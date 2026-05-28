import type { ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-8 bg-card rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 space-y-4 border border-border/50 group">
      <div className="bg-secondary p-4 rounded-2xl w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-primary">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </div>
  )
}
