import { Cpu, Database, MapPinned, RadioTower } from 'lucide-react'

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
    <section id="architecture" className="py-20 bg-secondary/30">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold text-primary">Production-Ready Architecture</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built for scale with a modular backend, realtime sources, and offline-first mobile stack.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="p-6 bg-card border rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center gap-3 font-bold text-primary">
                {section.icon}
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
          ))}
        </div>
      </div>
    </section>
  )
}
