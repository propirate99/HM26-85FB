# Mysuru CivicVerify & Swachha Grid Suite

**See it. Verify it. Resolve it.**

A unified municipal civic governance and solid waste management platform engineered for **Mysuru City Corporation (MCC)**. CivicVerify combines three core operational capabilities into a single consolidated codebase:

1. **Evidence-First Civic Issue Verification (`/app`, `/officer`, `/admin`, `/public`)**:
   - Location-bound evidence capture via live in-app camera and GPS accuracy verification.
   - 7-signal verification scoring engine (Google Gemini 3.6 Flash vision + rule heuristics).
   - Two-stage duplicate detection (spatial radius + token & Levenshtein similarity).
   - Automated zonal officer routing, SLA countdowns, and before/after resolution repair validation.
2. **MCC Swachha Grid — Ward Waste Operations (`/operations`)**:
   - Comprehensive operational register and accumulation tracking across all **65 municipal wards** and **7 zonal offices**.
   - Interactive Leaflet accumulation map with ward centroids, status classification (Critical, Strained, Stable), and vector routes to waste processing plants.
   - Real-time logistics bottleneck identification and priority compactor deployment queues.
3. **Mysuru Waste Logistics Scenario Simulator (`/simulator`)**:
   - Deterministic 600 TPD logistics simulation modeling primary auto-tipper door-to-door collection and secondary compactor haulage.
   - Interactive sliders for city generation (380–900 TPD), source segregation uplift, bin overflow tolerance, fleet counts, and fuel consumption.
   - Real-time KPI telemetry: trips, fleet km, diesel liters, daily cost (₹), cost per tonne (₹/t), CO2 emissions, and processing efficiency score.
   - Dynamic city choropleth map and one-click scenario CSV export.

---

## Unified Structure (`HM26-85FB/src`)

```
HM26-85FB/src/
├── package.json                   # Root monorepo workspace ("frontend", "backend")
├── docker-compose.yml
├── docs/                          # Technical docs & architecture specifications
├── data/                          # Unified raw dataset repository
│   ├── wards.geojson              # 65 Mysuru ward boundaries polygon GeoJSON
│   ├── facilities.geojson         # Treatment & recycling plants GeoJSON
│   ├── swm.json                   # 65-ward daily accumulation & fleet time series
│   ├── MCC_ward_waste_summary_2026-08-20_to_2026-09-18.csv
│   └── mysuru-swm-scenario.csv
├── tools/                         # Data processing and geometry generation
│   ├── build_data.py
│   └── gen_wards.py
├── backend/                       # Express API + Embedded / Mongoose DB
│   ├── data/                      # Backend persistent DB + SWM datasets
│   │   ├── civicverify_db.json
│   │   ├── swm.json
│   │   ├── wards.geojson
│   │   └── facilities.geojson
│   └── src/
│       ├── controllers/
│       │   ├── swm.controller.js  # Endpoints for 65 wards, facilities, & aggregates
│       │   └── ...
│       ├── routes/
│       │   ├── swm.routes.js      # /api/swm endpoints
│       │   └── ...
│       ├── services/
│       │   ├── swm.service.js     # SWM data query & aggregation service
│       │   └── ...
│       └── ...
└── frontend/                      # React 19 + Vite 6 PWA
    └── src/
        ├── assets/
        │   ├── data/              # GeoJSON & JSON assets directly imported by Vite
        │   │   ├── wards.geojson
        │   │   ├── facilities.geojson
        │   │   └── swm.json
        │   └── favicon.svg
        ├── components/
        │   ├── SwachhaMap.jsx     # Leaflet map with centroid & choropleth modes
        │   ├── WardTable.jsx      # Searchable & sortable 65-ward operations register
        │   ├── BottlenecksCard.jsx# Haulage & capacity bottleneck analyzer
        │   ├── PriorityList.jsx   # Ranked priority compactor deployment queue
        │   ├── SimulatorControls.jsx # Fleet & generation scenario sliders
        │   ├── SimulatorMetrics.jsx  # Real-time KPI summary (trips, diesel, cost, CO2)
        │   ├── Navbar.jsx         # Unified navigation across all modules
        │   └── ...
        ├── pages/
        │   ├── SwachhaGridPage.jsx# Ward Waste Operations Dashboard (/operations)
        │   ├── SimulatorPage.jsx  # 600 TPD Logistics Scenario Simulator (/simulator)
        │   ├── LandingPage.jsx    # Unified landing hub (/)
        │   ├── AdminDashboard.jsx # Embedded SWM & simulator operational links (/admin)
        │   ├── CitizenDashboard.jsx (/app)
        │   ├── CreateIssuePage.jsx  (/app/report)
        │   ├── OfficerDashboard.jsx (/officer)
        │   └── PublicIssuesPage.jsx (/public)
        ├── services/
        │   ├── swmApi.js          # SWM data provider service
        │   ├── simulatorEngine.js # Pure ES module simulation math engine
        │   └── ...
        ├── utils/
        │   ├── geoUtils.js        # Haversine, road detour, & centroid helpers
        │   └── ...
        ├── styles/
        │   ├── theme.css          # Royal Mysuru palette design tokens
        │   └── swm.css            # Consolidated styles for maps, grid, & simulator
        └── router/
            └── AppRouter.jsx      # App routing table
```

---

## Quick Start

### 1. Install Dependencies
```bash
cd "HM26-85FB/src"
npm install
```

### 2. Run Test Suite
```bash
# Automated tests for duplicate detection, RBAC, and verification scoring
npm test -w backend
```

### 3. Start Development Servers
```bash
# Concurrently starts Express API (:5050) and Vite PWA (:5173)
npm run dev
```

### 4. Build Production Bundle
```bash
npm run build -w frontend
```

---

## Demo Personas & Roles

| Role | Email / Persona | Primary Access |
| --- | --- | --- |
| **Citizen** | `anitha.r@example.in` (Anitha R) / `ravi.citizen@mysuru.demo` | Submit report with SLA calculation & GPS/camera, track status, preview HTML email notifications |
| **MCC Officer** | `swm.officer@mysuru.gov.in` (SWM Officer) / `ananya.officer@mysuru.gov.in` | 65-ward grievance queue, crew dispatch, ward hotspots, notification mailer log |
| **South Zone Officer** | `karthik.officer@mysuru.gov.in` (Karthik Swamy) | Zone 1/2 queue (`Vidyaranyapuram`), repair photos |
| **Main Authority** | `commissioner@mysuru.gov.in` (MCC Commissioner) | Authority console, SLA escalation, SWM Grid, Simulator |

---

## Key Routes

- **`/`**: Unified landing hub showcasing all system modules.
- **`/app` & `/app/report`**: Citizen evidence reporting flow.
- **`/officer`**: Zonal queue and resolution workflow.
- **`/admin`**: Authority escalation overview, audit logs, and operational telemetry.
- **`/operations`**: MCC Swachha Grid 65-ward operations dashboard.
- **`/simulator`**: 600 TPD solid waste logistics scenario simulator.
- **`/public`**: Privacy-sanitized public complaint feed.
