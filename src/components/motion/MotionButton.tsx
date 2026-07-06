import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { springTransition } from './variants'

interface MotionButtonProps {
  children: ReactNode
  className?: string
}

/** Wraps a button for spring hover/tap feedback without changing button semantics. */
export function MotionButton({ children, className }: MotionButtonProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={springTransition}
    >
      {children}
    </motion.div>
  )
}
