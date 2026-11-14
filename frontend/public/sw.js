/* BeatTraffic KL service worker: offline support without a build plugin.
 *  - /_next/static/*  hashed, immutable build files: cache-first.
 *  - page navigations: network-first, falling back to the last copy of that page (or the home page).
 *  - api.data.gov.my (DOSM): network-first, entries older than 1 h are not served from cache, max 50.
 *  - maps.googleapis.com: cache-first, 24 h, max 200.
 * Only GET requests are ever handled; the transit proxy (/api/*), Blink and Firebase calls are left alone.
 * Bump VERSION to drop every old cache on the next activation.
 */
const VERSION = "v1";
const STATIC = `bt-static-${VERSION}`;
const PAGES = `bt-pages-${VERSION}`;
const DOSM = `bt-dosm-${VERSION}`;
const MAPS = `bt-maps-${VERSION}`;
const META = `bt-meta-${VERSION}`; // url -> time stored (cross-origin responses are opaque, so their headers cannot be read)
const ALL = [STATIC, PAGES, DOSM, MAPS, META];

const RULES = {
  dosm: { cache: DOSM, maxEntries: 50, maxAgeMs: 3600 * 1000 },
  maps: { cache: MAPS, maxEntries: 200, maxAgeMs: 86400 * 1000 },
};

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("bt-") && !ALL.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

async function stamp(url) {
  const meta = await caches.open(META);
  await meta.put(url, new Response(String(Date.now())));
}

async function age(url) {
  const meta = await caches.open(META);
  const hit = await meta.match(url);
  return hit ? Date.now() - Number(await hit.text()) : Infinity;
}

async function store(rule, request, response) {
  // Opaque (status 0) responses are cacheable for no-cors image/script loads; error responses are not.
  if (!(response.ok || response.type === "opaque")) return;
  const cache = await caches.open(rule.cache);
  await cache.put(request, response.clone());
  await stamp(request.url);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - rule.maxEntries))) await cache.delete(key); // oldest first
}

async function fresh(rule, request) {
  const cache = await caches.open(rule.cache);
  const hit = await cache.match(request);
  return hit && (await age(request.url)) <= rule.maxAgeMs ? hit : undefined;
}

async function networkFirst(rule, request) {
  try {
    const response = await fetch(request);
    await store(rule, request, response);
    return response;
  } catch (err) {
    const hit = await fresh(rule, request);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(rule, request) {
  const hit = await fresh(rule, request);
  if (hit) return hit;
  const response = await fetch(request);
  await store(rule, request, response);
  return response;
}

async function navigation(request) {
  const pages = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) await pages.put(request, response.clone());
    return response;
  } catch {
    return (
      (await pages.match(request)) ||
      (await pages.match("/")) ||
      new Response("You are offline and this page has not been opened before.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(
        caches.open(STATIC).then(async (cache) => {
          const hit = await cache.match(request);
          if (hit) return hit;
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        }),
      );
    } else if (request.mode === "navigate") {
      event.respondWith(navigation(request));
    }
    return;
  }
  if (url.hostname === "api.data.gov.my" || url.hostname === "storage.data.gov.my") event.respondWith(networkFirst(RULES.dosm, request));
  else if (url.hostname === "maps.googleapis.com") event.respondWith(cacheFirst(RULES.maps, request));
});
