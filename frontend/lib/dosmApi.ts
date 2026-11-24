import type { TransitIncident, TransitStation } from './transitData'
import { fetchStationCatalog } from './stationCatalog'

/** Compatibility wrapper for existing consumers; the catalogue comes from the network API. */
export async function fetchStationsFromDosm(): Promise<TransitStation[]> {
  return (await fetchStationCatalog()).stations
}

// data.gov.my currently publishes vehicle positions, not a verified service-alert feed.
// Empty means unavailable here, never "all services normal". Consumers must disclose this.
export async function fetchIncidents(): Promise<TransitIncident[]> {
  return []
}
