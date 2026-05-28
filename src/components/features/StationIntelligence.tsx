import { useEffect, useState } from 'react'
import { Train, Bus, DoorOpen, Settings, Clock, AlertTriangle, Users, Navigation, CheckCircle2, Wrench, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { getStationDetails } from '../../lib/stationIntelligence'
import { fetchNearbyBuses } from '../../lib/busApi'
import type { StationDetails, StationFacility } from '../../lib/stationIntelligence'
import type { BusStop } from '../../lib/busApi'

const FACILITY_ICONS: Record<string, React.ReactNode> = {
  lift: <Navigation className="h-4 w-4" />,
  escalator: <Navigation className="h-4 w-4 rotate-45" />,
  toilet: <Settings className="h-4 w-4" />,
  atm: <Settings className="h-4 w-4" />,
  convenience: <Settings className="h-4 w-4" />,
  parking: <Settings className="h-4 w-4" />,
  mspa: <Settings className="h-4 w-4" />,
}

const FACILITY_LABELS: Record<string, string> = {
  lift: 'Lift', escalator: 'Escalator', toilet: 'Toilet',
  atm: 'ATM', convenience: 'Convenience Store', parking: 'Parking', mspa: 'mSPa',
}

const STATUS_ICON = (s: StationFacility['status']) =>
  s === 'operational'
    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
    : s === 'maintenance'
      ? <Wrench className="h-3.5 w-3.5 text-yellow-600" />
      : <XCircle className="h-3.5 w-3.5 text-red-600" />

const OCCUPANCY_LABELS = {
  empty: { label: 'Empty', color: 'text-green-600' },
  light: { label: 'Light', color: 'text-green-500' },
  moderate: { label: 'Moderate', color: 'text-yellow-600' },
  full: { label: 'Full', color: 'text-red-600' },
}

const CROWD_COLOR = (score: number) =>
  score < 35 ? 'text-green-600' : score < 60 ? 'text-yellow-600' : score < 80 ? 'text-orange-600' : 'text-red-600'

interface Props {
  stationId: string
  stationName: string
  crowdScore: number
}

export function StationIntelligence({ stationId, stationName, crowdScore }: Props) {
  const [details, setDetails] = useState<StationDetails | null>(null)
  const [buses, setBuses] = useState<BusStop[]>([])

  useEffect(() => {
    setDetails(getStationDetails(stationId, stationName, crowdScore))
    fetchNearbyBuses(stationId).then(setBuses)
  }, [stationId, stationName, crowdScore])

  if (!details) return null

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{details.name}</h2>
            <p className="text-primary-foreground/70 text-sm">{stationId}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${CROWD_COLOR(details.crowdScore)} bg-white rounded-xl px-3 py-1`}>
              {details.crowdScore}
            </p>
            <p className="text-xs text-primary-foreground/70 mt-1">Crowd Score</p>
          </div>
        </div>
        {details.isPeakHour && (
          <div className="flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-300 shrink-0" />
            <span className="text-yellow-100">{details.peakWarning}</span>
          </div>
        )}
      </div>

      {/* Next Trains */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Train className="h-4 w-4 text-primary" />
            Next Trains
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {details.nextTrains.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-2.5">
              <div>
                <p className="font-semibold text-sm">{t.destination}</p>
                <p className="text-xs text-muted-foreground">Platform {t.platform} · {t.coaches} coaches</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{t.minutesAway} min</p>
                <p className={`text-xs font-medium ${OCCUPANCY_LABELS[t.occupancy].color}`}>
                  {OCCUPANCY_LABELS[t.occupancy].label}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Facilities + Exit Guides side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Facilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {details.facilities.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {FACILITY_ICONS[f.type]}
                  <span className="font-medium">{FACILITY_LABELS[f.type]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {STATUS_ICON(f.status)}
                  <span className="hidden sm:inline">{f.location}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-primary" />
              Exit Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {details.exits.map(exit => (
              <div key={exit.exitCode} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {exit.exitCode}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{exit.description}</p>
                    <p className="text-xs text-muted-foreground">{exit.landmarks.join(' · ')} · {exit.walkTime} min walk</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Nearby Buses (BAS.MY) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bus className="h-4 w-4 text-primary" />
            Nearby Buses
            <span className="text-xs text-muted-foreground font-normal">(BAS.MY + RapidKL)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buses.map(stop => (
            <div key={stop.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{stop.name}</span>
                <span>· {stop.distance}m away</span>
              </div>
              <div className="space-y-1.5">
                {stop.routes.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                        {r.routeNumber}
                      </span>
                      <span>{r.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{r.nextArrival} min</span>
                      <Badge variant="outline" className="text-[10px] h-5">{r.operator}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
