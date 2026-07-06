import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getTranslation, type Locale, type Translations } from '../i18n'

const STORAGE_KEY = 'beat-kl-traffic-locale'
const LEGACY_STORAGE_KEY = 'beattraffic-locale'

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function detectLocale(): Locale {
  const stored = (localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)) as Locale | null
  if (stored === 'en' || stored === 'ms' || stored === 'zh') {
    localStorage.setItem(STORAGE_KEY, stored)
    return stored
  }

  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('ms') || browser.startsWith('my')) return 'ms'
  if (browser.startsWith('zh')) return 'zh'
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const t = useMemo(() => getTranslation(locale), [locale])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-Hans' : locale
    document.title = t.meta.title
  }, [locale, t.meta.title])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
