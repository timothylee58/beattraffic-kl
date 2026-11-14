export interface ModalCostResult {
  trainFare: number
  trainWalkMinutes: number
  grabEstimate: number
  grabSurge: boolean
  distanceKm: number
}

// KL average walking speed: 5 km/h → 12 min/km
const WALK_SPEED_MIN_PER_KM = 12

// Grab KL heuristic: RM 3 base + RM 1.50/km + surge during peak
const GRAB_BASE = 3.0
const GRAB_PER_KM = 1.5
const GRAB_SURGE_MULTIPLIER = 1.3

function isPeakHour(hour: number, dow: number): boolean {
  const isWeekend = dow === 0 || dow === 6
  return !isWeekend && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19))
}

/**
 * Estimate modal cost comparison between train and Grab.
 * distanceKm is the straight-line distance between the two station coordinates.
 * walkKm is the last-mile walking distance (defaults to 0.4 km if not provided).
 */
export function estimateModalCost(
  trainFare: number,
  distanceKm: number,
  walkKm = 0.4,
): ModalCostResult {
  const now = new Date()
  const hour = now.getHours()
  const dow = now.getDay()
  const surge = isPeakHour(hour, dow)

  const grabRaw = GRAB_BASE + distanceKm * GRAB_PER_KM
  const grabEstimate = Math.round((surge ? grabRaw * GRAB_SURGE_MULTIPLIER : grabRaw) * 10) / 10

  const trainWalkMinutes = Math.round(walkKm * WALK_SPEED_MIN_PER_KM)

  return {
    trainFare,
    trainWalkMinutes,
    grabEstimate,
    grabSurge: surge,
    distanceKm,
  }
}

/**
 * Haversine distance in km between two lat/lon points.
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
