import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ChevronRight, Database, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Reveal } from '../motion/Reveal'
import { AnimatedCounter } from '../motion/AnimatedCounter'
import { fetchIncidents, fetchStationsFromDosm } from '../../lib/dosmApi'
import { predictCrowdLevel } from '../../lib/predictiveEngine'
import {
  CROWD_COLORS, CROWD_DOT, heuristicCrowdLabel,
  fetchLineCrowdSummaries, type CrowdPrediction,
} from '../../lib/crowdPrediction'
import type { CrowdForecast, TransitIncident, TransitStation } from '../../lib/transitData'

const LABEL_GLOW: Record<string, string> = {
  calm: 'text-emerald-600 bg-emerald-500/10',
  moderate: 'text-amber-600 bg-amber-500/10',
  busy: 'text-orange-600 bg-orange-500/10',
  critical: 'text-destructive bg-destructive/10',
}

export function TransitIntelligencePanel() {
  const [stations, setStations] = useState<TransitStation[]>([])
  const [incidents, setIncidents] = useState<TransitIncident[]>([])
  const [forecasts, setForecasts] = useState<CrowdForecast[]>([])
  const [mlCrowd, setMlCrowd] = useState<CrowdPrediction[]>([])

  useEffect(() => {
    const load = async () => {
      const [stationData, incidentData, mlData] = await Promise.all([
        fetchStationsFromDosm(),
        fetchIncidents(),
        fetchLineCrowdSummaries(),
      ])
      setStations(stationData)
      setIncidents(incidentData)
      setForecasts(await Promise.all(stationData.slice(0, 5).map((station) => predictCrowdLevel(station, incidentData))))
      if (mlData) setMlCrowd(mlData)
    }

    void load()
  }, [])

  const criticalCount = useMemo(
    () => forecasts.filter((forecast) => forecast.label === 'critical' || forecast.label === 'busy').length,
    [forecasts],
  )

  return (
    <section className="container pb-12 space-y-4 pt-10">
      <Reveal>
        <h2 className="text-2xl font-bold text-primary">Real-Time Transit Intelligence</h2>
      </Reveal>
      <div className="grid md:grid-cols-4 gap-4">
        <Reveal delay={0}>
          <MetricCard icon={<Database className="h-4 w-4" />} label="Stations Ingested" value={stations.length} accent="from-primary/15 to-primary/5" />
        </Reveal>
        <Reveal delay={0.06}>
          <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Live Incidents" value={incidents.length} accent="from-destructive/15 to-destructive/5" />
        </Reveal>
        <Reveal delay={0.12}>
          <MetricCard icon={<Users className="h-4 w-4" />} label="High Crowd Alerts" value={criticalCount} accent="from-accent/25 to-accent/5" />
        </Reveal>
        <Reveal delay={0.18}>
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Forecast Window" value={30} suffix=" mins" accent="from-emerald-500/15 to-emerald-500/5" />
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <Card className="overflow-hidden border-primary/10 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Station Crowd Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecasts.map((forecast) => (
                <Link
                  key={forecast.stationId}
                  to={`/station/${forecast.stationId}`}
                  className="flex items-center justify-between rounded-xl border p-3 hover:bg-secondary/50 hover:border-primary/30 transition-all group"
                >
                  <div>
                    <p className="font-semibold">{stations.find((station) => station.id === forecast.stationId)?.name ?? forecast.stationId}</p>
                    <p className="text-xs text-muted-foreground">{forecast.line}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{forecast.score}/100</p>
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${LABEL_GLOW[forecast.label] ?? 'text-muted-foreground bg-muted'}`}>
                        {forecast.label}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </section>
  )
}

function MetricCard({ icon, label, value, suffix = '', accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent: string }) {
  return (
    <Card className={`relative overflow-hidden border-border/60 hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-70`} />
      <CardContent className="relative pt-6 space-y-2">
        <div className="text-primary bg-white/70 backdrop-blur-sm w-fit p-1.5 rounded-lg">{icon}</div>
        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">{label}</p>
        <p className="text-2xl font-bold">
          <AnimatedCounter value={value} suffix={suffix} />
        </p>
      </CardContent>
    </Card>
  )
}
