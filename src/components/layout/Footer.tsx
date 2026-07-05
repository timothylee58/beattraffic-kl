import { Train } from 'lucide-react'
import { Button } from '../ui/button'

export function Footer() {
  return (
    <footer className="relative bg-[#031733] text-primary-foreground py-16 overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient opacity-25" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="container relative grid md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 p-1.5 rounded-lg">
              <Train className="h-7 w-7 text-accent" />
            </div>
            <span className="text-2xl font-bold tracking-tight">BeatTraffic KL</span>
          </div>
          <p className="text-sm text-primary-foreground/60 leading-relaxed">
            Built to outsmart congestion, reduce wait times, and keep Malaysia moving with line-aware intelligence.
          </p>
          <div className="flex items-center gap-1.5">
            {['bg-yellow-400', 'bg-red-500', 'bg-orange-500', 'bg-indigo-400', 'bg-pink-400', 'bg-teal-400'].map((color) => (
              <span key={color} className={`h-1.5 w-6 rounded-full ${color}`} />
            ))}
          </div>
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
          <p className="text-sm text-primary-foreground/60 mb-6">
            Experience the future of KL transit. Download our mobile app today.
          </p>
          <div className="space-y-3">
            <Button variant="secondary" className="w-full justify-start h-12 glass-panel hover:bg-white/20 text-white">
              <span className="text-xs font-bold uppercase">Get it on App Store</span>
            </Button>
            <Button variant="secondary" className="w-full justify-start h-12 glass-panel hover:bg-white/20 text-white">
              <span className="text-xs font-bold uppercase">Get it on Google Play</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="container relative mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/40">
        <p>© {new Date().getFullYear()} BeatTraffic KL. Built for a smarter Malaysia.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-accent">Twitter</a>
          <a href="#" className="hover:text-accent">Facebook</a>
          <a href="#" className="hover:text-accent">Instagram</a>
        </div>
      </div>
    </footer>
  )
}
