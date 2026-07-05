import { Reveal } from '../motion/Reveal'

interface Line {
  name: string
  short: string
  color: string
  glow: string
  usp: string
  detail: string
  comingSoon?: boolean
}

const LINES: Line[] = [
  { name: 'MRT Putrajaya Line (Yellow)', short: 'PY', color: 'bg-yellow-400', glow: 'hover:shadow-yellow-400/30 hover:border-yellow-400/40', usp: 'Speed & Reliability Predictor', detail: 'Predicts fast-track windows and best transfer combos.' },
  { name: 'MRT Kajang Line', short: 'KJ', color: 'bg-blue-500', glow: 'hover:shadow-blue-500/30 hover:border-blue-500/40', usp: 'Speed & Reliability Predictor', detail: 'Optimizes cross-city reliability with time-of-day acceleration tips.' },
  { name: 'LRT Ampang Line', short: 'AG', color: 'bg-orange-500', glow: 'hover:shadow-orange-500/30 hover:border-orange-500/40', usp: 'Delay Survival Mode', detail: 'Auto-reroutes with bus bridges and split-line alerts.' },
  { name: 'LRT Sri Petaling Line', short: 'SP', color: 'bg-orange-600', glow: 'hover:shadow-orange-600/30 hover:border-orange-600/40', usp: 'Delay Survival Mode', detail: 'Highlights disruption-safe transfers and platform dwell forecasts.' },
  { name: 'LRT Kelana Jaya Line', short: 'KJL', color: 'bg-red-500', glow: 'hover:shadow-red-500/30 hover:border-red-500/40', usp: 'Crowd Heatmap & Coach Load', detail: 'Coach-level occupancy and platform crowd heatmaps.' },
  { name: 'KL Monorail', short: 'MR', color: 'bg-pink-500', glow: 'hover:shadow-pink-500/30 hover:border-pink-500/40', usp: 'Tourist & Short-Hop Optimizer', detail: 'Attraction scoring and short-hop last-mile nudges.' },
  { name: 'KTM Komuter', short: 'KTM', color: 'bg-indigo-500', glow: 'hover:shadow-indigo-500/30 hover:border-indigo-500/40', usp: 'Long-Distance Reliability & Seat Finder', detail: 'Seat probability prediction and transfer buffering.' },
  { name: 'Shah Alam Line (BRT)', short: 'BRT', color: 'bg-teal-500', glow: 'hover:shadow-teal-500/30 hover:border-teal-500/40', usp: 'First-Mile & Last-Mile Connector', detail: 'Integrates bus rapid transit corridors with rail hubs across Shah Alam and Klang — data integration in progress.', comingSoon: true },
]

export function LineIntelligenceSection() {
  return (
    <section id="lines" className="py-20 bg-background relative">
      <div className="container">
        <Reveal>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">Line-Aware Intelligence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every KL rail line ships with a dedicated USP and UI mode tuned for Malaysia-specific commuter pain points.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LINES.map((line, index) => (
            <Reveal key={line.name} delay={(index % 3) * 0.08}>
              <div
                className={`group p-6 border rounded-2xl bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${line.glow} ${line.comingSoon ? 'opacity-80' : ''}`}
              >
                {line.comingSoon && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full border border-accent/30">
                    Coming Soon
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-xl ${line.color} flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-110 transition-transform`}>
                    {line.short}
                  </div>
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full w-1/3 ${line.color} rounded-full group-hover:w-full transition-all duration-700 ease-out`} />
                  </div>
                </div>
                <h3 className="font-bold text-lg text-primary">{line.name}</h3>
                <p className="text-sm font-semibold text-accent mt-2">{line.usp}</p>
                <p className="text-sm text-muted-foreground mt-2">{line.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
