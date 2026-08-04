import type { GtfsStop } from './gtfsStatic'
import type { AlternativeRoute } from './alternativeRoutes'

const GTFS_CACHE = 'gtfs-v1'
const ROUTE_CACHE = 'route-v1'
const GTFS_KEY = 'stops'

function cacheAvailable(): boolean {
  return typeof caches !== 'undefined'
}

export async function cacheGtfsStops(stops: GtfsStop[]): Promise<void> {
  if (!cacheAvailable()) return
  try {
    const cache = await caches.open(GTFS_CACHE)
    await cache.put(GTFS_KEY, new Response(JSON.stringify(stops), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch { /* silently skip — offline cache is best-effort */ }
}

export async function getCachedStops(): Promise<GtfsStop[] | null> {
  if (!cacheAvailable()) return null
  try {
    const cache = await caches.open(GTFS_CACHE)
    const resp = await cache.match(GTFS_KEY)
    if (!resp) return null
    return await resp.json() as GtfsStop[]
  } catch { return null }
}

export async function cacheRoute(from: string, to: string, routes: AlternativeRoute[]): Promise<void> {
  if (!cacheAvailable()) return
  try {
    const cache = await caches.open(ROUTE_CACHE)
    await cache.put(`${from}-${to}`, new Response(JSON.stringify(routes), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch { /* best-effort */ }
}

export async function getCachedRoute(from: string, to: string): Promise<AlternativeRoute[] | null> {
  if (!cacheAvailable()) return null
  try {
    const cache = await caches.open(ROUTE_CACHE)
    const resp = await cache.match(`${from}-${to}`)
    if (!resp) return null
    return await resp.json() as AlternativeRoute[]
  } catch { return null }
}
