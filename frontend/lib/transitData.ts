export type TransitLineCode =
  | 'MRT_PUTRAJAYA'
  | 'MRT_KAJANG'
  | 'LRT_KELANA_JAYA'
  | 'LRT_AMPANG'
  | 'LRT_SRI_PETALING'
  | 'MONORAIL'
  | 'BRT_SUNWAY'
  | 'KTM_KOMUTER'

export interface TransitStation {
  id: string
  name: string
  line: TransitLineCode
  lat: number
  lon: number
  zone: number
}

export interface TransitIncident {
  id: string
  line: TransitLineCode
  severity: 'low' | 'medium' | 'high'
  message: string
  reportedAt: string
}

export interface CrowdForecast {
  stationId: string
  line: TransitLineCode
  forecastAt: string
  score: number
  label: 'calm' | 'moderate' | 'busy' | 'critical'
}

export const fallbackStations: TransitStation[] = [
  { id: 'MRT01', name: 'Kwasa Damansara', line: 'MRT_PUTRAJAYA', lat: 3.2059, lon: 101.5726, zone: 3 },
  { id: 'MRT14', name: 'Tun Razak Exchange', line: 'MRT_PUTRAJAYA', lat: 3.1428, lon: 101.7197, zone: 1 },
  { id: 'KJ16', name: 'KL Sentral', line: 'LRT_KELANA_JAYA', lat: 3.1343, lon: 101.6868, zone: 1 },
  { id: 'AG8', name: 'Masjid Jamek', line: 'LRT_AMPANG', lat: 3.1495, lon: 101.6959, zone: 1 },
  { id: 'MR6', name: 'Bukit Bintang', line: 'MONORAIL', lat: 3.1472, lon: 101.7117, zone: 1 },
]
