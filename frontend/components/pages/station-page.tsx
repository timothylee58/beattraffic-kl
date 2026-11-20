"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StationIntelligence } from '@/components/features/StationIntelligence'
import { fetchStationCatalog, findStation, catalogDescription, type StationCatalog } from '@/lib/stationCatalog'
import { predictCrowdLevel } from '@/lib/predictiveEngine'

export default function StationPage() {
  const { stationId } = useParams<{ stationId: string }>()
  const router = useRouter()
  const [crowdScore, setCrowdScore] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<StationCatalog | null>(null)
  const station = catalog ? findStation(catalog.stations, stationId) : undefined

  useEffect(() => {
    let cancelled = false
    fetchStationCatalog().then(data => { if (!cancelled) setCatalog(data) })
    return () => { cancelled = true }
  }, [stationId])

  useEffect(() => {
    if (!station) return
    let cancelled = false
    setCrowdScore(null)
    predictCrowdLevel(station, []).then(f => { if (!cancelled) setCrowdScore(f.score) })
    return () => { cancelled = true }
  }, [station])

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-3 h-14">
          <Button variant="ghost" size="icon" aria-label="Back to Home" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">{station?.name ?? stationId} — Station Intelligence</span>
        </div>
      </div>

      <div className="container py-6">
        {catalog && <p role="status" className="mb-4 text-sm text-muted-foreground">{catalogDescription(catalog)}</p>}
        {!catalog ? <p role="status">Loading station…</p> : station ? (
          <StationIntelligence
            stationId={station.id}
            stationName={station.name}
            crowdScore={crowdScore}
          />
        ) : (
          <div className="text-center py-20 space-y-3">
            <p className="text-muted-foreground">Station not found: <code>{stationId}</code></p>
            <Button variant="outline" onClick={() => router.push('/')}>Back to Home</Button>
          </div>
        )}
      </div>
    </div>
  )
}
