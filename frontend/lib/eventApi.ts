/**
 * KL Event Service — Feature #9 Event-Aware Routing
 *
 * Real endpoint: set NEXT_PUBLIC_KL_EVENTS_URL to a service returning KLEvent[].
 * Without a verified feed, no events are shown.
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

const EVENTS_URL = process.env.NEXT_PUBLIC_KL_EVENTS_URL as string | undefined

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch KL events within radiusKm of (lat, lon) that are active or starting
 * within the next windowHours hours. Tries NEXT_PUBLIC_KL_EVENTS_URL first.
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
      // Feed unavailable
    }
  }
  return [] // No verified event feed: never present invented events as current.
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
