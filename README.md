# Beat KL traffic

**Alleviating traffic jams across Klang Valley** — line-aware transit intelligence with real-time crowd prediction, AI delay forecasting, smart alternative routing, and digital ticketing, all built on open data (DOSM, GTFS, OpenStreetMap).

---

## Features

### Rider-Facing (Web + Mobile)

| Feature | Route / Entry Point | Description |
|---|---|---|
| **Live Network Ticker** | Top of every page | Real-time line status and wait times, polling every 30 s |
| **Route Planner** | `/` → Planner tab | Station-to-station fare calculation with distance-based pricing; one-tap ticket purchase |
| **AI Delay Prediction** | `/` → delay panel | Per-line delay scoring using rush-hour windows, incident severity, and zone proximity; refreshes every 60 s |
| **Smart Alternative Route Engine** | Inside Route Planner | Activates automatically when delay > 5 min; rail/bus/mixed alternatives with reliability %, duration, and fare; selecting one updates the Buy Ticket price |
| **Digital Ticketing** | `/` → My Tickets tab | QR-code tickets stored in the database; shows fare, route, and purchase date |
| **QR Ticket Scanner** | `/` → QR Scanner tab | Camera scanning via browser BarcodeDetector API with manual code-entry fallback; validates tickets against the database |
| **Station Intelligence** | `/station/:stationId` | Per-station crowd score, next trains + coach occupancy, facilities status, exit guide, and nearby BAS.MY / RapidKL buses |
| **Personal Commute Assistant** | `/` → Commute AI tab | Time-of-day route suggestions (morning/lunch/evening); save and manage favourite routes in `localStorage` |
| **BAS.MY + RapidKL Bus Integration** | Station Intelligence page | Nearby bus stops, route numbers, destinations, arrival times, and operator badges |
| **Transit Intelligence Panel** | `/` (home, below hero) | KPI cards (stations ingested, live incidents, high-crowd alerts, 30-min forecast window) + clickable station crowd predictions |

### Line-Aware Intelligence

Every KL rail line ships with a dedicated USP tuned for Malaysia-specific commuter pain points:

| Line | Colour | USP |
|---|---|---|
| MRT Putrajaya Line | Yellow | Speed & Reliability Predictor |
| MRT Kajang Line | Blue | Speed & Reliability Predictor |
| LRT Ampang Line | Orange | Delay Survival Mode |
| LRT Sri Petaling Line | Dark Orange | Delay Survival Mode |
| LRT Kelana Jaya Line | Red | Crowd Heatmap & Coach Load |
| KL Monorail | Pink | Tourist & Short-Hop Optimizer |
| KTM Komuter | Indigo | Long-Distance Reliability & Seat Finder |

### Operator-Facing

| Feature | Route | Description |
|---|---|---|
| **Admin Dashboard** | `/admin` | Authenticated-only operator view with 6 tabs |
| ↳ Line Status | — | Live delay and status for every line |
| ↳ Ticket Sales | — | Paginated table of all tickets with fare, route, status, and timestamp |
| ↳ Crowd Heatmap | — | Colour-coded grid of crowd scores per line |
| ↳ Incident Management | — | Add, view, and resolve incidents with severity classification |
| ↳ Suspicious Activity | — | Flagged tickets with risk level and reason |
| ↳ Slack Alert Logs | — | Recent alerts forwarded to Slack channels |

### Backend / NOC

- **Orchestration API** (FastAPI) — intent-routing NOC graph: `POST /agent/query`, `POST /webhook/alerts`, `GET /health/summary`
- **Slack Bot** (Bolt + Socket Mode) — `/noc-query` opens a query modal; `/noc-status` returns live health; alert forwarding and home-tab handlers
- **Prometheus alerts** — P1 (service down) and P2 (sustained high latency) rules
- **Grafana** — dashboards wired to the Prometheus data source

---

## Tech Stack

### Web App

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Routing | Next.js file-system routes (`frontend/app`) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Auth & DB | Blink SDK (`@blinkdotnew/sdk`) |
| QR Codes | `react-qr-code` (generation), browser BarcodeDetector API (scanning) |
| Notifications | `react-hot-toast` |
| Animations | Framer Motion |
| Maps | MapLibre GL (re-planner) and Google Maps (`/map`) |

### Mobile App

| Layer | Technology |
|---|---|
| Framework | React Native (Expo) |
| Language | TypeScript |
| Navigation | Expo Router |
| Data | Blink SDK |

### Backend Services

| Service | Technology |
|---|---|
| Orchestration API | Python 3.12 + FastAPI + Uvicorn |
| NOC Graph | LangGraph-style intent router (4 nodes) |
| Slack Bot | Node.js 20 + `@slack/bolt` (Socket Mode) |
| Cache / dedup | Redis 7 |
| Analytics Database | ClickHouse 24 (MergeTree + AggregatingMergeTree, TTL) |
| Observability | Prometheus + Grafana (ClickHouse datasource plugin) |
| Metrics | `prometheus-fastapi-instrumentator` — `/metrics` endpoint |
| CI/CD | GitHub Actions (path-filtered per service) |

### Data Sources

| Source | Usage |
|---|---|
| DOSM Open Data (data.gov.my) | Station CSV ingestion with graceful fallback |
| GTFS / GTFS-RT | Route and real-time feed (OpenTripPlanner integration planned) |
| MRT Corp / RapidKL feeds | Live line status |
| BAS.MY API | Nearby bus stops and arrivals (mock; pending API registration) |
| IoT station signals | Crowd and facility telemetry (planned) |

---

## Project Structure

```
beattraffic-kl/
├── frontend/                     # The web app: Next.js 15 + Tailwind + Framer Motion
│   ├── app/
│   │   ├── (site)/               # Landing page, /admin, /station/[stationId], /map (Blink, language, toast providers; always light)
│   │   ├── replan/               # Disruption re-planner (follows the system light/dark setting)
│   │   └── api/transit/          # Same-origin proxy to the orchestration API
│   ├── components/
│   │   ├── pages/                # Page bodies (home, admin dashboard, station, map)
│   │   ├── features/             # Route planner, tickets, QR scanner, commute AI, heatmap, passport, parking, ...
│   │   ├── layout/ sections/ motion/ decor/
│   │   ├── ui/                   # shadcn/ui component library
│   │   └── replanner.tsx ...     # Re-planner components
│   ├── lib/                      # Domain logic: transit data, crowd/delay prediction, fares, Blink + Firebase clients, RAG
│   ├── contexts/ hooks/ i18n/    # Language + agent contexts, auth hook, en/ms/zh translations
│   └── tests/                    # Vitest
├── mobile/                       # React Native (Expo)
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home — route search
│   │   └── tickets.tsx           # My tickets
│   ├── constants/design.ts
│   └── lib/blink.ts
├── orchestration-api/            # FastAPI NOC backend
│   ├── main.py                   # App factory + Prometheus instrumentation + analytics middleware
│   ├── requirements.txt          # fastapi, uvicorn, httpx, redis, clickhouse-driver, anthropic, …
│   └── app/
│       ├── analytics.py          # ClickHouse client; track() / track_batch()
│       ├── parking.py            # Kongsi + DBKL carpark data with source labelling
│       ├── api/routes/
│       │   ├── agent.py          # POST /agent/query
│       │   ├── webhook.py        # POST /webhook/alerts (hmac auth + BackgroundTasks forward)
│       │   ├── health.py         # GET /health/summary
│       │   ├── mobility.py       # GET /mobility/options — carpark + transit alternatives
│       │   ├── crowd_prediction.py
│       │   ├── crowd_prediction_daily.py
│       │   └── analytics.py      # Analytics query endpoints
│       └── graph/
│           ├── noc_graph.py      # Intent router → node dispatch
│           ├── nodes.py          # finops_query (CH-grounded), system_health, general_response, mobility_query
│           └── state.py          # NOCState TypedDict
├── slack-bot/                    # Slack Bolt app (Socket Mode)
│   └── src/
│       ├── app.ts                # Bolt app factory
│       ├── index.ts              # Bootstrap: Bolt on :3000, internal Express on :3001
│       ├── handlers/
│       │   ├── alert.ts          # handleIngestAlert — SHA-256 dedup, Redis-backed, channel routing
│       │   ├── home.ts
│       │   ├── command.ts        # /noc-query, /noc-status
│       │   └── action.ts
│       └── blocks/               # alertBlock, homeBlock, queryBlock
├── ml/                           # ML training scripts
│   ├── station_line_map.json     # 110+ stations across all 8 KL rail/BRT lines
│   ├── train_crowd_model.py      # Random Forest crowd-level classifier (ONNX export)
│   ├── train_delay_model.py      # Delay prediction model
│   ├── train_dosm.py             # DOSM ridership ingestion → ClickHouse
│   └── models/                   # Trained model artefacts + metrics
├── functions/
│   └── get-train-status/         # Serverless function: live line status
├── infra/
│   ├── clickhouse/
│   │   └── init.sql              # Schema: 5 raw tables + 3 materialized views, all with TTL
│   ├── prometheus/
│   │   ├── prometheus.yml        # Scrape config (orchestration-api /metrics, 10 s interval)
│   │   └── alert_rules.yml       # P1 (service down) + P2 (sustained high latency) rules
│   └── grafana/
│       ├── datasources/          # ClickHouse datasource provisioning
│       └── dashboards/           # Dashboard JSON provisioning
├── scripts/
│   └── migrate_postgres_to_clickhouse.py  # One-shot Postgres → ClickHouse migration
├── .github/workflows/
│   ├── deploy-orchestration-api.yml  # Path-filtered CI for Python service
│   └── deploy-slack-bot.yml          # Path-filtered CI for Node service
└── docker-compose.yml            # Full local stack (7 services; no Postgres)
```

---

## Getting Started

### Prerequisites

- Node.js 20+ and `bun` (or `npm`)
- Python 3.12+ (for the orchestration API)
- Docker + Docker Compose (for the full backend stack)

### Web App

```bash
cd frontend
npm ci

# Configure environment (see frontend/.env.example for every variable)
cp .env.example .env.local
# Fill in NEXT_PUBLIC_BLINK_PROJECT_ID and NEXT_PUBLIC_BLINK_PUBLISHABLE_KEY

npm run dev
# → http://localhost:3000   (re-planner at /replan, needs the orchestration API on API_URL)
```

**Production build:**

```bash
npm run build
node .next/standalone/server.js   # needs .next/static copied beside it, as the Dockerfile does
```

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

### Full Backend Stack (Docker)

```bash
# Configure environment
cp orchestration-api/.env.example orchestration-api/.env
cp slack-bot/.env.example slack-bot/.env
# Fill in tokens and API keys (see Environment Variables below)

# Start all 6 services
docker-compose up
```

| Service | URL |
|---|---|
| Orchestration API | `http://localhost:8000` |
| Slack Bot (Bolt) | `http://localhost:3000` |
| Slack Bot (internal) | `http://localhost:3001` — `POST /ingest`, `GET /healthz` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3005` |
| ClickHouse HTTP | `http://localhost:8123` |
| ClickHouse native | `localhost:9000` |
| Redis | `localhost:6379` |

### Orchestration API (without Docker)

```bash
cd orchestration-api
pip install fastapi "uvicorn[standard]"
uvicorn main:app --reload
# → http://localhost:8000
```

---

## Environment Variables

### Web App (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BLINK_PROJECT_ID` | Blink project ID (auto-detected from `.blink.new` hostname) |
| `NEXT_PUBLIC_BLINK_PUBLISHABLE_KEY` | Blink publishable key for auth and database access |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key (optional; enables cloud RAG) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION` | Cloud Functions region (default `asia-southeast1`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key for `/map` (restrict it to your site's referrers) |

`NEXT_PUBLIC_*` values are inlined into the browser bundle **at build time** and are visible to every visitor: set them before `npm run build` (or as Docker build args), and never put a secret in one. The full list, including the optional OTP, BAS.MY, ML and events endpoints, is in `frontend/.env.example`.

### Firebase RAG (Cloud Functions)

| Secret / step | Description |
|---|---|
| `GEMINI_API_KEY` | Set with `firebase functions:secrets:set GEMINI_API_KEY` for `text-embedding-004` |
| `ragIngest` | Callable function (admin claim) — seeds `knowledge_chunks` with embeddings |
| `ragQuery` | Callable function — embeds user question and returns top-k chunks |

Without Firebase env vars, Commute AI uses the bundled local hybrid retriever (`frontend/lib/rag/localRetriever.ts`).

### Orchestration API (`orchestration-api/.env`)

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection string (default `redis://redis:6379`) |
| `CLICKHOUSE_URL` | ClickHouse HTTP URL (default `http://clickhouse:8123`) |
| `ANTHROPIC_API_KEY` | API key for LLM-powered NOC query responses |
| `WEBHOOK_SECRET` | Optional shared secret for `POST /webhook/alerts` (`X-Webhook-Secret` header) |
| `SLACK_BOT_INGEST_URL` | Internal URL of the Slack bot's `/ingest` endpoint (default `http://slack-bot:3001/ingest`) |

### Slack Bot (`slack-bot/.env`)

| Variable | Description |
|---|---|
| `SLACK_BOT_TOKEN` | Bot OAuth token (`xoxb-…`) |
| `SLACK_APP_TOKEN` | App-level token for Socket Mode (`xapp-…`) |
| `SLACK_SIGNING_SECRET` | Request signing secret |
| `ORCHESTRATION_API_URL` | Base URL of the orchestration API |

---

## App Routes

| Route | Component | Access |
|---|---|---|
| `/` | `HomePage` | Public |
| `/station/:stationId` | `StationPage` | Public |
| `/admin` | `AdminDashboard` | Authenticated users only |

---

## Predictive Engine

Crowd and delay scores are computed client-side from three signals:

```
crowd_score = rush_hour_boost + city_centre_boost + incident_boost + noise(0–20)

rush_hour_boost   = 22 (07:00–09:00) | 27 (17:00–20:00) | 6 (off-peak)
city_centre_boost = 15 (zone 1) | 8 (zone 2) | 3 (zone 3+)
incident_boost    = 18 × high | 10 × medium | 4 × low incident on that line

delay_score = incident_delay + rush_hour_bonus (2–6 min random)
```

**Crowd labels:** `calm` (< 35) · `moderate` (< 60) · `busy` (< 80) · `critical` (≥ 80)

**Delay severity:** `none` (0 min) · `minor` (< 5) · `moderate` (< 12) · `severe` (≥ 12)

---

## ClickHouse Schema

All analytics writes go to the `beattraffic` database via `orchestration-api/app/analytics.py`.

| Table | Engine | TTL | Description |
|---|---|---|---|
| `crowd_predictions` | MergeTree | 90 days | Per-station crowd forecasts (label, probabilities, context flags) |
| `user_events` | MergeTree | 365 days | Fare calculations, ticket purchases, route events |
| `api_requests` | MergeTree | 90 days | Every HTTP request (method, path, status, latency) |
| `transit_incidents` | MergeTree | 365 days | Incidents ingested via webhook |
| `finops_costs` | MergeTree | 2 years | Per-service daily cost entries for FinOps queries |
| `ridership_od_daily` | MergeTree | — | DOSM OD ridership; read by the `ridership_stats` MCP tool |
| `station_crowd_hourly` | AggregatingMergeTree | 120 days | MV: hourly crowd roll-up per station |
| `fare_funnel_daily` | AggregatingMergeTree | 400 days | MV: daily fare event funnel |
| `line_delay_daily` | AggregatingMergeTree | 400 days | MV: daily incident count per line |

All tables are partitioned by `toYYYYMM(…)` for cheap TTL eviction.

### Populating finops_costs

Insert cost entries from your billing exporter or manually:

```sql
INSERT INTO beattraffic.finops_costs (event_date, service, environment, cost_usd)
VALUES (today(), 'anthropic', 'prod', 12.34);
```

Or use the migration script to copy existing data from another source:

```bash
POSTGRES_URL=postgresql://… CLICKHOUSE_URL=http://localhost:8123 \
  python scripts/migrate_postgres_to_clickhouse.py
```

### ClickHouse MCP server (optional)

Query ClickHouse interactively from Claude Code:

```bash
claude mcp add \
  -e CLICKHOUSE_HOST=localhost \
  -e CLICKHOUSE_PORT=8123 \
  -e CLICKHOUSE_USER=default \
  -e CLICKHOUSE_PASSWORD='' \
  -e CLICKHOUSE_DATABASE=beattraffic \
  --scope user \
  mcp-clickhouse -- \
  uv run --with mcp-clickhouse --python 3.12 mcp-clickhouse
```

---

## NOC Graph

The `POST /agent/query` endpoint routes through a 4-node pipeline:

```
query
  └─► intent_router
        ├─► finops_query      (intent == "finops" — queries ClickHouse finops_costs, then Claude)
        ├─► system_health     (intent == "health")
        ├─► mobility_query    (intent == "mobility" — carpark + transit data)
        └─► general_response  (everything else)
```

**Intent detection** uses word-boundary regex (`\b…\b`) to avoid false positives (e.g. "override" does not trigger the mobility branch).

**FinOps safety gate:** queries containing `DROP`, `DELETE`, `INSERT`, `UPDATE`, or `ALTER` are blocked before reaching ClickHouse or the LLM.

**FinOps data grounding:** `finops_query` fetches the last 30 days of spend from `beattraffic.finops_costs` and passes it as context to Claude, so answers cite real figures instead of hallucinating costs.

**Webhook alerts** (`POST /webhook/alerts`) validate the optional `X-Webhook-Secret` header with `hmac.compare_digest`, assign an `INC-{uuid}` incident ID, and forward to the Slack bot's internal `/ingest` endpoint asynchronously via `BackgroundTasks`.

---

## Slack Integration

### Commands

| Command | Description |
|---|---|
| `/noc-query` | Opens a modal to submit a natural-language NOC query |
| `/noc-status` | Returns live health status and open incident count |

### Alert Forwarding

Alerts flow: `POST /webhook/alerts` → orchestration-api → `POST http://slack-bot:3001/ingest` → Slack channel.

Channel routing:
- Region set → `#logistics-{region}` (e.g. `#logistics-kl`)
- P1 / P2, no region → `#ops-alerts`
- P3+, no region → `#ops-events`

Deduplication: alerts are fingerprinted by `sha256(severity:region:summary)` and suppressed for 5 minutes via Redis `NX EX 300`. The dedup key is released if the Slack post fails so the alert can be retried.

---

## Linting & Type Checking

```bash
cd frontend
npm run lint         # ESLint (next/core-web-vitals + typescript-eslint)
npm run typecheck    # next typegen + tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test             # Vitest
```

---

## Station Map Coverage

`ml/station_line_map.json` maps DOSM ridership station names to line, zone, and interchange status. Used by the ML training scripts for feature engineering.

| Line | line_id | Colour | Stations mapped |
|---|---|---|---|
| MRT Putrajaya | 0 | Yellow | 15 |
| MRT Kajang | 1 | Blue | 22 |
| LRT Kelana Jaya | 2 | Red | 26 |
| LRT Ampang | 3 | Orange | 15 |
| LRT Sri Petaling | 4 | Dark Orange | 13 |
| KL Monorail | 5 | Pink | 9 |
| KTM Komuter | 6 | Indigo | 30 |
| BRT Sunway | 7 | — | 5 |
| **Total** | | | **≈ 135** |

Stations that serve multiple lines (e.g. KL Sentral, Titiwangsa, Putra Heights) carry `"is_interchange": 1` and are assigned to their most prominent line. Expand by updating this file with real GTFS `stop_name` values and re-running the training scripts.

---

## Transit Graph & Disruption Agent

A KL commuter asks *"the line is down, how do I still get to KLCC by 9am?"*. The agent finds the relevant service notice, closes the affected edges in a transit graph, plans candidate routes, checks crowd forecasts on each, **verifies every leg exists in the graph**, and answers with the top two routes, their time and crowd level, and why the first one wins.

```
 notice text (untrusted)         ┌──────────────────────── MCP gateway (allowlist · rate limit · arg validation · audit log) ───────────────────────┐
        │                        │  plan_route      crowd_forecast        ridership_stats           search_notices                                  │
        ▼                        │  graph in        LightGBM (ONNX)       ClickHouse, read-only     pgvector (Postgres)                             │
 ┌─ LangGraph agent ───────┐     │  Postgres        crowd level/station   parameterised aggregates  service_notices                                 │
 │ parse ─► context ─►     │────►└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 │ reweight ─► plan ─►     │
 │ forecast ─► assess ─┐   │   assess: if the best route is crowded, add steering penalties and re-plan (max 3 iterations)
 │      ▲──────────────┘   │
 │ verify ─► answer        │   verify: re-checks every leg against the graph's edge index; failures are dropped, never shown
 └─────────────────────────┘
```

**Graph.** Stations are nodes; edges are per-line rail segments (minutes from distance, speed and dwell) plus walking links. Routing is Dijkstra over `(station, line)` states so a line change is a priced transition: transfer walk + half the new line's headway + a 3-minute transfer penalty. Closures are line-scoped (shared trunk track: closing the Ampang Line between two stations does not close the Sri Petaling Line). Candidate routes come from diversification: soft-penalise the lines and stations of the best route and re-plan.

**Tools** (`orchestration-api/mcp_server/`): `plan_route`, `crowd_forecast`, `ridership_stats`, `search_notices`. All four are read-only, validated by strict pydantic models (`extra="forbid"`), and reachable only through `ToolGateway`, which both the in-process agent and the MCP server (`python -m mcp_server.server`) use, so they share one allowlist, one validation layer and one audit format. Rate-limit buckets and the default in-memory audit ring are **per process**: the API and an MCP server run separately keep separate counters, and `MCP_AUDIT_LOG` is the durable trail. `plan_route` results are cached per `(graph version, origin, destination, disruption, k)`.

**Every number comes from a tool.** The answer node is deterministic: it formats minutes, depart-by times and crowd probabilities returned by tools (plus arithmetic on them, such as the minute difference between routes). No LLM writes or edits numbers; the agent currently spends **0 tokens** per answer. The per-request budget is a tool-call cap (default 12) and the loop cap.

**Tool-trace example** (`pasar_seni → klcc`, arrive by 09:00, question only, no notice supplied):

```
parse     source=notice:N002 confidence=high  closed_lines=[LRT_KELANA_JAYA]
            tools: plan_route (baseline) → search_notices (line=KJ, k=5) → plan_route… (parse picks the newest notice that affects the baseline route)
reweight  closed_edges=15
plan      routes=3 cache_hit=False                                 tool: plan_route (closure, k=3)
forecast  stations=9                                               tool: crowd_forecast
assess    iteration=1 next=verify
verify    verified=3 rejected=0
answer    status=ok routes=2
```

### Web app (`frontend/`)
Next.js 15 (App Router), React 19, Tailwind CSS 3, Framer Motion, MapLibre GL, shadcn-style primitives (Radix). It is the whole web UI: the landing page with ticketing, QR scanning, saved commutes, passport, leaderboard, Commute AI (Firebase RAG with a local fallback), Google Maps and the admin dashboard (Blink auth) live in `app/(site)`, and the disruption re-planner is at `/replan`.
- **Migrated from Vite.** The old React/Vite app is gone. Environment variables are now `NEXT_PUBLIC_*` (inlined at build time); the Vite PWA plugin is replaced by a hand-written worker (`public/sw.js`, registered in production only): hashed `/_next/static` files are cache-first, page navigations are network-first with the last visited copy (or the home page) as the offline fallback, DOSM data is network-first with a 1 h limit and Google Maps is cache-first for 24 h. It only handles GET and never touches `/api`, Blink or Firebase calls. Bump `VERSION` in the file to drop old caches. The app is installable via `app/manifest.ts`; the GTFS/route caches use the Cache API directly. The landing page and admin keep their original light-only look; the re-planner follows the system theme.
- **Blink SDK contract.** `blink.db.<table>.list()` returns an array, `create()` the record, and `delete()` takes an id. The old code destructured `{ data }` and passed `filter`/`{ where }`, so ticket history, QR validation, saved commutes, the leaderboard and delay reports silently fell back to their local/empty paths; `lib/blink.ts` now types the tables and `tests/legacy-data.test.ts` pins the calls.
- **Same-origin proxy.** The browser only talks to `/api/transit/{network,notices,replan}`; route handlers forward to the orchestration API at runtime (`API_URL`). There is no CORS and no backend URL in the browser, the upstream URL is built from a three-entry allowlist (so it cannot be used as an open proxy), request bodies are capped, and upstream error text is never echoed to the browser. The handler passes the visitor's IP in `X-Client-IP`; the API believes it **only** when the direct peer is in `TRUSTED_PROXIES`, so a spoofed header cannot dodge per-user rate limiting. The gate-signal endpoint is deliberately not proxied.
- **Motion and accessibility.** Framer Motion is used for entrance stagger, a shared-layout selection highlight and a minutes count-up, under `MotionConfig reducedMotion="user"`; screen readers get the final value, not the animating digits. Crowd levels carry an icon and text, never colour alone; the map is a labelled region with a text fallback when WebGL is unavailable; dark mode follows the system setting.
- **Run:** `cd frontend && cp .env.example .env.local && npm ci && npm run dev` (needs the API on `API_URL`, default `http://localhost:8000`). Checks: `npm run lint && npm run typecheck && npm test && npm run build`, all run in CI. Container: `frontend/Dockerfile` (standalone output, non-root) and the `web` service in `docker-compose.yml`.

### Live gate-signal feed
The crowd model is driven mostly by the last 15/30 minutes of per-station crowd and tap-in readings. `POST /transit/gate-signals` accepts them from whatever feed you connect: `{"signals": [{"station": "klcc", "crowd": 2, "tap": 0.9, "at": "<tz-aware ISO time, optional>"}]}`, authenticated with `X-Gate-Feed-Token`. It returns 503 until `GATE_FEED_TOKEN` is configured, checks the token before parsing the body, and validates the whole batch before storing any of it (unknown stations, out-of-range values, naive or future timestamps are rejected). `GET /transit/gate-signals/status` reports feed freshness only.
- **The feed must send normalised readings** (`crowd` 0=Low 1=Moderate 2=High; `tap` 0..1 as the share of that station's usual peak tap-in rate). Calibration is the sender's job: this repo does not guess per-station capacities.
- The agent asks `crowd_forecast` for live signals on every request. Readings older than 20 minutes are ignored (and the answer says the feed is stale); signals supplied in the request win per station over the feed. `crowd.signal_source` is `live_feed`, `request`, `mixed` or `none`, and the UI shows it.
- The store is **in-memory and per-process**: run one API worker, or swap in a shared store (e.g. Redis) before scaling out. **No real feed is connected**; choosing and wiring one is a data-source decision outside this repo.

### Security
- **Notices are untrusted text.** `app/agent/parse.py` is a gazetteer + cue matcher: it can only emit station ids and line codes that already exist in the graph, and the only effect is which edges are closed. Notice text does influence `plan_route` arguments, but only by populating the closure fields with ids that exist in the graph: it cannot choose a tool, add a tool call, or supply any other argument. Resolved or negated wording ("services resumed", "not disrupted") closes nothing, and a `between A and B` segment needs an outage cue in the same sentence. Covered by tests (including a retrieved notice that says "IGNORE ALL PREVIOUS INSTRUCTIONS…") and by eval scenario S19.
- **Tools stay read-only** and the allowlist is a code constant. ClickHouse access is parameterised and uses a read-only user with the server-side `readonly=1` setting (`infra/clickhouse/readonly_user.sql`). The `station`/`direction`/`day_type` inputs are validated and mapped to fixed SQL fragments; values go in as query parameters.
- **HTTP**: CORS is an explicit allowlist (`CORS_ORIGINS`); the rate-limit identity is server-assigned from the source IP, not client-supplied.

### Reliability
- Forecast tool down → the routes are still returned, crowd fields are omitted and the answer says crowd data is missing. Nothing is invented.
- No route exists → `status: no_route` with the reason (for example a Kelana-Jaya-only station when the whole line is suspended).
- Metrics: `transit_agent_verify_rejections_total` and `transit_agent_loop_cap_hits_total` (alerts in `infra/prometheus/alert_rules.yml`); every tool call is in the audit log keyed by `trace_id`.

### Evaluation (`orchestration-api/eval/`)
40 **synthetic** scenarios (10 line closure, 10 station closure, 8 segment closure, 6 peak hour, 6 event crowd). Notices come from `app/rag/seed_notices.py` and crowd signals are simulated gate readings. Ground truth is independent of the router: legs are re-checked (topology, continuity, priced transfers, endpoints, closures) against the raw seed lists, reachability against a plain BFS, and tool use is read from the gateway audit log, not from the agent's own report.

```bash
cd orchestration-api
pip install -r requirements-dev.txt
python ../ml/train_crowd_model.py --rows 60000 --out /tmp/models   # synthetic-data LightGBM, ~10 s
CROWD_MODEL_PATH=/tmp/models/crowd_model.onnx python -m eval.run_eval --forecaster onnx
```

Last run (real LightGBM/ONNX forecaster, in-memory notices, seed graph). `python -m eval.run_eval` exits non-zero if a hard gate fails, and CI runs it.

| Metric | Result | Gate |
|---|---|---|
| Returned legs valid against raw seed data (topology, continuity, priced transfers, endpoints, closures) | 231 / 231 (100%) | hard, 100% |
| Closures respected (no closed edge used) | 40 / 40 | hard, 100% |
| Status matches BFS reachability and label | 40 / 40 | hard, 100% |
| Correct tools chosen (from audit log) | 40 / 40 | hard, ≥ 95% |
| Gateway refusals (denied, rate-limited or invalid-argument calls) | 0 | hard, 0 |
| Peak/event scenarios where the fastest route was High crowd | 11 / 12 | reported |
| …of which the agent chose a lower-risk route | 8 / 12 (mean +3.1 min, worst-station p_high −0.98) | reported |
| Verify rejections / loop-cap hits | 0 / 0 | alerting |
| Tool calls per answer | median 2, max 5 | reported |
| Tokens per answer | 0 (deterministic answer node) | reported |
| Latency, cold route cache | p50 20.6 ms, p95 37.0 ms | reported |
| Latency, warm route cache | p50 17.1 ms, p95 19.6 ms | reported |

**Read these numbers with care.**
- The crowd-aware result is on *simulated* signals. The model is `v1-synthetic`, trained on synthetic data, and it leans almost entirely on the last 15/30 minutes of crowd and tap-in readings. With no live fare-gate feed it falls back to neutral inputs and calls every station "Moderate" (p_high ≈ 0.01–0.03), so **crowd-aware routing cannot differentiate stations until a real gate feed supplies those signals**. The ingestion side now exists (see "Live gate-signal feed"), but no real feed is connected: the scenarios and the UI's event toggle inject simulated signals, and every answer states where its crowd signals came from (`crowd.signal_source`) and warns when there are none.
- In 3 of 12 crowd scenarios the chosen route was not safer: every alternative also crossed a crowded hub or cost more than the crowd weight (10 minutes of travel time per unit of worst-station p_high) justified.
- The scenario hubs were placed on the fastest route so there is something to steer around; that is a statement about scenario design, not about real traffic.
- Latency is dominated by in-process routing on a 66-station graph; it says nothing about Postgres or ClickHouse round-trips, which the eval does not exercise.

### Known limitations
- The network is a **curated core subset** (66 stations, 6 lines) with approximate coordinates and distance-derived times (`app/transit/network_seed.py`). `ml/station_line_map.json` has no stop order or coordinates, so it cannot build edges. Replace the seed with the Prasarana GTFS pipeline; `Graph` and the Postgres schema do not change.
- **Live-server coverage.** In CI: Postgres 16 + pgvector (`tests/test_postgres_integration.py`: schema, seeding, graph loading, pgvector search) and a real ClickHouse 24.3 server, the image pinned in `docker-compose.yml` (`tests/test_clickhouse_live.py`: `init.sql`, the loader through the real driver, `ridership_stats` over the native protocol as the real `ridership_ro` user checked against a pandas oracle, and that user being denied every write, every other table, and any attempt to change its own limits). The embedded-engine tests (`tests/test_clickhouse_sql.py`, `chdb`) run without a server. The same suite was also run against ClickHouse 26.10. The eval itself still uses in-memory stand-ins. Notice embeddings are a dependency-free feature-hash (`HashEmbedder`, 256-d), not a semantic model.
- **Compose stack.** Verified by hand against the repo's own `docker-compose.yml` (ClickHouse, Postgres, Redis, the API and the web container; not Slack bot, Prometheus, Grafana or OpenTripPlanner): the API starts and goes healthy, the web container reaches it by service name, the fixed-address proxy trust works (a real client IP forwarded by the web container is used for rate limiting, a spoofed `X-Client-IP` sent straight at the published API port is ignored), Postgres seeds and the API switches from the seed graph to it, and `ridership_stats` returns real aggregates from the API container. **Not run literally:** `docker compose build web`/`docker build ./frontend` (the sandbox's TLS-intercepting proxy blocks `npm ci` inside build containers). Its steps were run individually: `npm ci` and `next build` on `node:22-alpine`, then the final stage's own instructions as the non-root `node` user with a healthy healthcheck. Callers that hit the API's published port directly share one rate-limit identity (the Docker bridge gateway); use the web container, or set `TRUSTED_PROXIES` for your own proxy.
- Notices have no validity window or resolved state: the agent takes the newest notice that affects your normal route. A newer whole-line suspension therefore supersedes an older segment notice.
- Lagged crowd inputs default to neutral; forecasts use each route's departure time for all of its stations.
- Crowd risk is scored on the stations where a rider waits (boarding, transfers, alighting), not on stops a train merely passes through; a crowded train between stations is not modelled. A route's score is its worst such station, not an average.
- Public-holiday flags come from the optional `holidays` package (treated as 0 when it is not installed); the school-holiday calendar is not modelled.
- `ridership_stats` matches the graph's station display name case-insensitively against the DOSM `origin`/`destination` strings. DOSM spellings may differ for some stations, so those return zero rows until they are listed in `app/transit/dosm_names.json`. Generate a proposal from a real DOSM export with `python scripts/map_dosm_names.py --parquet <file>` (run from `orchestration-api/`); it auto-accepts only exact and clearly-best matches and lists the rest for a human. The shipped map is empty because DOSM data was not reachable when this was built. Inbound lookups filter on `destination`, which is not in the table's sort key, so they scan more than outbound ones.
- `ridership_stats` needs the dedicated read-only user (`infra/clickhouse/readonly_user.sql`) and the native-protocol port (9000); it refuses to run as a privileged user.
- The whole web UI lives in `frontend/` (Next.js 15). Base map tiles come from public OpenStreetMap; use your own tile provider in production.

### Run it
```bash
# backend (seed graph + in-memory notices need no database)
cd orchestration-api && pip install -r requirements-dev.txt && uvicorn main:app --reload
# web app (Next.js; proxies /api/transit/* to API_URL, default http://localhost:8000)
(cd frontend && npm ci && npm run dev)   # → http://localhost:3000 (re-planner at /replan)
# full data path (Postgres is bound to localhost only)
docker-compose up -d postgres clickhouse
(cd orchestration-api && DATABASE_URL=postgresql://beattraffic:beattraffic_dev@localhost:5432/beattraffic python -m scripts.seed_transit)
# then set DATABASE_URL for the API. If the tables are empty the API falls back to the seed graph.
python scripts/load_ridership_clickhouse.py --parquet path/to/od_ridership.parquet   # idempotent; see the script for columns
# MCP server for other clients
python -m mcp_server.server
# read-only ClickHouse user for ridership_stats (compose's ClickHouse allows it; set CLICKHOUSE_RO_USER/_PASSWORD for the API)
sed 's/CHANGE_ME/<password>/' infra/clickhouse/readonly_user.sql | docker compose exec -T clickhouse clickhouse-client --multiquery
# whole stack incl. the web container (TRUSTED_PROXIES is preconfigured for the web container's fixed address)
docker compose up -d web
```

---

## Roadmap

- [ ] **AI Crowd Prediction v2** — blend ridership history, events, and weather for 30-min coach-load forecasts
- [ ] **Offline Routing** — cache GTFS fragments + walking graphs for no-signal zones
- [ ] **OpenTripPlanner Integration** — GTFS-aware multi-modal routing with real ETAs
- [ ] **MapLibre Map View** — live train positions and station overlays on OpenStreetMap
- [x] **RAG Chat Assistant** — Firebase Firestore vector search + local hybrid fallback; Gemini embeddings via Cloud Functions (`ragQuery` / `ragIngest`)
- [x] **Prometheus Metrics** — `/metrics` endpoint on orchestration-api, scraped every 10 s; Grafana dashboards provisioned
- [x] **Slack Alert Forwarding** — webhook → orchestration-api → Slack with Redis-backed SHA-256 content dedup
- [x] **ClickHouse Analytics** — all events, requests, incidents, and cost data in ClickHouse; PostgreSQL removed
- [ ] **FinOps Billing Exporter** — wire Anthropic / cloud billing APIs to populate `finops_costs` automatically
- [ ] **BAS.MY Live API** — replace mock bus data with registered BAS.MY API credentials
- [ ] **Fare Caps** — auto top-up and daily/weekly fare cap logic per Prasarana rules
- [x] **Transit Graph + Disruption Agent** — graph routing, MCP tools, LangGraph re-planner, 40-scenario eval, Next.js map UI (`frontend/`)
- [ ] **Full GTFS Station Map** — replace `station_line_map.json` stubs with real Prasarana GTFS `stop_id` → `stop_name` mappings
- [ ] **Safe-Walk Guidance** — incident clusters and late-night exit recommendations
- [ ] **State-by-State Expansion** — Johor → Penang → Sarawak with localised operator feeds

---

© 2026 Beat KL traffic. Clearer roads for Klang Valley.
