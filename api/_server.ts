// Local dev server — mirrors the Vercel API routes
// Run with: npm run api
import { createServer, IncomingMessage, ServerResponse } from "http";
import flightsHandler from "./flights.js";
import vesselsHandler from "./vessels.js";
import conflictsHandler from "./conflicts.js";
import conflictMonitorHandler from "./conflict-monitor.js";
import satellitesHandler from "./satellites.js";
import trafficHandler from "./traffic.js";
import nasaEventsHandler from "./nasa-events.js";
import osintNewsHandler from "./osint-news.js";

const PORT = 3001;

function makeReq(req: IncomingMessage, url: URL) {
  return Object.assign(req, {
    query: Object.fromEntries(url.searchParams.entries()),
  }) as any;
}

function makeRes(res: ServerResponse) {
  const headers: Record<string, string> = {};
  return Object.assign(res, {
    setHeader: (k: string, v: string) => { headers[k] = v; res.setHeader(k, v); },
    status: (code: number) => { res.statusCode = code; return res; },
    json: (data: any) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    },
    end: (body?: string) => res.end(body),
  }) as any;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const path = url.pathname;
  const vReq = makeReq(req, url);
  const vRes = makeRes(res);

  try {
    if (path === "/api/ping") { vRes.json({ message: `Pong! ${Date.now()}` }); }
    else if (path === "/api/flights") { await flightsHandler(vReq, vRes); }
    else if (path === "/api/vessels") { await vesselsHandler(vReq, vRes); }
    else if (path === "/api/conflicts") { await conflictsHandler(vReq, vRes); }
    else if (path === "/api/conflict-monitor") { await conflictMonitorHandler(vReq, vRes); }
    else if (path === "/api/satellites") { await satellitesHandler(vReq, vRes); }
    else if (path === "/api/traffic") { await trafficHandler(vReq, vRes); }
    else if (path === "/api/nasa-events") { await nasaEventsHandler(vReq, vRes); }
    else if (path === "/api/osint-news") { await osintNewsHandler(vReq, vRes); }
    else if (path.startsWith("/api/conflict-detail/")) {
      const { default: handler } = await import("./conflict-detail/[zone_id].js");
      vReq.query = { ...vReq.query, zone_id: path.split("/").pop() };
      await handler(vReq, vRes);
    }
    else { res.statusCode = 404; res.end("{}"); }
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`API dev server → http://localhost:${PORT}`));
