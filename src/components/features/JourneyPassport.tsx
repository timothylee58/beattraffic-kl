import { useState, useEffect } from 'react'
import { Stamp, Flame, Share2, Gift, LogIn } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { blink } from '../../lib/blink'
import { useAuth } from '../../hooks/useAuth'
import { loadPassport, recordVisit, buildShareCard, type PassportState } from '../../lib/journeyPassport'
import { trackEvent } from '../../lib/analytics'

const VOUCHER_COLORS = [
  'bg-gray-100 text-gray-600',
  'bg-yellow-100 text-yellow-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-800',
]

const TIER_MILESTONES = [5, 25, 50]

const DEMO_STATIONS = [
  { id: 'KJ16', name: 'KL Sentral' },
  { id: 'MR6', name: 'Bukit Bintang' },
  { id: 'AG8', name: 'Masjid Jamek' },
  { id: 'MRT14', name: 'Tun Razak Exchange' },
  { id: 'MRT01', name: 'Kwasa Damansara' },
]

export function JourneyPassport() {
  const { user } = useAuth()
  const [passport, setPassport] = useState<PassportState | null>(null)
  const [shareMsg, setShareMsg] = useState('')
  const [logStation, setLogStation] = useState('')

  useEffect(() => {
    setPassport(loadPassport())
  }, [])

  const handleRecord = () => {
    if (!logStation) return
    const station = DEMO_STATIONS.find(s => s.id === logStation)
    if (!station) return
    setPassport(recordVisit(station.id, station.name))
    trackEvent('station_visit_stamped', { from_station_id: station.id })
    setLogStation('')
  }

  const handleShare = () => {
    if (!passport) return
    const card = buildShareCard(passport)
    if (navigator.share) {
      navigator.share({ title: 'My BeatTraffic KL Passport', text: card }).catch(() => {})
    } else {
      navigator.clipboard.writeText(card).then(() => {
        setShareMsg('Copied to clipboard!')
        setTimeout(() => setShareMsg(''), 2000)
      })
    }
  }

  if (!user) {
    return (
      <Card className="bg-secondary/20 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <LogIn className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="font-semibold text-muted-foreground">Sign in to start your Journey Passport</p>
          <p className="text-sm text-muted-foreground/60">Collect station stamps, build streaks, and unlock vouchers.</p>
          <Button onClick={() => blink.auth.login()} className="bg-primary hover:bg-primary/90">Sign In</Button>
        </CardContent>
      </Card>
    )
  }

  if (!passport) return null

  const uniqueCount = passport.uniqueStations.size
  const nextMilestone = TIER_MILESTONES.find(m => uniqueCount < m) ?? 50
  const progressPct = Math.min(100, (uniqueCount / nextMilestone) * 100)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Stamp className="h-6 w-6" />
          Journey Passport
        </h2>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
          <Share2 className="h-4 w-4" />
          {shareMsg || 'Share recap'}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-5 pb-4 space-y-1">
            <p className="text-3xl font-black text-primary">{uniqueCount}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Stations</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4 space-y-1">
            <p className="text-3xl font-black text-orange-500 flex items-center justify-center gap-1">
              <Flame className="h-7 w-7" />{passport.streak}
            </p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Day streak</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4 space-y-1">
            <p className="text-3xl font-black text-purple-600">{passport.voucherTier}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Voucher tier</p>
          </CardContent>
        </Card>
      </div>

      {/* Voucher */}
      <Card className={`border-2 ${passport.voucherTier > 0 ? 'border-yellow-300' : 'border-dashed'}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <Gift className={`h-9 w-9 shrink-0 ${passport.voucherTier > 0 ? 'text-yellow-500' : 'text-muted-foreground/30'}`} />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-sm">{passport.voucherLabel}</p>
            {passport.voucherTier < 3 && (
              <>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {uniqueCount}/{nextMilestone} unique stations to next tier
                </p>
              </>
            )}
          </div>
          {passport.voucherTier > 0 && (
            <Badge className={VOUCHER_COLORS[passport.voucherTier]}>Tier {passport.voucherTier}</Badge>
          )}
        </CardContent>
      </Card>

      {/* Log a visit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stamp className="h-4 w-4" /> Log a station visit
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <select
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={logStation}
            onChange={e => setLogStation(e.target.value)}
          >
            <option value="">Select station…</option>
            {DEMO_STATIONS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button onClick={handleRecord} disabled={!logStation}>Stamp</Button>
        </CardContent>
      </Card>

      {/* Recent stamps */}
      {passport.visits.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Recent stamps</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {passport.visits.slice(0, 12).map((v, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border bg-card text-sm">
                <Stamp className="h-4 w-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{v.stationName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(v.visitedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
