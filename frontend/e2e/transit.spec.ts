import { test, expect, type Page } from '@playwright/test'
const stations = [
  { id: 'new_ingested', name: 'New Ingested Station', lines: ['MRT_KAJANG'], lat: 3.14, lon: 101.71 },
  { id: 'kl_sentral', name: 'KL Sentral', lines: ['LRT_KELANA_JAYA'], lat: 3.134, lon: 101.686 },
  { id: 'klcc', name: 'KLCC', lines: ['LRT_KELANA_JAYA'], lat: 3.157, lon: 101.712 },
]
const network = { approximate: true, stations }
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', e => errors.get(page)!.push(e.message))
  // Deterministic API fixture; no real accounts, payments or community report writes.
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    return route.abort()
  })
  await page.route('**/api/transit/network', route => route.fulfill({ json: network }))
})
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]) })
async function choose(page: Page, label: string, name: string) {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name, exact: false }).click()
}

test('homepage renders, identifies estimates, and links to newly ingested station details', async ({ page }, testInfo) => {
  const obsolete: string[] = []
  page.on('request', r => { if (/gokl_.*csv|rail_stations.*csv|get-train-status/.test(r.url())) obsolete.push(r.url()) })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Transit Intelligence', exact: true })).toBeVisible()
  await expect(page.getByText('Live network status unavailable', { exact: false })).toBeVisible()
  const station = page.getByRole('link', { name: /New Ingested Station/ })
  await expect(station).toBeVisible()
  await expect(page.getByText('Crowd estimates are not live occupancy measurements.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('homepage.png') })
  await station.scrollIntoViewIfNeeded()
  await expect.poll(() => station.evaluate(el => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) < 0.99) return false
    }
    return true
  })).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('intelligence.png') })
  await station.click()
  await expect(page).toHaveURL(/\/station\/new_ingested$/)
  await expect(page.getByRole('heading', { name: 'New Ingested Station', exact: true })).toBeVisible()
  await expect(page.getByText('Live train arrivals unavailable', { exact: false })).toBeVisible()
  await expect(page.getByText('Live bus arrivals unavailable', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'New Ingested Station', exact: true })).toBeVisible()
  expect(obsolete).toEqual([])
})

test('fare workflow invalidates changed and swapped journeys', async ({ page }) => {
  await page.goto('/')
  await choose(page, 'Origin station', 'New Ingested Station')
  await choose(page, 'Destination station', 'KL Sentral')
  await page.getByRole('button', { name: 'Check Fare & Routes' }).click()
  await expect(page.getByRole('button', { name: 'Create demo ticket' })).toBeEnabled()
  await expect(page.getByText('Fares and caps are illustrative estimates.', { exact: false })).toBeVisible()
  await choose(page, 'Destination station', 'KLCC')
  await expect(page.getByRole('button', { name: 'Create demo ticket' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Check Fare & Routes' }).click()
  await expect(page.getByRole('button', { name: 'Create demo ticket' })).toBeEnabled()
  await page.getByRole('button', { name: 'Swap origin and destination' }).click()
  await expect(page.getByRole('button', { name: 'Create demo ticket' })).toHaveCount(0)
  await choose(page, 'Destination station', 'KLCC')
  await page.getByRole('button', { name: 'Check Fare & Routes' }).click()
  await expect(page.getByText('Stations cannot be the same')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create demo ticket' })).toHaveCount(0)
})

test('refreshes station intelligence after 60 seconds', async ({ page }) => {
  await page.clock.install()
  let count = 0
  await page.route('**/api/transit/network', route => {
    count++
    return route.fulfill({ json: { ...network, stations: stations.map((s, i) => i === 0 ? { ...s, name: count > 1 ? 'Updated Station' : s.name } : s) } })
  })
  await page.goto('/')
  await expect(page.getByRole('link', { name: /New Ingested Station/ })).toBeVisible()
  await page.clock.fastForward(61_000)
  await expect(page.getByRole('link', { name: /Updated Station/ })).toBeVisible()
  expect(count).toBeGreaterThanOrEqual(2)
})

test('cached station deep links remain usable during feed outage', async ({ page }) => {
  await page.goto('/station/new_ingested')
  await expect(page.getByRole('heading', { name: 'New Ingested Station', exact: true })).toBeVisible()
  await page.route('**/api/transit/network', route => route.fulfill({ status: 503, json: {} }))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'New Ingested Station', exact: true })).toBeVisible()
  await expect(page.getByText('Cached station list', { exact: false })).toBeVisible()
})

test('network outage shows sample provenance and unknown station is recoverable', async ({ page }) => {
  await page.route('**/api/transit/network', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/station/missing')
  await expect(page.getByText('Sample station list', { exact: false })).toBeVisible()
  await expect(page.getByText('Station not found:', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Back to Home', exact: true }).last().click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
