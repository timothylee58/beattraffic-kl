import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), routes: vi.fn(), user: { id: 'u1' } }))
vi.mock('@/lib/blink', () => ({ blink: { db: { tickets: { list: mocks.list, create: mocks.create } }, auth: { login: vi.fn() } } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/lib/stationCatalog', () => ({ catalogDescription: () => 'Approximate network', fetchStationCatalog: async () => ({ stations: [
  { id: 'a', name: 'Alpha', line: 'MRT_KAJANG', lat: 3.1, lon: 101.7, zone: 1 },
  { id: 'b', name: 'Beta', line: 'MRT_KAJANG', lat: 3.2, lon: 101.8, zone: 3 },
  { id: 'c', name: 'Gamma', line: 'MRT_KAJANG', lat: 3.3, lon: 101.9, zone: 2 },
] }) }))
vi.mock('@/lib/eventApi', () => ({ fetchNearbyEvents: async () => [], eventImpactLabel: () => '' }))
vi.mock('@/lib/dosmApi', () => ({ fetchIncidents: async () => [{ line: 'MRT_KAJANG', severity: 'high', message: 'Test incident' }] }))
vi.mock('@/lib/alternativeRoutes', () => ({ getAlternativeRoutes: mocks.routes }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
// Native selects isolate the planner's state machine; real Radix interaction is covered by Playwright.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, disabled }: { value: string; onValueChange: (v: string) => void; children: ReactNode; disabled: boolean }) => <select value={value} onChange={e => onValueChange(e.target.value)} disabled={disabled}><option value="">Select</option>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}))
import { RoutePlanner } from '@/components/features/RoutePlanner'
beforeEach(() => { mocks.list.mockReset().mockResolvedValue([]); mocks.create.mockReset().mockResolvedValue({}); mocks.routes.mockReset().mockResolvedValue([]) })
async function selectJourney() {
  render(<RoutePlanner />)
  await waitFor(() => expect(screen.getAllByRole('combobox')[0]).not.toBeDisabled())
  const [from, to] = screen.getAllByRole('combobox')
  fireEvent.change(from!, { target: { value: 'a' } }); fireEvent.change(to!, { target: { value: 'b' } })
}
async function calculate() {
  fireEvent.click(screen.getByRole('button', { name: 'Check Fare & Routes' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create demo ticket' })).not.toBeDisabled())
}
it('reads SDK arrays, enforces the weekly balance and saves only a demo ticket', async () => {
  mocks.list.mockResolvedValue([{ fare: 24.5, created_at: new Date(Date.now() - 86400000).toISOString() }])
  await selectJourney(); await calculate()
  expect(mocks.list).toHaveBeenCalledWith({ where: { user_id: 'u1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create demo ticket' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ from_station_id: 'a', to_station_id: 'b', fare: 0.5, status: 'demo' })))
})
it.each(['origin', 'destination', 'swap'])('invalidates the quote after changing %s', async (kind) => {
  await selectJourney(); await calculate()
  if (kind === 'swap') fireEvent.click(screen.getByRole('button', { name: /Swap origin/ }))
  else fireEvent.change(screen.getAllByRole('combobox')[kind === 'origin' ? 0 : 1]!, { target: { value: 'c' } })
  expect(screen.queryByRole('button', { name: 'Create demo ticket' })).not.toBeInTheDocument()
  expect(mocks.create).not.toHaveBeenCalled()
})
it('ignores a stale fare response after stations change', async () => {
  let resolve!: (rows: never[]) => void
  mocks.list.mockReturnValue(new Promise(r => { resolve = r }))
  await selectJourney()
  fireEvent.click(screen.getByRole('button', { name: 'Check Fare & Routes' }))
  fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: 'c' } })
  await act(async () => { resolve([]) })
  expect(screen.queryByText('Estimated Fare')).not.toBeInTheDocument()
})
it('awaits delayed routes and ignores their response when the journey changes', async () => {
  let resolve!: (rows: unknown[]) => void
  mocks.routes.mockReturnValue(new Promise(r => { resolve = r }))
  await selectJourney()
  fireEvent.click(screen.getByRole('button', { name: 'Check Fare & Routes' }))
  await waitFor(() => expect(mocks.routes).toHaveBeenCalled())
  expect(screen.getByRole('button', { name: 'Create demo ticket' })).toBeDisabled()
  fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: 'c' } })
  await act(async () => { resolve([{ id: 'route', label: 'Old route' }]) })
  expect(screen.queryByText('Old route')).not.toBeInTheDocument()
  expect(screen.queryByText('Estimated Fare')).not.toBeInTheDocument()
})
it('renders awaited route results without attempting to map a Promise', async () => {
  mocks.routes.mockResolvedValue([{ id: 'r1', label: 'Via interchange', mode: 'rail', duration: 20, transfers: 1, reliability: 0, via: ['X'], fare: 3 }])
  await selectJourney(); await calculate()
  expect(screen.getByText('Via interchange')).toBeInTheDocument()
})
it('does not show a purchasable estimate when ticket history is unavailable', async () => {
  mocks.list.mockRejectedValue(new Error('unavailable'))
  await selectJourney()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Check Fare & Routes' })) })
  expect(screen.queryByText('Estimated Fare')).not.toBeInTheDocument()
})
it('expires a quote after five minutes', async () => {
  await selectJourney(); await calculate()
  const now = Date.now()
  const time = vi.spyOn(Date, 'now').mockReturnValue(now + 301000)
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Create demo ticket' }))
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.queryByText('Estimated Fare')).not.toBeInTheDocument()
  } finally { time.mockRestore() }
})
it('prevents duplicate demo writes while saving', async () => {
  let resolve!: () => void
  mocks.create.mockReturnValue(new Promise<void>(r => { resolve = r }))
  await selectJourney(); await calculate()
  const button = screen.getByRole('button', { name: 'Create demo ticket' })
  fireEvent.click(button); fireEvent.click(button)
  expect(mocks.create).toHaveBeenCalledTimes(1)
  expect(screen.getAllByRole('combobox')[0]).toBeDisabled()
  await act(async () => resolve())
})
it('applies the weekly cap when selecting an alternative', async () => {
  mocks.list.mockResolvedValue([{ fare: 24.5, created_at: new Date(Date.now() - 86400000).toISOString() }])
  mocks.routes.mockResolvedValue([{ id: 'r1', label: 'Via interchange', mode: 'rail', duration: 20, transfers: 1, reliability: 0, via: ['X'], fare: 9 }])
  await selectJourney(); await calculate()
  fireEvent.click(screen.getByRole('button', { name: /^Select$/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Create demo ticket' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ fare: 0.5 })))
})
