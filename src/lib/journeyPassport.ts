const LS_VISITS = 'beattraffic_passport_visits'
const LS_LAST_VISIT = 'beattraffic_passport_last_date'
const LS_STREAK = 'beattraffic_passport_streak'

export interface StationVisit {
  stationId: string
  stationName: string
  visitedAt: string
}

export interface PassportState {
  visits: StationVisit[]
  uniqueStations: Set<string>
  streak: number
  lastVisitDate: string | null
  voucherTier: 0 | 1 | 2 | 3
  voucherLabel: string
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadVisits(): StationVisit[] {
  try {
    return JSON.parse(localStorage.getItem(LS_VISITS) || '[]')
  } catch {
    return []
  }
}

export function loadPassport(): PassportState {
  const visits = loadVisits()
  const uniqueStations = new Set(visits.map(v => v.stationId))
  const streak = Number(localStorage.getItem(LS_STREAK) || '0')
  const lastVisitDate = localStorage.getItem(LS_LAST_VISIT)
  const count = uniqueStations.size
  const voucherTier: 0 | 1 | 2 | 3 = count >= 50 ? 3 : count >= 25 ? 2 : count >= 5 ? 1 : 0
  const labels = ['No voucher yet', '5% off next fare', '10% off + free GoKL day', 'Gold Explorer — 15% off all fares']
  return { visits, uniqueStations, streak, lastVisitDate, voucherTier, voucherLabel: labels[voucherTier] }
}

export function recordVisit(stationId: string, stationName: string): PassportState {
  const visits = loadVisits()
  visits.unshift({ stationId, stationName, visitedAt: new Date().toISOString() })
  localStorage.setItem(LS_VISITS, JSON.stringify(visits.slice(0, 500)))

  const td = today()
  const last = localStorage.getItem(LS_LAST_VISIT)
  let streak = Number(localStorage.getItem(LS_STREAK) || '0')
  if (last !== td) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    streak = last === yesterday ? streak + 1 : 1
    localStorage.setItem(LS_STREAK, String(streak))
    localStorage.setItem(LS_LAST_VISIT, td)
  }

  return loadPassport()
}

export function buildShareCard(state: PassportState): string {
  const lines = [
    '🚊 BeatTraffic KL Journey Passport',
    `📍 ${state.uniqueStations.size} unique stations visited`,
    `🔥 ${state.streak}-day streak`,
    state.voucherTier > 0 ? `🎟️ ${state.voucherLabel}` : '',
    `🗓️ ${today()}`,
  ].filter(Boolean)
  return lines.join('\n')
}
