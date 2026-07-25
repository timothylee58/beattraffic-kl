import { useState, useEffect, useRef, useCallback } from 'react'
import { BellRing, ChevronRight, Loader2, MapPin, TrainFront, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { blink } from '../../lib/blink'
import { getStopSequence, type GtfsStop } from '../../lib/gtfsStatic'
import { toast } from 'react-hot-toast'

interface Station {
  id: string
  name: string
  line: string
}

type TripState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'active'; stops: GtfsStop[]; currentIdx: number; notifyAt: number }
  | { status: 'arrived' }
  | { status: 'error'; message: string }

export function GetOffNotification() {
  const [stations, setStations] = useState<Station[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [notifyBefore, setNotifyBefore] = useState(2)
  const [trip, setTrip] = useState<TripState>({ status: 'idle' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    blink.db.stations.list().then(({ data }) => setStations((data || []) as unknown as Station[]))
  }, [])

  const clearTrip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTrip({ status: 'idle' })
  }, [])

  const startTrip = async () => {
    if (!from || !to) { toast.error('Select both stations'); return }
    if (from === to) { toast.error('Stations must differ'); return }

    const fromName = stations.find(s => s.id === from)?.name || from
    const toName = stations.find(s => s.id === to)?.name || to

    setTrip({ status: 'loading' })
    try {
      const stops = await getStopSequence(fromName, toName, 'rapid-rail-kl')
      if (stops.length < 2) {
        setTrip({ status: 'error', message: 'Could not find a stop sequence for these stations. Try a bus route.' })
        return
      }

      if (Notification.permission === 'default') await Notification.requestPermission()

      setTrip({ status: 'active', stops, currentIdx: 0, notifyAt: stops.length - 1 - notifyBefore })

      // Simulate advancing one stop every 3 minutes (demo tick)
      intervalRef.current = setInterval(() => {
        setTrip(prev => {
          if (prev.status !== 'active') return prev
          const next = prev.currentIdx + 1
          if (next >= prev.stops.length - 1) {
            clearInterval(intervalRef.current!)
            return { status: 'arrived' }
          }
          if (next === prev.notifyAt) {
            const dest = prev.stops[prev.stops.length - 1].stop_name
            if (Notification.permission === 'granted') {
              new Notification('BeatTraffic KL — Get off soon!', {
                body: `${notifyBefore} stop${notifyBefore > 1 ? 's' : ''} until ${dest}. Prepare to alight.`,
                icon: '/favicon.ico',
              })
            } else {
              toast(`${notifyBefore} stop${notifyBefore > 1 ? 's' : ''} until ${dest} — prepare to alight!`, { icon: '🚨', duration: 8000 })
            }
          }
          return { ...prev, currentIdx: next }
        })
      }, 3 * 60_000)
    } catch (err) {
      setTrip({ status: 'error', message: 'Failed to load GTFS data. Check your connection.' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
        <BellRing className="h-6 w-6" />
        Get-Off Notification
      </h2>

      {/* Setup form */}
      {(trip.status === 'idle' || trip.status === 'error') && (
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Set up your trip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-destructive" /> Board at
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                >
                  <option value="">Select station…</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Alight at
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                >
                  <option value="">Select station…</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">Alert me</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={notifyBefore}
                onChange={e => setNotifyBefore(Number(e.target.value))}
              >
                <option value={1}>1 stop before</option>
                <option value={2}>2 stops before</option>
                <option value={3}>3 stops before</option>
              </select>
            </div>

            {trip.status === 'error' && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{trip.message}</p>
            )}

            <Button onClick={startTrip} className="w-full font-bold h-11">
              <BellRing className="h-4 w-4 mr-2" /> Start Trip & Enable Alerts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {trip.status === 'loading' && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading GTFS stop sequence…
          </CardContent>
        </Card>
      )}

      {/* Active trip */}
      {trip.status === 'active' && (
        <Card className="border-t-4 border-t-green-500 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrainFront className="h-4 w-4 text-green-600" />
                Trip in progress
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearTrip}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{trip.stops[0].stop_name}</span>
                <span>{trip.stops[trip.stops.length - 1].stop_name}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(trip.currentIdx / (trip.stops.length - 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {trip.stops.length - 1 - trip.currentIdx} stop{trip.stops.length - 1 - trip.currentIdx !== 1 ? 's' : ''} remaining
              </p>
            </div>

            {/* Stop list */}
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {trip.stops.map((stop, i) => {
                const isCurrent = i === trip.currentIdx
                const isPast = i < trip.currentIdx
                const isAlert = i === trip.notifyAt
                const isDest = i === trip.stops.length - 1
                return (
                  <div
                    key={stop.stop_id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                      ${isCurrent ? 'bg-green-100 border border-green-300 font-semibold' : ''}
                      ${isPast ? 'text-muted-foreground line-through' : ''}
                      ${isDest && !isPast ? 'bg-primary/5 border border-primary/20 font-semibold' : ''}
                    `}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-green-500' : isPast ? 'bg-muted-foreground/30' : isDest ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                    <span className="flex-1 truncate">{stop.stop_name}</span>
                    {isCurrent && <Badge className="bg-green-500 text-white text-[10px]">You are here</Badge>}
                    {isAlert && !isPast && !isCurrent && <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600">🔔 alert here</Badge>}
                    {isDest && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Position advances every 3 min (demo). In production, station will be detected via GTFS-RT vehicle position.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Arrived */}
      {trip.status === 'arrived' && (
        <Card className="border-t-4 border-t-primary text-center">
          <CardContent className="py-10 space-y-3">
            <p className="text-4xl">🎉</p>
            <p className="text-xl font-bold text-primary">You've arrived!</p>
            <p className="text-sm text-muted-foreground">Hope your journey was smooth.</p>
            <Button onClick={clearTrip} variant="outline">Plan another trip</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
