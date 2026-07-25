import { useEffect, useState, useCallback } from 'react'
import { TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle2, Clock, Flag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { fetchIncidents } from '../../lib/dosmApi'
import { predictLineDelays, LINE_COLORS } from '../../lib/delayPrediction'
import type { LineDelayPrediction } from '../../lib/delayPrediction'
import { submitDelayReport, fetchReportCounts, type ReportCounts } from '../../lib/delayReports'
import type { TransitLineCode } from '../../lib/transitData'

const SEVERITY_COLORS = {
  none: 'bg-green-50 border-green-200',
  minor: 'bg-yellow-50 border-yellow-200',
  moderate: 'bg-orange-50 border-orange-200',
  severe: 'bg-red-50 border-red-200',
}

const SEVERITY_BADGE: Record<LineDelayPrediction['severity'], string> = {
  none: 'bg-green-100 text-green-800',
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
}

function TrendIcon({ trend }: { trend: LineDelayPrediction['trend'] }) {
  if (trend === 'improving') return <TrendingDown className="h-3.5 w-3.5 text-green-600" />
  if (trend === 'worsening') return <TrendingUp className="h-3.5 w-3.5 text-red-600" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

export function DelayPredictionPanel() {
  const [predictions, setPredictions] = useState<LineDelayPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [reportCounts, setReportCounts] = useState<ReportCounts>({})
  const [reporting, setReporting] = useState<TransitLineCode | null>(null)
  const [justReported, setJustReported] = useState<TransitLineCode | null>(null)

  const refreshCounts = useCallback(async () => {
    const counts = await fetchReportCounts()
    setReportCounts(counts)
  }, [])

  useEffect(() => {
    fetchIncidents().then(incidents => {
      setPredictions(predictLineDelays(incidents))
      setLoading(false)
    })
    refreshCounts()
    const interval = setInterval(() => {
      fetchIncidents().then(incidents => setPredictions(predictLineDelays(incidents)))
      refreshCounts()
    }, 60_000)
    return () => clearInterval(interval)
  }, [refreshCounts])

  const handleReport = async (line: TransitLineCode, severity: LineDelayPrediction['severity']) => {
    if (reporting) return
    setReporting(line)
    try {
      await submitDelayReport(line, severity === 'none' ? 'minor' : severity)
      await refreshCounts()
      setJustReported(line)
      setTimeout(() => setJustReported(null), 3000)
    } finally {
      setReporting(null)
    }
  }

  const delayedCount = predictions.filter(p => p.severity !== 'none').length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          AI Delay Prediction
        </CardTitle>
        {!loading && (
          <span className="text-xs text-muted-foreground">
            {delayedCount === 0
              ? 'All lines running normally'
              : `${delayedCount} line${delayedCount > 1 ? 's' : ''} with delays`}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {predictions.map(p => (
              <div
                key={p.line}
                className={`rounded-lg border p-3 space-y-2 transition-all ${SEVERITY_COLORS[p.severity]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${LINE_COLORS[p.line]}`} />
                    <span className="text-sm font-semibold">{p.lineName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendIcon trend={p.trend} />
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SEVERITY_BADGE[p.severity]}`}>
                      {p.severity === 'none' ? 'On Time' : `+${p.estimatedDelay}m`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate max-w-[60%]">{p.cause}</p>
                  <div className="flex items-center gap-1">
                    {p.severity === 'none' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                    )}
                    <span className="text-[10px] text-muted-foreground">{p.confidence}% conf.</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-black/5">
                  <button
                    onClick={() => handleReport(p.line, p.severity)}
                    disabled={reporting === p.line || justReported === p.line}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Flag className="h-3 w-3" />
                    {justReported === p.line
                      ? 'Reported — thanks!'
                      : reporting === p.line
                      ? 'Submitting…'
                      : 'Report delay'}
                  </button>
                  {(reportCounts[p.line] ?? 0) > 0 && (
                    <span className="text-[10px] text-destructive font-semibold">
                      {reportCounts[p.line]} report{reportCounts[p.line] === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
