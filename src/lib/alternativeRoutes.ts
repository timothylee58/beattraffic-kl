export interface AlternativeRoute {
  id: string
  label: string
  mode: 'rail' | 'bus' | 'mixed'
  duration: number
  transfers: number
  reliability: number
  via: string[]
  fare: number
  isRecommended?: boolean
}

const TEMPLATES: AlternativeRoute[] = [
  {
    id: 'alt-rail-swap',
    label: 'Alternate Rail Line',
    mode: 'rail',
    duration: 18,
    transfers: 2,
    reliability: 88,
    via: ['Masjid Jamek', 'Dang Wangi'],
    fare: 3.20,
    isRecommended: true,
  },
  {
    id: 'alt-bus-bridge',
    label: 'Bus Bridge (RapidKL)',
    mode: 'bus',
    duration: 25,
    transfers: 1,
    reliability: 72,
    via: ['KL Sentral Bus Terminal'],
    fare: 2.00,
  },
  {
    id: 'alt-express-walk',
    label: 'Express Bus + Walk',
    mode: 'mixed',
    duration: 30,
    transfers: 0,
    reliability: 65,
    via: ['Jalan Ampang Express'],
    fare: 1.50,
  },
]

export function getAlternativeRoutes(delayMinutes: number): AlternativeRoute[] {
  if (delayMinutes < 5) return []
  return TEMPLATES
}
