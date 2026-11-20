import { fallbackStations, type TransitStation, type TransitLineCode } from './transitData'

export interface StationCatalog {
  stations: TransitStation[]
  source: 'network' | 'cache' | 'fallback'
  approximate: boolean
  updatedAt: string | null
}

const KEY = 'beattraffic-station-catalog-v1'
const LINES = new Set<TransitLineCode>(['MRT_PUTRAJAYA', 'MRT_KAJANG', 'LRT_KELANA_JAYA', 'LRT_AMPANG', 'LRT_SRI_PETALING', 'MONORAIL', 'BRT_SUNWAY', 'KTM_KOMUTER'])
let memory: StationCatalog | null = null
let pending: Promise<StationCatalog> | null = null
let checkedAt = 0

function stationsFrom(value: unknown): TransitStation[] {
  if (!Array.isArray(value)) throw new Error('Invalid station catalogue')
  const seen = new Set<string>()
  return value.map((row: Record<string, unknown>) => {
    const line = (Array.isArray(row.lines) ? row.lines[0] : row.line) as TransitLineCode
    if (typeof row.id !== 'string' || !row.id.trim() || typeof row.name !== 'string' || !row.name.trim() ||
        !LINES.has(line) || typeof row.lat !== 'number' || !Number.isFinite(row.lat) || Math.abs(row.lat) > 90 ||
        typeof row.lon !== 'number' || !Number.isFinite(row.lon) || Math.abs(row.lon) > 180 || seen.has(row.id)) {
      throw new Error('Invalid station record')
    }
    seen.add(row.id)
    const known = fallbackStations.find(s => s.name.toLowerCase() === row.name!.toString().toLowerCase())
    return { id: row.id, name: row.name, line, lat: row.lat, lon: row.lon,
      // No fare zones are supplied by /network. This is an estimate, never an operator quote.
      zone: typeof row.zone === 'number' && [1, 2, 3].includes(row.zone) ? row.zone : known?.zone ?? 2 }
  })
}

function savedCatalog(): StationCatalog | null {
  if (memory?.source !== 'fallback' && memory) return { ...memory, source: 'cache' }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))) return null
    const stations = stationsFrom(raw.stations)
    return stations.length ? { stations, source: 'cache', approximate: raw.approximate !== false, updatedAt: raw.updatedAt } : null
  } catch { return null }
}

/** One catalogue for the dashboard, planner, map and station deep links. Never stores private user data. */
export async function fetchStationCatalog(force = false): Promise<StationCatalog> {
  if (pending) return pending
  if (!force && memory && Date.now() - checkedAt < 30_000) return memory
  pending = (async () => {
    try {
      // Reuse the existing same-origin network API instead of the nonexistent DOSM station CSV.
      const res = await fetch('/api/transit/network', { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      if (!res.ok) throw new Error('Station catalogue unavailable')
      const body = await res.json()
      const stations = stationsFrom(body.stations)
      if (!stations.length) throw new Error('Empty station catalogue')
      memory = { stations, source: 'network', approximate: body.approximate !== false, updatedAt: new Date().toISOString() }
      try { localStorage.setItem(KEY, JSON.stringify(memory)) } catch { /* storage may be disabled */ }
    } catch {
      memory = savedCatalog() ?? { stations: fallbackStations, source: 'fallback', approximate: true, updatedAt: null }
    }
    checkedAt = Date.now()
    return memory!
  })()
  try { return await pending } finally { pending = null }
}

export function findStation(stations: TransitStation[], id: string): TransitStation | undefined {
  const direct = stations.find(s => s.id === id)
  if (direct) return direct
  // Preserve old links when the canonical catalogue uses a different ID for the same station.
  const legacy = fallbackStations.find(s => s.id === id)
  return legacy && stations.find(s => s.name.toLowerCase() === legacy.name.toLowerCase())
}

export function catalogDescription(catalog: StationCatalog): string {
  if (catalog.source === 'fallback') return 'Sample station list — network unavailable; limited coverage.'
  if (catalog.source === 'cache') return 'Cached station list — connection unavailable; data may be stale.'
  return catalog.approximate ? 'Approximate network catalogue — station coverage is limited.' : 'Network station catalogue.'
}
