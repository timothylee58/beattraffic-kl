import { Clock, CreditCard, ShieldCheck } from 'lucide-react'
import { FeatureCard } from '../features/FeatureCard'
import { Reveal } from '../motion/Reveal'
import { useLanguage } from '../../contexts/LanguageContext'

const FEATURE_ICONS = [
  <Clock className="h-8 w-8 text-primary transition-colors" />,
  <CreditCard className="h-8 w-8 text-primary transition-colors" />,
  <ShieldCheck className="h-8 w-8 text-primary transition-colors" />,
]

export function FeaturesSection() {
  const { t } = useLanguage()

  return (
    <section className="bg-secondary/30 py-20 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[120%] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" />
      <div className="container relative">
        <Reveal>
          <div className="text-center space-y-4 mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full">
              {t.features.badge}
            </span>
            <h2 className="text-3xl font-bold text-primary">{t.features.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.features.subtitle}</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          {t.features.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.1}>
              <FeatureCard icon={FEATURE_ICONS[index]} title={item.title} description={item.description} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
