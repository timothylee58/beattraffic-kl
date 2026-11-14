// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: { request: Request; respondWith: (p: Promise<Response>) => void; waitUntil: (p: Promise<unknown>) => void }) => void;

const keyOf = (r: Request | string) => (typeof r === "string" ? new URL(r, "https://app.test/").href : r.url);

class FakeCache {
  store = new Map<string, Response>();
  async match(req: Request | string) { return this.store.get(keyOf(req))?.clone(); }
  async put(req: Request | string, res: Response) { this.store.set(keyOf(req), res); }
  async delete(req: Request | string) { return this.store.delete(keyOf(req)); }
  async keys() { return [...this.store.keys()].map((u) => new Request(u)); }
}

let handlers: Record<string, Handler>;
let caches: Map<string, FakeCache>;
let online: boolean;
let fetchCalls: string[];

function load() {
  handlers = {};
  caches = new Map();
  online = true;
  fetchCalls = [];
  const self = { location: new URL("https://app.test/"), skipWaiting: vi.fn(), clients: { claim: vi.fn() }, addEventListener: (t: string, h: Handler) => { handlers[t] = h; } };
  const cacheStorage = {
    open: async (n: string) => { if (!caches.has(n)) caches.set(n, new FakeCache()); return caches.get(n)!; },
    keys: async () => [...caches.keys()],
    delete: async (n: string) => caches.delete(n),
  };
  const fakeFetch = async (req: Request) => {
    fetchCalls.push(req.url);
    if (!online) throw new TypeError("offline");
    return new Response("body:" + req.url, { status: req.url.includes("bad") ? 500 : 200 });
  };
  vm.runInNewContext(readFileSync(join(__dirname, "../public/sw.js"), "utf8"), { self, caches: cacheStorage, fetch: fakeFetch, Response, Request, URL, Date: { now: () => Date.now() }, Promise, Math, String, Number, Infinity });
}

async function get(url: string, init: { method?: string; mode?: string } = {}) {
  const request = { url, method: init.method ?? "GET", mode: init.mode ?? "cors" } as unknown as Request;
  let result: Promise<Response> | undefined;
  handlers.fetch!({ request, respondWith: (p) => { result = p; }, waitUntil: () => {} });
  return result ? await result : undefined; // undefined = the worker ignored the request
}

beforeEach(() => { load(); vi.useRealTimers(); });

describe("service worker", () => {
  it("only handles GET and leaves same-origin API and unknown cross-origin calls alone", async () => {
    expect(await get("https://api.data.gov.my/x", { method: "POST" })).toBeUndefined();
    expect(await get("https://app.test/api/transit/network")).toBeUndefined();
    expect(await get("https://firestore.googleapis.com/x")).toBeUndefined();
  });

  it("serves a DOSM response from cache when offline, but not after an hour", async () => {
    vi.useFakeTimers();
    await get("https://api.data.gov.my/x");
    online = false;
    expect(await (await get("https://api.data.gov.my/x"))!.text()).toBe("body:https://api.data.gov.my/x");
    vi.advanceTimersByTime(3600 * 1000 + 1000);
    await expect(get("https://api.data.gov.my/x")).rejects.toThrow("offline");
  });

  it("maps are cache-first for 24 hours, then refetched", async () => {
    vi.useFakeTimers();
    await get("https://maps.googleapis.com/m");
    await get("https://maps.googleapis.com/m");
    expect(fetchCalls).toHaveLength(1);
    vi.advanceTimersByTime(86400 * 1000 + 1000);
    await get("https://maps.googleapis.com/m");
    expect(fetchCalls).toHaveLength(2);
  });

  it("does not cache error responses", async () => {
    await get("https://api.data.gov.my/bad");
    online = false;
    await expect(get("https://api.data.gov.my/bad")).rejects.toThrow("offline");
  });

  it("falls back to the last copy of a visited page, then to home, then to a plain 503", async () => {
    await get("https://app.test/", { mode: "navigate" });
    await get("https://app.test/station/a", { mode: "navigate" });
    online = false;
    expect(await (await get("https://app.test/station/a", { mode: "navigate" }))!.text()).toContain("/station/a");
    expect(await (await get("https://app.test/other", { mode: "navigate" }))!.text()).toContain("app.test/");
    caches.get("bt-pages-v1")!.store.clear();
    expect((await get("https://app.test/other", { mode: "navigate" }))!.status).toBe(503);
  });

  it("deletes caches from older versions on activate, keeping the current ones", async () => {
    caches.set("bt-static-v0", new FakeCache());
    caches.set("unrelated", new FakeCache());
    await new Promise<void>((resolve) => handlers.activate!({ request: undefined as never, respondWith: () => {}, waitUntil: (p) => void p.then(() => resolve()) }));
    expect([...caches.keys()]).toEqual(["unrelated"]);
  });
});
