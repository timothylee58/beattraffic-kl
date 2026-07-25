import { useState, useEffect, useCallback } from 'react'
import { Trophy, Leaf, RouteIcon, LogIn, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { blink } from '../../lib/blink'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchLeaderboard,
  recordJourney,
  getWeekLabel,
  type LeaderboardEntry,
} from '../../lib/leaderboard'

type Metric = 'distance_km' | 'co2_saved_kg' | 'journey_count'

const METRIC_META: Record<Metric, { label: string; unit: string; icon: React.ReactNode; color: string }> = {
  distance_km: { label: 'Distance', unit: 'km', icon: <RouteIcon className="h-4 w-4" />, color: 'text-blue-600' },
  co2_saved_kg: { label: 'CO₂ Saved', unit: 'kg', icon: <Leaf className="h-4 w-4" />, color: 'text-green-600' },
  journey_count: { label: 'Trips', unit: 'trips', icon: <Trophy className="h-4 w-4" />, color: 'text-purple-600' },
}

const RANK_COLORS = ['bg-yellow-400 text-yellow-900', 'bg-gray-300 text-gray-800', 'bg-orange-300 text-orange-900']

function rankLabel(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export function CommuteLeaderboard() {
  const { user } = useAuth()
  const [metric, setMetric] = useState<Metric>('distance_km')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  // Demo: log a manual journey
  const [demoKm, setDemoKm] = useState('')
  const [demoMode, setDemoMode] = useState<'rail' | 'bus'>('rail')
  const [logging, setLogging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchLeaderboard(metric)
    // mark current user
    if (user) data.forEach(e => { e.isMe = e.user_id === user.id })
    setEntries(data)
    setLoading(false)
  }, [metric, user])

  useEffect(() => { load() }, [load])

  const handleLogJourney = async () => {
    if (!user) { blink.auth.login(); return }
    const km = parseFloat(demoKm)
    if (!km || km <= 0) return
    setLogging(true)
    const name = user.email?.split('@')[0] || 'Commuter'
    await recordJourney(user.id, name, km, demoMode)
    setDemoKm('')
    await load()
    setLogging(false)
  }

  if (!user) {
    return (
      <Card className="bg-secondary/20 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <LogIn className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="font-semibold text-muted-foreground">Sign in to join the leaderboard</p>
          <p className="text-sm text-muted-foreground/60">Opt in to rank your weekly commute distance, eco score, and trips.</p>
          <Button onClick={() => blink.auth.login()} className="bg-primary hover:bg-primary/90">Sign In</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          Commute Leaderboard
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground border rounded-full px-3 py-1 font-medium">{getWeekLabel()}</span>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex gap-1.5 bg-muted p-1 rounded-xl w-fit">
        {(Object.keys(METRIC_META) as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
              ${metric === m ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {METRIC_META[m].icon}
            {METRIC_META[m].label}
          </button>
        ))}
      </div>

      {/* Log a journey (demo) */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold shrink-0">Log a journey:</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            className="border rounded-lg px-3 py-1.5 text-sm w-28"
            placeholder="km"
            value={demoKm}
            onChange={e => setDemoKm(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={demoMode}
            onChange={e => setDemoMode(e.target.value as 'rail' | 'bus')}
          >
            <option value="rail">Rail</option>
            <option value="bus">Bus</option>
          </select>
          <Button size="sm" onClick={handleLogJourney} disabled={logging || !demoKm}>
            {logging ? 'Saving…' : 'Submit'}
          </Button>
          <span className="text-xs text-muted-foreground">Journey logging will be automatic once Route Planner is complete.</span>
        </CardContent>
      </Card>

      {/* Board */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <Trophy className="h-10 w-10 text-muted-foreground opacity-20" />
            <p className="font-semibold text-muted-foreground">No entries yet this week</p>
            <p className="text-sm text-muted-foreground/60">Log your first journey above to claim the top spot!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div
              key={e.user_id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-shadow
                ${e.isMe ? 'border-primary bg-primary/5 shadow-md' : 'bg-card'}
              `}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0
                ${e.rank <= 3 ? RANK_COLORS[e.rank - 1] : 'bg-muted text-muted-foreground'}`}>
                {e.rank <= 3 ? rankLabel(e.rank) : `#${e.rank}`}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{e.display_name}</span>
                  {e.isMe && <Badge className="text-[10px] bg-primary text-white">You</Badge>}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{e.distance_km} km</span>
                  <span className="text-green-600">{e.co2_saved_kg} kg CO₂ saved</span>
                  <span>{e.journey_count} trips</span>
                </div>
              </div>

              <div className={`text-right shrink-0 font-black text-lg ${METRIC_META[metric].color}`}>
                {metric === 'distance_km' && `${e.distance_km}`}
                {metric === 'co2_saved_kg' && `${e.co2_saved_kg}`}
                {metric === 'journey_count' && `${e.journey_count}`}
                <span className="text-xs font-medium text-muted-foreground ml-1">{METRIC_META[metric].unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Leaderboard resets every Monday. Only opt-in users are shown.
      </p>
    </div>
  )
}
