# Vercel Deployment Guide for E-DGIS

## This is a Cloudflare Workers + Vite app, NOT a Next.js app.
## Deploy to Cloudflare Pages OR follow the Vercel workaround below.

## Option A: Deploy to Cloudflare Pages (RECOMMENDED - Best Performance)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "E-DGIS v1.0"
git remote add origin https://github.com/YOUR_USERNAME/E-DGIS.git
git push -u origin main
```

### 2. Connect to Cloudflare Pages
1. Go to https://dash.cloudflare.com → Workers & Pages
2. Click "Create application" → "Pages" → "Connect to Git"
3. Select your E-DGIS repository
4. Build settings:
   - Build command: `bun run build`
   - Build output directory: `dist/client`
5. Click "Save and Deploy"

### 3. Add Environment Variables in Cloudflare
Go to Pages → E-DGIS → Settings → Environment Variables:
```
VITE_MAPBOX_TOKEN = pk.your_mapbox_token_here
VITE_SUPABASE_URL = https://ozfhxkubjpyabfegyazm.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TFL_API_KEY = 9845d4d09cec4ef6b0a275c398ac85da
OPENSKY_CLIENT_ID = risks2rich3s1-api-client
OPENSKY_CLIENT_SECRET = itPV2AQTJUqbY60X4nnazaZvfYPXKDWD
```

### 4. Redeploy
After adding env vars, trigger a new deployment.

---

## Option B: Deploy to Vercel (requires wrangler adapter)

### 1. Install Vercel adapter
```bash
bun add @hono/node-server
```

### 2. Create vercel.json
```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist/client",
  "framework": null,
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index" }]
}
```

Note: Vercel is less optimal for Cloudflare Workers apps.
Cloudflare Pages is the native deployment target.

---

## Local Development
```bash
cd E-DGIS
bun install
bun dev
# Open http://localhost:9051
```

## Test APIs locally
```bash
curl http://localhost:9051/api/flights    # Live aircraft
curl http://localhost:9051/api/conflicts  # Conflict zones
curl http://localhost:9051/api/traffic    # TFL London
curl http://localhost:9051/api/satellites # Satellite positions
curl http://localhost:9051/api/nasa-events # NASA EONET
```
