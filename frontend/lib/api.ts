// Same-origin: Next.js route handlers proxy to the orchestration API, so there is no CORS and no backend URL in the browser.
const BASE = "/api/transit";

export interface NetworkStation { id: string; name: string; lat: number; lon: number; lines: string[] }
export interface NetworkLine { code: string; name: string; short: string; color: string }
export interface NetworkEdge { a: string; b: string; line: string }
export interface Network { version: string; approximate: boolean; lines: NetworkLine[]; stations: NetworkStation[]; edges: NetworkEdge[] }

export interface ServiceNotice { id: string; title: string; text: string; published_at: string; lines: string[]; synthetic: boolean }

export interface RouteLeg {
  mode: "rail" | "walk" | "transfer";
  line?: string;
  line_code?: string;
  color?: string;
  from: string;
  to: string;
  stops: string[];
  minutes: number;
  wait_minutes: number;
}

export type CrowdLevel = "Low" | "Moderate" | "High";
// Where the crowd model's recent-crowd inputs came from: the request itself, the live gate feed, both, or neither.
export type SignalSource = "request" | "live_feed" | "mixed" | "none";

export interface PlannedRoute {
  rank: number;
  total_minutes: number;
  transfers: number;
  depart_by: string;
  arrive_by: string;
  legs: RouteLeg[];
  path: { id: string; name: string; lat: number; lon: number }[];
  crowd_level?: CrowdLevel;
  crowd_p_high?: number;
  crowd_by_station?: Record<string, string>;
}

export type AnswerStatus = "ok" | "no_route" | "no_verified_route" | "invalid_disruption" | "tool_error" | "bad_request";

export interface ReplanAnswer {
  status: AnswerStatus;
  trace_id: string;
  message?: string;
  reason?: string;
  routes: PlannedRoute[];
  warnings?: string[];
  disruption: { source: string; closed_lines: string[]; closed_stations: string[]; closed_segments: string[] };
  closed_edges: [string, string, string][];
  crowd?: { available: boolean; model: string | null; observed_signals: string[]; signal_source?: SignalSource };
  iterations: number;
  loop_cap_hit: boolean;
  latency_ms: number;
  tool_calls: { tool: string; status: string; ms?: number; cache_hit?: boolean | null }[];
}

export interface ReplanRequest {
  origin: string;
  destination: string;
  arrive_by: string;
  question?: string;
  notice_text?: string;
  observed_crowd?: Record<string, { crowd_t15: number; tap_t15: number }>;
  event_within_2km?: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000), // a stalled backend must not leave the spinner running forever
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body?.detail === "string" ? body.detail : typeof body?.error === "string" ? body.error : "";
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const fetchNetwork = () => http<Network>("/network");
export const fetchNotices = () => http<{ synthetic: boolean; notices: ServiceNotice[] }>("/notices");
export const replan = (body: ReplanRequest) => http<ReplanAnswer>("/replan", { method: "POST", body: JSON.stringify(body) });
