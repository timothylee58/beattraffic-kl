import { Bus, Train, Shuffle, Star, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { getAlternativeRoutes } from '../../lib/alternativeRoutes'
import type { AlternativeRoute } from '../../lib/alternativeRoutes'

const MODE_ICONS = {
  rail: <Train className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  mixed: <Shuffle className="h-4 w-4" />,
}

const RELIABILITY_COLOR = (r: number) =>
  r >= 85 ? 'text-green-600' : r >= 70 ? 'text-yellow-600' : 'text-red-600'

interface Props {
  delayMinutes: number
  onSelect: (route: AlternativeRoute) => void
}

export function AlternativeRoutePanel({ delayMinutes, onSelect }: Props) {
  const routes = getAlternativeRoutes(delayMinutes)
  if (routes.length === 0) return null

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-orange-800 flex items-center gap-2">
          <Shuffle className="h-4 w-4" />
          Smart Alternative Routes
          <span className="text-xs font-normal text-orange-600 ml-1">
            ~{delayMinutes}m delay detected on your line
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {routes.map(route => (
          <div
            key={route.id}
            className={`bg-white rounded-xl border p-4 space-y-3 ${route.isRecommended ? 'border-primary ring-1 ring-primary/20' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-primary">{MODE_ICONS[route.mode]}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{route.label}</span>
                    {route.isRecommended && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        <Star className="h-2.5 w-2.5" />
                        Best
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    {route.via.map((stop, i) => (
                      <span key={stop} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                        {stop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onSelect(route)} className="shrink-0">
                Select
              </Button>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {route.duration} min
              </span>
              <span>{route.transfers} transfer{route.transfers !== 1 ? 's' : ''}</span>
              <span className={`font-semibold ${RELIABILITY_COLOR(route.reliability)}`}>
                {route.reliability}% reliable
              </span>
              <span className="ml-auto font-semibold text-primary">RM {route.fare.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
