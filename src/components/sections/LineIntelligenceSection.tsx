interface Line {
  name: string
  color: string
  glow: string
  usp: string
  detail: string
  comingSoon?: boolean
}

const LINES: Line[] = [
  { name: 'MRT Putrajaya Line', color: 'bg-yellow-400', glow: 'shadow-yellow-300/50', usp: 'Speed & Reliability Predictor', detail: 'Predicts fast-track windows and best transfer combos.' },
  { name: 'MRT Kajang Line', color: 'bg-blue-500', glow: 'shadow-blue-400/40', usp: 'Speed & Reliability Predictor', detail: 'Optimizes cross-city reliability with time-of-day acceleration tips.' },
  { name: 'LRT Ampang Line', color: 'bg-orange-500', glow: 'shadow-orange-400/40', usp: 'Delay Survival Mode', detail: 'Auto-reroutes with bus bridges and split-line alerts.' },
  { name: 'LRT Sri Petaling Line', color: 'bg-orange-600', glow: 'shadow-orange-500/40', usp: 'Delay Survival Mode', detail: 'Highlights disruption-safe transfers and platform dwell forecasts.' },
  { name: 'LRT Kelana Jaya Line', color: 'bg-red-500', glow: 'shadow-red-400/40', usp: 'Crowd Heatmap & Coach Load', detail: 'Coach-level occupancy and platform crowd heatmaps.' },
  { name: 'KL Monorail', color: 'bg-pink-500', glow: 'shadow-pink-400/40', usp: 'Tourist & Short-Hop Optimizer', detail: 'Attraction scoring and short-hop last-mile nudges.' },
  { name: 'KTM Komuter', color: 'bg-indigo-500', glow: 'shadow-indigo-400/40', usp: 'Long-Distance Reliability & Seat Finder', detail: 'Seat probability prediction and transfer buffering.' },
  { name: 'Shah Alam Line (BRT)', color: 'bg-teal-500', glow: 'shadow-teal-400/40', usp: 'First-Mile & Last-Mile Connector', detail: 'Integrates BRT corridors with rail hubs across Shah Alam and Klang as data comes online.', comingSoon: true },
]

export function LineIntelligenceSection() {
  return (
    <section id="lines" className="relative overflow-hidden bg-slate-950 py-20 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:28px_28px]" />
      <div className="container">
        <div className="relative mx-auto mb-12 max-w-3xl space-y-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Line modes</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Every rail line gets its own intelligence layer.</h2>
          <p className="text-white/65">
            Every KL rail line ships with a dedicated USP and UI mode tuned for Malaysia-specific commuter pain points.
          </p>
        </div>

        <div className="relative grid gap-4 lg:grid-cols-2">
          {LINES.map((line, index) => (
            <div
              key={line.name}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/[0.1] ${line.comingSoon ? 'opacity-80' : ''}`}
            >
              <div className={`absolute left-0 top-0 h-full w-1.5 ${line.color}`} />
              {line.comingSoon && (
                <span className="absolute right-4 top-4 rounded-full border border-accent/30 bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                  Coming Soon
                </span>
              )}
              <div className="flex gap-4">
                <div className="relative hidden w-28 shrink-0 sm:block">
                  <div className={`absolute left-1/2 top-2 h-[calc(100%-1rem)] w-1 -translate-x-1/2 rounded-full ${line.color} shadow-2xl ${line.glow}`} />
                  {[0, 1, 2].map((node) => (
                    <div
                      key={node}
                      className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-slate-950"
                      style={{ top: `${node * 42 + 8}px` }}
                    />
                  ))}
                  <div className={`absolute left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white ${line.color} shadow-xl ${line.glow}`} style={{ top: `${(index % 3) * 42 + 3}px` }} />
                </div>
                <div className="min-w-0 flex-1 space-y-3 pl-2">
                  <div className={`h-1.5 w-16 rounded-full ${line.color} shadow-xl ${line.glow} sm:hidden`} />
                  <h3 className="pr-24 text-lg font-black text-white sm:pr-0">{line.name}</h3>
                  <p className="text-sm font-bold text-accent">{line.usp}</p>
                  <p className="text-sm leading-6 text-white/65">{line.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
