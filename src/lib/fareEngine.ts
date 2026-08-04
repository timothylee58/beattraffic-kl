// Prasarana MyRapid zonal fare table (MYR)
// Zones 1 (city core), 2 (inner suburbs), 3 (outer suburbs)
// Source: Prasarana published fare schedule
const ZONE_FARE: Record<number, Record<number, number>> = {
  1: { 1: 1.20, 2: 2.00, 3: 3.00 },
  2: { 1: 2.00, 2: 1.50, 3: 2.50 },
  3: { 1: 3.00, 2: 2.50, 3: 2.00 },
}

export const DAILY_CAP = 5.00
export const WEEKLY_CAP = 25.00

export function calculateZonalFare(fromZone: number, toZone: number): number {
  return ZONE_FARE[fromZone]?.[toZone] ?? ZONE_FARE[toZone]?.[fromZone] ?? 2.00
}

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function weekStart(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function getSpentToday(userId: string, tickets: { user_id: string; fare: number; created_at?: string }[]): Promise<number> {
  const start = todayStart().toISOString()
  return tickets
    .filter(t => t.user_id === userId && (t.created_at ?? '') >= start)
    .reduce((sum, t) => sum + (t.fare ?? 0), 0)
}

export async function getSpentThisWeek(userId: string, tickets: { user_id: string; fare: number; created_at?: string }[]): Promise<number> {
  const start = weekStart().toISOString()
  return tickets
    .filter(t => t.user_id === userId && (t.created_at ?? '') >= start)
    .reduce((sum, t) => sum + (t.fare ?? 0), 0)
}

export function cappedFare(rawFare: number, spentToday: number): number {
  const remaining = Math.max(0, DAILY_CAP - spentToday)
  return Math.min(rawFare, remaining)
}

export interface FareSummary {
  rawFare: number
  finalFare: number
  isCapped: boolean
  spentToday: number
  spentThisWeek: number
  dailyRemaining: number
  weeklyRemaining: number
}

export function buildFareSummary(
  rawFare: number,
  spentToday: number,
  spentThisWeek: number,
): FareSummary {
  const finalFare = cappedFare(rawFare, spentToday)
  return {
    rawFare,
    finalFare,
    isCapped: finalFare < rawFare,
    spentToday,
    spentThisWeek,
    dailyRemaining: Math.max(0, DAILY_CAP - spentToday),
    weeklyRemaining: Math.max(0, WEEKLY_CAP - spentThisWeek),
  }
}
