import { useState, useEffect, useCallback } from 'react'
import { Navbar } from './components/layout/Navbar'
import { LiveTicker, type LineStatus } from './components/layout/LiveTicker'
import { Footer } from './components/layout/Footer'
import { HeroSection } from './components/sections/HeroSection'
import { FeaturesSection } from './components/sections/FeaturesSection'
import { LineIntelligenceSection } from './components/sections/LineIntelligenceSection'
import { ArchitectureSection } from './components/sections/ArchitectureSection'
import { RoadmapSection } from './components/sections/RoadmapSection'
import { RoutePlanner } from './components/features/RoutePlanner'
import { TicketList } from './components/features/TicketList'
import { TransitIntelligencePanel } from './components/features/TransitIntelligencePanel'
import { CloudLightning, Cpu, MapPinned, Search, Ticket } from 'lucide-react'
import { Button } from './components/ui/button'

function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'tickets'>('planner')
  const [lineStatus, setLineStatus] = useState<LineStatus[]>([])

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('https://lkkep88b--get-train-status.functions.blink.new')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setLineStatus(data)
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handlePlanRoute = () => {
    setActiveTab('planner')
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />

      <main>
        <LiveTicker lineStatus={lineStatus} />
        <HeroSection onPlanRoute={handlePlanRoute} />
        <TransitIntelligencePanel />

        <div id="planner" className="container -mt-16 relative z-30 pb-20">
          <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-lg w-fit mx-auto md:mx-0 border">
            <Button
              variant={activeTab === 'planner' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('planner')}
              className="rounded-lg h-12 px-8 font-bold"
            >
              <Search className="h-4 w-4 mr-2" />
              Route Planner
            </Button>
            <Button
              variant={activeTab === 'tickets' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('tickets')}
              className="rounded-lg h-12 px-8 font-bold"
            >
              <Ticket className="h-4 w-4 mr-2" />
              My Tickets
            </Button>
          </div>

          {activeTab === 'planner' ? <RoutePlanner /> : <TicketList />}

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { label: 'Smart Route Planner', value: 'GTFS-aware ETA + fastest transfers', icon: <MapPinned className="h-5 w-5 text-primary" /> },
              { label: 'Line Feature Engine', value: 'Dynamic UI per line USP', icon: <Cpu className="h-5 w-5 text-primary" /> },
              { label: 'Offline Cache', value: 'Routes + stations stored for no-signal zones', icon: <CloudLightning className="h-5 w-5 text-primary" /> },
            ].map((item) => (
              <div key={item.label} className="p-5 border rounded-2xl bg-card shadow-sm space-y-2">
                <div className="flex items-center gap-3 font-semibold text-primary">
                  {item.icon}
                  {item.label}
                </div>
                <p className="text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <FeaturesSection />
        <LineIntelligenceSection />
        <ArchitectureSection />
        <RoadmapSection />
      </main>

      <Footer />
    </div>
  )
}

export default App
