import { klNow } from './dates'
export type FacilityType = 'lift' | 'escalator' | 'toilet' | 'atm' | 'convenience' | 'parking' | 'mspa'
export type FacilityStatus = 'operational' | 'maintenance' | 'out_of_service'

export interface StationFacility {
  type: FacilityType
  status: FacilityStatus
  location: string
}

export interface ExitGuide {
  exitCode: string
  description: string
  landmarks: string[]
  walkTime: number
}

export interface NextTrain {
  destination: string
  platform: string
  minutesAway: number
  coaches: number
  occupancy: 'empty' | 'light' | 'moderate' | 'full'
}

export interface StationDetails {
  id: string
  name: string
  facilities: StationFacility[]
  exits: ExitGuide[]
  nextTrains: NextTrain[]
  crowdScore: number
  crowdLabel: string
  isPeakHour: boolean
  peakWarning?: string
}

export function getStationDetails(
  stationId: string,
  stationName: string,
  crowdScore: number,
): StationDetails {
  const h = klNow().hour
  const isPeakHour = (h >= 7 && h <= 9) || (h >= 17 && h <= 20)
  const crowdLabel =
    crowdScore < 35 ? 'Calm' : crowdScore < 60 ? 'Moderate' : crowdScore < 80 ? 'Busy' : 'Critical'

  return {
    id: stationId, name: stationName, crowdScore, crowdLabel, isPeakHour,
    peakWarning: isPeakHour ? 'Typical peak travel period. Live platform occupancy is unavailable.' : undefined,
    facilities: [],
    exits: [],
    nextTrains: [],
  }
}
