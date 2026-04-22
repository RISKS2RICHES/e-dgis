# E-DGIS — Global Intelligence Operations Dashboard

Real-time map showing live aircraft, vessels, conflict zones, satellites, and NASA events.

## Deploy to Vercel

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/e-dgis.git
git push -u origin main

# 2. Import repo on vercel.com → New Project
# Framework: Vite
# Build: npm run build
# Output: dist
# No env vars required (Mapbox token is bundled)
```

## Local Dev

```bash
npm install

# Terminal 1 — API server
npm run api

# Terminal 2 — Vite dev server (proxies /api to port 3001)
npm run dev
```

## Optional Env Vars

| Variable | Purpose |
|----------|---------|
| `VITE_MAPBOX_TOKEN` | Custom Mapbox token (default bundled) |
| `VITE_SUPABASE_URL` | Enable Historical Data page |
| `VITE_SUPABASE_ANON_KEY` | Enable Historical Data page |
| `OPENSKY_CLIENT_ID` | OpenSky auth for more flight data |
| `OPENSKY_CLIENT_SECRET` | OpenSky auth |
| `TFL_API_KEY` | TFL traffic data |

## Stack

- **Frontend**: React 19 + Vite + Tailwind + Mapbox GL JS
- **API**: Vercel Serverless Functions (Node.js)
- **Data**: airplanes.live (live AIS), CelesTrak (satellites), NASA EONET, TFL
