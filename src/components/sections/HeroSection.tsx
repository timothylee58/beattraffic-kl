import { Info, MapPinned, Search, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../ui/button'
import { RailBackdrop } from '../decor/RailBackdrop'
import { AnimatedCounter } from '../motion/AnimatedCounter'

interface HeroSectionProps {
  onPlanRoute: () => void
}

const PULSE_LINES = [
  { name: 'MRT Putrajaya', metric: 96, suffix: '%', label: 'Reliability', dot: 'bg-yellow-400' },
  { name: 'LRT Kelana Jaya', metric: 4, suffix: '/10', label: 'Crowd', dot: 'bg-red-500' },
  { name: 'KTM Komuter', metric: 68, suffix: '%', label: 'Seats', dot: 'bg-indigo-400' },
]

export function HeroSection({ onPlanRoute }: HeroSectionProps) {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-[#031733]">
      <div className="absolute inset-0 z-0 bg-mesh-gradient opacity-80" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#031733]/20 via-[#031733]/70 to-[#031733]" />
      <RailBackdrop className="absolute inset-0 z-[1] h-full w-full opacity-70" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-float" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="container relative z-20 text-white space-y-8 py-16">
        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5 text-center mx-auto md:text-left md:mx-0"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-bold uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-glow-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <Info className="h-3 w-3" />
              Moovit-beating intelligence for Malaysia
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-lg">
              BeatTraffic KL — <span className="text-gradient-brand italic">line-aware transit</span> that actually gets you there.
            </h1>
            <p className="text-lg text-white/70 max-w-xl drop-shadow">
              Smart route planning, crowd prediction, and offline routing built on OpenStreetMap + MapLibre + GTFS.
              Every line has its own AI-driven advantage so you arrive faster and less stressed.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6 shadow-[0_0_30px_-5px_hsl(var(--accent))] hover:shadow-[0_0_45px_-5px_hsl(var(--accent))] transition-shadow"
                onClick={onPlanRoute}
              >
                <Search className="h-4 w-4 mr-2" />
                Plan a route
              </Button>
              <Button
                variant="secondary"
                className="glass-panel hover:bg-white/20 text-white"
                onClick={() => document.getElementById('lines')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <MapPinned className="h-4 w-4 mr-2" />
                Explore live map
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel glow-ring rounded-3xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60">AI Crowd Pulse</p>
                <p className="text-2xl font-bold text-white">
                  <AnimatedCounter value={73} suffix="% calm" />
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center relative">
                <span className="absolute inset-0 rounded-2xl bg-accent/30 blur-lg animate-glow-pulse" />
                <Sparkles className="h-6 w-6 text-accent relative" />
              </div>
            </div>
            <div className="space-y-3 text-sm text-white/80">
              {PULSE_LINES.map((line) => (
                <div key={line.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${line.dot}`} />
                    {line.name}
                  </span>
                  <span className="font-bold text-white">
                    {line.label} <AnimatedCounter value={line.metric} suffix={line.suffix} />
                  </span>
                </div>
              ))}
            </div>
            <div className="glass-panel rounded-2xl p-4 text-xs text-white/70 border-white/10">
              Offline-ready routing + 45k cached POIs across Klang Valley. Syncs when you reconnect.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
