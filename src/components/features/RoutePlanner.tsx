import { useState, useEffect } from 'react'
import { Search, MapPin, ArrowRightLeft, TrainFront, AlertTriangle, Car, Footprints, CalendarDays } from 'lucide-react'
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
import { fetchGoKLRoutes, fetchGoKLStops, type GoKLRoute, type GoKLStop } from '../../lib/goklApi'
import { estimateModalCost, haversineKm, type ModalCostResult } from '../../lib/modalCost'
import { fetchNearbyEvents, hasHighImpactEvent, eventImpactLabel, type KLEvent } from '../../lib/eventApi'
import { fallbackStations } from '../../lib/transitData'
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
  const [goklRoutes, setGoklRoutes] = useState<GoKLRoute[]>([])
  const [goklStops, setGoklStops] = useState<GoKLStop[]>([])
  const [modalCost, setModalCost] = useState<ModalCostResult | null>(null)
  const [nearbyEvents, setNearbyEvents] = useState<KLEvent[]>([])

  useEffect(() => {
    loadStations()
    fetchGoKLRoutes().then(setGoklRoutes)
    fetchGoKLStops().then(setGoklStops)
  }, [])

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
    const toStation = stations.find(s => s.id === to)
    const fromIndex = stations.findIndex(s => s.id === from)
    const toIndex = stations.findIndex(s => s.id === to)
    const distance = Math.abs(fromIndex - toIndex)
    const calculatedFare = 2.0 + distance * 0.5
    setFare(calculatedFare)
    setSelectedAlt(null)
    setModalCost(null)
    setNearbyEvents([])

    // Coords from GTFS fallback table (best-effort; may be undefined for DB-only stations)
    const fromCoords = fallbackStations.find(s => s.id === from || s.name === fromStation?.name)
    const toCoords   = fallbackStations.find(s => s.id === to   || s.name === toStation?.name)

    // Compute multi-modal cost comparison
    const distKm = fromCoords && toCoords
      ? haversineKm(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon)
      : Math.max(1, distance * 0.8)
    setModalCost(estimateModalCost(calculatedFare, distKm))

    // Fetch nearby events for origin + destination concurrently
    // Skip sides with unknown coordinates to avoid showing KL-centre events as station-relevant
    const [fromEvents, toEvents] = await Promise.all([
      fromCoords ? fetchNearbyEvents(fromCoords.lat, fromCoords.lon) : Promise.resolve([]),
      toCoords ? fetchNearbyEvents(toCoords.lat, toCoords.lon) : Promise.resolve([]),
    ])
    const allEvents = [...fromEvents, ...toEvents.filter(e => !fromEvents.some(f => f.id === e.id))]
    setNearbyEvents(allEvents)

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
      setModalCost(null)
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

              {nearbyEvents.length > 0 && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                  <CalendarDays className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{eventImpactLabel(nearbyEvents)}</span>
                    <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
                      {nearbyEvents.map(e => (
                        <li key={e.id}>{e.name} — <span className="font-medium">{e.venue}</span></li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-blue-600">Expect higher crowds near these stations.</p>
                  </div>
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

      {/* Multi-modal cost comparison */}
      {fare !== null && modalCost && (
        <Card className="border-t-4 border-t-blue-600 animate-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              Cost Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Train option */}
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <TrainFront className="h-4 w-4" /> Train
                </div>
                <p className="text-2xl font-black text-primary">
                  RM {(selectedAlt ? selectedAlt.fare : modalCost.trainFare).toFixed(2)}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Footprints className="h-3.5 w-3.5 shrink-0" />
                  +{modalCost.trainWalkMinutes} min walk
                </div>
                <div className="text-[11px] text-green-700 font-medium bg-green-50 rounded px-2 py-0.5 inline-block">
                  Recommended
                </div>
              </div>

              {/* Grab option */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  <Car className="h-4 w-4" /> Grab
                </div>
                <p className="text-2xl font-black text-foreground">
                  ~RM {modalCost.grabEstimate.toFixed(0)}
                </p>
                <div className="text-xs text-muted-foreground">
                  ~{modalCost.distanceKm.toFixed(1)} km trip
                </div>
                {modalCost.grabSurge && (
                  <div className="text-[11px] text-orange-700 font-medium bg-orange-50 rounded px-2 py-0.5 inline-block">
                    Peak surge
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Grab price is an estimate (base RM3 + RM1.50/km
              {modalCost.grabSurge ? ', 1.3× surge' : ''}). Actual fares may vary.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Free GoKL bus options */}
      {fare !== null && goklStops.length > 0 && (
        <Card className="border-t-4 border-t-red-600 animate-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xs font-black bg-red-600 text-white px-2 py-0.5 rounded">FREE</span>
              GoKL City Bus — Free feeder options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">GoKL buses are free within KL city. These stops are near major rail interchanges on your route.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {goklStops.slice(0, 4).map(stop => (
                <div key={stop.stopId} className="flex items-start gap-2.5 p-3 rounded-lg border bg-red-50/50">
                  <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{stop.name}</p>
                    <p className="text-xs text-muted-foreground">Routes: {stop.routeIds.length > 0 ? stop.routeIds.join(', ') : goklRoutes.slice(0, 2).map(r => r.shortName).join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
