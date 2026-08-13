/**
 * ParkingFinder — "Park & Ride" tab
 *
 * Lets users ask a free-text mobility question (e.g. "Where should I park
 * near KL Sentral right now?"). Uses the browser Geolocation API for
 * coordinates and calls POST /agent/mobility on the orchestration-api.
 *
 * Falls back gracefully when:
 *  - Geolocation is denied → uses KL Sentral coordinates as default
 *  - Orchestration API is unconfigured → shows an informational message
 */

import { useState } from 'react'
import { Car, MapPin, Loader2, AlertCircle, SendHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { toast } from 'react-hot-toast'

const ORCHESTRATION_URL = import.meta.env.VITE_ORCHESTRATION_API_URL as string | undefined

// KL Sentral as default when geolocation is denied
const KL_SENTRAL = { lat: 3.1344, lon: 101.6862 }

const QUICK_QUERIES = [
  'Where can I park near here right now?',
  'Should I drive or take the LRT to KLCC?',
  'Find me the cheapest carpark within walking distance',
  'How crowded is the nearest LRT station today?',
]

interface MobilityResult {
  answer: string
  parking_count: number
  crowd_label: string | null
  data_sources: string[]
}

export function ParkingFinder() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [result, setResult] = useState<MobilityResult | null>(null)
  const [nearestStation, setNearestStation] = useState('KL Sentral')

  const locateUser = () => {
    if (!navigator.geolocation) {
      setCoords(KL_SENTRAL)
      toast('Using KL Sentral as default location', { icon: '📍' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocating(false)
        toast.success('Location detected')
      },
      () => {
        setCoords(KL_SENTRAL)
        setLocating(false)
        toast('Location denied — using KL Sentral', { icon: '📍' })
      },
      { timeout: 8000 },
    )
  }

  const askMobility = async (q: string) => {
    if (!ORCHESTRATION_URL) return
    const loc = coords ?? KL_SENTRAL
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${ORCHESTRATION_URL}/agent/mobility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          lat: loc.lat,
          lon: loc.lon,
          nearest_station: nearestStation,
          radius_km: 0.75,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      toast.error('Could not get mobility answer — check orchestration-api')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    askMobility(query.trim())
  }

  if (!ORCHESTRATION_URL) {
    return (
      <Card className="shadow-xl border-t-4 border-t-orange-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-orange-500" />
            Park &amp; Ride Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-sm text-orange-800 dark:text-orange-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Orchestration API not configured</p>
              <p className="mt-1 text-xs">Set <code>VITE_ORCHESTRATION_API_URL</code> in your <code>.env</code> to enable parking + AI mobility answers.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl border-t-4 border-t-orange-400 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-orange-500" />
          Park &amp; Ride Intelligence
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Location row */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={locateUser}
            disabled={locating}
            className="shrink-0"
          >
            {locating
              ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
              : <MapPin className="h-4 w-4 mr-1" />}
            {coords ? 'Location set ✓' : 'Use my location'}
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground shrink-0">Nearest station:</span>
            <input
              className="border rounded px-2 py-1 text-sm flex-1 bg-background"
              value={nearestStation}
              onChange={e => setNearestStation(e.target.value)}
              placeholder="e.g. KL Sentral"
            />
          </div>
        </div>

        {/* Quick queries */}
        <div className="flex flex-wrap gap-2">
          {QUICK_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => { setQuery(q); askMobility(q) }}
              className="text-xs px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-800 dark:text-orange-300 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Free-text query */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm flex-1 bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Ask anything: parking, drive vs LRT, crowd levels…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={loading || !query.trim()} className="bg-orange-500 hover:bg-orange-600 text-white shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </Button>
        </form>

        {/* Answer */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching parking + crowd data, asking Claude…
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-sm leading-relaxed whitespace-pre-wrap">
              {result.answer}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-muted">{result.parking_count} carpark{result.parking_count !== 1 ? 's' : ''} found</span>
              {result.crowd_label && (
                <span className="px-2 py-0.5 rounded-full bg-muted capitalize">Crowd: {result.crowd_label}</span>
              )}
              {result.data_sources.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-muted">{s}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
