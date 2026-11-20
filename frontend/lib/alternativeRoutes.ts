/**
 * Alternative route suggestions.
 *
 * Priority:
 *   1. OpenTripPlanner (POST NEXT_PUBLIC_OTP_URL/graphql) — real Prasarana GTFS
 *      topology, actual durations, real transfer counts.
 *   2. Empty list — used when OTP is unreachable or
 *      NEXT_PUBLIC_OTP_URL is unset (local dev without docker compose).
 *
 * The function is async so callers can await OTP without blocking the UI.
 */

import type { OtpCoords } from './otpClient'

export interface AlternativeRoute {
  id: string
  label: string
  mode: 'rail' | 'bus' | 'mixed'
  duration: number      // minutes
  transfers: number
  reliability: number   // 0-100
  via: string[]
  fare: number          // MYR
  isRecommended?: boolean
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Return alternative routes for a delay scenario.
 *
 * Pass `fromCoords` and `toCoords` to enable OTP lookup; omit to use
 * no lookup (e.g. when coordinates are unknown).
 *
 * @param delayMinutes  Return empty array when delay < 5 (no disruption).
 * @param fromCoords    Origin lat/lon for OTP query.
 * @param toCoords      Destination lat/lon for OTP query.
 */
export async function getAlternativeRoutes(
  delayMinutes: number,
  fromCoords?: OtpCoords | null,
  toCoords?: OtpCoords | null,
): Promise<AlternativeRoute[]> {
  if (delayMinutes < 5) return []

  if (fromCoords && toCoords) {
    try {
      const { queryOtpRoutes } = await import('./otpClient')
      const routes = await queryOtpRoutes(fromCoords, toCoords)
      if (routes && routes.length > 0) return routes
    } catch {
      // OTP unavailable — return no unverified routes
    }
  }

  return []
}
