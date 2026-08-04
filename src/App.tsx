import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { ScanHub } from './components/features/ScanHub'
import { CommuteAIAgent } from './components/features/CommuteAIAgent'
import { SavedCommutes } from './components/features/SavedCommutes'
import { JourneyPassport } from './components/features/JourneyPassport'
import { CrowdHeatmap } from './components/features/CrowdHeatmap'
import { GetOffNotification } from './components/features/GetOffNotification'
import { CommuteLeaderboard } from './components/features/CommuteLeaderboard'
import AdminDashboard from './pages/AdminDashboard'
import StationPage from './pages/StationPage'
import { MapPage } from './pages/MapPage'
import { BellRing, BookmarkPlus, CloudLightning, Cpu, Map, MapPinned, ScanText, Search, Sparkles, Stamp, Ticket, Trophy, Users } from 'lucide-react'
import { Button } from './components/ui/button'
import { Reveal } from './components/motion/Reveal'
import { useLanguage } from './contexts/LanguageContext'
import { useAgent } from './contexts/AgentContext'
import type { ScanInsight } from './types/agent'

type Tab = 'planner' | 'tickets' | 'scanner' | 'assistant' | 'commutes' | 'passport' | 'heatmap' | 'getoff' | 'leaderboard' | 'map'

function HomePage() {
  const { t } = useLanguage()
  const { sendMessage } = useAgent()
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

  const handleAskAi = (insight: ScanInsight) => {
    setActiveTab('assistant')
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })
    void sendMessage(
      `I just scanned a ${insight.documentType} (${insight.source}). Summary: ${insight.summary}. What should I do next to beat the jam?`,
    )
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
        <div className="container relative z-30 pb-20 max-w-6xl">
          <div className="flex gap-1.5 mb-6 bg-white p-1.5 rounded-xl shadow-lg w-fit mx-auto border flex-wrap">
            {([
              { id: 'planner' as const, label: t.tabs.planner, icon: <Search className="h-4 w-4" /> },
              { id: 'tickets' as const, label: t.tabs.tickets, icon: <Ticket className="h-4 w-4" /> },
              { id: 'scanner' as const, label: t.tabs.scanner, icon: <ScanText className="h-4 w-4" /> },
              { id: 'assistant' as const, label: t.tabs.assistant, icon: <Sparkles className="h-4 w-4" /> },
              { id: 'commutes' as const, label: t.tabs.commutes, icon: <BookmarkPlus className="h-4 w-4" /> },
              { id: 'passport' as const, label: t.tabs.passport, icon: <Stamp className="h-4 w-4" /> },
              { id: 'heatmap' as const, label: t.tabs.heatmap, icon: <Users className="h-4 w-4" /> },
              { id: 'getoff' as const, label: t.tabs.getoff, icon: <BellRing className="h-4 w-4" /> },
              { id: 'leaderboard' as const, label: t.tabs.leaderboard, icon: <Trophy className="h-4 w-4" /> },
              { id: 'map' as const, label: 'Map', icon: <Map className="h-4 w-4" /> },
            ]).map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg h-11 px-5 font-bold transition-all ${activeTab === tab.id ? 'shadow-[0_0_20px_-4px_hsl(var(--primary))]' : ''}`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'planner' && <RoutePlanner />}
              {activeTab === 'tickets' && <TicketList />}
              {activeTab === 'scanner' && <ScanHub onAskAi={handleAskAi} />}
              {activeTab === 'assistant' && <CommuteAIAgent />}
              {activeTab === 'commutes' && <SavedCommutes />}
              {activeTab === 'passport' && <JourneyPassport />}
              {activeTab === 'heatmap' && <CrowdHeatmap />}
              {activeTab === 'getoff' && <GetOffNotification />}
              {activeTab === 'leaderboard' && <CommuteLeaderboard />}
              {activeTab === 'map' && <div className="rounded-xl overflow-hidden shadow-xl" style={{ height: '70vh' }}><MapPage /></div>}
            </motion.div>
          </AnimatePresence>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { icon: <MapPinned className="h-5 w-5 text-primary" /> },
              { icon: <Cpu className="h-5 w-5 text-primary" /> },
              { icon: <CloudLightning className="h-5 w-5 text-primary" /> },
            ].map((item, index) => (
              <Reveal key={t.highlights[index].title} delay={index * 0.08}>
                <div className="group p-5 border rounded-2xl bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 space-y-2">
                  <div className="flex items-center gap-3 font-semibold text-primary">
                    <span className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary group-hover:[&>svg]:text-primary-foreground transition-colors">
                      {item.icon}
                    </span>
                    {t.highlights[index].title}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.highlights[index].description}</p>
                </div>
              </Reveal>
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
      <Route path="/map" element={<MapPage />} />
    </Routes>
  )
}
