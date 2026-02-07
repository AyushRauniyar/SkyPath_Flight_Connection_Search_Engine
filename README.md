# SkyPath – Flight Connection Search

A prototype flight connection search engine: search for valid itineraries between two airports (direct, 1-stop, and 2-stop) with correct layover and timezone rules.

## How to run

### With Docker (recommended)

```bash
git clone <your-repo>
cd <repo-name>
docker-compose up
```

- **Backend API:** http://localhost:3001  
- **Frontend:** http://localhost:5173  

Open the frontend URL in your browser. Use the search form (origin, destination, date). The dataset covers **2024-03-15** (and some overnight flights into 2024-03-16).

### Without Docker

**Backend**

```bash
cd backend
npm install
npm start
```

Runs on port 3001. Expects `flights.json` at repo root or in `backend/`.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on port 5173 and proxies `/api` to `http://localhost:3001`.

## Architecture

- **Backend (Node + Express):** Loads `flights.json` on startup into memory. Builds an index of flights by departure date (in origin timezone). Search is implemented as: direct flights, then 1-stop, then 2-stop; each connection is checked for min/max layover and domestic vs international (45 min vs 90 min). All duration math uses Luxon with airport timezones so UTC-based comparisons are correct (including date-line cases like SYD→LAX). Results are sorted by total travel time.
- **Frontend (React + Vite):** Single-page app with a search form (origin/destination type-ahead from `/api/airports`, date picker), and results list (segments, layovers, total duration, total price). Loading, empty, and error states are handled.

## Tradeoffs

- **In-memory data:** Simplest for the assignment; no database. Acceptable for ~260 flights. With more data or multiple instances, you’d add a DB or cache.
- **Frontend in dev in Docker:** Vite dev server runs in the frontend container so the proxy to the backend works without extra nginx. For production you’d build the frontend and serve it (e.g. via nginx) with a reverse proxy for `/api`.
- **Date scope:** Date picker is limited to the range the dataset supports (2024-03-15 / 2024-03-16). Could be relaxed if the dataset grew.

## With more time

- Unit tests for layover rules and timezone logic; integration test for the search endpoint.
- Broader date handling and validation.
- Production build + nginx (or similar) in Docker so the app runs without the Vite dev server.
