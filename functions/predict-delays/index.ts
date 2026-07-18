import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Feature schema ────────────────────────────────────────────────────────────
interface PredictRequest {
  line_id: number        // 0-7 (index into LINES array)
  hour?: number          // defaults to current KL time
  day_of_week?: number   // 0=Mon defaults to current day
  weather_code?: number  // 0=clear 1=light_rain 2=heavy_rain 3=flood_warning
  prev_delay_min?: number
  crowd_score?: number   // 0-1
  incidents_active?: number
  transfer_load?: number // 0-1
}

interface DelayPrediction {
  line: string
  delay_probability: number   // 0-1, P(delay > 5 min)
  estimated_delay_min: number // expected minutes of delay
  confidence: number          // 0-100
  severity: 'none' | 'minor' | 'moderate' | 'severe'
  trend: 'improving' | 'stable' | 'worsening'
  features_used: Record<string, number>
}

const LINES = [
  "MRT_PUTRAJAYA", "MRT_KAJANG", "LRT_KELANA_JAYA",
  "LRT_AMPANG", "LRT_SRI_PETALING", "MONORAIL",
  "KTM_KOMUTER", "BRT_SHAH_ALAM",
]

// Reliability priors per line (lower = historically less reliable)
// Replace with real historical averages once data is collected.
const LINE_RELIABILITY: Record<string, number> = {
  MRT_PUTRAJAYA:   0.93,
  MRT_KAJANG:      0.91,
  LRT_KELANA_JAYA: 0.89,
  LRT_AMPANG:      0.86,
  LRT_SRI_PETALING: 0.86,
  MONORAIL:        0.85,
  KTM_KOMUTER:     0.78,
  BRT_SHAH_ALAM:   0.90,
}

function isPeak(hour: number, dow: number): boolean {
  if (dow >= 5) return false
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)
}

function klNow(): { hour: number; dow: number } {
  // UTC+8
  const now = new Date(Date.now() + 8 * 3600 * 1000)
  return { hour: now.getUTCHours(), dow: now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1 }
}

/**
 * Heuristic model — mirrors the LightGBM feature set so it can be hot-swapped
 * for the real ONNX model once trained. Each coefficient approximates the
 * LightGBM feature importance ranking from the training script.
 */
function predict(req: PredictRequest): DelayPrediction {
  const { hour: nowHour, dow: nowDow } = klNow()

  const hour = req.hour ?? nowHour
  const dow = req.day_of_week ?? nowDow
  const minuteOfDay = hour * 60
  const isWeekend = dow >= 5 ? 1 : 0
  const peak = isPeak(hour, dow) ? 1 : 0
  const weatherCode = req.weather_code ?? 0
  const prevDelay = req.prev_delay_min ?? 0
  const crowdScore = req.crowd_score ?? (peak ? 0.6 : 0.3)
  const incidents = req.incidents_active ?? 0
  const transferLoad = req.transfer_load ?? 0.3
  const lineId = req.line_id
  const lineName = LINES[lineId] ?? "UNKNOWN"
  const reliability = LINE_RELIABILITY[lineName] ?? 0.88

  // Weighted sum → sigmoid → P(delay > 5 min)
  const logit =
    -2.8
    + 0.9  * peak
    + 0.4  * isWeekend
    + 0.35 * weatherCode
    + 1.1  * incidents
    + 0.5  * crowdScore
    + 0.3  * (prevDelay / 10)
    + 0.2  * transferLoad
    + 0.1  * (minuteOfDay / 1440)
    - 0.8  * (reliability - 0.88)   // line-level prior

  const p = 1 / (1 + Math.exp(-logit))
  const pClamped = Math.min(0.97, Math.max(0.02, p))

  // Convert probability to interpretable outputs
  const estimatedDelayMin = Math.round(pClamped * 25)
  const severity: DelayPrediction['severity'] =
    pClamped < 0.15 ? 'none'
    : pClamped < 0.40 ? 'minor'
    : pClamped < 0.70 ? 'moderate'
    : 'severe'

  const trend: DelayPrediction['trend'] =
    prevDelay > 8 && pClamped < 0.4 ? 'improving'
    : pClamped > 0.6 ? 'worsening'
    : 'stable'

  // Confidence: higher when features are more informative
  const confidence = Math.round(
    Math.min(92, 60 + 15 * (incidents > 0 ? 1 : 0) + 10 * peak + 7 * weatherCode)
  )

  return {
    line: lineName,
    delay_probability: Math.round(pClamped * 1000) / 1000,
    estimated_delay_min: estimatedDelayMin,
    confidence,
    severity,
    trend,
    features_used: {
      hour, day_of_week: dow, is_peak: peak, weather_code: weatherCode,
      prev_delay_min: prevDelay, crowd_score: crowdScore,
      incidents_active: incidents, transfer_load: transferLoad,
    },
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body: PredictRequest | PredictRequest[]

    if (req.method === 'GET') {
      // Predict all lines with current time
      const predictions = LINES.map((_, i) => predict({ line_id: i }))
      return new Response(JSON.stringify(predictions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    body = await req.json()

    // Accept a single request or a batch
    const requests: PredictRequest[] = Array.isArray(body) ? body : [body]
    const predictions = requests.map(predict)

    return new Response(
      JSON.stringify(Array.isArray(body) ? predictions : predictions[0]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
