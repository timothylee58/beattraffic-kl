import { useEffect, useState } from 'react'
import { Star, MapPin, Clock, ArrowRightLeft, Trash2, Plus, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import { blink } from '../../lib/blink'

interface SavedRoute {
  id: string
  fromId: string
  fromName: string
  toId: string
  toName: string
  useCount: number
}

interface Suggestion {
  label: string
  reason: string
  fromName: string
  toName: string
}

function getTimeSuggestion(): Suggestion | null {
  const h = new Date().getHours()
  if (h >= 6 && h <= 9) return { label: 'Morning Commute', reason: 'Based on your AM travel pattern', fromName: 'Home Station', toName: 'Office Station' }
  if (h >= 11 && h <= 13) return { label: 'Lunch Route', reason: 'Mid-day trip to food area', fromName: 'Office Station', toName: 'Bukit Bintang' }
  if (h >= 17 && h <= 20) return { label: 'Evening Return', reason: 'Your usual homebound route', fromName: 'Office Station', toName: 'Home Station' }
  return null
}

export function PersonalCommuteAssistant() {
  const { user, isAuthenticated } = useAuth()
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(false)
  const suggestion = getTimeSuggestion()

  const greeting = () => {
    const h = new Date().getHours()
    const name = user?.displayName?.split(' ')[0] || 'Commuter'
    if (h < 12) return `Good morning, ${name}`
    if (h < 17) return `Good afternoon, ${name}`
    return `Good evening, ${name}`
  }

  useEffect(() => {
    if (!user) return
    const stored = localStorage.getItem(`beattraffic-routes-${user.id}`)
    if (stored) setSavedRoutes(JSON.parse(stored))
  }, [user])

  const saveRoute = async () => {
    if (!user) { blink.auth.login(); return }
    const newRoute: SavedRoute = {
      id: Date.now().toString(),
      fromId: 'KJ16', fromName: 'KL Sentral',
      toId: 'MR6', toName: 'Bukit Bintang',
      useCount: 1,
    }
    const updated = [...savedRoutes, newRoute]
    setSavedRoutes(updated)
    localStorage.setItem(`beattraffic-routes-${user.id}`, JSON.stringify(updated))
  }

  const removeRoute = (id: string) => {
    if (!user) return
    const updated = savedRoutes.filter(r => r.id !== id)
    setSavedRoutes(updated)
    localStorage.setItem(`beattraffic-routes-${user.id}`, JSON.stringify(updated))
  }

  const bumpCount = (id: string) => {
    if (!user) return
    const updated = savedRoutes.map(r => r.id === id ? { ...r, useCount: r.useCount + 1 } : r)
    setSavedRoutes(updated)
    localStorage.setItem(`beattraffic-routes-${user.id}`, JSON.stringify(updated))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Personal Commute Assistant
        </CardTitle>
        {isAuthenticated && (
          <p className="text-sm text-muted-foreground">{greeting()}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated ? (
          <div className="text-center py-6 space-y-3">
            <Star className="h-10 w-10 text-muted-foreground opacity-20 mx-auto" />
            <p className="text-sm text-muted-foreground">Sign in to save your favourite routes and get personalised suggestions.</p>
            <Button onClick={() => blink.auth.login()} size="sm">Sign In</Button>
          </div>
        ) : (
          <>
            {/* Time-based suggestion */}
            {suggestion && (
              <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-accent">{suggestion.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                  {suggestion.fromName}
                  <ArrowRightLeft className="h-3 w-3 mx-1 text-muted-foreground" />
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {suggestion.toName}
                </div>
                <Button size="sm" className="w-full mt-1">Plan This Journey</Button>
              </div>
            )}

            {/* Saved routes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Saved Routes</span>
                <Button size="sm" variant="ghost" onClick={saveRoute} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Save Current
                </Button>
              </div>
              {savedRoutes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No saved routes yet. Plan a journey and save it here.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...savedRoutes].sort((a, b) => b.useCount - a.useCount).map(route => (
                    <div key={route.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm font-medium truncate">
                          <span>{route.fromName}</span>
                          <ArrowRightLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{route.toName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Used {route.useCount}×</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bumpCount(route.id)}>
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRoute(route.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
