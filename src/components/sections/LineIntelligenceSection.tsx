const LINES = [
  { name: 'MRT Putrajaya Line (Yellow)', color: 'bg-yellow-400', usp: 'Speed & Reliability Predictor', detail: 'Predicts fast-track windows and best transfer combos.' },
  { name: 'MRT Kajang Line', color: 'bg-blue-500', usp: 'Speed & Reliability Predictor', detail: 'Optimizes cross-city reliability with time-of-day acceleration tips.' },
  { name: 'LRT Ampang Line', color: 'bg-orange-500', usp: 'Delay Survival Mode', detail: 'Auto-reroutes with bus bridges and split-line alerts.' },
  { name: 'LRT Sri Petaling Line', color: 'bg-orange-600', usp: 'Delay Survival Mode', detail: 'Highlights disruption-safe transfers and platform dwell forecasts.' },
  { name: 'LRT Kelana Jaya Line', color: 'bg-red-500', usp: 'Crowd Heatmap & Coach Load', detail: 'Coach-level occupancy and platform crowd heatmaps.' },
  { name: 'KL Monorail', color: 'bg-pink-500', usp: 'Tourist & Short-Hop Optimizer', detail: 'Attraction scoring and short-hop last-mile nudges.' },
  { name: 'KTM Komuter', color: 'bg-indigo-500', usp: 'Long-Distance Reliability & Seat Finder', detail: 'Seat probability prediction and transfer buffering.' },
]

export function LineIntelligenceSection() {
  return (
    <section id="lines" className="py-20 bg-background">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Line-Aware Intelligence</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every KL rail line ships with a dedicated USP and UI mode tuned for Malaysia-specific commuter pain points.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LINES.map((line) => (
            <div key={line.name} className="p-6 border rounded-2xl bg-card shadow-sm hover:shadow-lg transition-all">
              <div className={`w-12 h-1.5 rounded-full ${line.color} mb-4`} />
              <h3 className="font-bold text-lg text-primary">{line.name}</h3>
              <p className="text-sm font-semibold text-accent mt-2">{line.usp}</p>
              <p className="text-sm text-muted-foreground mt-2">{line.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
