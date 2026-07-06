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
          {t.lines.items.map((line, index) => {
            const meta = LINE_META[index]
            const badge = meta.badge

            return (
              <Reveal key={meta.short} delay={(index % 3) * 0.08}>
                <motion.div
                  className={`group p-6 border rounded-2xl bg-card shadow-sm relative overflow-hidden ${meta.glow} ${badge === 'comingSoon' ? 'opacity-80' : ''}`}
                  whileHover={{ y: -6, boxShadow: '0 20px 40px -15px rgb(0 0 0 / 0.15)' }}
                  transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                >
                  {badge === 'new' && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30"
                    >
                      {t.lines.badgeNew}
                    </motion.span>
                  )}
                  {badge === 'comingSoon' && (
                    <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full border border-accent/30">
                      {t.lines.badgeComingSoon}
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-11 w-11 rounded-xl ${meta.color} flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-110 transition-transform`}>
                      {meta.short}
                    </div>
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full ${meta.color} rounded-full`}
                        initial={{ width: '33%' }}
                        whileHover={{ width: '100%' }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-primary pr-16">{line.name}</h3>
                  <p className="text-sm font-semibold text-accent mt-2">{line.usp}</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{line.detail}</p>
                </motion.div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
