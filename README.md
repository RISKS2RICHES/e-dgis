# E-DGIS — Global Intelligence Operations Dashboard

Real-time map showing live aircraft, vessels, satellites, conflict zones, and NASA events.

## Deploy to Vercel

### Step 1 — Import the repo
Go to [vercel.com/new](https://vercel.com/new) → Import `RISKS2RICHES/e-dgis`

### Step 2 — Add environment variables BEFORE deploying
In the Vercel project settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_MAPBOX_TOKEN` | Your Mapbox public token (get free at [account.mapbox.com](https://account.mapbox.com)) |

> ⚠️ **Critical:** `VITE_` prefixed variables are baked into the frontend bundle at **build time**.
> If you add the token after the first deploy, you **must trigger a redeploy** for it to take effect.
> Go to Vercel dashboard → Deployments → Redeploy.

### Step 3 — Deploy
- Framework: **Vite** (auto-detected)
- Build command: `npm run build`
- Output directory: `dist`

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with your token
echo "VITE_MAPBOX_TOKEN=pk.your_token_here" > .env.local

# 3. Start Vite dev server (frontend only, uses /api proxy)
npm run dev
```

## Optional Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_MAPBOX_TOKEN` | **Required** — Mapbox map tiles |
| `VITE_SUPABASE_URL` | Enable Historical Data page |
| `VITE_SUPABASE_ANON_KEY` | Enable Historical Data page |
| `OPENSKY_CLIENT_ID` | More flight data from OpenSky |
| `OPENSKY_CLIENT_SECRET` | More flight data from OpenSky |

## Data Sources

| Layer | Source | Notes |
|-------|--------|-------|
| ✈ Aircraft | [airplanes.live](https://airplanes.live) | ~1500 live flights, no key needed |
| 🛰 Satellites | [SatNOGS](https://db.satnogs.org) | 800 satellites, SGP4 propagation |
| ⚠ Conflicts | Static + Reliefweb | 18 active conflict zones |
| 🌊 Vessels | AISHub / VesselFinder / MarineTraffic | Live AIS |
| 🌍 NASA Events | [NASA EONET](https://eonet.gsfc.nasa.gov) | Wildfires, storms, etc. |
| 🚦 TFL Traffic | [TFL API](https://api.tfl.gov.uk) | London only |

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + Mapbox GL JS v3
- **API**: Vercel Serverless Functions (Node.js, `api/` folder)
- **Satellite math**: `satellite.js` SGP4 propagator
