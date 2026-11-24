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

/** No verified arrival feed is connected. Vehicle positions are not arrival predictions. */
export async function fetchNearbyBuses(_stationId: string): Promise<BusStop[]> {
  void _stationId
  return []
}
