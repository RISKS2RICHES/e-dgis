# E-DGIS Deployment Guide

## Quick Start - Local Testing

### 1. Start Development Server
```bash
cd /home/user/E-DGIS
bun dev
```

Open `http://localhost:5173`

### 2. Test API Endpoints
All endpoints return real or mock data:
- **Flights**: `http://localhost:5173/api/flights`
- **Vessels**: `http://localhost:5173/api/vessels`
- **Conflicts**: `http://localhost:5173/api/conflicts`
- **Satellites**: `http://localhost:5173/api/satellites`
- **Traffic**: `http://localhost:5173/api/traffic`

## Production Deployment to Vercel

### Step 1: Prepare for Deployment

```bash
# Verify build works
bun run build

# Check no errors
echo $?  # Should output 0
```

### Step 2: Push to GitHub

```bash
cd /home/user/E-DGIS
git init
git add .
git commit -m "Initial E-DGIS military intelligence dashboard"
git branch -M main
git remote add origin https://github.com/yourusername/E-DGIS.git
git push -u origin main
```

### Step 3: Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm i -g vercel
cd /home/user/E-DGIS
vercel
```

#### Option B: Vercel Dashboard
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Select "Next.js" framework
5. Click Deploy

### Step 4: Configure Environment Variables in Vercel

In your Vercel project dashboard:

1. Go to **Settings** > **Environment Variables**
2. Add all variables from `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN = pk.your_mapbox_token_here

OPENSKY_CLIENT_ID = risks2rich3s1-api-client

OPENSKY_CLIENT_SECRET = itPV2AQTJUqbY60X4nnazaZvfYPXKDWD

TFL_API_KEY = 9845d4d09cec4ef6b0a275c398ac85da

NEXT_PUBLIC_SUPABASE_URL = https://ozfhxkubjpyabfegyazm.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Zmh4a3VianB5YWJmZWd5YXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTg2MjMsImV4cCI6MjA5MjM5NDYyM30.3vI-QHOuH4x1NBwgE7D5AV1RFPoBccKNrFTrhpFJNaU

SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Zmh4a3VianB5YWJmZWd5YXptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjgxODYyMywiZXhwIjoyMDkyMzk0NjIzfQ.YMLSOZV--PEG9694NXfZjo0-LlW27ydON5jS7HJICDA
```

3. Click "Save"

### Step 5: Verify Deployment

After Vercel deploys:

1. Go to your Vercel project URL (e.g., `https://e-dgis.vercel.app`)
2. Test endpoints:
   - `https://yourdomain.com/api/flights`
   - `https://yourdomain.com/api/conflicts`
3. Navigate to map page and monitor page
4. Check browser console for any errors

## Setting Up Supabase (Optional - for historical data)

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Get your credentials

### 2. Run Database Schema
In Supabase SQL Editor:
```sql
-- Copy entire contents of database-schema.sql
```

### 3. Enable Realtime (Optional)
For real-time updates, enable realtime subscription on tables

## Custom Domain Setup

### Add Custom Domain in Vercel
1. Project Settings > **Domains**
2. Add domain (e.g., `intel-dgis.com`)
3. Follow Vercel's DNS configuration
4. Wait for SSL certificate (usually 5 mins)

## Monitoring & Logs

### Check Vercel Logs
```bash
vercel logs --follow
```

### Test API Health
```bash
curl https://yourdomain.com/api/flights
curl https://yourdomain.com/api/conflicts
```

## Performance Tuning

### For Vercel Free Tier

The system is already optimized:
- ✓ API responses cached (180s for flights, 3600s for conflicts)
- ✓ Client-side data filtering to reduce payload
- ✓ Lazy loading of map layers
- ✓ Pagination-ready (can be added later)

### If Upgrading to Pro

With Vercel Pro, you get:
- ✓ Unlimited function duration
- ✓ Better concurrency limits
- ✓ Custom infrastructure

## Troubleshooting Deployment

### Build Fails
```bash
# Check dependencies
bun install

# Verify build locally first
bun run build
```

### Environment Variables Not Working
- Verify variables are added in Vercel dashboard
- Don't commit `.env.local` to GitHub (already in .gitignore)
- Redeploy after adding variables

### MapBox Not Rendering
- Check token is in Vercel env vars
- Verify token hasn't hit rate limits
- Check MapBox dashboard for errors

### API Returns 500 Error
- Check logs: `vercel logs`
- Verify third-party APIs are accessible
- Check Supabase connection (if using DB)

## Data Sources & Rate Limits

| Source | Limit | Update |
|--------|-------|--------|
| ADSB.ONE | Unlimited | 3 min |
| OpenSky | 4000/day free | 3 min |
| ACLED | Unlimited | 1 hour |
| MapBox | 250k/month free | Live |
| NASA EONET | Unlimited | Live |
| TFL | Unlimited | 5 min |

## Security Best Practices

1. **Never commit .env files** (already in .gitignore)
2. **Rotate API keys regularly** in Supabase/MapBox
3. **Use Vercel's CORS settings** if needed
4. **Enable rate limiting** on Vercel Pro
5. **Monitor usage** to prevent unexpected bills

## Scaling for Higher Traffic

### Phase 1: Optimization (Current)
- Free tier works fine for <100 concurrent users
- API responses cached aggressively

### Phase 2: Caching Layer
- Add Redis cache (Upstash for Vercel)
- Cache entire datasets (flights, conflicts, vessels)

### Phase 3: Database Optimization
- Add PostgreSQL connection pooling
- Implement query indexing
- Archive old historical data

### Phase 4: CDN
- Enable Vercel Edge Network
- Distribute API responses globally
- Reduce latency

## Support & Maintenance

### Weekly Tasks
- Check Vercel analytics
- Monitor API rate limits
- Review error logs

### Monthly Tasks
- Update dependencies: `bun update`
- Review Supabase performance
- Backup database

### Yearly Tasks
- Audit security settings
- Review architecture
- Plan infrastructure upgrades

---

**Status**: Ready for production deployment  
**Last Updated**: April 22, 2026  
**Tested On**: Vercel Free Tier, Node.js 24, Bun 1.3.11
