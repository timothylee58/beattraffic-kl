import { Activity, Clock3, Info, MapPinned, Search, Sparkles, TrainFront } from 'lucide-react'
import { Button } from '../ui/button'
import { RoutePlanner } from '../features/RoutePlanner'

interface HeroSectionProps {
  onPlanRoute: () => void
}

export function HeroSection({ onPlanRoute }: HeroSectionProps) {
  const networkStats = [
    { label: 'Reliability', value: '96%', detail: 'MRT Putrajaya', icon: <Activity className="h-4 w-4" /> },
    { label: 'Crowd pulse', value: '73%', detail: 'Calm network', icon: <Sparkles className="h-4 w-4" /> },
    { label: 'Next best train', value: '4m', detail: 'KL Sentral', icon: <Clock3 className="h-4 w-4" /> },
  ]

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,203,5,0.28),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.32),transparent_30%),linear-gradient(135deg,#02152f_0%,#062b55_48%,#03101f_100%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute left-[-10%] top-24 h-1 w-[120%] rotate-[-8deg] rounded-full bg-yellow-300/70 shadow-[0_0_30px_rgba(255,203,5,0.8)]" />
        <div className="absolute left-[-5%] top-56 h-1 w-[110%] rotate-[6deg] rounded-full bg-sky-400/60 shadow-[0_0_24px_rgba(56,189,248,0.7)]" />
        <div className="absolute bottom-24 left-[-20%] h-1 w-[130%] rotate-[-2deg] rounded-full bg-red-400/60 shadow-[0_0_24px_rgba(248,113,113,0.7)]" />
        <div className="absolute right-8 top-28 h-24 w-24 rounded-full border border-yellow-300/40 bg-yellow-300/10 blur-sm" />
        <div className="absolute bottom-10 left-10 h-36 w-36 rounded-full border border-sky-300/30 bg-sky-300/10 blur-md" />
      </div>

      <div className="container py-12 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-950 shadow-lg shadow-yellow-300/20 animate-fade-in">
              <Info className="h-3 w-3" />
              KL transit command center
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight drop-shadow-lg sm:text-5xl lg:text-7xl">
              BeatTraffic KL turns every line into a live advantage.
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-white/75 sm:text-lg lg:mx-0">
              Plan faster routes, dodge crowded platforms, and react to delays with a commuter cockpit built for Klang Valley rail behavior.
            </p>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button
                className="h-11 bg-accent px-6 font-bold text-accent-foreground hover:bg-accent/90"
                onClick={onPlanRoute}
              >
                <Search className="h-4 w-4 mr-2" />
                Plan a route
              </Button>
              <Button
                variant="secondary"
                className="h-11 border border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => document.getElementById('lines')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <MapPinned className="h-4 w-4 mr-2" />
                Explore line modes
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {networkStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left shadow-xl backdrop-blur-md">
                  <div className="mb-3 flex items-center justify-between text-white/60">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-white/60">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="planner" className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-white/10 blur-2xl" />
            <div className="relative space-y-4 rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-md sm:p-4">
              <div className="flex items-center justify-between px-2 pt-1 text-xs text-white/70">
                <span className="flex items-center gap-2 font-bold uppercase tracking-[0.18em]">
                  <TrainFront className="h-4 w-4 text-accent" />
                  Live journey console
                </span>
                <span className="rounded-full bg-green-400/20 px-2 py-1 font-semibold text-green-100">Online</span>
              </div>
              <RoutePlanner variant="hero" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
