/**
 * OpenTripPlanner 2 GraphQL client.
 *
 * Queries the OTP server running at VITE_OTP_URL (defaults to
 * http://localhost:8080/otp/routers/default/index/graphql).
 * Returns null on any network/parse failure so callers can fall back to
 * the static template routes.
 *
 * The OTP service is defined in docker-compose.yml and loads Prasarana
 * GTFS data on first start. When the service is absent (e.g. development
 * without docker compose), all calls return null and the template fallback
 * is used transparently.
 */

import type { AlternativeRoute } from './alternativeRoutes'

const OTP_URL =
  (import.meta.env.VITE_OTP_URL as string | undefined) ??
  'http://localhost:8080/otp/routers/default/index/graphql'

// ── GraphQL query ──────────────────────────────────────────────────────────────

const PLAN_QUERY = /* graphql */ `
query PlanRoute(
  $fromLat: Float!  $fromLon: Float!
  $toLat:   Float!  $toLon:   Float!
  $date:    String! $time:    String!
  $modes:   [TransportMode]
) {
  plan(
    from: { lat: $fromLat, lon: $fromLon }
    to:   { lat: $toLat,   lon: $toLon   }
    date: $date
    time: $time
    transportModes: $modes
    numItineraries: 5
    walkReluctance: 2.0
    maxWalkDistance: 1500
  ) {
    itineraries {
      duration
      numberOfTransfers
      legs {
        mode
        route { shortName longName }
        from { name }
        to   { name }
        duration
        distance
        fare { fare { type cents } }
      }
    }
  }
}
`

// ── Mode sets ──────────────────────────────────────────────────────────────────

const MODE_SETS = [
  { label: 'Rail', modes: [{ mode: 'RAIL' }, { mode: 'WALK' }] },
  { label: 'Bus + Rail', modes: [{ mode: 'BUS' }, { mode: 'RAIL' }, { mode: 'WALK' }] },
  { label: 'Bus', modes: [{ mode: 'BUS' }, { mode: 'WALK' }] },
]

// ── Internal types ─────────────────────────────────────────────────────────────

interface OtpLeg {
  mode: string
  route: { shortName: string; longName: string } | null
  from: { name: string }
  to:   { name: string }
  duration: number    // seconds
  distance: number    // metres
  fare: { fare: { type: string; cents: number }[] } | null
}

interface OtpItinerary {
  duration: number          // seconds
  numberOfTransfers: number
  legs: OtpLeg[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _primaryMode(legs: OtpLeg[]): AlternativeRoute['mode'] {
  const modes = new Set(legs.map(l => l.mode.toUpperCase()))
  const hasRail = modes.has('RAIL') || modes.has('TRAM') || modes.has('SUBWAY')
  const hasBus  = modes.has('BUS')
  if (hasRail && hasBus) return 'mixed'
  if (hasBus) return 'bus'
  return 'rail'
}

function _viaStops(legs: OtpLeg[]): string[] {
  // Collect the intermediate stop names (destination of each transit leg)
  return legs
    .filter(l => l.mode !== 'WALK')
    .slice(0, -1)                          // exclude final destination
    .map(l => l.to.name)
    .filter(Boolean)
    .slice(0, 3)                           // cap at 3 for UI
}

function _fareFromLegs(legs: OtpLeg[]): number {
  // Sum GTFS fare cents from all legs that carry fare info
  const totalCents = legs.reduce((sum, leg) => {
    const cents = leg.fare?.fare?.find(f => f.type === 'regular')?.cents ?? 0
    return sum + cents
  }, 0)
  if (totalCents > 0) return Math.round(totalCents) / 100
  // Fall back to distance-based estimate (roughly MYR 0.10 per km)
  const distKm = legs.reduce((s, l) => s + l.distance, 0) / 1000
  return Math.max(1.20, Math.round(distKm * 0.10 * 20) / 20)
}

function _reliability(mode: AlternativeRoute['mode']): number {
  // Static reliability estimate; could be enriched from incident feed
  if (mode === 'rail') return 88
  if (mode === 'bus')  return 72
  return 75
}

/** Convert an OTP itinerary into our AlternativeRoute schema. */
function _toAltRoute(it: OtpItinerary, modeLabel: string, idx: number): AlternativeRoute {
  const mode = _primaryMode(it.legs)
  return {
    id: `otp-${modeLabel.replace(/\s+/g, '-').toLowerCase()}-${idx}`,
    label: it.numberOfTransfers === 0
      ? `${modeLabel} (direct)`
      : `${modeLabel} (${it.numberOfTransfers} transfer${it.numberOfTransfers > 1 ? 's' : ''})`,
    mode,
    duration: Math.round(it.duration / 60),   // seconds → minutes
    transfers: it.numberOfTransfers,
    reliability: _reliability(mode),
    via: _viaStops(it.legs),
    fare: _fareFromLegs(it.legs),
    isRecommended: idx === 0,                  // first result per mode set is recommended
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface OtpCoords {
  lat: number
  lon: number
}

/**
 * Query OTP for itineraries from `from` to `to`.
 * Returns deduplicated AlternativeRoute[] or null on failure.
 */
export async function queryOtpRoutes(
  from: OtpCoords,
  to:   OtpCoords,
): Promise<AlternativeRoute[] | null> {
  try {
    const now  = new Date()
    const date = now.toISOString().slice(0, 10)                  // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 5)                  // HH:MM

    const results = await Promise.allSettled(
      MODE_SETS.map(({ label, modes }) =>
        fetch(OTP_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            query: PLAN_QUERY,
            variables: {
              fromLat: from.lat, fromLon: from.lon,
              toLat:   to.lat,   toLon:   to.lon,
              date, time,
              modes,
            },
          }),
          signal: AbortSignal.timeout(8000),
        })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`OTP ${r.status}`)))
        .then((body): AlternativeRoute[] => {
          const itineraries: OtpItinerary[] = body?.data?.plan?.itineraries ?? []
          if (!itineraries.length) return []
          // Take the best itinerary per mode set
          return [_toAltRoute(itineraries[0], label, 0)]
        })
      )
    )

    const routes = results
      .filter((r): r is PromiseFulfilledResult<AlternativeRoute[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)

    return routes.length ? routes : null
  } catch {
    return null
  }
}
