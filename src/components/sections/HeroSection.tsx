import { Info, MapPinned, Search, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'

interface HeroSectionProps {
  onPlanRoute: () => void
}

export function HeroSection({ onPlanRoute }: HeroSectionProps) {
  return (
    <section className="relative h-[520px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 z-10" />
        <img
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000"
          alt="Malaysia Transit"
          className="w-full h-full object-cover scale-105 animate-pulse-slow"
        />
      </div>

      <div className="container relative z-20 text-white space-y-8">
        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div className="space-y-5 text-center mx-auto md:text-left md:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest animate-fade-in">
              <Info className="h-3 w-3" />
              Moovit-beating intelligence for Malaysia
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-lg">
              BeatTraffic KL — <span className="text-accent italic">line-aware transit</span> that actually gets you there.
            </h1>
            <p className="text-lg text-white/80 max-w-xl drop-shadow">
              Smart route planning, crowd prediction, and offline routing built on OpenStreetMap + MapLibre + GTFS.
              Every line has its own AI-driven advantage so you arrive faster and less stressed.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6"
                onClick={onPlanRoute}
              >
                <Search className="h-4 w-4 mr-2" />
                Plan a route
              </Button>
              <Button
                variant="secondary"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                onClick={() => document.getElementById('lines')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <MapPinned className="h-4 w-4 mr-2" />
                Explore live map
              </Button>
            </div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-3xl p-6 backdrop-blur-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60">AI Crowd Pulse</p>
                <p className="text-2xl font-bold text-white">73% calm</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span>MRT Putrajaya</span>
                <span className="font-bold text-white">Reliability 96%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>LRT Kelana Jaya</span>
                <span className="font-bold text-white">Crowd 4/10</span>
              </div>
              <div className="flex items-center justify-between">
                <span>KTM Komuter</span>
                <span className="font-bold text-white">Seats 68%</span>
              </div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 text-xs text-white/80">
              Offline-ready routing + 45k cached POIs across Klang Valley. Syncs when you reconnect.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
