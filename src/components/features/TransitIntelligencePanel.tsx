import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ChevronRight, Database, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { fetchIncidents, fetchStationsFromDosm } from '../../lib/dosmApi'
import { predictCrowdLevel } from '../../lib/predictiveEngine'
import type { CrowdForecast, TransitIncident, TransitStation } from '../../lib/transitData'

export function TransitIntelligencePanel() {
  const [stations, setStations] = useState<TransitStation[]>([])
  const [incidents, setIncidents] = useState<TransitIncident[]>([])
  const [forecasts, setForecasts] = useState<CrowdForecast[]>([])

  useEffect(() => {
    const load = async () => {
      const [stationData, incidentData] = await Promise.all([fetchStationsFromDosm(), fetchIncidents()])
      setStations(stationData)
      setIncidents(incidentData)
      setForecasts(stationData.slice(0, 5).map((station) => predictCrowdLevel(station, incidentData)))
    }

    void load()
  }, [])

  const criticalCount = useMemo(
    () => forecasts.filter((forecast) => forecast.label === 'critical' || forecast.label === 'busy').length,
    [forecasts],
  )

  return (
    <section className="container pb-12 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Real-Time Transit Intelligence</h2>
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard icon={<Database className="h-4 w-4" />} label="Stations Ingested" value={String(stations.length)} />
        <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Live Incidents" value={String(incidents.length)} />
        <MetricCard icon={<Users className="h-4 w-4" />} label="High Crowd Alerts" value={String(criticalCount)} />
        <MetricCard icon={<Activity className="h-4 w-4" />} label="Forecast Window" value="30 mins" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Station Crowd Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forecasts.map((forecast) => (
              <Link
                key={forecast.stationId}
                to={`/station/${forecast.stationId}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-secondary/50 transition-colors group"
              >
                <div>
                  <p className="font-semibold">{stations.find((station) => station.id === forecast.stationId)?.name ?? forecast.stationId}</p>
                  <p className="text-xs text-muted-foreground">{forecast.line}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">{forecast.score}/100</p>
                    <p className="text-xs uppercase text-muted-foreground">{forecast.label}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <div className="text-primary">{icon}</div>
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
