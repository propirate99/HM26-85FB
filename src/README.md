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

---

## Camera Evidence: Architecture & Standard Operating Procedure (SOP)

### Root Cause Analysis & Solutions
When users experienced a black screen on `/app/report` Step 3, the underlying causes were:
1. **Overconstrained Hardware Constraints**: Requesting `{ facingMode: { ideal: "environment" } }` on devices without an outward-facing camera (e.g. MacBooks, desktop webcams) caused browser `OverconstrainedError` or empty streams.
2. **Autoplay Policy & Playback Suspension**: Mobile and modern desktop browsers require explicit `video.play()` invocation inside `onloadedmetadata` on unmuted/muted video elements after setting `srcObject`.
3. **Missing Fallback Modality**: Inability to select or upload a device image when camera permissions were denied or hardware was busy.

### Engineering Safeguards Implemented
- **Relaxed Multi-Tier Media Negotiation** (`useCamera.js`): Automatically falls back to `{ video: true }` if environment-facing camera constraints fail.
- **Live State Detection**: Real-time visual feedback for `loading`, `live` (emerald pulse), and `denied` (actionable recovery instructions).
- **File Upload Fallback** (`CameraCapture.jsx`): Allows citizens to pick a photo from device storage or native camera app with in-app provenance tracking.
- **One-Click Field Evidence Presets**: Instant simulation of verified Mysuru civic evidence (Vidyaranyapuram Black Spot, KRS Road Pothole, Sayyaji Rao Streetlight) for zero-friction desktop testing.

### Standard Procedure for Reporting Camera Evidence Issues
When logging camera/media capture defects:
1. **Collect Diagnostics**: Note client browser, operating system, and hardware type (mobile, desktop, external webcam).
2. **Permission Check**: Inspect `navigator.permissions.query({ name: 'camera' })` status (`granted`, `prompt`, `denied`).
3. **Inspect Media Devices**: Verify `navigator.mediaDevices.enumerateDevices()` returns at least one `videoinput`.
4. **Ticket Template**:
   - **Title**: `[Camera/MediaCapture] <Specific Failure>`
   - **Environment**: OS, browser version, camera device type.
   - **Reproducible Steps**: Navigation path, permission grant prompt response, console errors (`NotAllowedError`, `NotFoundError`, `NotReadableError`).
   - **Fallback Verification**: Confirm whether file upload fallback or sample generator operated as intended.

---

## AI Complaint Management & Triage System

### API Key Authentication & Configuration
CivicVerify integrates with **Google Gemini 2.5 Flash** for multimodal complaint analysis:
- **Environment Setup** (`HM26-85FB/src/.env`):
  ```bash
  # Google Gemini AI Configuration
  GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
  GEMINI_MODEL=gemini-2.5-flash
  AI_PROVIDER=gemini   # Automatically defaults to 'gemini' when key is detected
  ```
- **Zero-Downtime Heuristic Engine**: If no external API key is configured, the system automatically runs the embedded heuristic AI engine so development, testing, and offline deployments remain 100% operational.
- **Live Admin Key Management**: Executives can view connectivity status (`GET /api/admin/ai/status`) and dynamically activate API keys via the `/admin` Operations Console without restarting the server.

### AI Triage Pipeline & Features
Every submitted complaint undergoes automated AI review:
1. **Fake & Gibberish Screening**:
   - Detects spam, keyboard smash (e.g. `asdf`, `qwerty`), selfies, memes, indoor photos, and non-civic content.
   - Flags entries with `isFake: true` and categorizes the reason (`GIBBERISH_OR_SPAM`, `NOT_CIVIC_RELATED`, `SYNTHETIC_GENERATED`).
   - Reduces verification score and forces automatic routing to `NEEDS_REVIEW`.
2. **Multimodal Auto-Categorization**:
   - Inspects complaint narrative and visual evidence to infer standard municipal categories: `GARBAGE`, `POTHOLE`, `STREETLIGHT`, `DRAIN`.
   - Produces a confidence score (0.0 to 1.0) and extracts municipal tags (e.g. `#solid_waste`, `#overflowing_bin`, `#road_hazard`).
   - Flags category mismatches between citizen selection and AI prediction.
3. **Severity & SLA Urgency Estimation**:
   - Identifies public hazards (`hazard`, `accident`, `danger`, `sparking`, `flooding`) and assigns severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
   - Elevates SLA urgency for high-impact civic threats.
4. **Integrated Duplicate Screening**:
   - Correlates spatial distance, category alignment, text Jaccard similarity, and perceptual image hash (`pHash`) with AI semantic overlap.
   - Produces duplicate match confidence (`STRONG`, `POSSIBLE`, `CREATE`) and links duplicate candidate IDs.

### Database Schema Enhancement (`aiTriage`)
Both `Report` and `CivicIssue` schemas persist structured AI triage metadata:
```json
{
  "analyzed": true,
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "isFake": false,
  "fakeReason": "",
  "suggestedCategory": "GARBAGE",
  "categoryAgrees": true,
  "confidence": 0.94,
  "extractedTags": ["solid_waste", "overflowing_bin"],
  "severity": "MEDIUM",
  "duplicateScore": 0,
  "duplicateDecision": "CREATE",
  "duplicateCandidateId": null,
  "summary": "Overflowing waste bin requiring immediate clearance",
  "analyzedAt": "2026-09-19T11:00:00.000Z",
  "durationMs": 340
}
```
Officers and administrators can inspect the AI Triage card on `/app/issues/:id` and `/admin`.
