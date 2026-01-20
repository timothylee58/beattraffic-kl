import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { RoutePlanner } from './components/features/RoutePlanner';
import { TicketList } from './components/features/TicketList';
import { Train, Bus, Map as MapIcon, ShieldCheck, Clock, CreditCard, Search, Ticket, Info, Activity } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { blink } from './lib/blink';

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
                Live Status
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
        <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 z-10" />
            <img 
              src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000" 
              alt="Public Transport" 
              className="w-full h-full object-cover scale-105 animate-pulse-slow"
            />
          </div>
          
          <div className="container relative z-20 text-white space-y-6">
            <div className="max-w-2xl space-y-4 text-center mx-auto md:text-left md:mx-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest animate-fade-in">
                <Info className="h-3 w-3" />
                Service fully operational
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-lg">
                Transit Reimagined for <span className="text-accent italic">Kuala Lumpur</span>
              </h1>
              <p className="text-lg text-white/80 max-w-lg drop-shadow">
                Seamless travel across the city with real-time updates, digital ticketing, and smart route planning.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <div className="container -mt-16 relative z-30 pb-20">
          <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-lg w-fit mx-auto md:mx-0 border">
            <Button 
              variant={activeTab === 'planner' ? 'primary' : 'ghost'} 
              onClick={() => setActiveTab('planner')}
              className="rounded-lg h-12 px-8 font-bold"
            >
              <Search className="h-4 w-4 mr-2" />
              Route Planner
            </Button>
            <Button 
              variant={activeTab === 'tickets' ? 'primary' : 'ghost'} 
              onClick={() => setActiveTab('tickets')}
              className="rounded-lg h-12 px-8 font-bold"
            >
              <Ticket className="h-4 w-4 mr-2" />
              My Tickets
            </Button>
          </div>

          {activeTab === 'planner' ? <RoutePlanner /> : <TicketList />}
        </div>

        {/* Features Section */}
        <section className="bg-secondary/30 py-20 relative">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold text-primary">Why Choose RapidKL?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Our mission is to provide the most reliable and efficient public transportation system in Malaysia.
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
                description="Purchase and store your tickets directly on your phone. No more queues at the station."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-8 w-8 text-primary" />}
                title="Safety First"
                description="Comprehensive safety protocols and 24/7 security monitoring across all lines."
              />
            </div>
          </div>
        </section>

        {/* Lines Section */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Network Coverage</h2>
                <p className="text-muted-foreground">Comprehensive connectivity across Greater Kuala Lumpur.</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm font-medium">LRT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium">MRT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm font-medium">Monorail</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                { name: 'Kelana Jaya', type: 'LRT', color: 'bg-destructive' },
                { name: 'Ampang', type: 'LRT', color: 'bg-destructive' },
                { name: 'Sri Petaling', type: 'LRT', color: 'bg-destructive' },
                { name: 'Kajang', type: 'MRT', color: 'bg-primary' },
                { name: 'Putrajaya', type: 'MRT', color: 'bg-primary' },
                { name: 'KL Monorail', type: 'Monorail', color: 'bg-accent' }
              ].map((line) => (
                <div key={line.name} className="p-6 border rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group bg-card">
                  <div className={`w-12 h-1.5 rounded-full ${line.color} mb-4`} />
                  <Train className="h-8 w-8 text-primary mb-3 group-hover:rotate-12 transition-transform" />
                  <p className="font-bold text-sm text-primary">{line.name} Line</p>
                  <p className="text-xs text-muted-foreground mt-1">{line.type}</p>
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
              <span className="text-2xl font-bold tracking-tight">RapidKL</span>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              Transforming urban mobility for a smarter, more connected Kuala Lumpur. We bridge distances and connect people.
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
              <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 border-white/20 hover:bg-white/20">
                <span className="text-xs font-bold uppercase">Get it on App Store</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 border-white/20 hover:bg-white/20">
                <span className="text-xs font-bold uppercase">Get it on Google Play</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="container mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/40">
          <p>© 2024 RapidKL Clone App. Built for a smarter city.</p>
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
