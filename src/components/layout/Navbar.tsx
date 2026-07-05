import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Train, User, LogOut, Menu, X, Shield } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import { blink } from '../../lib/blink'

export function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '/#planner', label: 'Planner' },
    { href: '/#lines', label: 'Line Intelligence' },
    { href: '/#architecture', label: 'Architecture' },
    { href: '/#roadmap', label: 'Roadmap' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-2 rounded-lg relative overflow-hidden">
            <span className="absolute inset-0 bg-accent/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Train className="h-6 w-6 text-primary-foreground relative" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">BeatTraffic KL</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium hover:text-primary transition-colors relative group py-1"
            >
              {link.label}
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-gradient-to-r from-accent to-primary group-hover:w-full transition-all duration-300" />
            </a>
          ))}
          {isAuthenticated && (
            <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.displayName || user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => blink.auth.logout()}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Button onClick={() => blink.auth.login()} className="bg-primary hover:bg-primary/90">
              Sign In
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen(prev => !prev)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 flex flex-col gap-4">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {isAuthenticated && (
              <Link
                to="/admin"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
                onClick={() => setMobileOpen(false)}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
