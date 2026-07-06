import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      className="relative p-8 bg-card rounded-3xl shadow-sm space-y-4 border border-border/50 group overflow-hidden h-full"
      whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.18)' }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      <motion.div
        className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-2xl"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.div
        className="relative bg-secondary p-4 rounded-2xl w-fit"
        whileHover={{ scale: 1.1, backgroundColor: 'hsl(var(--primary))' }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <span className="block group-hover:[&>svg]:text-primary-foreground transition-colors duration-300">
          {icon}
        </span>
      </motion.div>
      <h3 className="relative text-xl font-bold text-primary">{title}</h3>
      <p className="relative text-muted-foreground leading-relaxed text-sm">{description}</p>
      <motion.div
        className="relative h-0.5 rounded-full bg-gradient-to-r from-accent to-primary"
        initial={{ width: 40 }}
        whileHover={{ width: 80 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )
}
