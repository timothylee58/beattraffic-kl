import { useState, useEffect } from 'react'
import { Users, RefreshCw, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  heuristicCrowdLabel,
  fetchLineCrowdSummaries,
  CROWD_COLORS,
  CROWD_DOT,
  type CrowdLabel,
  type CrowdPrediction,
} from '../../lib/crowdPrediction'

interface LineSummary {
  code: string
  label: string
  color: string
  stations: StationSummary[]
}

interface StationSummary {
  id: string
  name: string
  crowdLabel: CrowdLabel
  crowd_level: number
}

const LINES: { code: string; label: string; color: string; stations: { id: string; name: string }[] }[] = [
  {
    code: 'MRT_KAJANG',
    label: 'MRT Kajang',
    color: '#E91E8C',
    stations: [
      { id: 'MK01', name: 'Kwasa Damansara' },
      { id: 'MK03', name: 'Damansara Damai' },
      { id: 'MK08', name: 'Semantan' },
      { id: 'MK11', name: 'Muzium Negara' },
      { id: 'MK12', name: 'Pasar Seni' },
      { id: 'MK14', name: 'Tun Razak Exchange' },
      { id: 'MK17', name: 'Cochrane' },
      { id: 'MK26', name: 'Kajang' },
    ],
  },
  {
    code: 'MRT_PUTRAJAYA',
    label: 'MRT Putrajaya',
    color: '#00A550',
    stations: [
      { id: 'PY01', name: 'Kwasa Sentral' },
      { id: 'PY07', name: 'Damansara Utama' },
      { id: 'PY15', name: 'Precinct 9' },
      { id: 'PY16', name: 'Putrajaya Sentral' },
    ],
  },
  {
    code: 'LRT_KELANA_JAYA',
    label: 'LRT Kelana Jaya',
    color: '#E31837',
    stations: [
      { id: 'KJ01', name: 'Putra Heights' },
      { id: 'KJ10', name: 'Asia Jaya' },
      { id: 'KJ13', name: 'Bangsar' },
      { id: 'KJ15', name: 'KL Sentral' },
      { id: 'KJ16', name: 'Masjid Jamek' },
      { id: 'KJ20', name: 'KLCC' },
      { id: 'KJ28', name: 'Kelana Jaya' },
    ],
  },
  {
    code: 'LRT_AMPANG',
    label: 'LRT Ampang',
    color: '#F5821F',
    stations: [
      { id: 'AG01', name: 'Sentul' },
      { id: 'AG06', name: 'Titiwangsa' },
      { id: 'AG07', name: 'PWTC' },
      { id: 'AG08', name: 'Masjid Jamek' },
      { id: 'AG12', name: 'Ampang' },
    ],
  },
  {
    code: 'MONORAIL',
    label: 'KL Monorail',
    color: '#8B1C62',
    stations: [
      { id: 'MR1', name: 'KL Sentral' },
      { id: 'MR3', name: 'Hang Tuah' },
      { id: 'MR4', name: 'Maharajalela' },
      { id: 'MR6', name: 'Bukit Bintang' },
      { id: 'MR9', name: 'Titiwangsa' },
    ],
  },
  {
    code: 'KTM_KOMUTER',
    label: 'KTM Komuter',
    color: '#003087',
    stations: [
      { id: 'KTM01', name: 'KL Sentral' },
      { id: 'KTM03', name: 'Bank Negara' },
      { id: 'KTM05', name: 'Kuala Lumpur' },
      { id: 'KTM07', name: 'Pudu' },
    ],
  },
]

function crowdBar(level: number) {
  const pct = Math.min(100, Math.round(level * 100))
  const color = level > 0.66 ? 'bg-red-500' : level > 0.33 ? 'bg-yellow-400' : 'bg-green-500'
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden w-16">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function CrowdHeatmap() {
  const now = new Date()
  const defaultLabel = heuristicCrowdLabel(now.getHours(), now.getDay())

  const [lines, setLines] = useState<LineSummary[]>(() =>
    LINES.map(l => ({
      ...l,
      stations: l.stations.map(s => ({
        ...s,
        crowdLabel: defaultLabel,
        crowd_level: defaultLabel === 'High' ? 0.85 : defaultLabel === 'Moderate' ? 0.5 : 0.2,
      })),
    }))
  )
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    const predictions = await fetchLineCrowdSummaries()
    setLines(prev =>
      prev.map(l => ({
        ...l,
        stations: l.stations.map(s => {
          const pred = predictions?.find(p => p.lineId === l.code && p.stationId === s.id)
          if (pred) {
            return { ...s, crowdLabel: pred.label, crowd_level: pred.crowd_level }
          }
          return s
        }),
      }))
    )
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 5 * 60_000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Users className="h-6 w-6" />
          Platform Crowd Heatmap
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs font-medium">
        {(['Low', 'Moderate', 'High'] as CrowdLabel[]).map(lbl => (
          <span key={lbl} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${CROWD_DOT[lbl]}`} />
            {lbl}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {lines.map(line => {
          const dominant = line.stations.reduce<Record<CrowdLabel, number>>(
            (acc, s) => { acc[s.crowdLabel]++; return acc },
            { Low: 0, Moderate: 0, High: 0 }
          )
          const lineLabel: CrowdLabel =
            dominant.High > 0 ? 'High' : dominant.Moderate > line.stations.length / 2 ? 'Moderate' : 'Low'
          const isOpen = expanded === line.code

          return (
            <Card key={line.code} className="overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setExpanded(isOpen ? null : line.code)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
                      <CardTitle className="text-sm font-semibold">{line.label}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs border ${CROWD_COLORS[lineLabel]}`}>{lineLabel}</Badge>
                      <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isOpen && (
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {line.stations.map(s => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${CROWD_COLORS[s.crowdLabel]}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${CROWD_DOT[s.crowdLabel]}`} />
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {crowdBar(s.crowd_level)}
                          <span className="text-xs opacity-75 w-8 text-right">
                            {Math.round(s.crowd_level * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Crowd levels are ML predictions updated every 5 min. Heuristic fallback used when model is offline.
      </p>
    </div>
  )
}
