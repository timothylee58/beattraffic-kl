import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { EASE_OUT_EXPO } from '../motion/variants'

export interface LineStatus {
  line: string
  status: string
  waitingTime: number
  crowdLevel: string
  dataAvailable?: boolean
}

interface LiveTickerProps {
  lineStatus: LineStatus[]
}

export function LiveTicker({ lineStatus }: LiveTickerProps) {
  const { t } = useLanguage()

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: EASE_OUT_EXPO }}
      className="relative bg-[#031733] border-b border-white/10 py-2.5 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#031733] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#031733] to-transparent z-10" />
      <div className="animate-marquee flex items-center gap-3 whitespace-nowrap">
        {[...Array(2)].map((_, copy) => (
          <Fragment key={copy}>
            <div className="flex items-center gap-2 text-xs font-bold text-accent shrink-0 uppercase tracking-widest pl-4">
              <span className="relative flex h-2 w-2">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-accent"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <Activity className="h-3 w-3" />
              {t.liveTicker.liveNetwork}
            </div>
            {lineStatus.map((s, index) => (
              <motion.div
                key={`${copy}-${s.line}`}
                initial={copy === 0 ? { opacity: 0, scale: 0.9 } : false}
                animate={copy === 0 ? { opacity: 1, scale: 1 } : undefined}
                transition={{ delay: 0.2 + index * 0.04, duration: 0.35, ease: EASE_OUT_EXPO }}
                whileHover={{ scale: 1.05, y: -1 }}
                className="flex items-center gap-2 text-xs shrink-0 bg-white/5 border border-white/10 rounded-full px-3 py-1"
              >
                <span className="font-bold text-white">{s.line}</span>
                {s.dataAvailable === false ? (
                  <span className="text-white/40 italic">{t.liveTicker.dataComingSoon}</span>
                ) : (
                  <>
                    <span className={s.status === 'Normal' ? 'text-emerald-400 font-semibold' : 'text-destructive font-bold'}>
                      {s.status}
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/60">{s.waitingTime}m {t.liveTicker.wait}</span>
                  </>
                )}
              </motion.div>
            ))}
          </Fragment>
        ))}
      </div>
    </motion.div>
  )
}
