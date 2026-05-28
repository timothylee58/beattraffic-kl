import type { TransitIncident, TransitLineCode } from './transitData'

export interface LineDelayPrediction {
  line: TransitLineCode
  lineName: string
  estimatedDelay: number
  confidence: number
  cause: string
  severity: 'none' | 'minor' | 'moderate' | 'severe'
  trend: 'improving' | 'stable' | 'worsening'
}

export const LINE_NAMES: Record<TransitLineCode, string> = {
  MRT_PUTRAJAYA: 'MRT Putrajaya Line',
  MRT_KAJANG: 'MRT Kajang Line',
  LRT_KELANA_JAYA: 'LRT Kelana Jaya Line',
  LRT_AMPANG: 'LRT Ampang Line',
  LRT_SRI_PETALING: 'LRT Sri Petaling Line',
  MONORAIL: 'KL Monorail',
  BRT_SUNWAY: 'BRT Sunway',
  KTM_KOMUTER: 'KTM Komuter',
}

export const LINE_COLORS: Record<TransitLineCode, string> = {
  MRT_PUTRAJAYA: 'bg-yellow-400',
  MRT_KAJANG: 'bg-blue-500',
  LRT_KELANA_JAYA: 'bg-red-500',
  LRT_AMPANG: 'bg-orange-500',
  LRT_SRI_PETALING: 'bg-orange-600',
  MONORAIL: 'bg-pink-500',
  BRT_SUNWAY: 'bg-teal-500',
  KTM_KOMUTER: 'bg-indigo-500',
}

export function predictLineDelays(
  incidents: TransitIncident[],
  currentHour = new Date().getHours(),
): LineDelayPrediction[] {
  const lines: TransitLineCode[] = [
    'MRT_PUTRAJAYA', 'MRT_KAJANG', 'LRT_KELANA_JAYA',
    'LRT_AMPANG', 'LRT_SRI_PETALING', 'MONORAIL', 'KTM_KOMUTER',
  ]
  const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 20)

  return lines.map(line => {
    const lineIncidents = incidents.filter(i => i.line === line)
    const incidentDelay = lineIncidents.reduce(
      (sum, i) => sum + (i.severity === 'high' ? 12 : i.severity === 'medium' ? 6 : 2),
      0,
    )
    const rushBoost = isRushHour ? 2 + Math.floor(Math.random() * 4) : 0
    const estimatedDelay = Math.min(30, incidentDelay + rushBoost)

    const cause =
      lineIncidents.length > 0
        ? lineIncidents[0].message
        : isRushHour ? 'High passenger volume during peak hours' : 'Normal operations'

    const severity: LineDelayPrediction['severity'] =
      estimatedDelay === 0 ? 'none' : estimatedDelay < 5 ? 'minor' : estimatedDelay < 12 ? 'moderate' : 'severe'

    const trendOptions: LineDelayPrediction['trend'][] = ['improving', 'stable', 'worsening']
    const trend = estimatedDelay === 0 ? 'stable' : trendOptions[Math.floor(Math.random() * 3)]

    return {
      line, lineName: LINE_NAMES[line], estimatedDelay,
      confidence: Math.max(55, 92 - estimatedDelay * 2),
      cause, severity, trend,
    }
  })
}
