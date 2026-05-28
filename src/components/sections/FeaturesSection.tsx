import { Clock, CreditCard, ShieldCheck } from 'lucide-react'
import { FeatureCard } from '../features/FeatureCard'

export function FeaturesSection() {
  return (
    <section className="bg-secondary/30 py-20 relative">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold text-primary">Why BeatTraffic KL Beats Moovit</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Line-aware intelligence means every line behaves differently — and so does the experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Clock className="h-8 w-8 text-primary" />}
            title="Real-time Tracking"
            description="Never miss a train with our precise real-time arrival and departure information."
          />
          <FeatureCard
            icon={<CreditCard className="h-8 w-8 text-primary" />}
            title="Digital Ticketing"
            description="One tap for QR tickets, auto top-up, and fare caps tailored to Klang Valley commuters."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-8 w-8 text-primary" />}
            title="Safety First"
            description="Alerts, incident clusters, and safe-walk guidance for late-night trips."
          />
        </div>
      </div>
    </section>
  )
}
