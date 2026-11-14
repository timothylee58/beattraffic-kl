import type { Locale, Translations } from './types'
import { en } from './translations/en'
import { ms } from './translations/ms'
import { zh } from './translations/zh'

export const translations: Record<Locale, Translations> = { en, ms, zh }

export function getTranslation(locale: Locale): Translations {
  return translations[locale] ?? en
}

export * from './types'
