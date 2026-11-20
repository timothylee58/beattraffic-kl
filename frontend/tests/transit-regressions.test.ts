import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { buildFareSummary, getSpentToday } from '@/lib/fareEngine'
import { klNow, klSpendWindows } from '@/lib/dates'

const station = { id: 'new-station', name: 'New Station', lines: ['MRT_KAJANG'], lat: 3.1, lon: 101.7 }
const network = { approximate: true, stations: [station] }
beforeEach(() => { vi.resetModules(); localStorage.clear() })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })

describe('station catalogue', () => {
  it('reads network station arrays, preserves IDs and labels approximate coverage', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(network)))
    vi.stubGlobal('fetch', fetch)
    const { fetchStationCatalog, findStation, catalogDescription } = await import('@/lib/stationCatalog')
    const catalog = await fetchStationCatalog()
    expect(findStation(catalog.stations, 'new-station')?.name).toBe('New Station')
    expect(catalog.source).toBe('network')
    expect(catalogDescription(catalog)).toContain('Approximate')
    expect(fetch).toHaveBeenCalledWith('/api/transit/network', expect.objectContaining({ cache: 'no-store' }))
  })
  it('deduplicates simultaneous requests and refreshes on demand', async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify(network)))
    vi.stubGlobal('fetch', fetch)
    const { fetchStationCatalog } = await import('@/lib/stationCatalog')
    await Promise.all([fetchStationCatalog(), fetchStationCatalog(true)])
    expect(fetch).toHaveBeenCalledTimes(1)
    await fetchStationCatalog(true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('retains downloaded stations after reload when the network fails, marking them stale', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(network))))
    await (await import('@/lib/stationCatalog')).fetchStationCatalog()
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { fetchStationCatalog, catalogDescription } = await import('@/lib/stationCatalog')
    const cached = await fetchStationCatalog()
    expect(cached.source).toBe('cache')
    expect(cached.stations[0]?.id).toBe('new-station')
    expect(catalogDescription(cached)).toContain('stale')
  })
  it.each([{}, { stations: [] }, { stations: [null] }, { stations: [{ ...station, lat: 999 }] }, { stations: [station, station] }])('labels fallback for invalid input: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))
    const { fetchStationCatalog, catalogDescription } = await import('@/lib/stationCatalog')
    const catalog = await fetchStationCatalog()
    expect(catalog.source).toBe('fallback')
    expect(catalogDescription(catalog)).toContain('Sample')
  })
  it('resolves old station links to canonical IDs', async () => {
    const { findStation } = await import('@/lib/stationCatalog')
    const canonical = { id: 'kl_sentral', name: 'KL Sentral', line: 'LRT_KELANA_JAYA' as const, lat: 3.1, lon: 101.7, zone: 1 }
    expect(findStation([canonical], 'KJ16')).toEqual(canonical)
  })
})

describe('demo fare cap correctness', () => {
  it.each([
    [3, 0, 24.5, 0.5], [3, 4.8, 20, 0.2], [3, 5, 25, 0],
    [3, 0, 27, 0], [3, 4.7, 24.9, 0.1], [1.2, 0, 0, 1.2],
  ])('caps raw %s with daily spend %s and weekly spend %s at %s', (raw, daily, weekly, expected) => {
    expect(buildFareSummary(raw, daily, weekly).finalFare).toBe(expected)
  })
  it.each([NaN, Infinity, -1])('rejects invalid money %s', (value) => {
    expect(() => buildFareSummary(value, 0, 0)).toThrow()
    expect(() => buildFareSummary(2, value, 0)).toThrow()
  })
  it('uses Kuala Lumpur midnight independent of browser timezone', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-19T16:30:00Z'))
    expect(klNow()).toEqual({ date: '2026-11-20', hour: 0, day: 5 })
    expect(klSpendWindows().today.toISOString()).toBe('2026-11-19T16:00:00.000Z')
    expect(klSpendWindows().week.toISOString()).toBe('2026-11-13T16:00:00.000Z')
    expect(await getSpentToday('u', [{ user_id: 'u', fare: 3, created_at: '2026-11-19T15:59:00Z' }, { user_id: 'u', fare: 2, created_at: '2026-11-19T16:01:00Z' }])).toBe(2)
  })
})

it('never returns invented live incidents, arrivals or GoKL routes', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  expect(await (await import('@/lib/dosmApi')).fetchIncidents()).toEqual([])
  expect(await (await import('@/lib/busApi')).fetchNearbyBuses('new-station')).toEqual([])
  expect(await (await import('@/lib/goklApi')).fetchGoKLRoutes()).toEqual([])
  expect(await (await import('@/lib/goklApi')).fetchGoKLStops()).toEqual([])
  expect(fetch).not.toHaveBeenCalled()
  const details = (await import('@/lib/stationIntelligence')).getStationDetails('new', 'New', 20)
  expect(details.nextTrains).toEqual([])
  expect(details.facilities).toEqual([])
})

it('returns an empty route array when OTP is not configured, including delayed journeys', async () => {
  const { getAlternativeRoutes } = await import('@/lib/alternativeRoutes')
  expect(await getAlternativeRoutes(12, { lat: 3.1, lon: 101.7 }, { lat: 3.2, lon: 101.8 })).toEqual([])
})

it('labels the backend heuristic as an estimate rather than a trained model', async () => {
  vi.stubEnv('NEXT_PUBLIC_ORCHESTRATION_API_URL', 'https://example.test')
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(
    url.endsWith('/daily') ? { model: 'heuristic', crowd_level: 2 } : { model: 'heuristic', predictions: [{ crowd_level: 1, probability: [0.2, 0.6, 0.2] }] },
  ))))
  const { predictCrowdLevel } = await import('@/lib/predictiveEngine')
  const { fallbackStations } = await import('@/lib/transitData')
  const result = await predictCrowdLevel(fallbackStations[0]!, [], 12)
  expect(result.source).toBe('heuristic')
  expect(Number.isFinite(result.score)).toBe(true)
})
it('ignores invalid model probabilities and produces a bounded local estimate', async () => {
  vi.stubEnv('NEXT_PUBLIC_ORCHESTRATION_API_URL', 'https://example.test')
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({ model: 'onnx', predictions: [{ crowd_level: 2, probability: ['wrong', 1, 7] }] }))))
  const { predictCrowdLevel } = await import('@/lib/predictiveEngine')
  const { fallbackStations } = await import('@/lib/transitData')
  const result = await predictCrowdLevel(fallbackStations[0]!, [], 12)
  expect(result.source).toBe('heuristic')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})
