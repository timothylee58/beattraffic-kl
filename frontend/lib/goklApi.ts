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

// No verified GoKL feed is configured. Do not use invented CSV URLs or route samples.
export async function fetchGoKLRoutes(): Promise<GoKLRoute[]> { return [] }
export async function fetchGoKLStops(): Promise<GoKLStop[]> { return [] }
export function findNearbyGoKLStops(_lat: number, _lon: number, _radiusKm = 0.5): GoKLStop[] { void _lat; void _lon; void _radiusKm; return [] }
