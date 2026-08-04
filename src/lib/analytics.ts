const ORCHESTRATION_URL = import.meta.env.VITE_ORCHESTRATION_API_URL as string | undefined

function _sessionId(): string {
  let id = sessionStorage.getItem('_bt_sid')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('_bt_sid', id)
  }
  return id
}

interface EventFields {
  user_id?: string
  from_station_id?: string
  to_station_id?: string
  fare?: number
  route_delay_minutes?: number
  used_alternative?: number
  alternative_id?: string
  nearby_event_count?: number
  extra?: string
}

export function trackEvent(eventType: string, fields: EventFields = {}): void {
  if (!ORCHESTRATION_URL) return
  const body = JSON.stringify({
    event_type: eventType,
    session_id: _sessionId(),
    user_id: fields.user_id ?? '',
    from_station_id: fields.from_station_id ?? '',
    to_station_id: fields.to_station_id ?? '',
    fare: fields.fare ?? 0,
    route_delay_minutes: fields.route_delay_minutes ?? 0,
    used_alternative: fields.used_alternative ?? 0,
    alternative_id: fields.alternative_id ?? '',
    nearby_event_count: fields.nearby_event_count ?? 0,
    extra: fields.extra ?? '{}',
  })
  fetch(`${ORCHESTRATION_URL}/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(2000),
  }).catch(() => {/* fire-and-forget */})
}
