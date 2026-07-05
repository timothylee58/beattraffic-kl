import { Clock, CreditCard, ShieldCheck } from 'lucide-react'
import { FeatureCard } from '../features/FeatureCard'
import { Reveal } from '../motion/Reveal'

export function FeaturesSection() {
  return (
    <section className="bg-secondary/30 py-14 sm:py-20 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[120%] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" />
      <div className="container relative">
        <Reveal>
          <div className="text-center space-y-4 mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full">
              Why It's Different
            </span>
            <h2 className="text-3xl font-bold text-primary">Why BeatTraffic KL Beats Moovit</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Line-aware intelligence means every line behaves differently — and so does the experience.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          <Reveal delay={0}>
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-primary transition-colors" />}
              title="Real-time Tracking"
              description="Never miss a train with our precise real-time arrival and departure information."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <FeatureCard
              icon={<CreditCard className="h-8 w-8 text-primary transition-colors" />}
              title="Digital Ticketing"
              description="One tap for QR tickets, auto top-up, and fare caps tailored to Klang Valley commuters."
            />
          </Reveal>
          <Reveal delay={0.2}>
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8 text-primary transition-colors" />}
              title="Safety First"
              description="Alerts, incident clusters, and safe-walk guidance for late-night trips."
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
