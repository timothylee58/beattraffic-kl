import { blink } from './blink'

export interface JourneyRecord {
  id: string
  user_id: string
  display_name: string
  distance_km: number
  co2_saved_kg: number
  journey_count: number
  week_start: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  distance_km: number
  co2_saved_kg: number
  journey_count: number
  isMe: boolean
}

const RAIL_CO2_PER_KM = 0.041
const BUS_CO2_PER_KM = 0.089
const CAR_CO2_PER_KM = 0.171  // baseline for "saved vs car"

export function computeEcoScore(distanceKm: number, mode: 'rail' | 'bus' = 'rail'): number {
  const transitCo2 = distanceKm * (mode === 'rail' ? RAIL_CO2_PER_KM : BUS_CO2_PER_KM)
  return Math.round((distanceKm * CAR_CO2_PER_KM - transitCo2) * 1000) / 1000
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export async function recordJourney(
  userId: string,
  displayName: string,
  distanceKm: number,
  mode: 'rail' | 'bus' = 'rail',
) {
  const week_start = getWeekStart()
  const co2_saved_kg = computeEcoScore(distanceKm, mode)

  try {
    const { data: existing } = await blink.db.leaderboard.list({
      where: { user_id: userId, week_start },
    })

    if (existing && existing.length > 0) {
      const row = existing[0] as unknown as JourneyRecord
      await blink.db.leaderboard.update(row.id, {
        distance_km: (row.distance_km || 0) + distanceKm,
        co2_saved_kg: (row.co2_saved_kg || 0) + co2_saved_kg,
        journey_count: (row.journey_count || 0) + 1,
        display_name: displayName,
      })
    } else {
      await blink.db.leaderboard.create({
        id: `lb-${userId}-${week_start}`,
        user_id: userId,
        display_name: displayName,
        distance_km: distanceKm,
        co2_saved_kg: co2_saved_kg,
        journey_count: 1,
        week_start,
      })
    }
  } catch {
    // offline — store locally
    const key = `bt-lb-${week_start}`
    const local = JSON.parse(localStorage.getItem(key) || 'null') || {
      distance_km: 0,
      co2_saved_kg: 0,
      journey_count: 0,
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        distance_km: local.distance_km + distanceKm,
        co2_saved_kg: local.co2_saved_kg + co2_saved_kg,
        journey_count: local.journey_count + 1,
      }),
    )
  }
}

export async function fetchLeaderboard(metric: 'distance_km' | 'co2_saved_kg' | 'journey_count' = 'distance_km'): Promise<LeaderboardEntry[]> {
  const week_start = getWeekStart()
  try {
    const { data } = await blink.db.leaderboard.list({ where: { week_start } })
    if (!data) return []
    const sorted = (data as unknown as JourneyRecord[])
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .slice(0, 20)
    return sorted.map((row, i) => ({
      rank: i + 1,
      user_id: row.user_id,
      display_name: row.display_name || 'Anonymous',
      distance_km: Math.round((row.distance_km || 0) * 10) / 10,
      co2_saved_kg: Math.round((row.co2_saved_kg || 0) * 100) / 100,
      journey_count: row.journey_count || 0,
      isMe: false,
    }))
  } catch {
    return []
  }
}

export function getWeekLabel(): string {
  const ws = getWeekStart()
  const d = new Date(ws)
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
  return `${fmt(d)} – ${fmt(end)}`
}
