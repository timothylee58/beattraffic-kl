import { motion } from 'framer-motion'
import { Reveal } from '../motion/Reveal'
import { useLanguage } from '../../contexts/LanguageContext'
import { LINE_META } from '../../data/lines'

export function LineIntelligenceSection() {
  const { t } = useLanguage()

  return (
    <section id="lines" className="py-20 bg-background relative">
      <div className="container">
        <Reveal>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">{t.lines.title}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.lines.subtitle}</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LINES.map((line, index) => (
            <Reveal key={line.name} delay={(index % 3) * 0.08}>
              <motion.div
                className={`group p-6 border rounded-2xl bg-card shadow-sm relative overflow-hidden ${line.glow} ${line.comingSoon ? 'opacity-80' : ''}`}
                whileHover={{ y: -6, boxShadow: '0 20px 40px -15px rgb(0 0 0 / 0.15)' }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              >
                {line.comingSoon && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full border border-accent/30">
                    Coming Soon
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-xl ${line.color} flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-110 transition-transform`}>
                    {line.short}
                  </div>
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full w-1/3 ${line.color} rounded-full group-hover:w-full transition-all duration-700 ease-out`} />
                  </div>
                </div>
                <h3 className="font-bold text-lg text-primary">{line.name}</h3>
                <p className="text-sm font-semibold text-accent mt-2">{line.usp}</p>
                <p className="text-sm text-muted-foreground mt-2">{line.detail}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
