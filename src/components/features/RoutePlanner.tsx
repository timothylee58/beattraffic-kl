import { useState, useEffect } from 'react'
import { Search, MapPin, ArrowRightLeft, TrainFront, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AlternativeRoutePanel } from './AlternativeRoutePanel'
import { blink } from '../../lib/blink'
import { useAuth } from '../../hooks/useAuth'
import { fetchIncidents } from '../../lib/dosmApi'
import { predictLineDelays } from '../../lib/delayPrediction'
import { getAlternativeRoutes } from '../../lib/alternativeRoutes'
import type { AlternativeRoute } from '../../lib/alternativeRoutes'
import { toast } from 'react-hot-toast'

interface Station {
  id: string
  name: string
  line: string
}

export function RoutePlanner() {
  const { user } = useAuth()
  const [stations, setStations] = useState<Station[]>([])
  const [stationsLoading, setStationsLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fare, setFare] = useState<number | null>(null)
  const [buying, setBuying] = useState(false)
  const [routeDelay, setRouteDelay] = useState(0)
  const [selectedAlt, setSelectedAlt] = useState<AlternativeRoute | null>(null)

  useEffect(() => { loadStations() }, [])

  const loadStations = async () => {
    setStationsLoading(true)
    try {
      const { data } = await blink.db.stations.list()
      setStations(data || [])
    } catch {
      toast.error('Failed to load stations')
    } finally {
      setStationsLoading(false)
    }
  }

  const calculateFare = async () => {
    if (!from || !to) { toast.error('Please select both stations'); return }
    if (from === to) { toast.error('Stations cannot be the same'); return }

    const fromStation = stations.find(s => s.id === from)
    const fromIndex = stations.findIndex(s => s.id === from)
    const toIndex = stations.findIndex(s => s.id === to)
    const distance = Math.abs(fromIndex - toIndex)
    setFare(2.0 + distance * 0.5)
    setSelectedAlt(null)

    // Check for delays on the from-station's line
    try {
      const incidents = await fetchIncidents()
      const delays = predictLineDelays(incidents)
      const lineDelay = fromStation
        ? delays.find(d => d.line === (fromStation.line as any))?.estimatedDelay ?? 0
        : 0
      setRouteDelay(lineDelay)
    } catch {
      setRouteDelay(0)
    }
  }

  const buyTicket = async () => {
    if (!user) { toast.error('Please sign in to buy a ticket'); blink.auth.login(); return }
    setBuying(true)
    try {
      const ticketId = `T-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      await blink.db.tickets.create({
        id: ticketId,
        user_id: user.id,
        from_station_id: from,
        to_station_id: to,
        fare: selectedAlt ? selectedAlt.fare : fare!,
        status: 'active',
        qr_code: `RAPIDKL-${ticketId}-${from}-${to}`,
      })
      toast.success('Ticket purchased successfully!')
      setFare(null)
      setFrom('')
      setTo('')
      setRouteDelay(0)
      setSelectedAlt(null)
    } catch {
      toast.error('Failed to purchase ticket')
    } finally {
      setBuying(false)
    }
  }

  const alternatives = getAlternativeRoutes(routeDelay)

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card className="shadow-xl border-t-4 border-t-primary animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrainFront className="h-5 w-5 text-primary" />
            Plan Your Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-[1fr_auto_1fr] items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-destructive" />
                From
              </label>
              <Select value={from} onValueChange={setFrom} disabled={stationsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={stationsLoading ? 'Loading stations…' : 'Select origin'} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} ({station.line})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => { const t = from; setFrom(to); setTo(t) }}
              aria-label="Swap origin and destination"
              className="mb-1 rounded-full hover:bg-secondary"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                To
              </label>
              <Select value={to} onValueChange={setTo} disabled={stationsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={stationsLoading ? 'Loading stations…' : 'Select destination'} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} ({station.line})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={calculateFare} disabled={stationsLoading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12">
            <Search className="h-4 w-4 mr-2" />
            Check Fare & Routes
          </Button>

          {fare !== null && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              {routeDelay > 0 && !selectedAlt && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>~{routeDelay} min delay detected on your route. See alternatives below.</span>
                </div>
              )}

              {selectedAlt && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                  <span className="font-semibold">Alternative selected:</span> {selectedAlt.label}
                  <button onClick={() => setSelectedAlt(null)} className="ml-auto text-xs underline text-green-700">Clear</button>
                </div>
              )}

              <div className="p-6 bg-secondary rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Estimated Fare</p>
                    <p className="text-3xl font-bold text-primary">
                      RM {(selectedAlt ? selectedAlt.fare : fare).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={buyTicket}
                    disabled={buying}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
                  >
                    {buying ? 'Processing…' : 'Buy Ticket'}
                  </Button>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <TrainFront className="h-4 w-4" />
                    Next train in: <span className="text-primary font-bold">4 mins</span>
                    {routeDelay > 0 && <span className="text-yellow-600 text-xs">(+{routeDelay}m delay)</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {fare !== null && alternatives.length > 0 && (
        <AlternativeRoutePanel
          delayMinutes={routeDelay}
          onSelect={route => { setSelectedAlt(route); toast.success(`Switched to: ${route.label}`) }}
        />
      )}
    </div>
  )
}
