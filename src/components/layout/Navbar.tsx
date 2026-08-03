import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Train, User, LogOut, Menu, X, Shield } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import { blink } from '../../lib/blink'
import { EASE_OUT_EXPO, slideDown } from '../motion/variants'
import { useLanguage } from '../../contexts/LanguageContext'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '/#planner', label: t.nav.planner },
    { href: '/#lines', label: t.nav.lineIntelligence },
    { href: '/#architecture', label: t.nav.architecture },
    { href: '/#roadmap', label: t.nav.roadmap },
  ]

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative"
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="container flex h-16 items-center justify-between">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-lg relative overflow-hidden">
              <span className="absolute inset-0 bg-accent/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Train className="h-6 w-6 text-primary-foreground relative" />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">BeatTraffic KL</span>
          </Link>
        </motion.div>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link, index) => (
            <motion.a
              key={link.href}
              href={link.href}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.4, ease: EASE_OUT_EXPO }}
              className="text-sm font-medium hover:text-primary transition-colors relative group py-1"
              whileHover={{ y: -1 }}
            >
              {link.label}
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-gradient-to-r from-accent to-primary group-hover:w-full transition-all duration-300" />
            </motion.a>
          ))}
          {isAuthenticated && (
            <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              {t.nav.admin}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium max-w-[8rem] truncate">{user?.displayName || user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => blink.auth.logout()}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t.nav.logout}</span>
              </Button>
            </div>
          ) : (
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button onClick={() => blink.auth.login()} className="bg-primary hover:bg-primary/90">
                Sign In
              </Button>
            </motion.div>
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="md:hidden border-t bg-background overflow-hidden"
          >
            <motion.div
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate="visible"
              className="container py-4 flex flex-col gap-4"
            >
              {navLinks.map(link => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  variants={slideDown}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                  className="text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </motion.a>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
