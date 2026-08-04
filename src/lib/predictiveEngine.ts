/**
 * Crowd prediction engine.
 *
 * Two-tier approach:
 *   1. POST /predict/crowd/daily  — DOSM daily-volume regressor (v2).
 *      Returns a base crowd_level (0/1/2) for the whole day.
 *      Score is then scaled by an intraday multiplier so peak-hour
 *      forecasts are higher than off-peak for the same day.
 *
 *   2. POST /predict/crowd        — 15-min LightGBM classifier (v1).
 *      Used when the DOSM model is unavailable (model not yet trained).
 *
 *   3. Local heuristic            — used when orchestration-api is not
 *      configured or both endpoints fail.
 *
 * Falls back silently at every layer — same pattern as the rest of the app.
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

/** Stations per line — must stay aligned with STATIONS_PER_LINE in ml/train_crowd_model.py. */
const STATIONS_PER_LINE: Record<number, number> = {
  0: 16, // MRT_PUTRAJAYA
  1: 31, // MRT_KAJANG
  2: 37, // LRT_KELANA_JAYA
  3: 18, // LRT_AMPANG
  4: 26, // LRT_SRI_PETALING
  5: 11, // MONORAIL
  6: 56, // KTM_KOMUTER
  7: 5,  // BRT_SUNWAY
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
  const p2 = Array.isArray(probs) && probs.length >= 3 ? probs[2] : 0
  return p2 > 0.70 ? 'critical' : 'busy'
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

// ── Intraday multiplier (applied on top of daily base score) ──────────────

/**
 * Scale the base daily-volume score by time-of-day.
 * Peak hours amplify, late night dampens, rest is neutral.
 */
function _intradayMultiplier(hour: number, isWeekend: boolean): number {
  if (isWeekend) {
    // Weekend: shopping/leisure pattern — midday peak
    if (hour >= 11 && hour <= 15) return 1.35
    if (hour >= 10 && hour <= 17) return 1.15
    if (hour < 8 || hour >= 22)   return 0.45
    return 0.85
  }
  // Weekday: twin-peak commute pattern
  if (hour >= 7  && hour <= 9)  return 1.80  // AM peak
  if (hour >= 17 && hour <= 20) return 1.90  // PM peak (slightly higher)
  if (hour >= 11 && hour <= 14) return 1.10  // midday
  if (hour < 6  || hour >= 23)  return 0.25  // late night
  if (hour < 7  || hour >= 21)  return 0.60  // early/late shoulder
  return 0.85
}

// ── Daily DOSM endpoint ────────────────────────────────────────────────────

/**
 * Call POST /predict/crowd/daily and blend with intraday multiplier.
 * Returns null on any failure so callers can fall through.
 */
async function _dailyForecast(
  station: TransitStation,
  currentHour: number,
): Promise<CrowdForecast | null> {
  if (!ORCHESTRATION_URL) return null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const res = await fetch(`${ORCHESTRATION_URL}/predict/crowd/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_name: station.name, date: today }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const body = await res.json()
    if (typeof body.crowd_level !== 'number') return null

    const isWeekend = [0, 6].includes(new Date().getDay())
    const mult      = _intradayMultiplier(currentHour, isWeekend)

    // Map base crowd_level → base score midpoint, then scale intraday
    const baseScore = body.crowd_level === 0 ? 20 : body.crowd_level === 1 ? 50 : 78
    const score     = Math.min(100, Math.round(baseScore * mult))

    return {
      stationId:  station.id,
      line:       station.line,
      forecastAt: new Date().toISOString(),
      score,
      label: _getCrowdLabel(score),
    }
  } catch {
    return null
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns a crowd forecast for `station`.
 *
 * Priority:
 *   1. DOSM daily regressor → scaled by intraday multiplier (most accurate)
 *   2. 15-min ONNX classifier (if daily model not yet trained)
 *   3. Local heuristic (always available)
 *
 * @param eventNearby Pass true when fetchNearbyEvents() returned results —
 *   sets the event_within_2km feature flag for the 15-min ML model.
 */
export async function predictCrowdLevel(
  station: TransitStation,
  incidents: TransitIncident[],
  currentHour = new Date().getHours(),
  eventNearby = false,
): Promise<CrowdForecast> {
  // Tier 1: daily DOSM regressor
  const daily = await _dailyForecast(station, currentHour)
  if (daily) return daily

  // Tier 2: 15-min ONNX classifier
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
      // fall through to heuristic
    }
  }

  // Tier 3: local heuristic
  return _heuristicCrowdLevel(station, incidents, currentHour)
}
