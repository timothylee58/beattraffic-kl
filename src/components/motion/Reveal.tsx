import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'left' | 'right' | 'none'
}

const OFFSETS: Record<NonNullable<RevealProps['direction']>, { x?: number; y?: number }> = {
  up: { y: 24 },
  left: { x: -24 },
  right: { x: 24 },
  none: {},
}

/** Fades + slides content into view once it enters the viewport. */
export function Reveal({ children, delay = 0, className, direction = 'up' }: RevealProps) {
  const offset = OFFSETS[direction]

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1], type: 'spring', stiffness: 120, damping: 18 }}
    >
      {children}
    </motion.div>
  )
}

interface RevealGroupProps {
  children: ReactNode
  className?: string
  stagger?: number
}

/** Applies a staggered Reveal to each direct child. */
export function RevealGroup({ children, className, stagger = 0.08 }: RevealGroupProps) {
  const items = Array.isArray(children) ? children : [children]

  return (
    <div className={className}>
      {items.map((child, index) => (
        <Reveal key={index} delay={index * stagger}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}
