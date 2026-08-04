export interface NearbyBus {
  routeNumber: string
  destination: string
  nextArrival: number
  operator: 'RapidKL' | 'Causeway Link' | 'BAS.MY' | 'Cityliner'
  platform: string
}

export interface BusStop {
  id: string
  name: string
  distance: number
  routes: NearbyBus[]
}

const STATION_BUS_DATA: Record<string, BusStop[]> = {
  KJ16: [{
    id: 'BS-01', name: 'KL Sentral Bus Terminal', distance: 80,
    routes: [
      { routeNumber: 'T780', destination: 'Bangsar', nextArrival: 3, operator: 'RapidKL', platform: 'A1' },
      { routeNumber: 'T103', destination: 'Mid Valley', nextArrival: 7, operator: 'RapidKL', platform: 'A2' },
      { routeNumber: 'U69', destination: 'Chow Kit', nextArrival: 12, operator: 'BAS.MY', platform: 'B1' },
    ],
  }],
  MR6: [{
    id: 'BS-02', name: 'Bukit Bintang Bus Stop', distance: 120,
    routes: [
      { routeNumber: 'T632', destination: 'KLCC', nextArrival: 5, operator: 'RapidKL', platform: 'S1' },
      { routeNumber: 'T612', destination: 'Chow Kit', nextArrival: 11, operator: 'RapidKL', platform: 'S2' },
    ],
  }],
  AG8: [{
    id: 'BS-03', name: 'Masjid Jamek Bus Stop', distance: 60,
    routes: [
      { routeNumber: 'T410', destination: 'KLCC', nextArrival: 4, operator: 'RapidKL', platform: 'A1' },
      { routeNumber: 'BAS002', destination: 'Pasar Seni', nextArrival: 8, operator: 'BAS.MY', platform: 'A2' },
    ],
  }],
}

const DEFAULT_STOP: BusStop = {
  id: 'BS-00', name: 'Nearest Bus Stop', distance: 200,
  routes: [
    { routeNumber: 'T780', destination: 'City Centre', nextArrival: 8, operator: 'RapidKL', platform: 'A1' },
    { routeNumber: 'BAS001', destination: 'Terminal Bersepadu Selatan', nextArrival: 15, operator: 'BAS.MY', platform: 'B1' },
  ],
}

const BASMY_TOKEN = import.meta.env.VITE_BASMY_TOKEN as string | undefined

interface GtfsRtStopTimeUpdate {
  stopId?: string
  departure?: { time?: number }
  arrival?: { time?: number }
}

interface GtfsRtTripUpdate {
  trip?: { routeId?: string; tripHeadsign?: string }
  stopTimeUpdate?: GtfsRtStopTimeUpdate[]
}

interface GtfsRtEntity {
  id: string
  tripUpdate?: GtfsRtTripUpdate
}

async function fetchLiveBusArrivals(stationId: string): Promise<BusStop[]> {
  const url = 'https://api.data.gov.my/gtfs-realtime/trip-updates/prasarana?category=bus'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (BASMY_TOKEN) headers['Authorization'] = `Bearer ${BASMY_TOKEN}`

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`BAS.MY API ${res.status}`)

  // data.gov.my returns GTFS-RT as a JSON envelope: { entity: [...] }
  const json = await res.json() as { entity?: GtfsRtEntity[] }
  const entities = json.entity ?? []

  const now = Math.floor(Date.now() / 1000)
  const routes: NearbyBus[] = []

  for (const entity of entities) {
    const tu = entity.tripUpdate
    if (!tu) continue
    for (const stu of tu.stopTimeUpdate ?? []) {
      if (stu.stopId !== stationId) continue
      const arrivalEpoch = stu.arrival?.time ?? stu.departure?.time
      if (!arrivalEpoch) continue
      const minutesAway = Math.round((arrivalEpoch - now) / 60)
      if (minutesAway < 0 || minutesAway > 60) continue
      routes.push({
        routeNumber: tu.trip?.routeId ?? 'BUS',
        destination: tu.trip?.tripHeadsign ?? 'City',
        nextArrival: minutesAway,
        operator: 'BAS.MY',
        platform: 'A',
      })
    }
  }

  if (routes.length === 0) return STATION_BUS_DATA[stationId] ?? [DEFAULT_STOP]

  return [{
    id: `live-${stationId}`,
    name: 'Live Bus Stop',
    distance: 100,
    routes: routes.slice(0, 5),
  }]
}

export async function fetchNearbyBuses(stationId: string): Promise<BusStop[]> {
  if (!BASMY_TOKEN) {
    await new Promise(r => setTimeout(r, 200))
    return STATION_BUS_DATA[stationId] ?? [DEFAULT_STOP]
  }
  try {
    return await fetchLiveBusArrivals(stationId)
  } catch {
    return STATION_BUS_DATA[stationId] ?? [DEFAULT_STOP]
  }
}
