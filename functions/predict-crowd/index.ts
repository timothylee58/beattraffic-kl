import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Feature schema ────────────────────────────────────────────────────────────
interface CrowdRequest {
  line_id: number      // 0-7
  station_id: number   // 0 – (stations_on_line - 1)
  hour?: number        // defaults to current KL hour
  day_of_week?: number // 0=Mon, defaults to current day
  weather_code?: number
  prev_crowd_t_15?: number   // 0/1/2
  prev_crowd_t_30?: number
  prev_tap_t_15?: number     // 0-1 normalised
  prev_tap_t_30?: number
  event_within_2km?: number  // 0 or 1
  transfer_inflow?: number   // 0-1
}

interface CrowdPrediction {
  line: string
  station_id: number
  crowd_level: 0 | 1 | 2
  crowd_label: 'Low' | 'Moderate' | 'High'
  probabilities: [number, number, number]  // [P(Low), P(Moderate), P(High)]
  confidence: number   // 0-100
  features_used: Record<string, number>
}

const LINES = [
  "MRT_PUTRAJAYA", "MRT_KAJANG", "LRT_KELANA_JAYA",
  "LRT_AMPANG", "LRT_SRI_PETALING", "MONORAIL",
  "KTM_KOMUTER", "BRT_SUNWAY",
]

const STATIONS_PER_LINE = [16, 31, 37, 18, 26, 11, 56, 5]

// Stations that see compounded load (interchange hubs)
const INTERCHANGE_STATION_IDS = new Set([0, 3, 7, 12, 15, 22, 30])

const CROWD_LABELS: ['Low', 'Moderate', 'High'] = ['Low', 'Moderate', 'High']

function klNow(): { hour: number; dow: number } {
  const now = new Date(Date.now() + 8 * 3600 * 1000)
  return { hour: now.getUTCHours(), dow: now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1 }
}

function isPeak(hour: number, dow: number): boolean {
  if (dow >= 5) return false
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)
}

function cyclic(val: number, period: number): [number, number] {
  const angle = (2 * Math.PI * val) / period
  return [Math.sin(angle), Math.cos(angle)]
}

function softmax(logits: [number, number, number]): [number, number, number] {
  const max = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - max)) as [number, number, number]
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / sum) as [number, number, number]
}

/**
 * Heuristic crowd prediction — mirrors the LightGBM feature set.
 * Hot-swap for ONNX once the model is trained.
 */
function predict(req: CrowdRequest): CrowdPrediction {
  const { hour: nowHour, dow: nowDow } = klNow()

  const hour = req.hour ?? nowHour
  const dow = req.day_of_week ?? nowDow
  const minuteOfDay = hour * 60
  const peak = isPeak(hour, dow) ? 1 : 0
  const weekend = dow >= 5 ? 1 : 0
  const weatherCode = req.weather_code ?? 0
  const prevCrowd15 = req.prev_crowd_t_15 ?? 1
  const prevCrowd30 = req.prev_crowd_t_30 ?? 1
  const prevTap15 = req.prev_tap_t_15 ?? (peak ? 0.55 : 0.25)
  const prevTap30 = req.prev_tap_t_30 ?? (peak ? 0.50 : 0.22)
  const event = req.event_within_2km ?? 0
  const transferInflow = req.transfer_inflow ?? 0.3
  const lineId = req.line_id
  const stationId = req.station_id
  const interchange = INTERCHANGE_STATION_IDS.has(stationId) ? 1 : 0

  const [hourSin, hourCos] = cyclic(hour, 24)
  const [dowSin, dowCos] = cyclic(dow, 7)

  // Base intensity (shared across classes)
  const intensity =
    0.15
    + 0.40 * peak
    + 0.10 * weekend
    + 0.08 * event
    + 0.12 * interchange
    + 0.10 * transferInflow
    + 0.15 * prevTap15
    + 0.10 * prevTap30
    - 0.04 * weatherCode
    + 0.05 * (prevCrowd15 / 2)
    + 0.03 * (prevCrowd30 / 2)
    + 0.02 * (minuteOfDay / 1440)
    + 0.01 * hourSin + 0.01 * hourCos
    + 0.01 * dowSin + 0.01 * dowCos
    // LRT Kelana Jaya (line 2) runs highest ridership
    + 0.05 * (lineId === 2 ? 1 : 0)

  // Logits for [Low, Moderate, High]
  const logits: [number, number, number] = [
    2.0 - intensity * 4,   // Low: high when intensity is low
    0.5 - Math.abs(intensity - 0.45) * 3,  // Moderate: peaks around mid-intensity
    -1.5 + intensity * 4,  // High: high when intensity is high
  ]

  const probs = softmax(logits)
  const crowdLevel = probs.indexOf(Math.max(...probs)) as 0 | 1 | 2

  // Confidence: higher when lagged features are informative and probabilities spread out
  const maxP = Math.max(...probs)
  const confidence = Math.round(50 + maxP * 45 + (prevCrowd15 === crowdLevel ? 5 : 0))

  return {
    line: LINES[lineId] ?? "UNKNOWN",
    station_id: stationId,
    crowd_level: crowdLevel,
    crowd_label: CROWD_LABELS[crowdLevel],
    probabilities: [
      Math.round(probs[0] * 1000) / 1000,
      Math.round(probs[1] * 1000) / 1000,
      Math.round(probs[2] * 1000) / 1000,
    ],
    confidence: Math.min(95, confidence),
    features_used: {
      hour, day_of_week: dow, is_peak: peak, weather_code: weatherCode,
      prev_crowd_t_15: prevCrowd15, prev_tap_t_15: prevTap15,
      is_interchange: interchange, event_within_2km: event, transfer_inflow: transferInflow,
    },
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed` }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    if (req.method === 'GET') {
      // Summarise by line: predict the busiest station (interchange) per line
      const summaries = LINES.map((_, lineId) => {
        const stationId = [...INTERCHANGE_STATION_IDS].find(s => s < STATIONS_PER_LINE[lineId]) ?? 0
        return predict({ line_id: lineId, station_id: stationId })
      })
      return new Response(JSON.stringify(summaries), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: CrowdRequest | CrowdRequest[] = await req.json()
    const requests = Array.isArray(body) ? body : [body]

    for (const r of requests) {
      if (r.line_id === undefined || r.line_id < 0 || r.line_id >= LINES.length) {
        return new Response(
          JSON.stringify({ error: `Invalid line_id: ${r.line_id}. Must be 0–${LINES.length - 1}.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const maxStation = STATIONS_PER_LINE[r.line_id] - 1
      if (r.station_id === undefined || r.station_id < 0 || r.station_id > maxStation) {
        return new Response(
          JSON.stringify({ error: `Invalid station_id: ${r.station_id}. Must be 0–${maxStation} for line ${r.line_id}.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

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
