import { Fragment } from 'react'
import { Activity } from 'lucide-react'

export interface LineStatus {
  line: string
  status: string
  waitingTime: number
  crowdLevel: string
  dataAvailable?: boolean
}

interface LiveTickerProps {
  lineStatus: LineStatus[]
}

export function LiveTicker({ lineStatus }: LiveTickerProps) {
  return (
    <div className="relative bg-[#031733] border-b border-white/10 py-2.5 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#031733] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#031733] to-transparent z-10" />
      <div className="animate-marquee flex items-center gap-3 whitespace-nowrap">
        {[...Array(2)].map((_, copy) => (
          <Fragment key={copy}>
            <div className="flex items-center gap-2 text-xs font-bold text-accent shrink-0 uppercase tracking-widest pl-4">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-glow-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <Activity className="h-3 w-3" />
              Live Network
            </div>
            {lineStatus.map((s) => (
              <div
                key={`${copy}-${s.line}`}
                className="flex items-center gap-2 text-xs shrink-0 bg-white/5 border border-white/10 rounded-full px-3 py-1"
              >
                <span className="font-bold text-white">{s.line}</span>
                {s.dataAvailable === false ? (
                  <span className="text-white/40 italic">data coming soon</span>
                ) : (
                  <>
                    <span className={s.status === 'Normal' ? 'text-emerald-400 font-semibold' : 'text-destructive font-bold'}>
                      {s.status}
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/60">{s.waitingTime}m wait</span>
                  </>
                )}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
