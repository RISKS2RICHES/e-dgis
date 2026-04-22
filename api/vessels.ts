import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Digitraffic (Finnish Transport Infrastructure Agency) ──────────────────
// Open data, no key needed, works from any IP including Vercel datacenters
// Covers Baltic Sea + North Sea + global vessels reporting to Finnish AIS network
// Updated every ~30s, 18000+ vessels

interface Vessel {
  mmsi: string;
  name: string;
  type: number;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  course: number;
  dest: string;
  flag: string;
  source: string;
}

async function fetchGzip(url: string, timeoutMs = 10000): Promise<any> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "Accept-Encoding": "gzip",
      "User-Agent": "E-DGIS/1.0",
      "Accept": "application/json",
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  const vessels: Vessel[] = [];
  const errors: string[] = [];
  const now = Date.now();
  const STALE_MS = 30 * 60 * 1000; // only show vessels seen in last 30 min

  // ── Source 1: Digitraffic — locations (GeoJSON FeatureCollection) ─────────
  // This is the PRIMARY source — 18k+ vessels, truly open, no key
  let locationMap = new Map<number, { lon: number; lat: number; sog: number; cog: number; heading: number; ts: number }>();
  try {
    const locData = await fetchGzip("https://meri.digitraffic.fi/api/ais/v1/locations", 12000);
    const features: any[] = locData.features || [];
    for (const f of features) {
      const props = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      const ts = props.timestampExternal ?? 0;
      // Only keep vessels seen in last 30 min
      if (now - ts < STALE_MS) {
        locationMap.set(props.mmsi, {
          lon, lat,
          sog: props.sog ?? 0,
          cog: props.cog ?? 0,
          heading: props.heading ?? 0,
          ts,
        });
      }
    }
  } catch (e: any) {
    errors.push(`digitraffic-locations: ${e.message}`);
  }

  // ── Source 2: Digitraffic — vessel metadata (name, type, destination) ─────
  let metaMap = new Map<number, { name: string; shipType: number; dest: string; callSign: string }>();
  try {
    const metaData = await fetchGzip("https://meri.digitraffic.fi/api/ais/v1/vessels", 12000);
    const metaVessels: any[] = Array.isArray(metaData) ? metaData : [];
    for (const v of metaVessels) {
      metaMap.set(v.mmsi, {
        name: v.name ?? "",
        shipType: v.shipType ?? 0,
        dest: v.destination ?? "",
        callSign: v.callSign ?? "",
      });
    }
  } catch (e: any) {
    errors.push(`digitraffic-meta: ${e.message}`);
  }

  // ── Merge location + metadata ─────────────────────────────────────────────
  for (const [mmsi, loc] of locationMap) {
    const meta = metaMap.get(mmsi);
    if (!loc.lat || !loc.lon || isNaN(loc.lat) || isNaN(loc.lon)) continue;
    vessels.push({
      mmsi: String(mmsi),
      name: meta?.name || `MMSI ${mmsi}`,
      type: meta?.shipType ?? 0,
      lat: +loc.lat.toFixed(5),
      lon: +loc.lon.toFixed(5),
      speed: +(loc.sog / 10).toFixed(1),
      heading: loc.heading,
      course: +loc.cog.toFixed(1),
      dest: meta?.dest ?? "",
      flag: "",
      source: "DIGITRAFFIC",
    });
  }

  // ── Source 3: Try VesselFinder public API (works from some DCs) ───────────
  if (vessels.length < 100) {
    try {
      const r = await fetch(
        "https://www.vesselfinder.com/api/pub/vesselsonmap/json?bbox=-180,-85,180,85",
        {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
        }
      );
      if (r.ok) {
        const d: any = await r.json();
        const seen = new Set(vessels.map(v => v.mmsi));
        (Array.isArray(d) ? d : []).forEach((v: any) => {
          const lat = parseFloat(v[0] ?? 0);
          const lon = parseFloat(v[1] ?? 0);
          if (!lat || !lon) return;
          const mmsi = String(v[2] ?? "");
          if (seen.has(mmsi)) return;
          seen.add(mmsi);
          vessels.push({
            mmsi, name: v[3] || "UNKNOWN", type: 0,
            lat: +lat.toFixed(5), lon: +lon.toFixed(5),
            speed: +(parseFloat(v[7] ?? 0) / 10).toFixed(1),
            heading: parseFloat(v[5] ?? 0),
            course: parseFloat(v[6] ?? 0),
            dest: "", flag: "", source: "VESSELFINDER",
          });
        });
      }
    } catch (e: any) {
      errors.push(`vesselfinder: ${e.message}`);
    }
  }

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  res.json({
    status: "ok",
    count: vessels.length,
    vessels: vessels.slice(0, 3000),
    errors: errors.length ? errors : undefined,
    ts: Date.now(),
    source: vessels.length > 0
      ? (vessels[0].source === "DIGITRAFFIC" ? "DIGITRAFFIC_LIVE" : "VESSELFINDER")
      : "NONE",
  });
}
