/**
 * Crowd prediction engine.
 *
 * Tries POST ${VITE_ORCHESTRATION_API_URL}/predict/crowd first (the ONNX
 * LightGBM model served by orchestration-api). Falls back to the
 * time-of-week heuristic when the endpoint is unavailable or unconfigured —
 * same pattern as Firebase RAG → local retriever and DOSM API → fallback
 * stations used elsewhere in this codebase.
 */
import type { CrowdForecast, TransitIncident, TransitStation } from './transitData'

const ORCHESTRATION_URL = import.meta.env.VITE_ORCHESTRATION_API_URL as string | undefined

// ── Line-id map: must match LINES order in ml/train_crowd_model.py ─────────
const LINE_ID: Record<string, number> = {
  MRT_PUTRAJAYA: 0,
  MRT_KAJANG: 1,
  LRT_KELANA_JAYA: 2,
  LRT_AMPANG: 3,
  LRT_SRI_PETALING: 4,
  MONORAIL: 5,
  KTM_KOMUTER: 6,
  BRT_SUNWAY: 7,
}

/** Stations per line — mirrors the training data ranges. */
const STATIONS_PER_LINE: Record<number, number> = {
  0: 36, // MRT_PUTRAJAYA
  1: 37, // MRT_KAJANG
  2: 37, // LRT_KELANA_JAYA
  3: 13, // LRT_AMPANG
  4: 24, // LRT_SRI_PETALING
  5: 11, // MONORAIL
  6: 56, // KTM_KOMUTER
  7: 6,  // BRT_SUNWAY
}

/** Stable integer index for a station ID, bounded to the line's station range. */
function _stationIdx(stationId: string, lineId: number): number {
  let h = 0
  for (const c of stationId) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  const range = STATIONS_PER_LINE[lineId] ?? 37
  return h % range
}

/** Map ML label (0/1/2) + probabilities to the legacy CrowdForecast vocabulary. */
function _mlLabel(level: number, probs: number[]): CrowdForecast['label'] {
  if (level === 0) return 'calm'
  if (level === 1) return 'moderate'
  return (probs[2] ?? 0) > 0.70 ? 'critical' : 'busy'
}

/** Weighted probability → 0-100 score (mirrors TransitIntelligencePanel display). */
function _mlScore(probs: number[]): number {
  if (!Array.isArray(probs) || probs.length < 3) return 40
  return Math.round((probs[0] ?? 0) * 18 + (probs[1] ?? 0) * 52 + (probs[2] ?? 0) * 90)
}

// ── Heuristic fallback (sync, always available) ────────────────────────────

function _getCrowdLabel(score: number): CrowdForecast['label'] {
  if (score < 35) return 'calm'
  if (score < 60) return 'moderate'
  if (score < 80) return 'busy'
  return 'critical'
}

function _heuristicCrowdLevel(
  station: TransitStation,
  incidents: TransitIncident[],
  currentHour: number,
): CrowdForecast {
  const rushHourBoost =
    currentHour >= 7 && currentHour <= 9 ? 22 : currentHour >= 17 && currentHour <= 20 ? 27 : 6
  const cityCenterBoost = station.zone === 1 ? 15 : station.zone === 2 ? 8 : 3
  const incidentBoost = incidents
    .filter(i => i.line === station.line)
    .reduce(
      (sum, i) => sum + (i.severity === 'high' ? 18 : i.severity === 'medium' ? 10 : 4),
      0,
    )
  const score = Math.min(100, rushHourBoost + cityCenterBoost + incidentBoost + Math.floor(Math.random() * 20))
  return {
    stationId: station.id,
    line: station.line,
    forecastAt: new Date().toISOString(),
    score,
    label: _getCrowdLabel(score),
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns a crowd forecast for `station`.
 *
 * Calls the ONNX endpoint when VITE_ORCHESTRATION_API_URL is set;
 * falls back to the heuristic silently on any failure.
 *
 * @param eventNearby Pass true when fetchNearbyEvents() returned results —
 *   sets the event_within_2km feature flag for the ML model.
 */
export async function predictCrowdLevel(
  station: TransitStation,
  incidents: TransitIncident[],
  currentHour = new Date().getHours(),
  eventNearby = false,
): Promise<CrowdForecast> {
  if (ORCHESTRATION_URL) {
    try {
      const res = await fetch(`${ORCHESTRATION_URL}/predict/crowd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stations: [
            {
              line_id: LINE_ID[station.line] ?? 0,
              station_id: _stationIdx(station.id, LINE_ID[station.line] ?? 0),
              is_interchange: station.zone === 1 ? 1 : 0,
              event_within_2km: eventNearby ? 1 : 0,
              // weather_code omitted → defaults to 0 (clear) server-side
            },
          ],
        }),
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const body = await res.json()
        const pred = body.predictions?.[0]
        if (pred) {
          return {
            stationId: station.id,
            line: station.line,
            forecastAt: new Date().toISOString(),
            score: _mlScore(pred.probability),
            label: _mlLabel(pred.crowd_level, pred.probability),
          }
        }
      }
    } catch {
      // network error, timeout, or malformed response → fall through
    }
  }
  return _heuristicCrowdLevel(station, incidents, currentHour)
}
