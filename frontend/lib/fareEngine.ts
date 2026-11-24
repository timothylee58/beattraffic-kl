import { klSpendWindows } from './dates'
// Illustrative fare estimates (MYR), not an operator-approved tariff.
// Daily/rolling-seven-day caps below are demo policy until verified with the operator.
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

export async function getSpentToday(userId: string, tickets: { user_id: string; fare: number; created_at?: string }[]): Promise<number> {
  const start = klSpendWindows().today.toISOString()
  return tickets
    .filter(t => t.user_id === userId && (t.created_at ?? '') >= start)
    .reduce((sum, t) => sum + (t.fare ?? 0), 0)
}

export async function getSpentThisWeek(userId: string, tickets: { user_id: string; fare: number; created_at?: string }[]): Promise<number> {
  const start = klSpendWindows().week.toISOString()
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
  const validAmount = (n: number) => Number.isFinite(n) && n >= 0
  if (![rawFare, spentToday, spentThisWeek].every(validAmount)) throw new Error('Invalid fare amount')
  const cents = (n: number) => Math.round(n * 100)
  const dailyRemaining = Math.max(0, cents(DAILY_CAP) - cents(spentToday))
  const weeklyRemaining = Math.max(0, cents(WEEKLY_CAP) - cents(spentThisWeek))
  const finalFare = Math.min(cents(rawFare), dailyRemaining, weeklyRemaining) / 100
  return {
    rawFare,
    finalFare,
    isCapped: finalFare < rawFare,
    spentToday,
    spentThisWeek,
    dailyRemaining: dailyRemaining / 100,
    weeklyRemaining: weeklyRemaining / 100,
  }
}
