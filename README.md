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
| Cache | Redis 7 |
| Database | PostgreSQL 16 |
| Observability | Prometheus + Grafana |
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
│   ├── main.py
│   └── app/
│       ├── api/routes/
│       │   ├── agent.py          # POST /agent/query
│       │   ├── webhook.py        # POST /webhook/alerts
│       │   └── health.py         # GET /health/summary
│       └── graph/
│           ├── noc_graph.py      # Intent router → node dispatch
│           ├── nodes.py          # finops_query, system_health, general_response
│           └── state.py          # NOCState TypedDict
├── slack-bot/                    # Slack Bolt app (Socket Mode)
│   └── src/
│       ├── app.ts                # Bolt app factory
│       ├── index.ts              # Bootstrap + shutdown
│       ├── handlers/             # alert, home, command, action
│       └── blocks/               # alertBlock, homeBlock, queryBlock
├── functions/
│   └── get-train-status/         # Serverless function: live line status
├── infra/
│   └── prometheus/alert_rules.yml # P1 / P2 alert rules
├── .github/workflows/
│   ├── deploy-orchestration-api.yml  # Path-filtered CI for Python service
│   └── deploy-slack-bot.yml          # Path-filtered CI for Node service
└── docker-compose.yml            # Full local stack (6 services)
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
| Slack Bot | `http://localhost:3000` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3005` |
| Redis | `localhost:6379` |
| PostgreSQL | `localhost:5432` |

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
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | API key for LLM-powered NOC query responses |

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

## NOC Graph

The `POST /agent/query` endpoint routes through a 4-node pipeline:

```
query
  └─► intent_router
        ├─► finops_query      (intent == "finops")
        ├─► system_health     (intent == "health")
        └─► general_response  (everything else)
```

**FinOps safety gate:** queries containing `DROP`, `DELETE`, `INSERT`, `UPDATE`, or `ALTER` are blocked before execution.

**Webhook alerts** (`POST /webhook/alerts`) assign an `INC-{uuid}` incident ID and forward to Slack asynchronously in the background.

---

## Slack Commands

| Command | Description |
|---|---|
| `/noc-query` | Opens a modal to submit a natural-language NOC query |
| `/noc-status` | Returns live health status and open incident count |

---

## Linting & Type Checking

```bash
bun run lint         # TypeScript + ESLint + Stylelint + CSS variable checks (all)
bun run lint:types   # TypeScript compiler check only
bun run lint:js      # ESLint only
bun run lint:css     # Stylelint only
```

---

## Roadmap

- [ ] **AI Crowd Prediction v2** — blend ridership history, events, and weather for 30-min coach-load forecasts
- [ ] **Offline Routing** — cache GTFS fragments + walking graphs for no-signal zones
- [ ] **OpenTripPlanner Integration** — GTFS-aware multi-modal routing with real ETAs
- [ ] **MapLibre Map View** — live train positions and station overlays on OpenStreetMap
- [x] **RAG Chat Assistant** — Firebase Firestore vector search + local hybrid fallback; Gemini embeddings via Cloud Functions (`ragQuery` / `ragIngest`)
- [ ] **BAS.MY Live API** — replace mock bus data with registered BAS.MY API credentials
- [ ] **Fare Caps** — auto top-up and daily/weekly fare cap logic per Prasarana rules
- [ ] **Safe-Walk Guidance** — incident clusters and late-night exit recommendations
- [ ] **State-by-State Expansion** — Johor → Penang → Sarawak with localised operator feeds

---

© 2026 Beat KL traffic. Clearer roads for Klang Valley.
