import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  const vessels: any[] = [];
  const seen = new Set<string>();

  const addVessel = (v: any) => {
    const key = String(v.mmsi || v.lat + "," + v.lon);
    if (seen.has(key)) return;
    seen.add(key);
    vessels.push(v);
  };

  await Promise.allSettled([
    // AISHub REST API
    fetch("https://api.aishub.net/ais/vessels?format=json&limit=500", {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "E-DGIS/1.0" },
    }).then(async (r) => {
      if (!r.ok) return;
      const d: any = await r.json();
      const arr = Array.isArray(d) ? d : d.data || d.vessels || [];
      arr.forEach((v: any) => {
        const lat = parseFloat(v.LATITUDE || v.lat || 0);
        const lon = parseFloat(v.LONGITUDE || v.lon || 0);
        if (!lat || !lon || (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001)) return;
        addVessel({
          mmsi: v.MMSI || v.mmsi || "",
          name: v.SHIPNAME || v.name || "UNKNOWN",
          type: v.SHIPTYPE || 0,
          lat, lon,
          speed: parseFloat(v.SPEED || v.sog || 0) / 10,
          heading: parseFloat(v.HEADING || v.hdg || 0),
          course: parseFloat(v.COURSE || v.cog || 0),
          dest: v.DESTINATION || "",
          flag: v.FLAG || "",
        });
      });
    }).catch(() => {}),

    // VesselFinder public map API
    fetch("https://www.vesselfinder.com/api/pub/vesselsonmap/json?bbox=-180,-85,180,85", {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; E-DGIS/1.0)" },
    }).then(async (r) => {
      if (!r.ok) return;
      const d: any = await r.json();
      (Array.isArray(d) ? d : []).forEach((v: any) => {
        const lat = parseFloat(v[0] || 0);
        const lon = parseFloat(v[1] || 0);
        if (!lat || !lon) return;
        addVessel({
          mmsi: v[2] || "",
          name: v[3] || "UNKNOWN",
          type: 0,
          lat, lon,
          speed: parseFloat(v[7] || 0) / 10,
          heading: parseFloat(v[5] || 0),
          course: parseFloat(v[6] || 0),
          dest: "",
          flag: "",
        });
      });
    }).catch(() => {}),

    // Marine Traffic public tile API
    fetch("https://www.marinetraffic.com/getData/get_data_json_4/z:2/X:0/Y:0/station:0", {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.marinetraffic.com/" },
    }).then(async (r) => {
      if (!r.ok) return;
      const d: any = await r.json();
      const rows = d?.data?.rows || d?.rows || [];
      rows.forEach((v: any) => {
        const lat = parseFloat(v.LAT || v.lat || 0);
        const lon = parseFloat(v.LON || v.lon || 0);
        if (!lat || !lon) return;
        addVessel({
          mmsi: v.MMSI || "",
          name: v.SHIPNAME || v.name || "UNKNOWN",
          type: parseInt(v.SHIPTYPE || 0),
          lat, lon,
          speed: parseFloat(v.SPEED || 0) / 10,
          heading: parseFloat(v.HEADING || 0),
          course: parseFloat(v.COURSE || 0),
          dest: v.DESTINATION || "",
          flag: v.FLAG || "",
        });
      });
    }).catch(() => {}),
  ]);

  res.json({ status: "ok", count: vessels.length, vessels: vessels.slice(0, 2000), ts: Date.now() });
}
