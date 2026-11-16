// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/transit/[...path]/route";

const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`http://localhost:3000${url}`, init);

let upstream: ReturnType<typeof vi.fn>;
beforeEach(() => {
  upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", upstream);
  process.env.API_URL = "http://api.internal:8000";
});
afterEach(() => vi.unstubAllGlobals());

describe("transit proxy", () => {
  it("forwards only the three known paths", async () => {
    for (const bad of [["admin"], ["health", "summary"], ["..", "etc", "passwd"], ["replan", "extra"], ["metrics"]]) {
      const res = await GET(req(`/api/transit/${bad.join("/")}`), ctx(...bad));
      expect(res.status).toBe(404);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it("builds the upstream URL from the allowlist, never from client text", async () => {
    await GET(req("/api/transit/network"), ctx("network"));
    expect(upstream.mock.calls[0]?.[0]).toBe("http://api.internal:8000/transit/network");
  });

  it("enforces the method per path", async () => {
    expect((await POST(req("/api/transit/network", { method: "POST", body: "{}" }), ctx("network"))).status).toBe(405);
    expect((await GET(req("/api/transit/replan"), ctx("replan"))).status).toBe(405);
  });

  it("forwards the POST body and the client IP (first X-Forwarded-For hop)", async () => {
    await POST(req("/api/transit/replan", { method: "POST", body: '{"origin":"a"}', headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }), ctx("replan"));
    const init = upstream.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> };
    expect(init.body).toBe('{"origin":"a"}');
    expect(init.headers["X-Client-IP"]).toBe("203.0.113.9");
  });

  it("rejects oversized bodies before contacting the API", async () => {
    const res = await POST(req("/api/transit/replan", { method: "POST", body: "x".repeat(25_000) }), ctx("replan"));
    expect(res.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("never leaks upstream error details to the browser", async () => {
    upstream.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:8000 (db password=hunter2)"));
    const res = await GET(req("/api/transit/network"), ctx("network"));
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|hunter2/);
  });

  it("passes upstream status codes through (e.g. 422 validation, 429 rate limit)", async () => {
    upstream.mockResolvedValue(new Response(JSON.stringify({ detail: "slow down" }), { status: 429, headers: { "content-type": "application/json" } }));
    const res = await POST(req("/api/transit/replan", { method: "POST", body: "{}" }), ctx("replan"));
    expect(res.status).toBe(429);
  });
});
