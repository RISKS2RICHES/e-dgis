import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  const flights: any[] = [];
  const errors: string[] = [];

  // ADSB.ONE / airplanes.live — free open API, no key needed
  try {
    const r = await fetch("https://api.airplanes.live/v2/point/0/20/5000", {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (r.ok) {
      const d: any = await r.json();
      if (d.ac && Array.isArray(d.ac)) {
        flights.push(...d.ac.map((f: any) => ({ ...f, _src: "AIRPLANESLIVE" })));
      }
    }
  } catch (e: any) {
    errors.push(`airplanes.live: ${e.message}`);
  }

  // OpenSky Network — unauthenticated (rate limited but free)
  if (flights.length < 100) {
    try {
      const id = process.env.OPENSKY_CLIENT_ID;
      const secret = process.env.OPENSKY_CLIENT_SECRET;
      const authHeader =
        id && secret
          ? { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") }
          : {};
      const r = await fetch("https://opensky-network.org/api/states/all", {
        headers: authHeader,
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const d: any = await r.json();
        if (d.states && Array.isArray(d.states)) {
          flights.push(
            ...d.states
              .filter((s: any[]) => s[6] != null && s[5] != null)
              .map((s: any[]) => ({
                icao24: s[0],
                callsign: (s[1] || "").trim(),
                lat: s[6],
                lon: s[5],
                alt_baro: s[7] ?? s[13],
                gs: s[9],
                track: s[10],
                baro_rate: s[11],
                _src: "OPENSKY",
              }))
          );
        }
      }
    } catch (e: any) {
      errors.push(`OpenSky: ${e.message}`);
    }
  }

  // Deduplicate by ICAO24
  const seen = new Set<string>();
  const deduped = flights
    .filter((f) => {
      const icao = (f.icao24 || f.hex || "").toLowerCase().trim();
      if (!icao || seen.has(icao)) return false;
      seen.add(icao);
      return true;
    })
    .filter((f) => {
      const lat = parseFloat(f.lat);
      const lon = parseFloat(f.lon);
      return (
        !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
      );
    })
    .map((f) => ({
      icao24: f.icao24 || f.hex || "",
      callsign: (f.callsign || f.flight || "").trim(),
      lat: parseFloat(f.lat),
      lon: parseFloat(f.lon),
      altitude: parseFloat(f.alt_baro || f.altitude || 0),
      speed: parseFloat(f.gs || f.ground_speed || 0),
      heading: parseFloat(f.track || f.heading || 0),
      vrate: parseFloat(f.baro_rate || 0),
      type: f.actype || f.t || f.aircraft_type || "",
      reg: f.reg || f.r || f.registration || "",
      operator: f.operator || f.ownOp || "",
      source: f._src,
    }));

  res.json({
    status: "ok",
    count: deduped.length,
    flights: deduped,
    errors: errors.length ? errors : undefined,
    ts: Date.now(),
  });
}
