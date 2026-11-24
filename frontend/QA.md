# Transit regression QA

This change addresses the five reported release blockers on top of `eb7442b` (the current Next.js app). The old Vite homepage rendering and Blink array-shape corrections were already present on that base; regression coverage retains those fixes.

## Behavior

- Dashboard, fare planner, map, station details, and ticket station names share `/api/transit/network`. This is the existing approximate network catalogue, not a new official live feed. Station records are validated, simultaneous requests are combined, and a downloaded catalogue can be reused after reload during an outage. A five-station sample is explicitly labelled when neither the feed nor a cached catalogue is available.
- Canonical station IDs survive navigation and reload. Legacy sample IDs resolve to the matching canonical station by name when present. Unknown IDs show a recoverable not-found screen.
- Intelligence refreshes the catalogue and up to five crowd estimates every 60 seconds, avoids overlapping refreshes, and cancels state updates on unmount. Retrieval/refresh times use Kuala Lumpur time. Crowd output identifies model versus heuristic estimates, and neither is presented as measured occupancy.
- Nonexistent station/GoKL CSV URLs, invented incidents, random homepage status, train/bus arrivals, facilities, exits, events, and generic alternative route samples are no longer used in the affected workflows. Missing feeds show unavailable states. Community reports are labelled unverified.
- Fare results are tied to both station IDs and the signed-in user. Changing either station, swapping, changing users, or starting a new calculation invalidates the previous result. Late responses are discarded. Ticket creation is disabled while calculating, and quotes expire after five minutes. Duplicate clicks cannot submit parallel writes from the same planner.
- Illustrative fares use the smaller of the raw amount, remaining RM5 daily allowance, and remaining RM25 rolling-seven-day allowance, rounded in cents. The same rule applies to selected alternatives. Spending windows use Kuala Lumpur midnight. Failure to read spending history prevents a quote.
- The existing browser ticket write is a **demo**, explicitly not valid for travel; no payment is taken. It writes `status: demo`, a demo-only QR value, and a creation timestamp. The scanner rejects these demo values. This does not implement operator ticket issuance or payment.
- Alternative planning is awaited and its resolved array is passed to the panel. Without configured OTP service or a usable result, no routes are fabricated. A new cache version excludes legacy sample routes; malformed cached route arrays are rejected.

## Run the checks

From `frontend/`:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright launches the built Next app at `127.0.0.1:4173`. Use `QA_CHROMIUM=/absolute/path/to/chromium` only to select an already installed browser. CI installs the browser, runs the suite, and uploads its HTML report.

The suite uses desktop Chromium (1440×1000) and Pixel 7 mobile emulation. It exercises actual controls, navigation, direct reload, changing/switching stations, same-station rejection, minute refresh, cached-feed failure and missing-station recovery. Every scenario checks for uncaught browser errors. Screenshots and failure traces are in `test-results/`; the HTML report is in `playwright-report/`.

Unit regressions additionally cover SDK array results, slow fare/route responses, delayed route rendering, daily and weekly cap intersections, alternative-route caps, invalid amounts, quote expiry, duplicate submission, Malaysia date boundaries, malformed station responses, legacy IDs, cache reuse, missing live data and invalid model output.

## Verified results — 20 November 2026

- 90 unit/component tests passed.
- 10 Playwright scenarios passed across desktop and mobile emulation.
- Production build, TypeScript and lint passed; lint retains existing unused-variable warnings outside this change.
- The first Playwright run had a clock-installation error in the refresh test and desktop timeouts with an older browser running parallel workers. The suite now installs the clock before page startup and runs one worker; the passing run uses the current installed Chromium. No application assertion was removed.

## Release decision

**Not approved for public production transit guidance or paid ticketing.** These fixes make the affected preview workflows testable and explicit about unavailable information; they do not establish real-time service coverage or fare accuracy.

Remaining release gates:

1. Replace the approximate seed/limited fallback with validated operator network coverage; integrate a supported live data source with source timestamps, freshness policy and monitoring. Validate arrival and incident semantics independently of vehicle positions.
2. Verify the operator fare rules. Implement authoritative server-side quotes, atomic spending/cap checks and idempotent payment/issuance before enabling real purchases. Browser demo caps are not financial enforcement across devices.
3. Validate crowd models against real observations and publish measured accuracy/coverage. Heuristics and synthetic training results are not proof of station occupancy accuracy.
4. Run staging QA against the actual configured backend, authentication, database access controls and operator services, plus physical-device/Safari checks and the wider app workflows. This run used controlled network fixtures and mocked authenticated writes, and did not deploy or perform real purchases.

The local browser tests intentionally block external services. A passing fixture test verifies frontend behavior; it does not verify a government feed, OTP deployment, Google Maps key, live Blink account, or production availability.
