import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { StationIntelligence } from '../components/features/StationIntelligence'
import { fallbackStations } from '../lib/transitData'
import { predictCrowdLevel } from '../lib/predictiveEngine'

export default function StationPage() {
  const { stationId } = useParams<{ stationId: string }>()
  const navigate = useNavigate()
  const [crowdScore, setCrowdScore] = useState(40)

  const station = fallbackStations.find(s => s.id === stationId)

  useEffect(() => {
    if (!station) return
    predictCrowdLevel(station, []).then(f => setCrowdScore(f.score))
  }, [station?.id])

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-3 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">{station?.name ?? stationId} — Station Intelligence</span>
        </div>
      </div>

      <div className="container py-6">
        {station ? (
          <StationIntelligence
            stationId={station.id}
            stationName={station.name}
            crowdScore={crowdScore}
          />
        ) : (
          <div className="text-center py-20 space-y-3">
            <p className="text-muted-foreground">Station not found: <code>{stationId}</code></p>
            <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        )}
      </div>
    </div>
  )
}
