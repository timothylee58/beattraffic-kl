import { Sparkles } from 'lucide-react'
import { Reveal } from '../motion/Reveal'
import { useLanguage } from '../../contexts/LanguageContext'

export function RoadmapSection() {
  const { t } = useLanguage()

  return (
    <section id="roadmap" className="py-20 bg-background relative">
      <div className="container">
        <Reveal>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">{t.roadmap.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.roadmap.subtitle}</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.roadmap.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <div className="group p-6 border rounded-2xl bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 space-y-3 relative overflow-hidden h-full">
                <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-accent/10 group-hover:bg-accent/20 blur-xl transition-colors" />
                <div className="flex items-center gap-3 text-primary font-semibold relative">
                  <Sparkles className="h-5 w-5 text-accent group-hover:animate-glow-pulse" />
                  {item.title}
                </div>
                <p className="text-sm text-muted-foreground relative leading-relaxed">{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
