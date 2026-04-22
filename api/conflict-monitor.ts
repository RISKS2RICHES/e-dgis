import type { VercelRequest, VercelResponse } from "@vercel/node";

const STATIC_UPDATES = [
  { id: "s1", zone: "Ukraine", type: "MILITARY_OP", severity: 5, desc: "Russian forces conducting multi-axis offensive operations across the Donetsk front. Drone strikes targeting energy infrastructure. Ukrainian FPV drone operations and ATACMS strikes hitting Russian logistics and airbases inside Russia.", source: "OSINT", ts: new Date(Date.now() - 900000).toISOString(), lat: 48.5, lon: 31.5 },
  { id: "s2", zone: "Gaza Strip", type: "MILITARY_OP", severity: 5, desc: "IDF continuing operations across Gaza. Significant civilian casualties reported. Ceasefire phase II negotiations ongoing via Qatar and Egypt mediation. Aid access remains severely restricted.", source: "NEWS", ts: new Date(Date.now() - 1800000).toISOString(), lat: 31.35, lon: 34.31 },
  { id: "s3", zone: "Sudan", type: "ATROCITY", severity: 5, desc: "RSF forces advancing on El Fasher. Mass atrocity crimes ongoing. 11 million+ internally displaced — largest displacement crisis globally.", source: "UN_OCHA", ts: new Date(Date.now() - 3600000).toISOString(), lat: 13.5, lon: 25.5 },
  { id: "s4", zone: "Kashmir (LoC)", type: "ESCALATION", severity: 4, desc: "India-Pakistan tensions critical following Pahalgam attack (26 killed). Indian military on high alert. Pakistan army mobilizing. Diplomatic relations severed.", source: "OSINT", ts: new Date(Date.now() - 2700000).toISOString(), lat: 34.0, lon: 74.5 },
  { id: "s5", zone: "Eastern DRC", type: "MILITARY_OP", severity: 4, desc: "M23/RDF forces controlling Goma and advancing south toward Bukavu. SADC mission repositioning. Ceasefire negotiations in Doha.", source: "UN_MONUSCO", ts: new Date(Date.now() - 5400000).toISOString(), lat: -1.67, lon: 29.22 },
  { id: "s6", zone: "Yemen", type: "NAVAL_ATTACK", severity: 4, desc: "Houthi forces launched anti-ship ballistic missiles targeting commercial vessels in Red Sea and Gulf of Aden. US/UK coalition responding with airstrikes.", source: "CENTCOM", ts: new Date(Date.now() - 7200000).toISOString(), lat: 14.5, lon: 43.0 },
  { id: "s7", zone: "Myanmar", type: "MILITARY_OP", severity: 4, desc: "Three Brotherhood Alliance forces and PDF maintaining offensive pressure on junta. TNLA seized Hsipaw. Arakan Army controls 80%+ of Rakhine State.", source: "OSINT", ts: new Date(Date.now() - 9000000).toISOString(), lat: 21.5, lon: 95.8 },
  { id: "s8", zone: "Lebanon", type: "AIRSTRIKE", severity: 4, desc: "IDF airstrikes on Hezbollah infrastructure in southern Lebanon. Hezbollah retaliatory rocket and drone fire into northern Israel.", source: "OSINT", ts: new Date(Date.now() - 10800000).toISOString(), lat: 33.55, lon: 35.55 },
  { id: "s9", zone: "West Bank", type: "MILITARY_OP", severity: 4, desc: "IDF conducting large-scale Iron Wall operation in Jenin, Tulkarm, and Nur Shams refugee camps. Palestinian resistance in camps ongoing.", source: "NEWS", ts: new Date(Date.now() - 12600000).toISOString(), lat: 32.2, lon: 35.2 },
  { id: "s10", zone: "Syria", type: "AIRSTRIKE", severity: 3, desc: "Israeli airstrikes (160+ strikes since Dec 2024) targeting Syrian military infrastructure, weapons depots and Iranian-linked facilities.", source: "OSINT", ts: new Date(Date.now() - 14400000).toISOString(), lat: 35.0, lon: 38.5 },
  { id: "s11", zone: "Somalia", type: "AIRSTRIKE", severity: 3, desc: "US AFRICOM airstrike targeting al-Shabaab militants in Lower Shabelle. ATMIS handover to Somali National Army forces progressing.", source: "AFRICOM", ts: new Date(Date.now() - 18000000).toISOString(), lat: 2.0, lon: 45.0 },
  { id: "s12", zone: "Sahel / Mali", type: "INSURGENCY", severity: 3, desc: "JNIM besieging Bamako outskirts. Series of ambushes on Mali FAMa and Wagner convoys in Mopti and Gao regions.", source: "OSINT", ts: new Date(Date.now() - 21600000).toISOString(), lat: 16.0, lon: -3.0 },
];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }

  let acledUpdates: any[] = [];
  try {
    const r = await fetch(
      "https://api.reliefweb.int/v1/disasters?appname=edgis&limit=20&filter[field]=status&filter[value]=ongoing",
      { signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const d: any = await r.json();
      if (d.data) {
        acledUpdates = d.data.slice(0, 10).map((e: any, i: number) => ({
          id: `rw_${i}`,
          zone: e.fields?.country?.[0]?.name || "Unknown",
          type: "HUMANITARIAN",
          severity: 3,
          desc: e.fields?.name || "Ongoing humanitarian crisis",
          source: "RELIEFWEB",
          ts: e.fields?.date?.created || new Date().toISOString(),
          lat: null, lon: null,
        }));
      }
    }
  } catch (_) {}

  const all = [...STATIC_UPDATES, ...acledUpdates].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );

  res.json({ status: "ok", count: all.length, updates: all, ts: Date.now() });
}
