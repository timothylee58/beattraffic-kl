import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
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
import { DelayPredictionPanel } from './components/features/DelayPredictionPanel'
import { PersonalCommuteAssistant } from './components/features/PersonalCommuteAssistant'
import { QRScanner } from './components/features/QRScanner'
import AdminDashboard from './pages/AdminDashboard'
import StationPage from './pages/StationPage'
import { CloudLightning, Cpu, MapPinned, QrCode, Search, Sparkles, Ticket } from 'lucide-react'
import { Button } from './components/ui/button'

type Tab = 'planner' | 'tickets' | 'scanner' | 'assistant'

function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('planner')
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

        {/* AI Delay Prediction + Personal Commute Assistant side panel */}
        <div id="planner" className="container pb-8 -mt-6">
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <DelayPredictionPanel />
            <PersonalCommuteAssistant />
          </div>
        </div>

        {/* Main Tab Area */}
        <div className="container relative z-30 pb-20">
          <div className="flex gap-1.5 mb-6 bg-white p-1 rounded-xl shadow-lg w-fit mx-auto md:mx-0 border flex-wrap">
            {([
              { id: 'planner', label: 'Route Planner', icon: <Search className="h-4 w-4" /> },
              { id: 'tickets', label: 'My Tickets', icon: <Ticket className="h-4 w-4" /> },
              { id: 'scanner', label: 'QR Scanner', icon: <QrCode className="h-4 w-4" /> },
              { id: 'assistant', label: 'Commute AI', icon: <Sparkles className="h-4 w-4" /> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className="rounded-lg h-11 px-5 font-bold"
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Button>
            ))}
          </div>

          {activeTab === 'planner' && <RoutePlanner />}
          {activeTab === 'tickets' && <TicketList />}
          {activeTab === 'scanner' && <QRScanner />}
          {activeTab === 'assistant' && <PersonalCommuteAssistant />}

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/station/:stationId" element={<StationPage />} />
    </Routes>
  )
}
