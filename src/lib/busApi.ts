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

export async function fetchNearbyBuses(stationId: string): Promise<BusStop[]> {
  await new Promise(r => setTimeout(r, 200))
  return STATION_BUS_DATA[stationId] ?? [{
    id: 'BS-00', name: 'Nearest Bus Stop', distance: 200,
    routes: [
      { routeNumber: 'T780', destination: 'City Centre', nextArrival: 8, operator: 'RapidKL', platform: 'A1' },
      { routeNumber: 'BAS001', destination: 'Terminal Bersepadu Selatan', nextArrival: 15, operator: 'BAS.MY', platform: 'B1' },
    ],
  }]
}
