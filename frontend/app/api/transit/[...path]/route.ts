import type { NextRequest } from "next/server";

// Runtime proxy to the orchestration API. Only these fixed paths are forwarded, so this cannot be used as an
// open proxy (SSRF): the upstream URL is built from a lookup, never from client-controlled text.
const ALLOWED: Record<string, "GET" | "POST"> = { network: "GET", notices: "GET", replan: "POST" };
const MAX_BODY_BYTES = 20_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

function clientIp(req: NextRequest): string {
  // First hop of X-Forwarded-For as set by the platform in front of Next. The backend only honours the
  // forwarded value from a trusted proxy (TRUSTED_PROXIES), so a spoofed header cannot dodge its rate limit.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await params;
  const key = path.join("/");
  const method = ALLOWED[key];
  if (!method) return json({ error: "not found" }, 404);
  if (req.method !== method) return json({ error: "method not allowed" }, 405);

  let body: string | undefined;
  if (method === "POST") {
    body = await req.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return json({ error: "request too large" }, 413);
  }

  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
  try {
    const upstream = await fetch(`${apiUrl}/transit/${key}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Client-IP": clientIp(req) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    // Never echo upstream error text (hostnames, stack traces) to the browser.
    return json({ error: "The planning service is unavailable." }, 502);
  }
}

export { handle as GET, handle as POST };
