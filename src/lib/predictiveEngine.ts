import type { CrowdForecast, TransitIncident, TransitStation } from './transitData'

const getCrowdLabel = (score: number): CrowdForecast['label'] => {
  if (score < 35) return 'calm'
  if (score < 60) return 'moderate'
  if (score < 80) return 'busy'
  return 'critical'
}

export function predictCrowdLevel(
  station: TransitStation,
  incidents: TransitIncident[],
  currentHour = new Date().getHours(),
): CrowdForecast {
  const rushHourBoost = currentHour >= 7 && currentHour <= 9 ? 22 : currentHour >= 17 && currentHour <= 20 ? 27 : 6
  const cityCenterBoost = station.zone === 1 ? 15 : station.zone === 2 ? 8 : 3
  const incidentBoost = incidents
    .filter((incident) => incident.line === station.line)
    .reduce((sum, incident) => sum + (incident.severity === 'high' ? 18 : incident.severity === 'medium' ? 10 : 4), 0)

  const score = Math.min(100, rushHourBoost + cityCenterBoost + incidentBoost + Math.floor(Math.random() * 20))

  return {
    stationId: station.id,
    line: station.line,
    forecastAt: new Date().toISOString(),
    score,
    label: getCrowdLabel(score),
  }
}
