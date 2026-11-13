import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Clock, Footprints, Loader2, Repeat, Train, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RouteMap } from '@/components/features/RouteMap'
import {
  fetchNetwork, fetchNotices, replan,
  type Network, type PlannedRoute, type ReplanAnswer, type ServiceNotice,
} from '@/lib/transitApi'

const AUTO = '__auto__'
const NONE = '__none__'
const EVENT_STATIONS = ['klcc', 'ampang_park', 'persiaran_klcc']
const DEFAULT_QUESTION = 'the line is down, how do I still get to KLCC by 9am?'

const CROWD_STYLE: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Moderate: 'bg-amber-100 text-amber-900 border-amber-300',
  High: 'bg-red-100 text-red-900 border-red-300',
}

function nextWeekday(): string {
  const d = new Date()
  do d.setDate(d.getDate() + 1); while ([0, 6].includes(d.getDay()))
  return d.toISOString().slice(0, 10)
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kuala_Lumpur' })

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function RouteCard({ route, selected, onSelect }: { route: PlannedRoute; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${selected ? 'border-primary bg-secondary/60' : 'hover:bg-muted/50'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Route {route.rank}{route.rank === 1 ? ' · recommended' : ''}</span>
        <div className="flex items-center gap-2">
          {route.crowd_level && (
            <Badge variant="outline" className={CROWD_STYLE[route.crowd_level]}>
              <Users className="mr-1 h-3 w-3" aria-hidden /> Crowd: {route.crowd_level}
            </Badge>
          )}
          <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" aria-hidden />{route.total_minutes} min</Badge>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Leave by <strong className="text-foreground">{hhmm(route.depart_by)}</strong> to arrive by {hhmm(route.arrive_by)} · {route.transfers} transfer{route.transfers === 1 ? '' : 's'}
        {route.crowd_p_high !== undefined && <> · worst-station high-crowd probability {route.crowd_p_high}</>}
      </p>
      <ol className="mt-3 space-y-1.5">
        {route.legs.map((l, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {l.mode === 'rail' && <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} aria-hidden />}
            {l.mode === 'walk' && <Footprints className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
            {l.mode === 'transfer' && <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span>
              {l.mode === 'rail' && <>{l.line}: {l.from} → {l.to} <span className="text-muted-foreground">({l.minutes} min + {l.wait_minutes} wait)</span></>}
              {l.mode === 'walk' && <>Walk {l.from} → {l.to} <span className="text-muted-foreground">({l.minutes} min)</span></>}
              {l.mode === 'transfer' && <>Change at {l.from} <span className="text-muted-foreground">({l.minutes} min)</span></>}
            </span>
          </li>
        ))}
      </ol>
    </button>
  )
}

export default function DisruptionPage() {
  const [network, setNetwork] = useState<Network | null>(null)
  const [notices, setNotices] = useState<ServiceNotice[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [origin, setOrigin] = useState('pasar_seni')
  const [destination, setDestination] = useState('klcc')
  const [time, setTime] = useState('09:00')
  const [disruption, setDisruption] = useState(AUTO)
  const [question, setQuestion] = useState(DEFAULT_QUESTION)
  const [eventCrowd, setEventCrowd] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<ReplanAnswer | null>(null)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    Promise.all([fetchNetwork(), fetchNotices()])
      .then(([n, c]) => { setNetwork(n); setNotices(c.notices) })
      .catch(e => setLoadError(e.message))
  }, [])

  const stations = useMemo(() => [...(network?.stations ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [network])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const destName = stations.find(s => s.id === destination)?.name ?? destination
      const body = {
        origin, destination,
        arrive_by: `${nextWeekday()}T${time}:00+08:00`,
        question: disruption === AUTO ? question : `fastest way to ${destName}?`,
        ...(disruption !== AUTO && disruption !== NONE ? { notice_text: notices.find(n => n.id === disruption)?.text } : {}),
        ...(eventCrowd ? {
          event_within_2km: 1,
          observed_crowd: Object.fromEntries(EVENT_STATIONS.map(s => [s, { crowd_t15: 2, tap_t15: 0.92 }])),
        } : {}),
      }
      const res = await replan(body)
      setAnswer(res); setSelected(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center px-4 gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Home
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><Train className="h-5 w-5 text-primary" aria-hidden /> Disruption re-planner</h1>
        </div>
      </header>

      <main className="container grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Where are you going?</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="origin">From</Label>
                    <select id="origin" className={selectClass} value={origin} onChange={e => setOrigin(e.target.value)}>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest">To</Label>
                    <select id="dest" className={selectClass} value={destination} onChange={e => setDestination(e.target.value)}>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Arrive by (next weekday, KL time)</Label>
                  <input id="time" type="time" className={selectClass} value={time} onChange={e => setTime(e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="disruption">Disruption</Label>
                  <select id="disruption" className={selectClass} value={disruption} onChange={e => setDisruption(e.target.value)}>
                    <option value={AUTO}>Let the agent find it (searches notices)</option>
                    <option value={NONE}>No disruption (normal service)</option>
                    {notices.map(n => <option key={n.id} value={n.id}>{n.id} · {n.title}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">Notices are synthetic demo data, not operator announcements.</p>
                </div>

                {disruption === AUTO && (
                  <div className="space-y-1.5">
                    <Label htmlFor="q">Your question</Label>
                    <textarea id="q" rows={2} maxLength={500} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={question} onChange={e => setQuestion(e.target.value)} />
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Switch id="event" checked={eventCrowd} onCheckedChange={setEventCrowd} aria-describedby="event-help" />
                  <div>
                    <Label htmlFor="event">Simulate an event crowd near KLCC</Label>
                    <p id="event-help" className="text-xs text-muted-foreground">Feeds simulated gate readings (KLCC, Ampang Park, Persiaran KLCC) into the crowd model. No live tap-in feed is connected yet.</p>
                  </div>
                </div>

                <Button type="submit" disabled={busy || !network} className="w-full">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Planning…</> : 'Re-plan my journey'}
                </Button>
              </form>
            </CardContent>
          </Card>
          {loadError && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Could not load the network: {loadError}
            </p>
          )}
        </section>

        <section className="grid gap-4 lg:grid-rows-[minmax(0,1fr)_auto]">
          <RouteMap network={network} closedEdges={answer?.closed_edges ?? []} routes={answer?.routes ?? []} selected={selected} />
          {network?.approximate && <p className="text-xs text-muted-foreground">Station positions and travel times are approximate (seed network, not live GTFS).</p>}
        </section>

        <section aria-live="polite" className="space-y-3 lg:col-span-2">
          {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">{error}</p>}
          {answer && (
            <>
              <Card>
                <CardContent className="space-y-1 p-4 text-sm">
                  <p><strong>Disruption:</strong>{' '}
                    {[...answer.disruption.closed_lines.map(l => `${l} suspended`), ...answer.disruption.closed_stations.map(s => `${s} closed`), ...answer.disruption.closed_segments.map(s => `${s} suspended`)].join('; ') || 'none detected'}
                    <span className="text-muted-foreground"> (source: {answer.disruption.source})</span>
                  </p>
                  {answer.reason && <p><strong>Why route 1:</strong> {answer.reason}</p>}
                  {answer.message && <p>{answer.message}</p>}
                </CardContent>
              </Card>
              <div className="grid gap-3 md:grid-cols-2">
                {answer.routes.map((r, i) => <RouteCard key={r.rank} route={r} selected={i === selected} onSelect={() => setSelected(i)} />)}
              </div>
              {!!answer.warnings?.length && (
                <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  {answer.warnings.map(w => <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{w}</li>)}
                </ul>
              )}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Agent trace · {answer.latency_ms} ms · {answer.iterations} plan loop{answer.iterations === 1 ? '' : 's'}{answer.loop_cap_hit ? ' · loop cap hit' : ''}</summary>
                <ul className="mt-2 space-y-0.5 font-mono">
                  {answer.tool_calls.map((t, i) => <li key={i}>{t.tool} → {t.status}{t.cache_hit ? ' (cached)' : ''}{t.ms !== undefined ? ` · ${t.ms} ms` : ''}</li>)}
                </ul>
              </details>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
