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
| Framework | React 19 + Vite 7 |
| Language | TypeScript 5.9 |
| Routing | React Router v7 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Auth & DB | Blink SDK (`@blinkdotnew/sdk`) |
| QR Codes | `react-qr-code` (generation), browser BarcodeDetector API (scanning) |
| Notifications | `react-hot-toast` |
| Animations | Framer Motion |
| Maps (planned) | OpenStreetMap + MapLibre GL |

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
├── src/                          # Web app (React + Vite)
│   ├── App.tsx                   # Root — BrowserRouter + Routes
│   ├── main.tsx                  # Entry point with BlinkProvider
│   ├── pages/
│   │   ├── AdminDashboard.tsx    # /admin (auth-gated, 6 tabs)
│   │   └── StationPage.tsx       # /station/:stationId
│   ├── components/
│   │   ├── features/
│   │   │   ├── RoutePlanner.tsx          # Fare calc + delay integration
│   │   │   ├── TicketList.tsx            # My tickets with QR codes
│   │   │   ├── TransitIntelligencePanel.tsx
│   │   │   ├── DelayPredictionPanel.tsx  # Per-line AI delay cards
│   │   │   ├── AlternativeRoutePanel.tsx # Shown on delay > 5 min
│   │   │   ├── QRScanner.tsx             # Camera + manual validation
│   │   │   ├── StationIntelligence.tsx   # Full station detail view
│   │   │   ├── PersonalCommuteAssistant.tsx
│   │   │   └── FeatureCard.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx        # Sticky nav; Admin link for auth users
│   │   │   ├── LiveTicker.tsx    # Scrolling real-time line status
│   │   │   └── Footer.tsx
│   │   ├── sections/             # Landing page sections
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   ├── LineIntelligenceSection.tsx
│   │   │   ├── ArchitectureSection.tsx
│   │   │   └── RoadmapSection.tsx
│   │   └── ui/                   # shadcn/ui component library
│   ├── lib/
│   │   ├── transitData.ts        # Domain types + fallback stations
│   │   ├── predictiveEngine.ts   # Crowd level scoring
│   │   ├── delayPrediction.ts    # Per-line delay model
│   │   ├── alternativeRoutes.ts  # Alternative route templates
│   │   ├── busApi.ts             # BAS.MY + RapidKL bus data
│   │   ├── stationIntelligence.ts # Facilities, exits, next-train factory
│   │   ├── dosmApi.ts            # DOSM station CSV ingestion
│   │   ├── blink.ts              # Blink SDK client
│   │   └── utils.ts
│   └── hooks/
│       ├── useAuth.ts            # Blink auth state
│       └── use-mobile.tsx
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
# Install dependencies
bun install

# Configure environment
cp .env.local.example .env.local
# Fill in VITE_BLINK_PROJECT_ID and VITE_BLINK_PUBLISHABLE_KEY

# Start dev server
bun run dev
# → http://localhost:5173
```

**Production build:**

```bash
bun run build
bun run preview
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

### Web App (`.env.local`)

| Variable | Description |
|---|---|
| `VITE_BLINK_PROJECT_ID` | Blink project ID (auto-detected from `.blink.new` hostname) |
| `VITE_BLINK_PUBLISHABLE_KEY` | Blink publishable key for auth and database access |
| `VITE_FIREBASE_API_KEY` | Firebase web API key (optional; enables cloud RAG) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_FUNCTIONS_REGION` | Cloud Functions region (default `asia-southeast1`) |

### Firebase RAG (Cloud Functions)

| Secret / step | Description |
|---|---|
| `GEMINI_API_KEY` | Set with `firebase functions:secrets:set GEMINI_API_KEY` for `text-embedding-004` |
| `ragIngest` | Callable function (admin claim) — seeds `knowledge_chunks` with embeddings |
| `ragQuery` | Callable function — embeds user question and returns top-k chunks |

Without Firebase env vars, Commute AI uses the bundled local hybrid retriever (`src/lib/rag/localRetriever.ts`).

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
| `/disruption` | `DisruptionPage` | Public |

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
bun run lint         # TypeScript + ESLint + Stylelint + CSS variable checks (all)
bun run lint:types   # TypeScript compiler check only
bun run lint:js      # ESLint only
bun run lint:css     # Stylelint only
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
- The crowd-aware result is on *simulated* signals. The model is `v1-synthetic`, trained on synthetic data, and it leans almost entirely on the last 15/30 minutes of crowd and tap-in readings. With no live fare-gate feed it falls back to neutral inputs and calls every station "Moderate" (p_high ≈ 0.01–0.03), so **crowd-aware routing cannot differentiate stations until a real gate feed supplies those signals**. The scenarios inject them; the answer carries a warning when none were supplied.
- In 3 of 12 crowd scenarios the chosen route was not safer: every alternative also crossed a crowded hub or cost more than the crowd weight (10 minutes of travel time per unit of worst-station p_high) justified.
- The scenario hubs were placed on the fastest route so there is something to steer around; that is a statement about scenario design, not about real traffic.
- Latency is dominated by in-process routing on a 66-station graph; it says nothing about Postgres or ClickHouse round-trips, which the eval does not exercise.

### Known limitations
- The network is a **curated core subset** (66 stations, 6 lines) with approximate coordinates and distance-derived times (`app/transit/network_seed.py`). `ml/station_line_map.json` has no stop order or coordinates, so it cannot build edges. Replace the seed with the Prasarana GTFS pipeline; `Graph` and the Postgres schema do not change.
- **Live-server coverage.** The Postgres schema, seeding, graph loading and pgvector search run against a real Postgres 16 + pgvector in CI (`tests/test_postgres_integration.py`, service container). The ClickHouse SQL (`init.sql`, the `ridership_stats` query, the loader) runs on the real ClickHouse engine embedded via `chdb` (`tests/test_clickhouse_sql.py`), checked against an independent pandas oracle. **Not covered:** the ClickHouse native wire protocol, a real read-only user being denied writes, and the full `docker-compose` stack; the eval itself still uses in-memory stand-ins. Notice embeddings are a dependency-free feature-hash (`HashEmbedder`, 256-d), not a semantic model.
- Notices have no validity window or resolved state: the agent takes the newest notice that affects your normal route. A newer whole-line suspension therefore supersedes an older segment notice.
- Lagged crowd inputs default to neutral; forecasts use each route's departure time for all of its stations.
- Crowd risk is scored on the stations where a rider waits (boarding, transfers, alighting), not on stops a train merely passes through; a crowded train between stations is not modelled. A route's score is its worst such station, not an average.
- Public-holiday flags come from the optional `holidays` package (treated as 0 when it is not installed); the school-holiday calendar is not modelled.
- `ridership_stats` matches the graph's station display name case-insensitively against the DOSM `origin`/`destination` strings. DOSM spellings may differ for some stations, so those return zero rows until they are listed in `app/transit/dosm_names.json`. Generate a proposal from a real DOSM export with `python scripts/map_dosm_names.py --parquet <file>` (run from `orchestration-api/`); it auto-accepts only exact and clearly-best matches and lists the rest for a human. The shipped map is empty because DOSM data was not reachable when this was built. Inbound lookups filter on `destination`, which is not in the table's sort key, so they scan more than outbound ones.
- `ridership_stats` needs the dedicated read-only user (`infra/clickhouse/readonly_user.sql`) and the native-protocol port (9000); it refuses to run as a privileged user.
- The UI is a React/Vite page (`/disruption`) with MapLibre GL and shadcn/ui, matching this repo's stack, not a separate Next.js 15 app. Base tiles come from public OpenStreetMap; use your own tile provider in production.

### Run it
```bash
# backend (seed graph + in-memory notices need no database)
cd orchestration-api && pip install -r requirements-dev.txt && uvicorn main:app --reload
# frontend
VITE_ORCHESTRATION_API_URL=http://localhost:8000 bun run dev   # → http://localhost:5173/disruption
# full data path (Postgres is bound to localhost only)
docker-compose up -d postgres clickhouse
(cd orchestration-api && DATABASE_URL=postgresql://beattraffic:beattraffic_dev@localhost:5432/beattraffic python -m scripts.seed_transit)
# then set DATABASE_URL for the API. If the tables are empty the API falls back to the seed graph.
python scripts/load_ridership_clickhouse.py --parquet path/to/od_ridership.parquet   # idempotent; see the script for columns
# MCP server for other clients
python -m mcp_server.server
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
- [x] **Transit Graph + Disruption Agent** — graph routing, MCP tools, LangGraph re-planner, 40-scenario eval, `/disruption` map UI
- [ ] **Full GTFS Station Map** — replace `station_line_map.json` stubs with real Prasarana GTFS `stop_id` → `stop_name` mappings
- [ ] **Safe-Walk Guidance** — incident clusters and late-night exit recommendations
- [ ] **State-by-State Expansion** — Johor → Penang → Sarawak with localised operator feeds

---

© 2026 Beat KL traffic. Clearer roads for Klang Valley.
