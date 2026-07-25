import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { LOCALES } from '../../i18n'
import { useLanguage } from '../../contexts/LanguageContext'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()
  const current = LOCALES.find((l) => l.code === locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 font-medium" aria-label="Change language">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{current?.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LOCALES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={locale === lang.code ? 'bg-accent/15 font-semibold' : ''}
          >
            <motion.span
              className="flex flex-col"
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span>{lang.native}</span>
              <span className="text-xs text-muted-foreground">{lang.label}</span>
            </motion.span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
