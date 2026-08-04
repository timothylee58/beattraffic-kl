export interface GtfsStop {
  stop_id: string
  stop_name: string
  stop_lat: number
  stop_lon: number
}

export interface GtfsStopTime {
  trip_id: string
  stop_id: string
  stop_sequence: number
  departure_time: string
}

export interface GtfsTrip {
  trip_id: string
  route_id: string
  shape_id: string
  trip_headsign: string
}

import { cacheGtfsStops, getCachedStops } from './offlineCache'

const BASE = 'https://api.data.gov.my/gtfs-static/prasarana?category='

// in-memory cache per category
const cache: Record<string, { stops: GtfsStop[]; stopTimes: GtfsStopTime[]; trips: GtfsTrip[] }> = {}

async function fetchZip(category: string) {
  if (cache[category]) return cache[category]

  let res: Response
  try {
    res = await fetch(`${BASE}${category}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`GTFS fetch failed: ${res.status}`)
  } catch {
    // Network unavailable — return cached stops if available
    const cached = await getCachedStops()
    if (cached) {
      cache[category] = { stops: cached, stopTimes: [], trips: [] }
      return cache[category]
    }
    throw new Error('GTFS unavailable offline and no cache found')
  }
  const buf = await res.arrayBuffer()

  // Parse the ZIP in-browser using a minimal approach
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buf)

  const readCsv = async (name: string): Promise<Record<string, string>[]> => {
    const file = zip.file(name)
    if (!file) return []
    const text = await file.async('string')
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
    return lines.slice(1).map(line => {
      const vals = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').replace(/^"|"$/g, '').trim()]))
    })
  }

  const [rawStops, rawStopTimes, rawTrips] = await Promise.all([
    readCsv('stops.txt'),
    readCsv('stop_times.txt'),
    readCsv('trips.txt'),
  ])

  const stops: GtfsStop[] = rawStops.map(r => ({
    stop_id: r.stop_id,
    stop_name: r.stop_name,
    stop_lat: Number(r.stop_lat),
    stop_lon: Number(r.stop_lon),
  }))

  const stopTimes: GtfsStopTime[] = rawStopTimes.map(r => ({
    trip_id: r.trip_id,
    stop_id: r.stop_id,
    stop_sequence: Number(r.stop_sequence),
    departure_time: r.departure_time,
  }))

  const trips: GtfsTrip[] = rawTrips.map(r => ({
    trip_id: r.trip_id,
    route_id: r.route_id,
    shape_id: r.shape_id || '',
    trip_headsign: r.trip_headsign || '',
  }))

  cache[category] = { stops, stopTimes, trips }
  // Persist stops for offline use (best-effort)
  cacheGtfsStops(stops).catch(() => {})
  return cache[category]
}

/**
 * Get the ordered stop sequence for a route, identified by matching stop name pairs.
 * Returns stops in travel order from `fromStopName` to `toStopName` (inclusive).
 */
export async function getStopSequence(
  fromStopName: string,
  toStopName: string,
  category = 'rapid-rail-kl',
): Promise<GtfsStop[]> {
  const { stops, stopTimes, trips } = await fetchZip(category)

  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const fromStop = stops.find(s => normalise(s.stop_name).includes(normalise(fromStopName)))
  const toStop = stops.find(s => normalise(s.stop_name).includes(normalise(toStopName)))
  if (!fromStop || !toStop) return []

  // Find a trip that contains both stops in the right order
  const fromEntries = stopTimes.filter(st => st.stop_id === fromStop.stop_id)
  for (const fe of fromEntries) {
    const toEntry = stopTimes.find(
      st => st.trip_id === fe.trip_id && st.stop_id === toStop.stop_id && st.stop_sequence > fe.stop_sequence,
    )
    if (toEntry) {
      // Collect all stops on this trip between from and to (inclusive)
      const segment = stopTimes
        .filter(
          st =>
            st.trip_id === fe.trip_id &&
            st.stop_sequence >= fe.stop_sequence &&
            st.stop_sequence <= toEntry.stop_sequence,
        )
        .sort((a, b) => a.stop_sequence - b.stop_sequence)

      return segment.map(st => stops.find(s => s.stop_id === st.stop_id)!).filter(Boolean)
    }
  }
  return []
}
