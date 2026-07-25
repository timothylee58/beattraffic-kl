import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, BookmarkPlus, Trash2, ArrowRight, LogIn } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { blink } from '../../lib/blink'
import { useAuth } from '../../hooks/useAuth'
import {
  listSavedCommutes,
  saveCommute,
  deleteSavedCommute,
  requestNotificationPermission,
  fireDelayNotification,
  type SavedCommute,
} from '../../lib/savedCommutes'

const PREDICT_URL = import.meta.env.VITE_PREDICT_DELAYS_URL as string | undefined

async function checkDelayForCommute(commute: SavedCommute): Promise<number> {
  if (!PREDICT_URL) return 0
  try {
    const res = await fetch(PREDICT_URL)
    if (!res.ok) return 0
    const data: { estimatedDelay?: number }[] = await res.json()
    return data[0]?.estimatedDelay ?? 0
  } catch {
    return 0
  }
}

interface StationOption {
  id: string
  name: string
}

export function SavedCommutes() {
  const { user } = useAuth()
  const [commutes, setCommutes] = useState<SavedCommute[]>([])
  const [loading, setLoading] = useState(true)
  const [stations, setStations] = useState<StationOption[]>([])
  const [notifGranted, setNotifGranted] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', fromId: '', toId: '' })

  const reload = useCallback(async () => {
    setLoading(true)
    setCommutes(await listSavedCommutes(user?.id))
    setLoading(false)
  }, [user])

  useEffect(() => {
    reload()
    setNotifGranted(Notification.permission === 'granted')
    blink.db.stations.list().then(({ data }) => {
      setStations((data || []) as unknown as StationOption[])
    }).catch(() => {})
  }, [reload])

  useEffect(() => {
    if (commutes.length === 0) return
    const interval = setInterval(async () => {
      for (const c of commutes) {
        const delay = await checkDelayForCommute(c)
        if (delay >= 5) fireDelayNotification(c, delay)
      }
    }, 5 * 60_000)
    return () => clearInterval(interval)
  }, [commutes])

  const handleAdd = async () => {
    if (!form.fromId || !form.toId || form.fromId === form.toId) return
    const fromStation = stations.find(s => s.id === form.fromId)
    const toStation = stations.find(s => s.id === form.toId)
    if (!fromStation || !toStation) return
    await saveCommute(
      {
        label: form.label || `${fromStation.name} → ${toStation.name}`,
        from_station_id: form.fromId,
        from_name: fromStation.name,
        to_station_id: form.toId,
        to_name: toStation.name,
      },
      user?.id
    )
    setForm({ label: '', fromId: '', toId: '' })
    setAdding(false)
    reload()
  }

  const handleEnableNotifs = async () => {
    const ok = await requestNotificationPermission()
    setNotifGranted(ok)
  }

  if (!user) {
    return (
      <Card className="bg-secondary/20 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <LogIn className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="font-semibold text-muted-foreground">Sign in to save commutes</p>
          <p className="text-sm text-muted-foreground/60">We'll alert you before delays hit your route.</p>
          <Button onClick={() => blink.auth.login()} className="bg-primary hover:bg-primary/90">Sign In</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <BookmarkPlus className="h-6 w-6" />
          Saved Commutes
        </h2>
        <div className="flex gap-2">
          {!notifGranted && (
            <Button variant="outline" size="sm" onClick={handleEnableNotifs} className="gap-2">
              <Bell className="h-4 w-4" /> Enable alerts
            </Button>
          )}
          {notifGranted && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" /> Alerts on
            </span>
          )}
          <Button size="sm" onClick={() => setAdding(a => !a)} className="gap-2">
            <BookmarkPlus className="h-4 w-4" /> Add commute
          </Button>
        </div>
      </div>

      {adding && (
        <Card className="border-primary/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New saved commute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Label (e.g. Home → Office)"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={form.fromId}
                onChange={e => setForm(f => ({ ...f, fromId: e.target.value }))}
              >
                <option value="">From station…</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={form.toId}
                onChange={e => setForm(f => ({ ...f, toId: e.target.value }))}
              >
                <option value="">To station…</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}

      {!loading && commutes.length === 0 && !adding && (
        <Card className="bg-secondary/20 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <BellOff className="h-12 w-12 text-muted-foreground opacity-20" />
            <p className="font-semibold text-muted-foreground">No saved commutes yet</p>
            <p className="text-sm text-muted-foreground/60">Save a route and we'll alert you to delays before you leave.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {commutes.map(c => (
          <Card key={c.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{c.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7 w-7 p-0"
                  onClick={() => deleteSavedCommute(c.id, user?.id).then(reload)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{c.from_name}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground">{c.to_name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Delay alerts fire automatically every 5 min when delay ≥ 5 min.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
