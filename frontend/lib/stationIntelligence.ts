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
  const h = new Date().getHours()
  const isPeakHour = (h >= 7 && h <= 9) || (h >= 17 && h <= 20)
  const crowdLabel =
    crowdScore < 35 ? 'Calm' : crowdScore < 60 ? 'Moderate' : crowdScore < 80 ? 'Busy' : 'Critical'

  return {
    id: stationId, name: stationName, crowdScore, crowdLabel, isPeakHour,
    peakWarning: isPeakHour ? 'Platforms will be congested. Consider waiting 1–2 trains for a seat.' : undefined,
    facilities: [
      { type: 'lift', status: 'operational', location: 'Concourse → Platform' },
      { type: 'escalator', status: 'operational', location: 'Main Entrance' },
      { type: 'toilet', status: 'operational', location: 'Level 2, near ticketing' },
      { type: 'atm', status: 'operational', location: 'Ground Floor' },
      { type: 'convenience', status: 'operational', location: 'Concourse Level' },
      { type: 'parking', status: 'maintenance', location: 'Park & Ride Deck' },
    ],
    exits: [
      { exitCode: 'A', description: 'Main Street / Shopping Mall', landmarks: ['Shopping Centre', 'Hotel Lobby'], walkTime: 3 },
      { exitCode: 'B', description: 'Office & Residential Block', landmarks: ['Office Tower', 'Apartments'], walkTime: 5 },
      { exitCode: 'C', description: 'Bus Terminal / Taxi Stand', landmarks: ['RapidKL Stop', 'Grab Pick-up'], walkTime: 2 },
    ],
    nextTrains: [
      { destination: 'City Centre', platform: '1', minutesAway: 2, coaches: 4, occupancy: 'moderate' },
      { destination: 'End Station', platform: '2', minutesAway: 6, coaches: 4, occupancy: 'light' },
      { destination: 'City Centre', platform: '1', minutesAway: 11, coaches: 4, occupancy: 'empty' },
    ],
  }
}
