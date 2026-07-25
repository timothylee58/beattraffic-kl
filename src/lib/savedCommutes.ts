import { blink } from './blink'

export interface SavedCommute {
  id: string
  label: string
  from_station_id: string
  from_name: string
  to_station_id: string
  to_name: string
  created_at: string
}

const LS_KEY = 'beattraffic_saved_commutes'

function localLoad(): SavedCommute[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function localSave(items: SavedCommute[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export async function listSavedCommutes(userId?: string): Promise<SavedCommute[]> {
  if (userId) {
    try {
      const { data } = await blink.db.saved_commutes.list({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      })
      return (data || []) as unknown as SavedCommute[]
    } catch {
      // fall through to local
    }
  }
  return localLoad()
}

export async function saveCommute(
  commute: Omit<SavedCommute, 'id' | 'created_at'>,
  userId?: string
): Promise<SavedCommute> {
  const now = new Date().toISOString()
  if (userId) {
    try {
      const { data } = await blink.db.saved_commutes.create({
        ...commute,
        user_id: userId,
        created_at: now,
      })
      return data as unknown as SavedCommute
    } catch {
      // fall through to local
    }
  }
  const item: SavedCommute = { ...commute, id: crypto.randomUUID(), created_at: now }
  localSave([item, ...localLoad()])
  return item
}

export async function deleteSavedCommute(id: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      await blink.db.saved_commutes.delete({ where: { id } })
      return
    } catch {
      // fall through
    }
  }
  localSave(localLoad().filter(c => c.id !== id))
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function fireDelayNotification(commute: SavedCommute, delayMin: number) {
  if (Notification.permission !== 'granted') return
  new Notification(`Delay on your commute: ${commute.label}`, {
    body: `Expected +${delayMin} min delay on ${commute.from_name} → ${commute.to_name}. Consider leaving earlier.`,
    icon: '/favicon.ico',
    tag: `commute-delay-${commute.id}`,
  })
}
