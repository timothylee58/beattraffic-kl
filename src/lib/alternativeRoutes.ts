/**
 * Alternative route suggestions.
 *
 * Priority:
 *   1. OpenTripPlanner (POST VITE_OTP_URL/graphql) — real Prasarana GTFS
 *      topology, actual durations, real transfer counts.
 *   2. Static template fallback — used when OTP is unreachable or
 *      VITE_OTP_URL is unset (local dev without docker compose).
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

// ── Static fallback templates (displayed when OTP is unavailable) ──────────────

const TEMPLATES: AlternativeRoute[] = [
  {
    id: 'alt-rail-swap',
    label: 'Alternate Rail Line',
    mode: 'rail',
    duration: 18,
    transfers: 2,
    reliability: 88,
    via: ['Masjid Jamek', 'Dang Wangi'],
    fare: 3.20,
    isRecommended: true,
  },
  {
    id: 'alt-bus-bridge',
    label: 'Bus Bridge (RapidKL)',
    mode: 'bus',
    duration: 25,
    transfers: 1,
    reliability: 72,
    via: ['KL Sentral Bus Terminal'],
    fare: 2.00,
  },
  {
    id: 'alt-express-walk',
    label: 'Express Bus + Walk',
    mode: 'mixed',
    duration: 30,
    transfers: 0,
    reliability: 65,
    via: ['Jalan Ampang Express'],
    fare: 1.50,
  },
]

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Return alternative routes for a delay scenario.
 *
 * Pass `fromCoords` and `toCoords` to enable OTP lookup; omit to use
 * templates only (e.g. when coordinates are unknown).
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
      // OTP unavailable — fall through to templates
    }
  }

  return TEMPLATES
}

/**
 * Synchronous version — always returns templates.
 * Use this only in contexts where async is not possible.
 */
export function getAlternativeRoutesSync(delayMinutes: number): AlternativeRoute[] {
  if (delayMinutes < 5) return []
  return TEMPLATES
}
