export interface LineMeta {
  short: string
  color: string
  glow: string
  metric?: number
  metricSuffix?: string
  badge?: 'new' | 'comingSoon'
}

/** Visual metadata for each line card — text comes from i18n. */
export const LINE_META: LineMeta[] = [
  { short: 'PY', color: 'bg-yellow-400', glow: 'hover:shadow-yellow-400/30 hover:border-yellow-400/40', metric: 96, metricSuffix: '%' },
  { short: 'KJ', color: 'bg-blue-500', glow: 'hover:shadow-blue-500/30 hover:border-blue-500/40', metric: 94, metricSuffix: '%' },
  { short: 'AG', color: 'bg-orange-500', glow: 'hover:shadow-orange-500/30 hover:border-orange-500/40' },
  { short: 'SP', color: 'bg-orange-600', glow: 'hover:shadow-orange-600/30 hover:border-orange-600/40' },
  { short: 'KJL', color: 'bg-red-500', glow: 'hover:shadow-red-500/30 hover:border-red-500/40', metric: 4, metricSuffix: '/10' },
  { short: 'MR', color: 'bg-pink-500', glow: 'hover:shadow-pink-500/30 hover:border-pink-500/40' },
  { short: 'KTM', color: 'bg-indigo-500', glow: 'hover:shadow-indigo-500/30 hover:border-indigo-500/40', metric: 68, metricSuffix: '%' },
  { short: 'L3', color: 'bg-teal-500', glow: 'hover:shadow-teal-500/30 hover:border-teal-500/40', badge: 'new' },
]
