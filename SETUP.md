# E-DGIS Setup Guide

## Prerequisites

1. **Node.js 18+** (using Bun)
2. **Supabase Account** (Free tier available)
3. **Mapbox Account** (Free tier: 250k map loads/month)
4. **Vercel Account** (for deployment)

## 1. Local Environment Setup

### Install Dependencies
```bash
bun install
```

### Environment Variables
All API keys are configured in `.env.local` (already set):

```bash
# MapBox (Open API - required)
NEXT_PUBLIC_MAPBOX_TOKEN=<your_token>

# OpenSky Network
OPENSKY_CLIENT_ID=<your_id>
OPENSKY_CLIENT_SECRET=<your_secret>

# TFL API (London Traffic)
TFL_API_KEY=<your_key>

# Supabase (auto-configured)
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>

# Free Public APIs (no key needed)
NEXT_PUBLIC_ADSB_ONE_API=https://api.adsb.one
NEXT_PUBLIC_ADSB_EXCHANGE_API=https://adsbexchange-api.herokuapp.com
NEXT_PUBLIC_OPENSKY_API=https://opensky-network.org/api
```

## 2. Supabase Setup

### Create Database Schema
1. Go to your Supabase dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open a new query and copy the contents of `database-schema.sql`
4. Execute the query

This will create:
- `flights` - Real-time and historical flight data
- `vessels` - Maritime vessel tracking
- `satellites` - Satellite position data
- `conflict_zones` - War/conflict zones
- `conflict_events` - Detailed conflict events
- `conflict_videos` - Verified conflict video sources
- `traffic_incidents` - London traffic data
- `satellite_imagery` - NASA Earth observations

### Enable Row Level Security (RLS)
In Supabase dashboard, for each table:
1. Go to **Authentication** > **Policies**
2. Create a policy allowing SELECT for all users (read-only for public)

Example for `flights` table:
```sql
CREATE POLICY "Allow public read access" ON flights
FOR SELECT USING (true);
```

## 3. Local Development

### Start Development Server
```bash
bun dev
```

The app will be available at `http://localhost:5173`

### API Endpoints (Available locally)
- `/api/flights` - Real-time flight data (3-minute cache)
- `/api/vessels` - Maritime vessel tracking
- `/api/satellites` - Satellite positions with TLE calculations
- `/api/conflicts` - Conflict zones (hourly update)
- `/api/traffic` - London traffic incidents
- `/api/satellite-imagery` - NASA EONET imagery
- `/api/conflict-videos` - Conflict-related videos
- `/api/conflict-monitor` - Live conflict updates

## 4. Deployment to Vercel

### Step 1: Build
```bash
bun run build
```

### Step 2: Configure Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Step 3: Add Environment Variables in Vercel Dashboard

Go to your Vercel project > **Settings** > **Environment Variables**

Add all variables from `.env.local`:
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `OPENSKY_CLIENT_ID`
- `OPENSKY_CLIENT_SECRET`
- `TFL_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Custom Domain (Optional)

1. In Vercel project settings > **Domains**
2. Add your custom domain
3. Update DNS settings according to Vercel's instructions

## 5. Data Sources & APIs

### Real-Time Data (Updated every 3 minutes)
- **Flights**: ADSB.ONE, ADSB Exchange, OpenSky Network (deduplicated)
- **Vessels**: AISHub (maritime tracking)
- **Satellites**: CelesTrak (TLE data with position calculations)

### Conflict Data (Updated hourly)
- **ACLED**: Armed Conflict Location & Event Data
- **Manual**: Hardcoded conflict zones for reliability
- **Coverage**: Ukraine, Gaza, Lebanon, Yemen, Syria, Myanmar, DRC, Somalia, South Sudan, Afghanistan

### Other Layers
- **Traffic**: TFL API (London only)
- **Satellite Imagery**: NASA EONET, GIBS

## 6. Performance Optimization on Vercel (Free Tier)

### Known Limitations
- **Function timeout**: 10 seconds (free tier)
- **Data fetching**: Uses caching to handle rate limits
- **Real-time**: Implements polling (180s intervals) instead of WebSockets

### Optimization Strategies Implemented
1. **Data deduplication** for flights across APIs
2. **Request caching** via `revalidate` options
3. **Client-side filtering** for large datasets
4. **Lazy loading** of map layers
5. **Geographic filtering** for map data

## 7. Monitoring & Maintenance

### Check API Status
Visit each endpoint in browser:
- `https://yourdomain.com/api/flights`
- `https://yourdomain.com/api/conflicts`
- etc.

### Database Backups
1. Enable automatic backups in Supabase > **Backups**
2. Recommended: Daily backup retention

### Update Frequency
- Flights: Every 3 minutes
- Conflicts: Every 1 hour
- Satellites: Every 24 hours (TLE data)
- Traffic: Every 5 minutes

## 8. Troubleshooting

### MapBox Not Loading
- Verify token is correct in Supabase dashboard
- Check token hasn't been revoked in MapBox account
- Ensure domain is whitelisted in MapBox settings

### No Flight Data
- Check internet connection
- Verify ADSB APIs are accessible (not geo-blocked)
- Check browser console for CORS errors

### Supabase Connection Issues
- Verify URL and keys are correct
- Check Supabase service is operational
- Ensure database tables exist (run schema SQL)

### Vercel Deployment Fails
- Check all environment variables are set
- Verify Node.js version is 18+
- Check build logs: `vercel logs --follow`

## 9. Security Considerations

### Public APIs
- ADSB, AISHub, NASA EONET are public services
- No sensitive credentials exposed

### Secret Management
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is kept server-side only
- Anon key used for client-side queries has restricted RLS policies
- MapBox token has domain restrictions

### Data Privacy
- Application processes real-time data from open sources only
- No personal data is stored
- Conflict data sourced from public intelligence sources

## 10. GitHub & Version Control

### Push to GitHub
```bash
git add .
git commit -m "Initial E-DGIS deployment"
git push origin main
```

### Vercel GitHub Integration
1. Connect Vercel to GitHub repo
2. Enable automatic deployments on push
3. Preview deployments for pull requests

---

**Note**: This system uses open-source APIs and publicly available data. All functionality works independently without Runable subscription after deployment to Vercel.
