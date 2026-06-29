import { Sparkles } from 'lucide-react'

const ROADMAP = [
  {
    title: 'AI Crowd Prediction',
    detail: 'Blends ridership history, events, and weather to forecast coach load 30 minutes ahead.',
  },
  {
    title: 'Offline Routing',
    detail: 'Store GTFS fragments + walking graphs for reliable routing even without data.',
  },
  {
    title: 'Shah Alam Line Integration',
    detail: 'First-mile/last-mile BRT data pipeline — GTFS feed, station mapping, and fare integration underway as the line launches.',
  },
  {
    title: 'State-by-State Expansion',
    detail: 'Johor → Penang → Sarawak with localized operator feeds and fare rules.',
  },
]

export function RoadmapSection() {
  return (
    <section id="roadmap" className="py-20 bg-background">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Elevate the App</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            AI crowd prediction, offline routing, Shah Alam Line integration, and state-by-state expansion already mapped on the roadmap.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {ROADMAP.map((item) => (
            <div key={item.title} className="p-6 border rounded-2xl bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-3 text-primary font-semibold">
                <Sparkles className="h-5 w-5 text-accent" />
                {item.title}
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
