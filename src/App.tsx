import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { RoutePlanner } from './components/features/RoutePlanner';
import { TicketList } from './components/features/TicketList';
import { TransitIntelligencePanel } from './components/features/TransitIntelligencePanel';
import { Train, ShieldCheck, Clock, CreditCard, Search, Ticket, Info, Activity, Sparkles, MapPinned, RadioTower, Cpu, Database, CloudLightning } from 'lucide-react';
import { Button } from './components/ui/button';

interface LineStatus {
  line: string;
  status: string;
  waitingTime: number;
  crowdLevel: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'tickets'>('planner');
  const [lineStatus, setLineStatus] = useState<LineStatus[]>([]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://lkkep88b--get-train-status.functions.blink.new');
      const data = await response.json();
      setLineStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <main>
        {/* Real-time Ticker */}
        <div className="bg-primary/5 border-b py-2 overflow-hidden">
          <div className="container">
            <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
              <div className="flex items-center gap-2 text-xs font-bold text-primary shrink-0 uppercase tracking-widest">
                <Activity className="h-3 w-3" />
                Live Network
              </div>
              {lineStatus.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs shrink-0">
                  <span className="font-bold">{s.line}:</span>
                  <span className={s.status === 'Normal' ? 'text-green-600' : 'text-destructive font-bold'}>
                    {s.status}
                  </span>
                  <span className="text-muted-foreground">• {s.waitingTime}m wait</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative h-[520px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 z-10" />
            <img 
              src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000" 
              alt="Malaysia Transit" 
              className="w-full h-full object-cover scale-105 animate-pulse-slow"
            />
          </div>
          
          <div className="container relative z-20 text-white space-y-8">
            <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
              <div className="space-y-5 text-center mx-auto md:text-left md:mx-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest animate-fade-in">
                  <Info className="h-3 w-3" />
                  Moovit-beating intelligence for Malaysia
                </div>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-lg">
                  BeatTraffic KL — <span className="text-accent italic">line-aware transit</span> that actually gets you there.
                </h1>
                <p className="text-lg text-white/80 max-w-xl drop-shadow">
                  Smart route planning, crowd prediction, and offline routing built on OpenStreetMap + MapLibre + GTFS.
                  Every line has its own AI-driven advantage so you arrive faster and less stressed.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6">
                    <Search className="h-4 w-4 mr-2" />
                    Plan a route
                  </Button>
                  <Button variant="secondary" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                    <MapPinned className="h-4 w-4 mr-2" />
                    Explore live map
                  </Button>
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-3xl p-6 backdrop-blur-md shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/60">AI Crowd Pulse</p>
                    <p className="text-2xl font-bold text-white">73% calm</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <div className="space-y-3 text-sm text-white/80">
                  <div className="flex items-center justify-between">
                    <span>MRT Putrajaya</span>
                    <span className="font-bold text-white">Reliability 96%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LRT Kelana Jaya</span>
                    <span className="font-bold text-white">Crowd 4/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>KTM Komuter</span>
                    <span className="font-bold text-white">Seats 68%</span>
                  </div>
                </div>
                <div className="bg-white/15 rounded-2xl p-4 text-xs text-white/80">
                  Offline-ready routing + 45k cached POIs across Klang Valley. Syncs when you reconnect.
                </div>
              </div>
            </div>
          </div>
        </section>

        <TransitIntelligencePanel />

        {/* Main Content Area */}
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
              { label: 'Offline Cache', value: 'Routes + stations stored for no-signal zones', icon: <CloudLightning className="h-5 w-5 text-primary" /> }
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

        {/* Features Section */}
        <section className="bg-secondary/30 py-20 relative">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold text-primary">Why BeatTraffic KL Beats Moovit</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Line-aware intelligence means every line behaves differently — and so does the experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Clock className="h-8 w-8 text-primary" />}
                title="Real-time Tracking"
                description="Never miss a train with our precise real-time arrival and departure information."
              />
              <FeatureCard 
                icon={<CreditCard className="h-8 w-8 text-primary" />}
                title="Digital Ticketing"
                description="One tap for QR tickets, auto top-up, and fare caps tailored to Klang Valley commuters."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-8 w-8 text-primary" />}
                title="Safety First"
                description="Alerts, incident clusters, and safe-walk guidance for late-night trips."
              />
            </div>
          </div>
        </section>

        {/* Line Intelligence Section */}
        <section id="lines" className="py-20 bg-background">
          <div className="container">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold">Line-Aware Intelligence</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every KL rail line ships with a dedicated USP and UI mode tuned for Malaysia-specific commuter pain points.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'MRT Putrajaya Line (Yellow)', color: 'bg-yellow-400', usp: 'Speed & Reliability Predictor', detail: 'Predicts fast-track windows and best transfer combos.' },
                { name: 'MRT Kajang Line', color: 'bg-blue-500', usp: 'Speed & Reliability Predictor', detail: 'Optimizes cross-city reliability with time-of-day acceleration tips.' },
                { name: 'LRT Ampang Line', color: 'bg-orange-500', usp: 'Delay Survival Mode', detail: 'Auto-reroutes with bus bridges and split-line alerts.' },
                { name: 'LRT Sri Petaling Line', color: 'bg-orange-600', usp: 'Delay Survival Mode', detail: 'Highlights disruption-safe transfers and platform dwell forecasts.' },
                { name: 'LRT Kelana Jaya Line', color: 'bg-red-500', usp: 'Crowd Heatmap & Coach Load', detail: 'Coach-level occupancy and platform crowd heatmaps.' },
                { name: 'KL Monorail', color: 'bg-pink-500', usp: 'Tourist & Short-Hop Optimizer', detail: 'Attraction scoring and short-hop last-mile nudges.' },
                { name: 'KTM Komuter', color: 'bg-indigo-500', usp: 'Long-Distance Reliability & Seat Finder', detail: 'Seat probability prediction and transfer buffering.' }
              ].map((line) => (
                <div key={line.name} className="p-6 border rounded-2xl bg-card shadow-sm hover:shadow-lg transition-all">
                  <div className={`w-12 h-1.5 rounded-full ${line.color} mb-4`} />
                  <h3 className="font-bold text-lg text-primary">{line.name}</h3>
                  <p className="text-sm font-semibold text-accent mt-2">{line.usp}</p>
                  <p className="text-sm text-muted-foreground mt-2">{line.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section id="architecture" className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold text-primary">Production-Ready Architecture</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built for scale with a modular backend, realtime sources, and offline-first mobile stack.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Mobile App', icon: <MapPinned className="h-6 w-6 text-primary" />, items: ['React Native (Expo)', 'Smart Route Planner', 'Offline Cache', 'Alerts & Crowding'] },
                { title: 'Backend', icon: <Cpu className="h-6 w-6 text-primary" />, items: ['Node.js orchestration', 'OpenTripPlanner (OTP)', 'Line Feature Rules Engine', 'GTFS + GTFS-RT'] },
                { title: 'Realtime Sources', icon: <RadioTower className="h-6 w-6 text-primary" />, items: ['MRT Corp feeds', 'RapidKL alerts', 'Crowdsourced reports', 'IoT station signals'] },
                { title: 'Data Layer', icon: <Database className="h-6 w-6 text-primary" />, items: ['PostgreSQL', 'Redis for hot paths', 'Analytics warehouse', 'Geo-indexed tiles'] }
              ].map((section) => (
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

        {/* Future Enhancements */}
        <section id="roadmap" className="py-20 bg-background">
          <div className="container">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold">Elevate the App</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                AI crowd prediction, offline routing, and state-by-state expansion already mapped on the roadmap.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'AI Crowd Prediction', detail: 'Blends ridership history, events, and weather to forecast coach load 30 minutes ahead.' },
                { title: 'Offline Routing', detail: 'Store GTFS fragments + walking graphs for reliable routing even without data.' },
                { title: 'State-by-State Expansion', detail: 'Johor → Penang → Sarawak with localized operator feeds and fare rules.' }
              ].map((item) => (
                <div key={item.title} className="p-6 border rounded-2xl bg-card shadow-sm space-y-3">
                  <div className="flex items-center gap-3 text-primary font-semibold">
                    <Sparkles className="h-5 w-5 text-accent" />
                    {item.title}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground py-16">
        <div className="container grid md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Train className="h-8 w-8 text-accent" />
              <span className="text-2xl font-bold tracking-tight">BeatTraffic KL</span>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              Built to outsmart congestion, reduce wait times, and keep Malaysia moving with line-aware intelligence.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-accent">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-accent transition-colors">Journey Planner</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Ticket Prices</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Line Map</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Feedback</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-accent">Help & Support</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-accent transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-accent">Mobile App</h4>
            <p className="text-sm text-primary-foreground/60 mb-6">Experience the future of KL transit. Download our mobile app today.</p>
            <div className="space-y-3">
              <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <span className="text-xs font-bold uppercase">Get it on App Store</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <span className="text-xs font-bold uppercase">Get it on Google Play</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="container mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/40">
          <p>© 2024 BeatTraffic KL. Built for a smarter Malaysia.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-accent">Twitter</a>
            <a href="#" className="hover:text-accent">Facebook</a>
            <a href="#" className="hover:text-accent">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-card rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 space-y-4 border border-border/50 group">
      <div className="bg-secondary p-4 rounded-2xl w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-primary">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </div>
  );
}

export default App;
