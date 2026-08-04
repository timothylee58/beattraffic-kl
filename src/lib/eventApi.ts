/**
 * KL Event Service — Feature #9 Event-Aware Routing
 *
 * Real endpoint: set VITE_KL_EVENTS_URL to a service returning KLEvent[].
 * Without it, falls back to mock data for known KL venues (same pattern as
 * BAS.MY bus data — mock pending real API availability).
 *
 * Proximity filter uses haversine distance so only events within radiusKm
 * of a station are returned; time filter drops past events.
 */

export type EventCategory = 'concert' | 'sports' | 'festival' | 'conference' | 'exhibition'
export type CrowdImpact = 'low' | 'medium' | 'high'

export interface KLEvent {
  id: string
  name: string
  venue: string
  lat: number
  lon: number
  startAt: string   // ISO-8601
  endAt: string
  estimatedAttendance: CrowdImpact
  category: EventCategory
}

const EVENTS_URL = import.meta.env.VITE_KL_EVENTS_URL as string | undefined

// ── Mock dataset — major KL venues with plausible recurring events ─────────
// Dates are relative so they always appear "upcoming" in demos.
function _daysFromNow(d: number, hStart = 19, hEnd = 23): { start: string; end: string } {
  const s = new Date()
  s.setDate(s.getDate() + d)
  s.setHours(hStart, 0, 0, 0)
  const e = new Date(s)
  e.setHours(hEnd, 0, 0, 0)
  return { start: s.toISOString(), end: e.toISOString() }
}

const MOCK_EVENTS: KLEvent[] = [
  {
    id: 'KLE-01',
    name: 'KL Tower International Tower Run',
    venue: 'KL Tower',
    lat: 3.1528,
    lon: 101.7035,
    startAt: _daysFromNow(1, 6, 12).start,
    endAt: _daysFromNow(1, 6, 12).end,
    estimatedAttendance: 'high',
    category: 'sports',
  },
  {
    id: 'KLE-02',
    name: 'Axiata Arena Live Concert',
    venue: 'Axiata Arena, Bukit Jalil',
    lat: 3.0565,
    lon: 101.6921,
    startAt: _daysFromNow(2, 20, 23).start,
    endAt: _daysFromNow(2, 20, 23).end,
    estimatedAttendance: 'high',
    category: 'concert',
  },
  {
    id: 'KLE-03',
    name: 'KLCC Convention — Digital Economy Summit',
    venue: 'Kuala Lumpur Convention Centre',
    lat: 3.1554,
    lon: 101.7113,
    startAt: _daysFromNow(0, 8, 18).start,
    endAt: _daysFromNow(0, 8, 18).end,
    estimatedAttendance: 'medium',
    category: 'conference',
  },
  {
    id: 'KLE-04',
    name: 'Pavilion KL Fashion Week',
    venue: 'Pavilion Kuala Lumpur',
    lat: 3.1487,
    lon: 101.7136,
    startAt: _daysFromNow(3, 10, 22).start,
    endAt: _daysFromNow(3, 10, 22).end,
    estimatedAttendance: 'medium',
    category: 'festival',
  },
  {
    id: 'KLE-05',
    name: 'Sunway Lagoon Weekend Fest',
    venue: 'Sunway Lagoon',
    lat: 3.0706,
    lon: 101.6060,
    startAt: _daysFromNow(4, 10, 20).start,
    endAt: _daysFromNow(4, 10, 20).end,
    estimatedAttendance: 'medium',
    category: 'festival',
  },
  {
    id: 'KLE-06',
    name: 'Merdeka 118 Night Run',
    venue: 'Merdeka 118, Pasar Seni area',
    lat: 3.1431,
    lon: 101.6953,
    startAt: _daysFromNow(5, 7, 11).start,
    endAt: _daysFromNow(5, 7, 11).end,
    estimatedAttendance: 'high',
    category: 'sports',
  },
  {
    id: 'KLE-07',
    name: 'TRX Rise Art + Tech Exhibition',
    venue: 'TRX Exchange, Tun Razak Exchange',
    lat: 3.1423,
    lon: 101.7199,
    startAt: _daysFromNow(0, 10, 22).start,
    endAt: _daysFromNow(7, 10, 22).end,
    estimatedAttendance: 'low',
    category: 'exhibition',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function _haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function _isActive(event: KLEvent, windowHours = 4): boolean {
  const now = Date.now()
  const start = new Date(event.startAt).getTime()
  const end = new Date(event.endAt).getTime()
  // Active: event hasn't ended and starts within the next windowHours
  return end > now && start <= now + windowHours * 3_600_000
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch KL events within radiusKm of (lat, lon) that are active or starting
 * within the next windowHours hours. Tries VITE_KL_EVENTS_URL first.
 */
export async function fetchNearbyEvents(
  lat: number,
  lon: number,
  radiusKm = 2,
  windowHours = 4,
): Promise<KLEvent[]> {
  if (EVENTS_URL) {
    try {
      const res = await fetch(
        `${EVENTS_URL}?lat=${lat}&lon=${lon}&radius=${radiusKm}&window_hours=${windowHours}`,
        { signal: AbortSignal.timeout(3000) },
      )
      if (res.ok) {
        const data: KLEvent[] = await res.json()
        return data
      }
    } catch {
      // fall through to mock
    }
  }
  return MOCK_EVENTS.filter(
    e =>
      _isActive(e, windowHours) &&
      _haversineKm(lat, lon, e.lat, e.lon) <= radiusKm,
  )
}

/**
 * Returns true when any event in the list has high estimated attendance —
 * used to set the event_within_2km feature flag for the ML model.
 */
export function hasHighImpactEvent(events: KLEvent[]): boolean {
  return events.some(e => e.estimatedAttendance === 'high')
}

/** Human-readable summary of event crowd impact for UI labels. */
export function eventImpactLabel(events: KLEvent[]): string {
  const high = events.filter(e => e.estimatedAttendance === 'high').length
  const med = events.filter(e => e.estimatedAttendance === 'medium').length
  if (high > 0) return `${high} high-impact event${high > 1 ? 's' : ''} nearby`
  if (med > 0) return `${med} event${med > 1 ? 's' : ''} nearby`
  return `${events.length} event${events.length > 1 ? 's' : ''} nearby`
}
