import type { VercelRequest, VercelResponse } from "@vercel/node";

const ZONES = [
  { id: "ukraine", name: "Ukraine", lat: 49.0, lon: 31.2, country: "Ukraine", region: "Eastern Europe", status: "ACTIVE", severity: 5, type: "STATE_WAR", desc: "Full-scale Russian military invasion. Active frontlines across Donetsk, Zaporizhzhia, Kherson, and Kharkiv oblasts.", started: "2022-02-24" },
  { id: "gaza", name: "Gaza Strip", lat: 31.35, lon: 34.31, country: "Palestine", region: "Middle East", status: "ACTIVE", severity: 5, type: "ARMED_CONFLICT", desc: "Israel-Hamas war following October 7 2023 Hamas attack. Significant civilian casualties and infrastructure destruction.", started: "2023-10-07" },
  { id: "west_bank", name: "West Bank", lat: 31.95, lon: 35.27, country: "Palestine", region: "Middle East", status: "ESCALATING", severity: 4, type: "OCCUPATION_CONFLICT", desc: "Ongoing IDF operations, settler violence, and Palestinian armed resistance.", started: "2023-10-07" },
  { id: "lebanon", name: "Lebanon", lat: 33.55, lon: 35.55, country: "Lebanon", region: "Middle East", status: "ACTIVE", severity: 4, type: "PROXY_WAR", desc: "Israel-Hezbollah armed conflict. Cross-border strikes. Fragile ceasefire with violations.", started: "2024-09-23" },
  { id: "syria", name: "Syria", lat: 35.0, lon: 38.5, country: "Syria", region: "Middle East", status: "ACTIVE", severity: 4, type: "CIVIL_WAR", desc: "Multi-actor conflict involving government forces, rebel factions, ISIS remnants, Kurdish SDF, and foreign powers.", started: "2011-03-15" },
  { id: "yemen", name: "Yemen", lat: 15.5, lon: 48.0, country: "Yemen", region: "Middle East", status: "ACTIVE", severity: 4, type: "CIVIL_WAR", desc: "Houthi forces vs Saudi-led coalition. Houthi Red Sea attacks on commercial shipping.", started: "2015-03-26" },
  { id: "sudan", name: "Sudan", lat: 15.0, lon: 30.0, country: "Sudan", region: "Africa", status: "ACTIVE", severity: 5, type: "CIVIL_WAR", desc: "SAF vs RSF since April 2023. World's largest displacement crisis with 11M+ internally displaced.", started: "2023-04-15" },
  { id: "myanmar", name: "Myanmar", lat: 21.5, lon: 95.8, country: "Myanmar", region: "Southeast Asia", status: "ACTIVE", severity: 4, type: "CIVIL_WAR", desc: "Military junta vs resistance forces (PDFs, ethnic armed organizations). Junta has lost significant territory.", started: "2021-02-01" },
  { id: "drc_east", name: "Eastern DRC", lat: -1.5, lon: 29.0, country: "DRC", region: "Africa", status: "ACTIVE", severity: 4, type: "INSURGENCY", desc: "M23/RDF (Rwanda-backed) advanced and captured Goma Jan 2025. Multiple armed groups in North/South Kivu.", started: "2022-11-01" },
  { id: "somalia", name: "Somalia", lat: 5.5, lon: 46.0, country: "Somalia", region: "Africa", status: "ACTIVE", severity: 3, type: "INSURGENCY", desc: "Al-Shabaab insurgency. US AFRICOM drone strikes targeting leadership ongoing.", started: "2006-01-01" },
  { id: "kashmir", name: "Kashmir (LoC)", lat: 34.0, lon: 74.5, country: "India/Pakistan", region: "South Asia", status: "ESCALATING", severity: 4, type: "BORDER_CONFLICT", desc: "Pahalgam attack April 2025 killed 26 Indian tourists. India-Pakistan military escalation ongoing.", started: "2025-04-22" },
  { id: "sahel_mali", name: "Mali / Sahel", lat: 17.0, lon: -2.0, country: "Mali", region: "West Africa", status: "ACTIVE", severity: 3, type: "INSURGENCY", desc: "JNIM (AQIM affiliate) and ISIS-GS jihadist insurgency in the Sahel.", started: "2012-01-01" },
  { id: "burkina_faso", name: "Burkina Faso", lat: 12.0, lon: -1.5, country: "Burkina Faso", region: "West Africa", status: "ACTIVE", severity: 3, type: "INSURGENCY", desc: "JNIM and ISWAP jihadist insurgency. ~40-60% of territory inaccessible to government.", started: "2015-01-01" },
  { id: "nigeria_ne", name: "NE Nigeria", lat: 12.0, lon: 13.5, country: "Nigeria", region: "West Africa", status: "ACTIVE", severity: 3, type: "INSURGENCY", desc: "Boko Haram and ISWAP insurgency in Lake Chad Basin.", started: "2009-07-26" },
  { id: "south_sudan", name: "South Sudan", lat: 7.0, lon: 30.5, country: "South Sudan", region: "East Africa", status: "ACTIVE", severity: 3, type: "CIVIL_WAR", desc: "Renewed civil conflict between SSPDF and SPLM-IO factions.", started: "2013-12-15" },
  { id: "afghanistan", name: "Afghanistan", lat: 33.9, lon: 67.7, country: "Afghanistan", region: "South Asia", status: "ACTIVE", severity: 3, type: "INSURGENCY", desc: "Taliban governance with ISIS-K attacks targeting civilians and minority groups.", started: "2021-08-15" },
  { id: "russia_kursk", name: "Kursk Oblast", lat: 51.5, lon: 36.5, country: "Russia", region: "Eastern Europe", status: "ACTIVE", severity: 4, type: "CROSS_BORDER", desc: "Ukrainian cross-border operation Aug 2024 seized territory in Kursk Oblast. Russian counter-offensive ongoing.", started: "2024-08-06" },
  { id: "haiti", name: "Haiti", lat: 18.9, lon: -72.3, country: "Haiti", region: "Caribbean", status: "ACTIVE", severity: 3, type: "GANG_CONFLICT", desc: "Viv Ansanm gang coalition controls ~80% of Port-au-Prince.", started: "2021-07-07" },
];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (_req.method === "OPTIONS") { res.status(200).end(); return; }
  res.json({ status: "ok", count: ZONES.length, conflicts: ZONES, ts: Date.now() });
}
