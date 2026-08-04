export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

export const KL_CENTER = { lat: 3.1390, lng: 101.6869 }

export const CROWD_MARKER_COLORS: Record<string, string> = {
  calm: '#22c55e',      // green-500
  moderate: '#eab308',  // yellow-500
  busy: '#f97316',      // orange-500
  critical: '#ef4444',  // red-500
}
