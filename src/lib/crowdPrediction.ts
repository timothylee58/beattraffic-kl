export interface CrowdPrediction {
  line: string
  station_id: number
  crowd_level: 0 | 1 | 2
  crowd_label: 'Low' | 'Moderate' | 'High'
  probabilities: [number, number, number]
  confidence: number
}

export const CROWD_LABELS = ['Low', 'Moderate', 'High'] as const
export type CrowdLabel = typeof CROWD_LABELS[number]

export const CROWD_COLORS: Record<CrowdLabel, string> = {
  Low:      'text-green-600 bg-green-50 border-green-200',
  Moderate: 'text-amber-600 bg-amber-50 border-amber-200',
  High:     'text-red-600 bg-red-50 border-red-200',
}

export const CROWD_DOT: Record<CrowdLabel, string> = {
  Low:      'bg-green-500',
  Moderate: 'bg-amber-500',
  High:     'bg-red-500',
}

const ML_ENDPOINT = import.meta.env.VITE_PREDICT_CROWD_URL ?? ''

export async function fetchLineCrowdSummaries(): Promise<CrowdPrediction[] | null> {
  if (!ML_ENDPOINT) return null
  try {
    const res = await fetch(ML_ENDPOINT)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchStationCrowdPrediction(
  lineId: number,
  stationId: number,
): Promise<CrowdPrediction | null> {
  if (!ML_ENDPOINT) return null
  try {
    const res = await fetch(ML_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_id: lineId, station_id: stationId }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Heuristic fallback — used when ML endpoint is not configured. */
export function heuristicCrowdLabel(hour: number, dow: number): CrowdLabel {
  const isPeak = dow < 5 && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20))
  const isMidDay = hour >= 11 && hour <= 14
  if (isPeak) return 'High'
  if (isMidDay) return 'Moderate'
  return 'Low'
}
