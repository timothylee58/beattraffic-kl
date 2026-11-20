"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, ChevronRight, Database, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Reveal } from '../motion/Reveal'
import { AnimatedCounter } from '../motion/AnimatedCounter'
import { fetchStationCatalog, catalogDescription, type StationCatalog } from '../../lib/stationCatalog'
import { predictCrowdLevel } from '../../lib/predictiveEngine'
import type { CrowdForecast, TransitStation } from '../../lib/transitData'

const LABEL_GLOW: Record<string, string> = {
  calm: 'text-emerald-600 bg-emerald-500/10',
  moderate: 'text-amber-600 bg-amber-500/10',
  busy: 'text-orange-600 bg-orange-500/10',
  critical: 'text-destructive bg-destructive/10',
}

export function TransitIntelligencePanel() {
  const [stations, setStations] = useState<TransitStation[]>([])
  const [forecasts, setForecasts] = useState<CrowdForecast[]>([])
  const [catalog, setCatalog] = useState<StationCatalog | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let running = false
    const load = async () => {
      if (running) return
      running = true
      try {
        const data = await fetchStationCatalog(true)
        if (cancelled) return
        setCatalog(data)
        setStations(data.stations)
        const next = await Promise.all(data.stations.slice(0, 5).map(station => predictCrowdLevel(station, [])))
        if (!cancelled) {
          setForecasts(next)
          setUpdatedAt(new Date().toISOString())
        }
      } catch {
        if (!cancelled) { setForecasts([]); setUpdatedAt(null) }
      } finally {
        running = false
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const interval = setInterval(() => { void load() }, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const criticalCount = useMemo(
    () => forecasts.filter((forecast) => forecast.label === 'critical' || forecast.label === 'busy').length,
    [forecasts],
  )

  return (
    <section className="container pb-12 space-y-4 pt-10">
      <Reveal>
        <h2 className="text-2xl font-bold text-primary">Transit Intelligence</h2>
      </Reveal>
      <div role="status" className="text-sm text-muted-foreground space-y-1">
        <p>{catalog ? catalogDescription(catalog) : 'Loading station catalogue…'}</p>
        <p>Crowd estimates are not live occupancy measurements. Live incident feed unavailable.</p>
        {updatedAt && <p>Estimates refreshed <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</time> MYT. Showing {forecasts.length} stations.</p>}
        {catalog?.updatedAt && <p>Catalogue retrieved {new Date(catalog.updatedAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT.</p>}
        {loading && <p>Loading crowd estimates…</p>}
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        <Reveal delay={0}>
          <MetricCard icon={<Database className="h-4 w-4" />} label="Stations Available" value={stations.length} accent="from-primary/15 to-primary/5" />
        </Reveal>
        <Reveal delay={0.06}>
          <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Live Incidents" value="Unavailable" accent="from-destructive/15 to-destructive/5" />
        </Reveal>
        <Reveal delay={0.12}>
          <MetricCard icon={<Users className="h-4 w-4" />} label="High Crowd Estimates" value={criticalCount} accent="from-accent/25 to-accent/5" />
        </Reveal>
        <Reveal delay={0.18}>
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Refresh Interval" value={60} suffix=" secs" accent="from-emerald-500/15 to-emerald-500/5" />
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <Card className="overflow-hidden border-primary/10 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Station Crowd Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecasts.map((forecast) => (
                <Link
                  key={forecast.stationId}
                  href={`/station/${encodeURIComponent(forecast.stationId)}`}
                  className="flex items-center justify-between rounded-xl border p-3 hover:bg-secondary/50 hover:border-primary/30 transition-all group"
                >
                  <div>
                    <p className="font-semibold">{stations.find((station) => station.id === forecast.stationId)?.name ?? forecast.stationId}</p>
                    <p className="text-xs text-muted-foreground">{forecast.line} · {forecast.source === 'heuristic' ? 'Heuristic estimate' : 'Model estimate'}</p>
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

function MetricCard({ icon, label, value, suffix = '', accent }: { icon: React.ReactNode; label: string; value: number | string; suffix?: string; accent: string }) {
  return (
    <Card className={`relative overflow-hidden border-border/60 hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-70`} />
      <CardContent className="relative pt-6 space-y-2">
        <div className="text-primary bg-white/70 backdrop-blur-sm w-fit p-1.5 rounded-lg">{icon}</div>
        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">{label}</p>
        <p className="text-2xl font-bold">
          {typeof value === 'number' ? <AnimatedCounter value={value} suffix={suffix} /> : value}
        </p>
      </CardContent>
    </Card>
  )
}
