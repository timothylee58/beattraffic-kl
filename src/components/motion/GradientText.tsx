import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GradientTextProps {
  children: ReactNode
  className?: string
}

/** Animated brand gradient text with a slow shimmer sweep. */
export function GradientText({ children, className = '' }: GradientTextProps) {
  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent bg-[length:200%_auto] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(100deg, hsl(var(--accent)), hsl(0 90% 65%) 35%, hsl(330 85% 65%) 55%, hsl(210 100% 65%) 75%, hsl(var(--accent)))',
      }}
      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    >
      {children}
    </motion.span>
  )
}
