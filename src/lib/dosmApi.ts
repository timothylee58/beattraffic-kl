import { fallbackStations, type TransitIncident, type TransitStation } from './transitData'

const DOSM_STATIONSET_URL = 'https://storage.data.gov.my/transportation/rapidkl_station.csv'

function csvToStations(csvText: string): TransitStation[] {
  const lines = csvText.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return fallbackStations
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

  return lines.slice(1, 51).map((row, index) => {
    const values = row.split(',')
    const get = (key: string) => values[headers.indexOf(key)]
    return {
      id: get('station_id') || `DOSM-${index}`,
      name: get('station_name') || `Station ${index + 1}`,
      line: (get('line_code') as TransitStation['line']) || 'MRT_PUTRAJAYA',
      lat: Number(get('latitude') || 3.14),
      lon: Number(get('longitude') || 101.69),
      zone: Number(get('fare_zone') || 2),
    }
  })
}

export async function fetchStationsFromDosm(): Promise<TransitStation[]> {
  try {
    const response = await fetch(DOSM_STATIONSET_URL)
    if (!response.ok) throw new Error('DOSM station download failed')
    const rawCsv = await response.text()
    return csvToStations(rawCsv)
  } catch {
    return fallbackStations
  }
}

export async function fetchIncidents(): Promise<TransitIncident[]> {
  // Placeholder for real-time alerts endpoint.
  return [
    {
      id: 'INC-1',
      line: 'LRT_KELANA_JAYA',
      severity: 'medium',
      message: 'Signal delay near Pasar Seni',
      reportedAt: new Date().toISOString(),
    },
  ]
}
