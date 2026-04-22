import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  const apiKey = process.env.TFL_API_KEY || "9845d4d09cec4ef6b0a275c398ac85da";
  const incidents: any[] = [];
  const cameras: any[] = [];
  let lineStatus: any[] = [];

  await Promise.allSettled([
    // Road disruptions
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const r = await fetch(`https://api.tfl.gov.uk/Road/All/Disruption?startDate=${today}&endDate=${tomorrow}&app_key=${apiKey}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d: any[] = await r.json();
        if (Array.isArray(d)) {
          d.slice(0, 80).forEach((inc: any) => {
            let lat = 51.5074, lon = -0.1278;
            if (inc.geography?.type === "Point") { lon = inc.geography.coordinates[0]; lat = inc.geography.coordinates[1]; }
            incidents.push({ id: inc.id || inc.disruptionId, type: inc.category || "DISRUPTION", severity: inc.severity || "Moderate", desc: (inc.description || inc.summary || "").substring(0, 200), road: inc.corridorIds?.join(", ") || "", lat, lon, start: inc.startDateTime, end: inc.endDateTime });
          });
        }
      }
    })(),
    // JamCams
    (async () => {
      const r = await fetch(`https://api.tfl.gov.uk/Place/Type/JamCam?app_key=${apiKey}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d: any[] = await r.json();
        if (Array.isArray(d)) {
          d.slice(0, 100).forEach((cam: any) => {
            if (!cam.lat || !cam.lon) return;
            const imgUrl = (cam.additionalProperties || []).find((p: any) => p.key === "imageUrl")?.value;
            cameras.push({ id: cam.id, name: cam.commonName, lat: cam.lat, lon: cam.lon, imageUrl: imgUrl || null });
          });
        }
      }
    })(),
    // Tube status
    (async () => {
      const r = await fetch(`https://api.tfl.gov.uk/Line/Mode/tube,dlr,elizabeth-line,overground/Status?app_key=${apiKey}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d: any[] = await r.json();
        if (Array.isArray(d)) {
          lineStatus = d.map((line) => ({
            id: line.id, name: line.name,
            status: line.lineStatuses?.[0]?.statusSeverityDescription || "Good Service",
            disruption: line.lineStatuses?.[0]?.disruption?.description?.substring(0, 200) || null,
          }));
        }
      }
    })(),
  ]);

  res.json({ status: "ok", incidents, cameras, lineStatus, ts: Date.now() });
}
