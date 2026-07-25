export interface GoKLRoute {
  routeId: string
  shortName: string
  longName: string
  color: string
}

export interface GoKLStop {
  stopId: string
  name: string
  lat: number
  lon: number
  routeIds: string[]
}

const DOSM_BASE = 'https://storage.data.gov.my/transportation/'

// Colour palette per GoKL route (best-effort from published maps)
const ROUTE_COLORS: Record<string, string> = {
  U80: '#E31837',
  U81: '#E31837',
  U82: '#E31837',
  U83: '#E31837',
  U84: '#E31837',
  U85: '#E31837',
  U86: '#E31837',
  U87: '#E31837',
  U88: '#E31837',
  U89: '#E31837',
}

function parseGtfsCsv(csv: string): Record<string, string>[] {
  const rows = csv.split('\n').map(r => r.trim()).filter(Boolean)
  if (rows.length < 2) return []
  const headers = rows[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return rows.slice(1).map(row => {
    const vals = row.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').replace(/^"|"$/g, '').trim()]))
  })
}

let routeCache: GoKLRoute[] | null = null
let stopCache: GoKLStop[] | null = null

export async function fetchGoKLRoutes(): Promise<GoKLRoute[]> {
  if (routeCache) return routeCache
  try {
    const res = await fetch(`${DOSM_BASE}gokl_routes.csv`)
    if (!res.ok) throw new Error('not found')
    const rows = parseGtfsCsv(await res.text())
    routeCache = rows.map(r => ({
      routeId: r['route_id'] || r['Route_ID'] || '',
      shortName: r['route_short_name'] || r['Route_Short_Name'] || '',
      longName: r['route_long_name'] || r['Route_Long_Name'] || '',
      color: ROUTE_COLORS[r['route_short_name'] || ''] || '#E31837',
    })).filter(r => r.routeId)
  } catch {
    routeCache = FALLBACK_ROUTES
  }
  return routeCache
}

export async function fetchGoKLStops(): Promise<GoKLStop[]> {
  if (stopCache) return stopCache
  try {
    const res = await fetch(`${DOSM_BASE}gokl_stops.csv`)
    if (!res.ok) throw new Error('not found')
    const rows = parseGtfsCsv(await res.text())
    stopCache = rows.map(r => ({
      stopId: r['stop_id'] || '',
      name: r['stop_name'] || '',
      lat: Number(r['stop_lat'] || 0),
      lon: Number(r['stop_lon'] || 0),
      routeIds: [],
    })).filter(s => s.stopId)
  } catch {
    stopCache = FALLBACK_STOPS
  }
  return stopCache
}

export function findNearbyGoKLStops(lat: number, lon: number, radiusKm = 0.5): GoKLStop[] {
  if (!stopCache) return []
  return stopCache.filter(s => {
    const dLat = (s.lat - lat) * 111
    const dLon = (s.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180)
    return Math.sqrt(dLat * dLat + dLon * dLon) <= radiusKm
  })
}

// ------ Fallback data (major KL city-centre stops) ------
const FALLBACK_ROUTES: GoKLRoute[] = [
  { routeId: 'U80', shortName: 'U80', longName: 'KL Sentral – Masjid Jamek – KLCC', color: '#E31837' },
  { routeId: 'U81', shortName: 'U81', longName: 'KL Sentral – Chow Kit – Titiwangsa', color: '#E31837' },
  { routeId: 'U82', shortName: 'U82', longName: 'KL Sentral – Bukit Bintang – Ampang', color: '#E31837' },
  { routeId: 'U83', shortName: 'U83', longName: 'Masjid Jamek – Chow Kit – Wangsa Maju', color: '#E31837' },
]

const FALLBACK_STOPS: GoKLStop[] = [
  { stopId: 'GK-001', name: 'KL Sentral (GoKL)', lat: 3.1343, lon: 101.6868, routeIds: ['U80', 'U81', 'U82'] },
  { stopId: 'GK-002', name: 'Masjid Jamek (GoKL)', lat: 3.1495, lon: 101.6959, routeIds: ['U80', 'U83'] },
  { stopId: 'GK-003', name: 'KLCC (GoKL)', lat: 3.1578, lon: 101.7123, routeIds: ['U80'] },
  { stopId: 'GK-004', name: 'Bukit Bintang (GoKL)', lat: 3.1472, lon: 101.7117, routeIds: ['U82'] },
  { stopId: 'GK-005', name: 'Chow Kit (GoKL)', lat: 3.1634, lon: 101.6979, routeIds: ['U81', 'U83'] },
  { stopId: 'GK-006', name: 'Titiwangsa (GoKL)', lat: 3.1768, lon: 101.7040, routeIds: ['U81'] },
]
