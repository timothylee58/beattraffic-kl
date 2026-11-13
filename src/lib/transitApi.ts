export const TRANSIT_API_URL = (import.meta.env.VITE_ORCHESTRATION_API_URL as string | undefined) ?? ''

export interface NetworkStation { id: string; name: string; lat: number; lon: number; lines: string[] }
export interface NetworkLine { code: string; name: string; short: string; color: string }
export interface NetworkEdge { a: string; b: string; line: string }
export interface Network { version: string; approximate: boolean; lines: NetworkLine[]; stations: NetworkStation[]; edges: NetworkEdge[] }

export interface ServiceNotice { id: string; title: string; text: string; published_at: string; lines: string[]; synthetic: boolean }

export interface RouteLeg {
  mode: 'rail' | 'walk' | 'transfer'
  line?: string
  line_code?: string
  color?: string
  from: string
  to: string
  stops: string[]
  minutes: number
  wait_minutes: number
}

export interface PlannedRoute {
  rank: number
  total_minutes: number
  transfers: number
  depart_by: string
  arrive_by: string
  legs: RouteLeg[]
  path: { id: string; name: string; lat: number; lon: number }[]
  crowd_level?: 'Low' | 'Moderate' | 'High'
  crowd_p_high?: number
  crowd_by_station?: Record<string, string>
}

export interface ReplanAnswer {
  status: 'ok' | 'no_route' | 'no_verified_route' | 'invalid_disruption' | 'tool_error' | 'bad_request'
  trace_id: string
  message?: string
  reason?: string
  routes: PlannedRoute[]
  warnings?: string[]
  disruption: { source: string; closed_lines: string[]; closed_stations: string[]; closed_segments: string[] }
  closed_edges: [string, string, string][]
  crowd?: { available: boolean; model: string | null; observed_signals: string[] }
  iterations: number
  loop_cap_hit: boolean
  latency_ms: number
  tool_calls: { tool: string; status: string; ms?: number; cache_hit?: boolean | null }[]
}

export interface ReplanRequest {
  origin: string
  destination: string
  arrive_by: string
  question?: string
  notice_text?: string
  observed_crowd?: Record<string, { crowd_t15: number; tap_t15: number }>
  event_within_2km?: number
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  if (!TRANSIT_API_URL) throw new Error('VITE_ORCHESTRATION_API_URL is not set')
  const res = await fetch(`${TRANSIT_API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json() as Promise<T>
}

export const fetchNetwork = () => http<Network>('/transit/network')
export const fetchNotices = () => http<{ synthetic: boolean; notices: ServiceNotice[] }>('/transit/notices')
export const replan = (body: ReplanRequest) => http<ReplanAnswer>('/transit/replan', { method: 'POST', body: JSON.stringify(body) })
