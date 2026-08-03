import { Info, MapPinned, Search, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../ui/button'
import { RailBackdrop } from '../decor/RailBackdrop'
import { AnimatedCounter } from '../motion/AnimatedCounter'
import { GradientText } from '../motion/GradientText'
import { MotionButton } from '../motion/MotionButton'
import { TiltCard } from '../motion/TiltCard'
import { EASE_OUT_EXPO, fadeUp, staggerContainer } from '../motion/variants'
import { useLanguage } from '../../contexts/LanguageContext'

interface HeroSectionProps {
  onPlanRoute: () => void
}

export function HeroSection({ onPlanRoute }: HeroSectionProps) {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-[min(100dvh,720px)] flex items-center justify-center overflow-hidden bg-[#031733] px-4 sm:px-6">
      <div className="absolute inset-0 z-0 bg-mesh-gradient opacity-80" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#031733]/20 via-[#031733]/70 to-[#031733]" />
      <RailBackdrop className="absolute inset-0 z-[1] h-full w-full opacity-70" />

      <motion.div
        className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 14, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-20 w-full max-w-6xl mx-auto py-12 sm:py-16 lg:py-20 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-16 items-center justify-items-center">
          <motion.div
            variants={staggerContainer(0.12, 0.1)}
            initial="hidden"
            animate="visible"
            className="w-full max-w-xl lg:max-w-none space-y-5 text-center lg:text-left lg:justify-self-end lg:pr-4 xl:pr-8"
          >
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-bold uppercase tracking-widest mx-auto lg:mx-0"
            >
              <span className="relative flex h-2 w-2">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-accent"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <Info className="h-3 w-3" />
              Moovit-beating intelligence for Malaysia
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
              className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.15] drop-shadow-lg"
            >
              BeatTraffic — <GradientText className="italic">line-aware transit intelligence</GradientText> that actually gets you around Klang Valley.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
              className="text-base sm:text-lg text-white/70 max-w-lg mx-auto lg:mx-0 drop-shadow"
            >
              Smart route planning, crowd prediction, and offline routing built on OpenStreetMap + MapLibre + GTFS.
              Every line has its own AI-driven advantage so you arrive faster and less stressed.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
              className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start pt-1"
            >
              <MotionButton>
                <Button
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6 shadow-[0_0_30px_-5px_hsl(var(--accent))] hover:shadow-[0_0_45px_-5px_hsl(var(--accent))] transition-shadow"
                  onClick={onPlanRoute}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Plan a route
                </Button>
              </MotionButton>
              <MotionButton>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto glass-panel hover:bg-white/20 text-white"
                  onClick={() => document.getElementById('lines')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <MapPinned className="h-4 w-4 mr-2" />
                  Explore live map
                </Button>
              </MotionButton>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT_EXPO }}
            className="w-full max-w-md lg:max-w-none lg:justify-self-start lg:pl-4 xl:pl-8"
          >
            <TiltCard className="glass-panel glow-ring rounded-3xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/60">AI Crowd Pulse</p>
                  <p className="text-2xl font-bold text-white">
                    <AnimatedCounter value={73} suffix="% calm" />
                  </p>
                </div>
                <motion.div
                  className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center relative"
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="absolute inset-0 rounded-2xl bg-accent/30 blur-lg animate-glow-pulse" />
                  <Sparkles className="h-6 w-6 text-accent relative" />
                </motion.div>
              </div>

              <motion.div
                variants={staggerContainer(0.08, 0.35)}
                initial="hidden"
                animate="visible"
                className="space-y-3 text-sm text-white/80"
              >
                {PULSE_LINES.map((line, index) => (
                  <motion.div
                    key={line.name}
                    variants={fadeUp}
                    transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                    className="flex items-center justify-between"
                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  >
                    <span className="flex items-center gap-2">
                      <motion.span
                        className={`h-1.5 w-1.5 rounded-full ${line.dot}`}
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.4 }}
                      />
                      {line.name}
                    </span>
                    <span className="font-bold text-white">
                      {line.label} <AnimatedCounter value={line.metric} suffix={line.suffix} />
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5, ease: EASE_OUT_EXPO }}
                className="glass-panel rounded-2xl p-4 text-xs text-white/70 border-white/10"
              >
                Offline-ready routing + 45k cached POIs across Klang Valley. Syncs when you reconnect.
              </motion.div>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
