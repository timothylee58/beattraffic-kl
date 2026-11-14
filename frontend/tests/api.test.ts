import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchNetwork, replan } from "@/lib/api";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("calls the same-origin proxy and passes an abort signal (no hung spinners)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ stations: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchNetwork();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/transit/network");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("POSTs the request body to /replan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ status: "ok", routes: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await replan({ origin: "a", destination: "b", arrive_by: "2026-11-16T09:00:00+08:00" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/transit/replan");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ origin: "a", destination: "b" });
  });

  it("surfaces the server's detail message as an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "unknown origin or destination station" }), { status: 422 })));
    await expect(replan({ origin: "x", destination: "y", arrive_by: "t" })).rejects.toMatchObject({ name: "ApiError", status: 422, message: "unknown origin or destination station" });
  });

  it("falls back to a generic message for non-JSON error bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 })));
    const err = await fetchNetwork().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Request failed (502)");
  });
});
