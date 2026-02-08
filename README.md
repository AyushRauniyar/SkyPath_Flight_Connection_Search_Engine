# SkyPath – Flight Connection Search

A full-stack prototype flight connection search engine built as a take-home assignment. Users search for valid itineraries between two airports (direct, 1-stop, and 2-stop) with **correct layover rules and timezone handling**, including date-line and overnight connection cases. The implementation emphasizes correctness, clear API contracts, validation, and a polished UX with type-ahead, keyboard support, and consistent error messaging.

---

## What’s included

- **Backend:** Node.js + Express REST API; in-memory search over `flights.json` with Luxon-based timezone logic, connection rules (45/90 min min, 6 h max, domestic vs international), and robust validation.
- **Frontend:** React 18 + Vite 5 SPA with airport type-ahead, date picker, loading/error/empty states, and results showing segments, layovers, total duration/price, and journey dates (including correct next-day arrival for long trips).
- **Infrastructure:** Docker Compose that runs both services; backend and frontend Dockerfiles; frontend proxies `/api` to backend in dev and in Docker.
- **Documentation:** This README with run instructions, project structure, implementation highlights, edge cases, and tradeoffs.

---

## How to run

### With Docker (recommended)

```bash
git clone <your-repo>
cd <repo-name>
docker-compose up
```

- **Backend API:** http://localhost:3001  
- **Frontend:** http://localhost:5173  

The dataset covers **2024-03-15** and some overnight flights into **2024-03-16**. Use the search form (origin, destination, date) to try the suggested test cases below.

### Without Docker

**Backend**

```bash
cd backend
npm install
npm start
```

Runs on port 3001. Looks for `flights.json` at repo root, `backend/`, or relative to the running process (see *Project structure*).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on port 5173 and proxies `/api` to `http://localhost:3001`. To use a different backend (e.g. in Docker), set `VITE_API_BACKEND` and ensure the Vite proxy target matches.

### Running tests (backend)

```bash
cd backend
npm install
npm test
```

This runs all tests with Node’s built-in test runner (`node --test`):

- **Unit tests**
  - `src/utils/timezone.test.js` — `parseLocalInTimezone`, `getDepartureDateLocal`, `isLayoverValid`, `layoverDurationMs`, `formatDurationMs` (min/max layover, domestic vs international, formatting).
  - `src/services/searchService.test.js` — `createSearchService` with a small fixture: direct flight, 1-stop connection, empty results for same origin/destination and invalid codes, sort order, itinerary shape.
- **API integration tests** (`src/api.test.js`) — `GET /api/airports` and `GET /api/search` via Supertest against an injected app (no real server or `flights.json`): missing params, same origin/destination, invalid date, invalid airport codes, valid search returns 200 and itineraries.

The test app uses fixture data only; the main server and `flights.json` are not required to run tests.

---

## Project structure

```
AirportUI/
├── backend/
│   ├── src/
│   │   ├── data/loadData.js      # Load & validate flights.json (multi-path resolution)
│   │   ├── services/searchService.js  # Direct/1-stop/2-stop search, layover rules, filter
│   │   ├── utils/timezone.js     # Luxon parsing, departure date, min/max layover
│   │   └── index.js              # Express app, /api/airports, /api/search, validation, logging
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AirportInput.jsx   # Type-ahead, keyboard nav, accessibility
│   │   │   ├── SearchForm.jsx     # Validation, API calls, error mapping
│   │   │   └── Results.jsx        # Itinerary cards, journey dates, badges
│   │   ├── App.jsx / App.css
│   │   ├── main.jsx, index.css
│   │   └── ...
│   ├── vite.config.js            # Proxy /api → backend
│   ├── Dockerfile
│   └── package.json
├── flights.json                   # Dataset (~260 flights, 25 airports)
├── docker-compose.yml
└── README.md
```

Backend is organized into **data** (loading), **services** (search algorithm), and **utils** (timezone/layover). Frontend keeps search state in `App.jsx` and delegates form and results to dedicated components with their own CSS.

---

## Implementation highlights

These choices were made to meet the assignment’s correctness and UX requirements and to keep the code maintainable.

### Backend

- **Single source of truth for time:** All segment and layover durations are computed from **UTC milliseconds** via Luxon. Times in the dataset are **local airport time**; `timezone.js` parses them in the correct zone and converts to epoch ms. That avoids ambiguity for date-line crossings (e.g. SYD → LAX) and overnight segments.
- **Index by local departure date:** Flights are bucketed by **departure date in the origin airport’s timezone** (`getDepartureDateLocal`). A flight that departs late at night in one timezone and lands “next day” elsewhere is still searchable on the day the user selects.
- **Next-day connections:** For 1-stop and 2-stop, the code considers **next calendar day** departures from each connection airport. That correctly finds connections where you arrive late (e.g. 23:00) and leave early next morning (e.g. 06:00), as long as the layover is within 45/90 min – 6 h.
- **No return-to-origin:** Itineraries that pass through the search origin again before the final destination (e.g. JFK → YYZ → JFK → LAX) are **filtered out** after building candidates, so only sensible multi-stop routes are returned.
- **Structured validation:** The search endpoint validates in a clear order: missing params → same origin/destination → date format → airport codes. Each case returns **400** with a consistent `error` and `message` so the frontend can show or map to user-friendly text.
- **Data loading:** `loadData.js` tries several paths for `flights.json` (relative to source, repo root, cwd) so the same code works when run from the repo root or from inside `backend/`, and when `flights.json` is mounted elsewhere in Docker.

### Frontend

- **Unified invalid-airport experience:** If the user types a bad code or the API returns “Invalid airport”, the UI shows the **same** message and a hint (“Select from the dropdown or retype a valid 3-letter code”). Client-side validation uses the same airport list as the backend so invalid codes are caught before submit when possible.
- **Smart code extraction:** The form supports both “LAX” and “LAX – Los Angeles International” style input. A small `getCodeFromQuery()` helper extracts a 3-letter code from the start of the string or before the en-dash so a paste from the dropdown still submits correctly.
- **Accessible type-ahead:** `AirportInput` uses `role="listbox"` / `role="option"` and `aria-selected`, keyboard navigation (Arrow Up/Down, Enter, Escape), and scrolls the highlighted option into view. Click-outside closes the list; `preventDefault` on option mousedown keeps focus in the input so the dropdown doesn’t steal it.
- **Result ranking and display:** Options in the airport dropdown are **ranked**: code match at start of query first, then code contains, then name/city, with alphabetical tie-break by code so “LA” quickly surfaces LAX and LGA.
- **Journey dates that cross midnight:** The “Departing … → Arriving …” line uses **departure date + totalDurationMs** to derive the arrival date. For 24h+ or date-line trips, the displayed arrival day is therefore correct (e.g. “Departing Fri → Arriving Sat”) instead of relying on the last segment’s date string alone.
- **Loading and errors:** Submit button shows “Searching…” and is disabled while loading; Results shows a spinner. Airports fetch failure shows a message and a **Retry** button; search errors show the API message and, for invalid airport, the same hint as above.

---

## Features & behavior (detail)

### Backend (Node + Express)

| Area | Detail |
|------|--------|
| **APIs** | `GET /api/airports` returns the full airport list (code, name, city, country, timezone). `GET /api/search?origin=&destination=&date=` returns `{ itineraries }` sorted by total travel time (shortest first). |
| **Search algorithm** | Direct flights first; then 1-stop (with next-day departures at connection); then 2-stop (with next-day at each connection). Each connection is validated with `isLayoverValid()` (same airport implied by construction). |
| **Connection rules** | Min layover 45 min (domestic) or 90 min (international); max 6 h. Domestic = same country for arriving flight’s origin and departing flight’s destination. Implemented in `utils/timezone.js` and used in `searchService.js`. |
| **Validation** | Missing/empty origin or destination → 400. Same origin and destination → 400. Date not `YYYY-MM-DD` → 400. Unknown airport code → 400 with “Invalid airport” and message. Search errors (e.g. thrown from service) → 500 with safe message. |
| **Result shape** | Each itinerary: `segments` (with `durationFormatted` per segment), `layovers` (airport + durationMs + durationFormatted), `totalDurationMs`, `totalDurationFormatted`, `totalPrice`. |
| **Observability** | Request logging: method, path, status, duration, and query params. Startup logs airport/flight counts and path used for `flights.json`. Search logs result count per query. |

### Frontend (React + Vite)

| Area | Detail |
|------|--------|
| **Search form** | Two `AirportInput` components (origin, destination) and one date input. Airports loaded once from `/api/airports`; type-ahead filters by code, name, or city and sorts by relevance. Keyboard and mouse supported; Retry on airports failure. |
| **Validation** | Required fields, valid 3-letter code in airport list, origin ≠ destination, date required. Backend invalid-airport response is detected and shown with the same copy and hint as client-side. |
| **Results** | Error state (message + hint), loading state (spinner), empty state (“No flights found…”), and list of itinerary cards. Each card: total duration, price, Direct / 1 stop / 2 stops badge; per-segment route and duration; layovers; journey dates line (departure date → arrival date from totalDurationMs). |
| **Styling** | Dark theme (slate/blue), gradient background, card layout for form and results, focus rings, spinner animation, responsive flex layout. |

---

## Edge cases & special scenarios

All of the following are explicitly handled so the app behaves correctly and fails gracefully.

| Scenario | Handling |
|----------|----------|
| **Same origin and destination (JFK → JFK)** | Backend returns 400 with “Origin and destination must be different.” Frontend validates before submit and shows the same message. |
| **Invalid airport code (e.g. XXX → LAX)** | Backend returns 400 “Invalid airport” and message to select from list. Frontend validates against loaded airport list; if API returns invalid-airport, shows same message + hint (dropdown or 3-letter code). |
| **Missing origin / destination / date** | Backend: 400 for missing required params or invalid date format. Frontend: required-field and date checks before submit. |
| **Date line / overnight (SYD → LAX)** | All times parsed in local airport time with Luxon; durations in UTC ms. Total duration and segment times are correct even when local arrival appears “before” departure. |
| **Overnight at connection (arrive 23:00, depart 06:00 next day)** | 1-stop and 2-stop logic include next-day departures from the connection airport; such connections are returned when layover is within 45/90 min – 6 h. |
| **Return to origin mid-itinerary (JFK → YYZ → JFK → LAX)** | Post-search filter in `searchService` removes any itinerary where an intermediate segment’s destination is the search origin. |
| **Domestic vs international layover** | 45 min minimum for domestic (same country), 90 min for international. Uses airport `country` for arriving origin and departing destination. |
| **Max layover 6 hours** | Enforced in `isLayoverValid`; connections with layover > 6 h are not included. |
| **Long trips (24h+) and journey dates** | Frontend computes arrival date as departure date + `totalDurationMs` so “Departing Fri → Arriving Sat” is correct. |
| **Airports API fails** | Error message and Retry button; submit disabled until airports load. |
| **Search API 4xx/5xx** | Error message (and optional hint for invalid airport); results cleared and loading state cleared. |
| **Flights.json location** | Backend tries multiple paths (relative to `loadData.js`, repo root, cwd) so it works from CLI and Docker. |

---

## Suggested test cases

Use these to verify correctness and UX:

| Search | Expected |
|--------|----------|
| **JFK → LAX, 2024-03-15** | Direct and multi-stop options; sorted by total time. |
| **SFO → NRT, 2024-03-15** | International; 90 min minimum layover at connection. |
| **BOS → SEA, 2024-03-15** | No direct flight; only 1-stop (or 2-stop) connections. |
| **JFK → JFK, 2024-03-15** | Validation error: origin and destination must be different. |
| **XXX → LAX, 2024-03-15** | Invalid airport; graceful error and hint to use dropdown or valid code. |
| **SYD → LAX, 2024-03-15** | Date-line route; correct total duration and arrival day in results. |

---

## Architecture & tradeoffs

- **Backend:** In-memory dataset loaded once at startup. Search is implemented as explicit direct → 1-stop → 2-stop loops with shared helpers for “flights from X on date (and optionally next day)” and `buildItinerary`. Timezone and layover logic live in `timezone.js` so they can be unit-tested independently. No database: appropriate for the assignment size (~260 flights); for scale you’d add a DB or cache.
- **Frontend:** React state in `App.jsx` (itineraries, loading, error); `SearchForm` and `Results` are presentational plus their own side effects (fetch, validation). Vite dev server proxies `/api` to the backend; in Docker, `VITE_API_BACKEND=http://backend:3001` points the proxy at the backend service.
- **Docker:** Backend Dockerfile uses Node 20 Alpine, `npm ci`, and copies `flights.json` from the build context so Compose can mount it from the repo root. Frontend runs the Vite dev server with `--host 0.0.0.0` so it’s reachable from the host; for production you’d build the frontend and serve it (e.g. nginx) with a reverse proxy for `/api`.
- **Date scope:** The date picker is limited to 2024-03-15 and 2024-03-16 to match the dataset; this can be relaxed if the dataset is extended.

---

## With more time

- **Tests:** Unit tests for `timezone.js` (parsing, `getDepartureDateLocal`, `isLayoverValid`) and for `searchService` (connection building, return-to-origin filter). Integration test for `GET /api/search` (validation and a few origin/destination/date combinations).
- **Data:** Support arbitrary date ranges when the dataset grows; optional validation that the chosen date falls within available data.
- **Production:** Docker image that builds the frontend and serves it (e.g. nginx) so the app doesn’t depend on the Vite dev server.
