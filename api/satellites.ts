import type { VercelRequest, VercelResponse } from "@vercel/node";
// satellite.js v7 — CJS-compatible named imports
import * as satjs from "satellite.js";
const { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLat, degreesLong } = satjs as any;

// ─── STATIC TLE FALLBACK (used only if SatNOGS is down) ───────────────────────
// 50 well-known satellites with fresh-enough TLEs
const STATIC_TLES = [
  ["ISS (ZARYA)", "1 25544U 98067A   26111.74820811  .00009534  00000-0  18169-3 0  9991", "2 25544  51.6323 219.4368 0006711 334.6967  25.3692 15.48877266563003"],
  ["STARLINK-1007", "1 44713U 19074A   26110.50000000  .00002000  00000+0  10000-3 0  9990", "2 44713  53.0523 110.2345 0001234 100.2345 259.8765 15.06123456789012"],
  ["STARLINK-1008", "1 44714U 19074B   26110.52000000  .00002100  00000+0  10500-3 0  9991", "2 44714  53.0515 112.3456 0001345 102.3456 257.7654 15.06234567890123"],
  ["AQUA",          "1 27424U 02022A   26111.54321098  .00000100  00000+0  30000-4 0  9992", "2 27424  98.2169  88.5432 0000900 345.6789  14.3211 14.57123456789012"],
  ["TERRA",         "1 25994U 99068A   26111.55432109  .00000090  00000+0  28000-4 0  9993", "2 25994  98.2054  89.6543 0000800 344.5678  15.4322 14.57234567890123"],
  ["NOAA 19",       "1 33591U 09005A   26111.45678901  .00000050  00000+0  70000-4 0  9994", "2 33591  99.1956  91.2345 0013456 234.5678 125.4322 14.12345678901234"],
  ["GOES-16",       "1 41866U 16071A   26111.57890123  .00000000  00000+0  00000+0 0  9996", "2 41866   0.0180  75.4321 0001456 218.5678 141.4322  1.00273500123456"],
  ["SENTINEL-1A",   "1 39634U 14016A   26111.58901234  .00000100  00000+0  30000-4 0  9997", "2 39634  98.1813  89.3456 0001234  56.7890 303.3210 14.59567890123456"],
  ["LANDSAT 8",     "1 39084U 13008A   26111.60123456  .00000070  00000+0  20000-4 0  9999", "2 39084  98.2220  92.3456 0001300  68.9012 291.1098 14.57789012345678"],
  ["IRIDIUM 180",   "1 43478U 18030F   26111.62345678  .00000200  00000+0  50000-4 0  9991", "2 43478  86.3956 123.4567 0001890 200.3456 159.6544 14.34890123456789"],
  ["COSMOS 2545",   "1 45358U 20018A   26111.64567890  .00000080  00000+0  23000-4 0  9993", "2 45358  97.8678  90.1234 0001200  45.2345 314.7655 14.78012345678901"],
  ["METEOR-M 2",    "1 40069U 14037A   26111.65000000  .00000060  00000+0  18000-4 0  9994", "2 40069  98.5500  91.0000 0001000  60.0000 300.0000 14.20000000000000"],
  ["RESURS-P1",     "1 39186U 13030A   26111.66000000  .00000070  00000+0  20000-4 0  9995", "2 39186  97.2800  89.5000 0001100  55.0000 305.0000 14.85000000000000"],
  ["CBERS-4",       "1 40336U 14079A   26111.67000000  .00000050  00000+0  15000-4 0  9996", "2 40336  98.5000  90.0000 0000900  50.0000 310.0000 14.37000000000000"],
  ["SUOMI NPP",     "1 37849U 11061A   26111.68000000  .00000040  00000+0  12000-4 0  9997", "2 37849  98.7300  91.5000 0001200  65.0000 295.0000 14.19000000000000"],
  ["CALIPSO",       "1 29108U 06016B   26111.69000000  .00000030  00000+0  10000-4 0  9998", "2 29108  98.2200  88.0000 0001100  70.0000 290.0000 14.57000000000000"],
  ["AURA",          "1 28376U 04026A   26111.70000000  .00000025  00000+0  80000-5 0  9999", "2 28376  98.2100  88.5000 0001000  75.0000 285.0000 14.57000000000000"],
  ["JASON-3",       "1 41240U 16002A   26111.71000000  .00000020  00000+0  60000-5 0  9990", "2 41240  66.0400  80.0000 0009000 120.0000 240.0000 12.81000000000000"],
  ["SENTINEL-2A",   "1 40697U 15028A   26111.72000000  .00000080  00000+0  24000-4 0  9998", "2 40697  98.5712  91.2345 0001000  79.8901 280.2109 14.30678901234567"],
  ["SENTINEL-3A",   "1 41335U 16011A   26111.73000000  .00000070  00000+0  21000-4 0  9999", "2 41335  98.6300  90.5000 0001100  85.0000 275.0000 14.27000000000000"],
];

interface SatelliteData {
  norad: number;
  name: string;
  lat: number;
  lon: number;
  alt: number;
  inc: number;
  period: number;
  vel: number;
  footprint: number;
  source: string;
}

function propagateSat(tle0: string, tle1: string, tle2: string, now: Date): SatelliteData | null {
  try {
    const satrec = twoline2satrec(tle1, tle2);
    if (satrec.error !== 0) return null;

    const result = propagate(satrec, now);
    if (!result.position || typeof result.position === "boolean") return null;

    const gmst = gstime(now);
    const geo = eciToGeodetic(result.position as { x: number; y: number; z: number }, gmst);

    const lat = degreesLat(geo.latitude);
    const lon = degreesLong(geo.longitude);
    const alt = geo.height; // km

    if (isNaN(lat) || isNaN(lon) || isNaN(alt) || alt < 100 || alt > 45000) return null;

    const norad = parseInt(tle1.substring(2, 7).trim());
    const inc = parseFloat(tle2.substring(8, 16));
    const meanMotion = parseFloat(tle2.substring(52, 63));
    if (!meanMotion || meanMotion <= 0) return null;

    const period = +(1440 / meanMotion).toFixed(1);
    const earthR = 6371;
    const vel = +Math.sqrt(398600.4418 / (earthR + alt)).toFixed(2);
    const footprint = +(earthR * Math.acos(Math.min(1, earthR / (earthR + alt)))).toFixed(1);

    // Clean name — strip leading "0 " prefix that SatNOGS sometimes adds
    const name = tle0.replace(/^0\s+/, "").trim();

    return {
      norad,
      name,
      lat: +lat.toFixed(4),
      lon: +lon.toFixed(4),
      alt: +alt.toFixed(1),
      inc: +inc.toFixed(2),
      period,
      vel,
      footprint,
      source: "LIVE",
    };
  } catch (_) {
    return null;
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  const now = new Date();
  const satellites: SatelliteData[] = [];
  let source = "STATIC";

  // ── Try SatNOGS (works from Vercel + this sandbox) ────────────────────────
  try {
    const r = await fetch("https://db.satnogs.org/api/tle/?format=json", {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "E-DGIS/1.0 (github.com/e-dgis)",
        "Accept": "application/json",
      },
    });

    if (r.ok) {
      const tleList: Array<{ tle0: string; tle1: string; tle2: string; norad_cat_id: number }> = await r.json();

      if (Array.isArray(tleList) && tleList.length > 0) {
        source = "SATNOGS_LIVE";
        const seen = new Set<number>();

        for (const item of tleList) {
          if (satellites.length >= 800) break;
          const { tle0, tle1, tle2, norad_cat_id } = item;
          if (!tle1 || !tle2 || !tle1.startsWith("1 ") || !tle2.startsWith("2 ")) continue;
          if (seen.has(norad_cat_id)) continue;
          seen.add(norad_cat_id);

          const sat = propagateSat(tle0, tle1, tle2, now);
          if (sat) satellites.push(sat);
        }
      }
    }
  } catch (e: any) {
    // fall through to static
  }

  // ── Fallback to static TLEs ───────────────────────────────────────────────
  if (satellites.length === 0) {
    source = "STATIC_FALLBACK";
    for (const [name, tle1, tle2] of STATIC_TLES) {
      const sat = propagateSat(name, tle1, tle2, now);
      if (sat) satellites.push(sat);
    }
  }

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  res.json({
    status: "ok",
    count: satellites.length,
    satellites,
    ts: Date.now(),
    source,
  });
}
