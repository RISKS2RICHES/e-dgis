# E-DGIS Architecture

## System Overview

E-DGIS is a serverless real-time intelligence dashboard designed for deployment on Vercel's free tier without Runable subscription dependencies.

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   MapBox 3D Map (Dark Mode)                 │
│              React Components + Data Panels                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Next.js Pages & Components                     │
│   (/page.tsx, /monitor/page.tsx, /history/page.tsx)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│          Next.js API Routes (Serverless)                    │
│  /api/flights  /api/vessels  /api/conflicts etc.           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        Data Aggregation & Transformation Layer              │
│  • Deduplication (flights)                                 │
│  • Format normalization                                    │
│  • Caching (via revalidate)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────────────┐
        │              │                          │
   ┌────▼──┐      ┌────▼──┐              ┌────▼──────┐
   │ ADSB  │      │ AISHub│              │ NASA EONET│
   │ APIs  │      │ AIS   │ ┌─────────┐ │ Satellite │
   │ (Real)│      │       │ │Supabase │ │ Imagery   │
   └───────┘      └───────┘ │(Optional)│ └───────────┘
                             │Database │
                  ┌──────────┴─────────┴──────────┐
                  │   ACLED, TFL, Others         │
                  └──────────────────────────────┘
```

## Data Flow

### Real-Time Flight Data (3-minute interval)
```
ADSB.ONE API → Fetch & Parse
ADSB Exchange API → Merge Results
OpenSky API → Add OpenSky Data
           ↓
    Deduplication by ICAO24
           ↓
    Filter Invalid Coordinates
           ↓
    Return to Frontend (cached 180s)
           ↓
    MapBox Layer Update
```

### Conflict Zone Data (1-hour interval)
```
ACLED API → Parse Events
Hardcoded Database → Merge
           ↓
    Group by Location
           ↓
    Calculate Severity
           ↓
    Store in Supabase (optional)
           ↓
    Return to Frontend (cached 3600s)
           ↓
    Map Red Zone Display
```

### Satellite Positioning
```
CelesTrak TLE Files → Fetch (24h cache)
           ↓
    Parse TLE Format
           ↓
    Calculate Simplified Position*
           ↓
    Generate Footprint Radius
           ↓
    Return to Frontend
           ↓
    MapBox Marker Display

* Note: Simplified calculation for performance
  Full SGP4 available on request
```

## Component Architecture

### Pages
```
app/
├── page.tsx                 # Main operations map
├── monitor/page.tsx         # Conflict monitoring
├── history/page.tsx         # Historical data
└── api/
    ├── flights/route.ts     # Aircraft aggregation
    ├── vessels/route.ts     # Maritime tracking
    ├── satellites/route.ts  # Satellite positions
    ├── conflicts/route.ts   # War zone data
    ├── traffic/route.ts     # Traffic incidents
    ├── satellite-imagery/   # Earth observations
    ├── conflict-videos/     # Video sources
    └── conflict-monitor/    # Live updates
```

### Components
```
components/
├── Map.tsx                  # MapBox instance
├── MapControls.tsx          # Layer toggles & legend
├── DataPanel.tsx            # Click detail panel
├── Navigation.tsx           # Sidebar navigation
├── ConflictMonitor.tsx      # Conflict details
└── utilities/
    └── supabase.ts          # DB helpers
```

## API Design

### Request Pattern
```
GET /api/<data-type>?region=<optional>&limit=<optional>
```

### Response Pattern
```json
{
  "status": "success" | "error",
  "count": <number>,
  "<data-type>": [<data>],
  "timestamp": <ISO8601>,
  "errors": [<optional>]
}
```

### Caching Strategy
```
Flights:        180s  (3 min)  - Rapid changes
Vessels:        180s  (3 min)  - Rapid changes
Satellites:     86400s (24h)   - TLE updates daily
Conflicts:      3600s (1h)     - ACLED slow updates
Traffic:        300s  (5 min)  - TFL updates
Imagery:        3600s (1h)     - Satellite data infrequent
Videos:         on-demand      - Cached client-side
Monitor:        180s  (3 min)  - Recent events
```

## Frontend Architecture

### State Management
- URL-based routing (Wouter)
- Local React state for map layers
- IndexedDB for client-side caching (optional)

### Map Layer System
```
MapBox Instance
├── Base Layer (Dark)
├── Terrain & 3D Buildings
├── GeoJSON Sources
│   ├── Flights (real-time)
│   ├── Vessels (real-time)
│   ├── Conflicts (hourly)
│   ├── Satellites (24h)
│   └── Traffic (5-min)
└── Interaction Handlers
    ├── Click → Show DataPanel
    ├── Hover → Highlight
    └── Zoom → Adjust markers
```

### Rendering Pipeline
```
Component Mount
    ↓
API Call (fetch or cache)
    ↓
Data Validation
    ↓
GeoJSON Transformation
    ↓
MapBox addSource()
    ↓
MapBox addLayer()
    ↓
Set Event Handlers
    ↓
Render Complete
```

## Backend Architecture

### Serverless Functions
Each API route is a stateless serverless function:

```typescript
export async function GET(request: NextRequest) {
  // 1. Fetch from external APIs (with timeout)
  // 2. Transform data format
  // 3. Validate coordinates
  // 4. Return cached response
  // Maximum execution: 10s (Vercel free tier)
}
```

### Rate Limiting Strategy
```
Free Tier Limits (Handled Gracefully):
├── ADSB.ONE        → Unlimited (public)
├── OpenSky         → 4000/day (auth required)
├── ACLED           → Unlimited (free tier)
├── TFL             → Unlimited (London only)
├── NASA EONET      → Unlimited (public)
├── AISHub          → Per-request (free tier)
└── MapBox          → 250k/month (free tier)

Mitigation:
• Aggressive caching
• Client-side deduplication
• Fallback to mock data
• Queue management
```

### Error Handling
```
Try-Catch Wrapper
    ↓
    ├─ Success → Return data + timestamp
    ├─ API Down → Return cached/fallback
    └─ Error → Log + return empty array
    
Result: Always return 200 (graceful degradation)
```

## Database Architecture (Optional)

### Supabase Tables
```
flights
├── id (UUID)
├── icao_24 (VARCHAR)
├── position (DECIMAL, DECIMAL)
├── timestamp
└── indexes: timestamp, location

conflict_zones
├── id (UUID)
├── zone_name (VARCHAR)
├── position (DECIMAL, DECIMAL)
├── status (VARCHAR)
├── timestamp
└── indexes: timestamp, location, status

[Similar for vessels, satellites, etc.]
```

### Query Optimization
- Indexes on `timestamp` (DESC for recent data)
- Indexes on `latitude, longitude` (geographic queries)
- Time-based partition strategy (optional)

## Performance Optimization

### Client-Side
1. **Lazy Loading**: Map layers load on toggle
2. **Debouncing**: API calls throttled to 3-min intervals
3. **Efficient Rendering**: React prevents unnecessary re-renders
4. **CSS Optimization**: Tailwind purged for production

### Server-Side
1. **HTTP Caching**: `revalidate` parameter
2. **Data Deduplication**: Remove duplicate flights
3. **Format Optimization**: Send only needed fields
4. **Timeout Handling**: 10s max per function

### Network
1. **GZIP Compression**: Enabled by Vercel
2. **CDN**: Vercel Edge Network
3. **Payload Size**: ~100-500KB per API call

## Security Model

### Authentication
- Public APIs (ADSB, EONET): No auth needed
- Private APIs (OpenSky, TFL): API keys in env vars
- Database (optional): Supabase RLS policies

### Authorization
- All data is public intelligence
- No user-specific data
- No role-based access control (for now)

### Data Protection
- API keys server-side only
- No secrets in client-side code
- HTTPS enforced by Vercel
- CORS headers configurable

## Scalability

### Current Setup (Vercel Free)
- Concurrent users: ~100
- API calls/minute: ~100-200
- Data points/map: ~1,000-5,000
- Storage: Limited to runtime (no persistence)

### Scaling Roadmap
```
Level 1 (Current) → Vercel Free + Edge Cache
Level 2 → Vercel Pro + Redis (Upstash)
Level 3 → Vercel Pro + Supabase + CDN
Level 4 → Custom Infra + Dedicated DB + WebSockets
```

## Deployment Architecture

### Local
```
bun dev → http://localhost:5173
```

### Vercel
```
GitHub Push → Vercel Auto-Deploy → Preview URL → Production URL
```

### Environment
```
.env.local (development)
    ↓
Vercel Dashboard (production)
    ↓
process.env / process.env.NEXT_PUBLIC_*
```

## Monitoring & Observability

### Available Logs
- Vercel: `vercel logs --follow`
- Browser: DevTools Console
- API: Response status codes
- Supabase: Dashboard analytics

### Health Checks
```
GET /api/flights        # Response time < 2s?
GET /api/conflicts      # Data count > 0?
GET /api/satellites     # Valid coordinates?
```

### Metrics to Track
- API response time
- Data freshness
- Error rates
- Map load time

## Future Enhancements

### Immediate (v1.1)
- [ ] WebSocket support (upgrade to Pro)
- [ ] Advanced filtering on map
- [ ] Export to GeoJSON/CSV
- [ ] Custom alerts

### Medium-term (v2.0)
- [ ] Full SGP4 satellite calculations
- [ ] User accounts & preferences
- [ ] Slack/Discord integration
- [ ] API rate limiting dashboard

### Long-term (v3.0)
- [ ] Machine learning for event detection
- [ ] Predictive routing for vessels
- [ ] Conflict escalation forecasting
- [ ] Mobile app

---

**Architecture Version**: 1.0  
**Last Updated**: April 22, 2026  
**Deployment**: Vercel Free Tier  
**Status**: Production Ready
