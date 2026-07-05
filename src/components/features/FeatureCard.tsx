import type { ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="relative p-8 bg-card rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 space-y-4 border border-border/50 group overflow-hidden">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />
      <div className="relative bg-secondary p-4 rounded-2xl w-fit group-hover:scale-110 group-hover:bg-primary group-hover:[&>svg]:text-primary-foreground transition-all duration-300">
        {icon}
      </div>
      <h3 className="relative text-xl font-bold text-primary">{title}</h3>
      <p className="relative text-muted-foreground leading-relaxed text-sm">{description}</p>
      <div className="relative h-0.5 w-10 rounded-full bg-gradient-to-r from-accent to-primary group-hover:w-20 transition-all duration-300" />
    </div>
  )
}
