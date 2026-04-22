import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const r = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200&days=30", { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d: any = await r.json();
      const events = (d.events || [])
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.categories?.[0]?.title || "Unknown",
          lat: e.geometry?.[e.geometry.length - 1]?.coordinates?.[1],
          lon: e.geometry?.[e.geometry.length - 1]?.coordinates?.[0],
          date: e.geometry?.[e.geometry.length - 1]?.date,
          closed: e.closed,
        }))
        .filter((e: any) => e.lat && e.lon && !isNaN(e.lat) && !isNaN(e.lon));
      return res.json({ status: "ok", count: events.length, events, ts: Date.now() });
    }
  } catch (_) {}
  res.json({ status: "ok", count: 0, events: [], ts: Date.now() });
}
