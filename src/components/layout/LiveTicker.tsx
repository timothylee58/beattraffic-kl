import { Fragment } from 'react'
import { Activity } from 'lucide-react'

export interface LineStatus {
  line: string
  status: string
  waitingTime: number
  crowdLevel: string
}

interface LiveTickerProps {
  lineStatus: LineStatus[]
}

export function LiveTicker({ lineStatus }: LiveTickerProps) {
  return (
    <div className="bg-primary/5 border-b py-2 overflow-hidden">
      <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
        {[...Array(2)].map((_, copy) => (
          <Fragment key={copy}>
            <div className="flex items-center gap-2 text-xs font-bold text-primary shrink-0 uppercase tracking-widest">
              <Activity className="h-3 w-3" />
              Live Network
            </div>
            {lineStatus.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs shrink-0">
                <span className="font-bold">{s.line}:</span>
                <span className={s.status === 'Normal' ? 'text-green-600' : 'text-destructive font-bold'}>
                  {s.status}
                </span>
                <span className="text-muted-foreground">• {s.waitingTime}m wait</span>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
