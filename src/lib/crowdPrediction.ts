export type CrowdLabel = 'Low' | 'Moderate' | 'High'

export interface CrowdPrediction {
  lineId: string
  stationId?: string
  crowd_level: number
  label: CrowdLabel
}

export const CROWD_COLORS: Record<CrowdLabel, string> = {
  Low: 'bg-green-100 text-green-800 border-green-300',
  Moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  High: 'bg-red-100 text-red-800 border-red-300',
}

export const CROWD_DOT: Record<CrowdLabel, string> = {
  Low: 'bg-green-500',
  Moderate: 'bg-yellow-500',
  High: 'bg-red-500',
}

export const CROWD_BG: Record<CrowdLabel, string> = {
  Low: 'bg-green-500',
  Moderate: 'bg-yellow-400',
  High: 'bg-red-500',
}

export function heuristicCrowdLabel(hour: number, dow: number): CrowdLabel {
  const isWeekend = dow === 0 || dow === 6
  const isPeak = (!isWeekend && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)))
  const isMidPeak = (!isWeekend && hour >= 11 && hour <= 14) || (isWeekend && hour >= 11 && hour <= 15)
  if (isPeak) return 'High'
  if (isMidPeak) return 'Moderate'
  return 'Low'
}

const CROWD_URL = import.meta.env.VITE_PREDICT_CROWD_URL as string | undefined

export async function fetchLineCrowdSummaries(): Promise<CrowdPrediction[] | null> {
  if (!CROWD_URL) return null
  try {
    const res = await fetch(CROWD_URL)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchStationCrowdPrediction(lineId: string, stationId: string): Promise<CrowdPrediction | null> {
  const all = await fetchLineCrowdSummaries()
  if (!all) return null
  return all.find(p => p.lineId === lineId && p.stationId === stationId) ?? null
}
