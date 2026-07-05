import { Sparkles } from 'lucide-react'
import { Reveal } from '../motion/Reveal'

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
    <section id="roadmap" className="py-20 bg-background relative">
      <div className="container">
        <Reveal>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">Elevate the App</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              AI crowd prediction, offline routing, Shah Alam Line integration, and state-by-state expansion already mapped on the roadmap.
            </p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {ROADMAP.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <div className="group p-6 border rounded-2xl bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 space-y-3 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-accent/10 group-hover:bg-accent/20 blur-xl transition-colors" />
                <div className="flex items-center gap-3 text-primary font-semibold relative">
                  <Sparkles className="h-5 w-5 text-accent group-hover:animate-glow-pulse" />
                  {item.title}
                </div>
                <p className="text-sm text-muted-foreground relative">{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
