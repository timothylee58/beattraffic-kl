import { Cpu, Database, MapPinned, RadioTower } from 'lucide-react'
import { Reveal } from '../motion/Reveal'

export function ArchitectureSection() {
  const sections = [
    {
      title: 'Mobile App',
      icon: <MapPinned className="h-6 w-6 text-primary" />,
      items: ['React Native (Expo)', 'Smart Route Planner', 'Offline Cache', 'Alerts & Crowding'],
    },
    {
      title: 'Backend',
      icon: <Cpu className="h-6 w-6 text-primary" />,
      items: ['Node.js orchestration', 'OpenTripPlanner (OTP)', 'Line Feature Rules Engine', 'GTFS + GTFS-RT'],
    },
    {
      title: 'Realtime Sources',
      icon: <RadioTower className="h-6 w-6 text-primary" />,
      items: ['MRT Corp feeds', 'RapidKL alerts', 'Crowdsourced reports', 'IoT station signals'],
    },
    {
      title: 'Data Layer',
      icon: <Database className="h-6 w-6 text-primary" />,
      items: ['PostgreSQL', 'Redis for hot paths', 'Analytics warehouse', 'Geo-indexed tiles'],
    },
  ]

  return (
    <section id="architecture" className="py-14 sm:py-20 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden lg:block" />
      <div className="container relative">
        <Reveal>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-primary">Production-Ready Architecture</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for scale with a modular backend, realtime sources, and offline-first mobile stack.
            </p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section, index) => (
            <Reveal key={section.title} delay={index * 0.08}>
              <div className="group p-6 bg-card border rounded-2xl space-y-4 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 relative">
                <div className="absolute -top-3 left-6 h-1.5 w-8 rounded-full bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 font-bold text-primary">
                  <span className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary group-hover:[&>svg]:text-primary-foreground transition-colors">
                    {section.icon}
                  </span>
                  {section.title}
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
