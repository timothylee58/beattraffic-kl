"use client"

import { useState, useEffect, useRef } from 'react'
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
import { estimateModalCost, haversineKm, type ModalCostResult } from '../../lib/modalCost'
import { fetchNearbyEvents, eventImpactLabel, type KLEvent } from '../../lib/eventApi'
import type { TransitStation } from '../../lib/transitData'
import { fetchStationCatalog, catalogDescription } from '../../lib/stationCatalog'
import { klSpendWindows } from '../../lib/dates'
import { trackEvent } from '../../lib/analytics'
import { calculateZonalFare, buildFareSummary, type FareSummary } from '../../lib/fareEngine'
import { cacheRoute, getCachedRoute } from '../../lib/offlineCache'
import { toast } from 'react-hot-toast'

interface TicketRecord { created_at?: string; fare?: number }

const spend = (tickets: unknown[], since: Date) =>
  (tickets as TicketRecord[])
    .filter(t => new Date(t.created_at ?? 0) >= since)
    .reduce((sum, t) => sum + (t.fare ?? 0), 0)

export function RoutePlanner() {
  const { user } = useAuth()
  const [stations, setStations] = useState<TransitStation[]>([])
  const [stationsLoading, setStationsLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fare, setFare] = useState<number | null>(null)
  const [buying, setBuying] = useState(false)
  const [routeDelay, setRouteDelay] = useState(0)
  const [selectedAlt, setSelectedAlt] = useState<AlternativeRoute | null>(null)
  const [modalCost, setModalCost] = useState<ModalCostResult | null>(null)
  const [nearbyEvents, setNearbyEvents] = useState<KLEvent[]>([])
  const [fareSummary, setFareSummary] = useState<FareSummary | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [stationMessage, setStationMessage] = useState('Loading station catalogue…')
  const [alternatives, setAlternatives] = useState<AlternativeRoute[]>([])
  const [calculating, setCalculating] = useState(false)
  const [quote, setQuote] = useState<{ from: string; to: string; userId: string | null; at: number } | null>(null)
  const request = useRef(0)
  const buyingRef = useRef(false)

  const invalidate = () => {
    request.current++
    setQuote(null); setFare(null); setFareSummary(null); setSelectedAlt(null)
    setAlternatives([]); setModalCost(null); setNearbyEvents([]); setRouteDelay(0)
    setIsOffline(false); setCalculating(false)
  }
  const changeFrom = (value: string) => { invalidate(); setFrom(value) }
  const changeTo = (value: string) => { invalidate(); setTo(value) }
  useEffect(() => { invalidate() }, [user?.id])
  useEffect(() => () => { request.current++ }, [])

  useEffect(() => {
    loadStations()
  }, [])

  const loadStations = async () => {
    setStationsLoading(true)
    const catalog = await fetchStationCatalog()
    setStations(catalog.stations)
    setStationMessage(catalogDescription(catalog))
    setStationsLoading(false)
  }

  const calculateFare = async () => {
    invalidate()
    if (!from || !to) { toast.error('Please select both stations'); return }
    if (from === to) { toast.error('Stations cannot be the same'); return }
    const fromStation = stations.find(s => s.id === from)
    const toStation = stations.find(s => s.id === to)
    if (!fromStation || !toStation) { toast.error('Station no longer available'); return }
    const version = request.current
    setCalculating(true)
    try {
      let spentToday = 0, spentThisWeek = 0
      if (user) {
        const tickets = await blink.db.tickets.list({ where: { user_id: user.id } })
        const windows = klSpendWindows()
        spentToday = spend(tickets, windows.today)
        spentThisWeek = spend(tickets, windows.week)
      }
      if (version !== request.current) return
      const summary = buildFareSummary(calculateZonalFare(fromStation.zone, toStation.zone), spentToday, spentThisWeek)
      setFareSummary(summary)
      setFare(summary.finalFare)
      setQuote({ from, to, userId: user?.id ?? null, at: Date.now() })
      setModalCost(estimateModalCost(summary.finalFare, haversineKm(fromStation.lat, fromStation.lon, toStation.lat, toStation.lon)))

      const [fromEvents, toEvents, incidents] = await Promise.all([
        fetchNearbyEvents(fromStation.lat, fromStation.lon),
        fetchNearbyEvents(toStation.lat, toStation.lon),
        fetchIncidents(),
      ])
      if (version !== request.current) return
      setNearbyEvents([...fromEvents, ...toEvents.filter(e => !fromEvents.some(f => f.id === e.id))])
      // Do not manufacture disruptions from peak-hour heuristics when the incident feed is unavailable.
      const delay = predictLineDelays(incidents, 12).find(d => d.line === fromStation.line)?.estimatedDelay ?? 0
      setRouteDelay(delay)
      if (!navigator.onLine) {
        const cached = await getCachedRoute(from, to)
        if (version !== request.current) return
        setAlternatives(cached ?? [])
        setIsOffline(true)
      } else {
        const routes = await getAlternativeRoutes(delay, fromStation, toStation)
        if (version !== request.current) return
        setAlternatives(routes)
        if (routes.length) void cacheRoute(from, to, routes)
      }
    } catch {
      if (version === request.current) {
        invalidate()
        toast.error('Unable to calculate a fare. Please retry.')
      }
    } finally {
      if (version === request.current) setCalculating(false)
    }
  }

  const buyTicket = async () => {
    if (buyingRef.current) return
    if (!quote || quote.from !== from || quote.to !== to || from === to ||
        quote.userId !== (user?.id ?? null) || !fareSummary || Date.now() - quote.at > 300_000) {
      invalidate(); toast.error('Please check the fare again for this journey'); return
    }
    if (!user) { toast.error('Please sign in to create a demo ticket'); blink.auth.login(); return }
    buyingRef.current = true
    setBuying(true)
    try {
      // Demonstration only: never issue an active operator ticket without a payment/issuance integration.
      const ticketId = `DEMO-${crypto.randomUUID()}`
      await blink.db.tickets.create({
        id: ticketId, user_id: user.id,
        from_station_id: quote.from, to_station_id: quote.to,
        fare: fareSummary.finalFare, status: 'demo', created_at: new Date().toISOString(),
        qr_code: `DEMO-NOT-VALID-FOR-TRAVEL-${ticketId}`,
      })
      toast.success('Demo ticket saved — not valid for travel')
      invalidate(); setFrom(''); setTo('')
    } catch {
      toast.error('Failed to save demo ticket')
    } finally {
      buyingRef.current = false
      setBuying(false)
    }
  }

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
          <p role="status" className="text-sm text-muted-foreground">{stationMessage}</p>
          <p className="text-sm text-muted-foreground">Fares and caps are illustrative estimates. Demo tickets are not valid for travel; no payment is taken.</p>
          <div className="grid md:grid-cols-[1fr_auto_1fr] items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-destructive" />
                From
              </label>
              <Select value={from} onValueChange={changeFrom} disabled={stationsLoading || buying}>
                <SelectTrigger aria-label="Origin station">
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
              disabled={buying}
              onClick={() => { invalidate(); const t = from; setFrom(to); setTo(t) }}
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
              <Select value={to} onValueChange={changeTo} disabled={stationsLoading || buying}>
                <SelectTrigger aria-label="Destination station">
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

          <Button onClick={calculateFare} disabled={stationsLoading || calculating || buying} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12">
            <Search className="h-4 w-4 mr-2" />
            {calculating ? 'Checking…' : 'Check Fare & Routes'}
          </Button>

          {fare !== null && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              {isOffline && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
                  <span>Offline — cached alternatives may be stale; live arrivals unavailable</span>
                </div>
              )}
              {routeDelay > 0 && !selectedAlt && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>~{routeDelay} min delay detected on your route. See alternatives below.</span>
                </div>
              )}

              {selectedAlt && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                  <span className="font-semibold">Alternative selected:</span> {selectedAlt.label}
                  <button onClick={() => {
                    if (!fareSummary) return
                    const origin = stations.find(s => s.id === from)
                    const destination = stations.find(s => s.id === to)
                    if (!origin || !destination) { invalidate(); return }
                    setFareSummary(buildFareSummary(calculateZonalFare(origin.zone, destination.zone), fareSummary.spentToday, fareSummary.spentThisWeek))
                    setSelectedAlt(null)
                  }} className="ml-auto text-xs underline text-green-700">Clear</button>
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
                {fareSummary?.isCapped && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800">
                    <span className="font-semibold">Demo fare cap applied</span> — RM {fareSummary.dailyRemaining.toFixed(2)} remaining today
                  </div>
                )}
                {fareSummary && fareSummary.weeklyRemaining < 5 && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                    Rolling 7-day demo cap: RM {fareSummary.spentThisWeek.toFixed(2)} / RM 25.00 spent — RM {fareSummary.weeklyRemaining.toFixed(2)} left
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Estimated Fare</p>
                    <p className="text-3xl font-bold text-primary">
                      RM {(selectedAlt ? selectedAlt.fare : fare).toFixed(2)}
                    </p>
                    {fareSummary?.isCapped && (
                      <p className="text-xs text-muted-foreground line-through">RM {fareSummary.rawFare.toFixed(2)} standard</p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    onClick={buyTicket}
                    disabled={buying || calculating}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
                  >
                    {buying ? 'Saving…' : 'Create demo ticket'}
                  </Button>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <TrainFront className="h-4 w-4" />
                    Live train arrivals unavailable
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
          routes={alternatives}
          onSelect={route => {
            if (!fareSummary) return
            const summary = buildFareSummary(route.fare, fareSummary.spentToday, fareSummary.spentThisWeek)
            setFareSummary(summary)
            setSelectedAlt({ ...route, fare: summary.finalFare })
            trackEvent('alternative_route_selected', {
              from_station_id: from,
              to_station_id: to,
              alternative_id: route.label,
              fare: route.fare,
            })
            toast.success(`Switched to: ${route.label}`)
          }}
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

      {fare !== null && <p className="text-sm text-muted-foreground">GoKL feeder routes unavailable — check the operator for routes and eligibility.</p>}
    </div>
  )
}
