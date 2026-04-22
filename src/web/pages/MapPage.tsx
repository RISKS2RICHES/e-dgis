import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import DataPanel from "../components/DataPanel";
import LayerControls from "../components/LayerControls";

// Mapbox token — set VITE_MAPBOX_TOKEN in Vercel environment variables (must redeploy after adding)
const TOKEN: string = (import.meta.env.VITE_MAPBOX_TOKEN as string) ?? "";

// Plane SVG as data URL for aircraft icon
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#60a5fa" stroke="#1e3a5f" stroke-width="1" d="M12 2L6 14H9V22L12 20L15 22V14H18L12 2Z"/>
</svg>`;

const PLANE_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(PLANE_SVG);

const SAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
  <rect x="10" y="6" width="4" height="12" fill="#c4b5fd" stroke="#7c3aed" stroke-width="1"/>
  <rect x="2" y="10" width="20" height="4" fill="#c4b5fd" stroke="#7c3aed" stroke-width="1"/>
  <circle cx="12" cy="12" r="2" fill="#7c3aed"/>
</svg>`;
const SAT_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SAT_SVG);

const SHIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
  <path fill="#06b6d4" stroke="#0e7490" stroke-width="1" d="M12 2L8 10H4L3 16H21L20 10H16L12 2Z"/>
</svg>`;
const SHIP_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SHIP_SVG);

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ type: string; data: any } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [layers, setLayers] = useState({
    flights: true, vessels: true, conflicts: true,
    satellites: false, traffic: false, nasaEvents: false
  });
  const [counts, setCounts] = useState({ flights: 0, vessels: 0, satellites: 0, conflicts: 0 });
  const [apiStatus, setApiStatus] = useState<Record<string, 'ok' | 'error' | 'loading'>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Load image into map
  const loadImage = useCallback((map: mapboxgl.Map, id: string, url: string): Promise<void> => {
    return new Promise((resolve) => {
      if (map.hasImage(id)) { resolve(); return; }
      const img = new Image(24, 24);
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    if (!TOKEN) {
      setMapError("VITE_MAPBOX_TOKEN is not set. Add it to your Vercel environment variables and redeploy.");
      return;
    }

    if (!mapboxgl.supported()) {
      setMapError("Your browser does not support WebGL, which is required for the map.");
      return;
    }

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [10, 20],
      zoom: 2.2,
      pitch: 20,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      failIfMajorPerformanceCaveat: false,
    });

    map.on("error", (e) => {
      console.error("Mapbox error:", e);
      if (e.error?.status === 401 || String(e.error?.message).includes("401")) {
        setMapError("Mapbox token is invalid or expired. Check VITE_MAPBOX_TOKEN in Vercel and redeploy.");
      }
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", async () => {
      // Load custom icons
      await Promise.all([
        loadImage(map, "plane-icon", PLANE_URL),
        loadImage(map, "sat-icon", SAT_URL),
        loadImage(map, "ship-icon", SHIP_URL),
      ]);

      // Atmosphere / fog
      map.setFog({
        color: "rgb(10,15,30)",
        "high-color": "rgb(20,35,70)",
        "space-color": "rgb(5,10,20)",
        "star-intensity": 0.5,
        range: [0.5, 10],
      });

      // Init empty GeoJSON sources
      const emptySrc = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
      ["flights-src", "vessels-src", "conflicts-src", "satellites-src", "satellites-orbits-src", "traffic-src", "nasa-src"].forEach(id => {
        map.addSource(id, { type: "geojson", data: emptySrc() });
      });

      // ── CONFLICT ZONES ── (large filled areas + pulse + dot + label)
      // Outer glow / zone fill
      map.addLayer({
        id: "conflicts-zone",
        type: "circle",
        source: "conflicts-src",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"],
            1, ["case", ["==", ["get", "severity"], 5], 30, ["==", ["get", "severity"], 4], 25, ["==", ["get", "severity"], 3], 20, 15],
            4, ["case", ["==", ["get", "severity"], 5], 60, ["==", ["get", "severity"], 4], 50, ["==", ["get", "severity"], 3], 40, 30],
            8, ["case", ["==", ["get", "severity"], 5], 120, ["==", ["get", "severity"], 4], 100, ["==", ["get", "severity"], 3], 80, 60]
          ],
          "circle-color": ["case",
            ["==", ["get", "severity"], 5], '#dc2626',
            ["==", ["get", "severity"], 4], '#ea580c',
            ["==", ["get", "severity"], 3], '#d97706',
            ["==", ["get", "severity"], 2], '#65a30d',
            '#16a34a'
          ],
          "circle-opacity": 0.12,
          "circle-blur": 1.2,
        },
      });
      // Inner solid dot
      map.addLayer({
        id: "conflicts-layer",
        type: "circle",
        source: "conflicts-src",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 7, 5, 10, 10, 18],
          "circle-color": ["case",
            ["==", ["get", "severity"], 5], '#dc2626',
            ["==", ["get", "severity"], 4], '#ea580c',
            ["==", ["get", "severity"], 3], '#d97706',
            ["==", ["get", "severity"], 2], '#65a30d',
            '#16a34a'
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.95,
        },
      });
      // Labels
      map.addLayer({
        id: "conflicts-labels",
        type: "symbol",
        source: "conflicts-src",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 5, 12, 8, 14],
          "text-offset": [0, 1.8],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-optional": true,
        },
        paint: { "text-color": "#fca5a5", "text-halo-color": "#0f172a", "text-halo-width": 1.5 },
      });

      // ── FLIGHTS LAYER ── (custom plane SVG icon)
      map.addLayer({
        id: "flights-layer",
        type: "symbol",
        source: "flights-src",
        layout: {
          "icon-image": "plane-icon",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 0.8, 10, 1.2],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-optional": false,
          "text-field": ["step", ["zoom"], "", 6, ["get", "callsign"]],
          "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
          "text-size": 9,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#93c5fd",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1,
          "icon-opacity": 0.95,
        },
      });

      // ── VESSELS LAYER ── (ship icon)
      map.addLayer({
        id: "vessels-layer",
        type: "symbol",
        source: "vessels-src",
        layout: {
          "icon-image": "ship-icon",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 0.7, 10, 1.0],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-rotate": ["coalesce", ["get", "heading"], ["get", "course"], 0],
          "icon-rotation-alignment": "map",
          "text-field": ["step", ["zoom"], "", 7, ["get", "name"]],
          "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
          "text-size": 9,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#67e8f9",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1,
          "icon-opacity": 0.9,
        },
      });

      // Vessel dots fallback (shown when no ship icon)
      map.addLayer({
        id: "vessels-dots",
        type: "circle",
        source: "vessels-src",
        paint: {
          "circle-radius": 3,
          "circle-color": "#06b6d4",
          "circle-stroke-color": "#0e7490",
          "circle-stroke-width": 1,
          "circle-opacity": 0.8,
        },
      });

      // ── SATELLITES LAYER ──
      map.addLayer({
        id: "satellites-footprint",
        type: "circle",
        source: "satellites-src",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 6, 5, 14],
          "circle-color": "#a78bfa",
          "circle-opacity": 0.06,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "satellites-layer",
        type: "symbol",
        source: "satellites-src",
        layout: {
          visibility: "none",
          "icon-image": "sat-icon",
          "icon-size": 0.8,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "text-field": ["step", ["zoom"], "", 5, ["get", "name"]],
          "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
          "text-size": 8,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": "#c4b5fd", "text-halo-color": "#0f172a", "text-halo-width": 1, "icon-opacity": 0.9 },
      });

      // ── SATELLITE ORBIT LINES ──
      map.addLayer({
        id: "satellites-orbits-layer",
        type: "line",
        source: "satellites-orbits-src",
        layout: { visibility: "none" },
        paint: {
          "line-color": "#7c3aed",
          "line-width": 0.8,
          "line-opacity": 0.35,
          "line-dasharray": [3, 2],
        },
      });

      // ── TRAFFIC LAYER ──
      map.addLayer({
        id: "traffic-layer",
        type: "circle",
        source: "traffic-src",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 5,
          "circle-color": ["case", ["==", ["get", "type"], "TRAFFIC_CAMERA"], '#10b981', '#f59e0b'],
          "circle-opacity": 0.85,
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1,
        },
      });

      // ── NASA EVENTS LAYER ──
      map.addLayer({
        id: "nasa-layer",
        type: "circle",
        source: "nasa-src",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 7,
          "circle-color": "#f97316",
          "circle-opacity": 0.7,
          "circle-stroke-color": "#c2410c",
          "circle-stroke-width": 1.5,
        },
      });

      // Click handlers
      const clickableLayers = ["conflicts-layer", "flights-layer", "vessels-layer", "vessels-dots", "satellites-layer", "traffic-layer", "nasa-layer"];
      const typeMap: Record<string, string> = {
        "conflicts-layer": "conflict", "flights-layer": "flight",
        "vessels-layer": "vessel", "vessels-dots": "vessel",
        "satellites-layer": "satellite", "traffic-layer": "traffic", "nasa-layer": "nasa",
      };
      clickableLayers.forEach(layerId => {
        map.on("click", layerId, (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          // Parse stringified properties from GeoJSON
          const props: any = {};
          for (const [k, v] of Object.entries(feat.properties || {})) {
            if (typeof v === 'string') {
              try { props[k] = JSON.parse(v); } catch { props[k] = v; }
            } else { props[k] = v; }
          }
          setSelected({ type: typeMap[layerId], data: props });
          setPanelOpen(true);
        });
        map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [loadImage]);

  // Update layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const pairs: [string, boolean][] = [
      ["flights-layer", layers.flights],
      ["vessels-layer", layers.vessels], ["vessels-dots", layers.vessels],
      ["conflicts-layer", layers.conflicts], ["conflicts-zone", layers.conflicts], ["conflicts-labels", layers.conflicts],
      ["satellites-layer", layers.satellites], ["satellites-footprint", layers.satellites], ["satellites-orbits-layer", layers.satellites],
      ["traffic-layer", layers.traffic],
      ["nasa-layer", layers.nasaEvents],
    ];
    pairs.forEach(([id, vis]) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    });
  }, [layers, mapReady]);

  // Generic layer loader
  const loadLayer = useCallback(async (endpoint: string, sourceId: string, statusKey: string, transform: (d: any) => GeoJSON.Feature[]) => {
    const map = mapRef.current;
    if (!map || !mapReady) return 0;
    setApiStatus(p => ({ ...p, [statusKey]: 'loading' }));
    try {
      const r = await fetch(`/api/${endpoint}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const features = transform(d);
      const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (src) src.setData({ type: "FeatureCollection", features });
      setApiStatus(p => ({ ...p, [statusKey]: 'ok' }));
      setLastUpdate(new Date());
      return features.length;
    } catch (e) {
      setApiStatus(p => ({ ...p, [statusKey]: 'error' }));
      return 0;
    }
  }, [mapReady]);

  // Fetch flights
  const fetchFlights = useCallback(async () => {
    const n = await loadLayer("flights", "flights-src", "flights", (d) =>
      (d.flights || [])
        .filter((f: any) => f.lat && f.lon && !isNaN(f.lat) && !isNaN(f.lon))
        .map((f: any): GeoJSON.Feature => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [f.lon, f.lat] },
          properties: {
            icao24: f.icao24, callsign: f.callsign || f.icao24,
            heading: f.heading || f.track || 0,
            altitude: f.altitude || f.alt || 0,
            speed: f.speed || f.gs || 0,
            type: f.type || '', reg: f.reg || '',
            operator: f.operator || f.airline || '',
            source: f.source || 'LIVE',
            lat: f.lat, lon: f.lon,
          }
        }))
    );
    setCounts(p => ({ ...p, flights: n }));
  }, [loadLayer]);

  // Fetch vessels
  const fetchVessels = useCallback(async () => {
    const n = await loadLayer("vessels", "vessels-src", "vessels", (d) =>
      (d.vessels || [])
        .filter((v: any) => v.lat && v.lon && !isNaN(v.lat) && !isNaN(v.lon))
        .map((v: any): GeoJSON.Feature => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [v.lon, v.lat] },
          properties: {
            mmsi: v.mmsi, name: v.name || v.mmsi || 'Unknown',
            heading: v.heading || 0, course: v.course || 0,
            speed: v.speed || v.sog || 0, type: v.type || 0,
            flag: v.flag || '', dest: v.dest || '',
            lat: v.lat, lon: v.lon,
          }
        }))
    );
    setCounts(p => ({ ...p, vessels: n }));
  }, [loadLayer]);

  // Fetch conflicts
  const fetchConflicts = useCallback(async () => {
    const n = await loadLayer("conflicts", "conflicts-src", "conflicts", (d) =>
      (d.conflicts || [])
        .filter((c: any) => c.lat && c.lon)
        .map((c: any): GeoJSON.Feature => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lon, c.lat] },
          properties: { ...c }
        }))
    );
    setCounts(p => ({ ...p, conflicts: n }));
  }, [loadLayer]);

  // Fetch satellites with real SGP4 orbit tracks
  const fetchSatellites = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setApiStatus(p => ({ ...p, satellites: 'loading' }));
    try {
      const r = await fetch('/api/satellites');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const sats: any[] = d.satellites || [];

      const pointFeatures: GeoJSON.Feature[] = sats
        .filter((s: any) => s.lat !== undefined && s.lon !== undefined && !isNaN(s.lat) && !isNaN(s.lon))
        .map((s: any): GeoJSON.Feature => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: {
            name: s.name, norad: s.norad,
            lat: s.lat, lon: s.lon, alt: s.alt,
            inc: s.inc, period: s.period, vel: s.vel,
          }
        }));

      const ptSrc = map.getSource("satellites-src") as mapboxgl.GeoJSONSource;
      if (ptSrc) ptSrc.setData({ type: "FeatureCollection", features: pointFeatures });

      // Build orbit ground tracks from inclination + period
      const orbitFeatures: GeoJSON.Feature[] = sats
        .filter((s: any) => s.lat !== undefined && s.inc !== undefined)
        .map((s: any): GeoJSON.Feature | null => {
          const period = s.period || 90;
          const inc = (s.inc || 51.6) * Math.PI / 180;
          const earthRotRate = 360 / (24 * 60); // deg/min
          const steps = 80;
          const points: [number, number][] = [];

          for (let i = 0; i <= steps; i++) {
            const t = (i / steps - 0.5) * period; // minutes from now
            const angle = (t / period) * 2 * Math.PI + Math.asin(Math.sin(inc) === 0 ? 0 : Math.sin(s.lat * Math.PI / 180) / Math.sin(inc));
            const lat = Math.asin(Math.max(-1, Math.min(1, Math.sin(inc) * Math.sin(angle)))) * 180 / Math.PI;
            const lonOffset = (t / period) * 360 - t * earthRotRate;
            let lon = ((s.lon + lonOffset) % 360 + 540) % 360 - 180;
            if (!isNaN(lat) && !isNaN(lon)) points.push([lon, lat]);
          }

          if (points.length < 4) return null;

          // Split at anti-meridian
          const segments: [number, number][][] = [[]];
          for (let i = 0; i < points.length; i++) {
            const seg = segments[segments.length - 1];
            if (seg.length > 0 && Math.abs(points[i][0] - seg[seg.length - 1][0]) > 180) {
              segments.push([]);
            }
            segments[segments.length - 1].push(points[i]);
          }

          const validSegs = segments.filter(s => s.length >= 2);
          if (validSegs.length === 0) return null;
          if (validSegs.length === 1) {
            return { type: "Feature", geometry: { type: "LineString", coordinates: validSegs[0] }, properties: { name: s.name } };
          }
          return { type: "Feature", geometry: { type: "MultiLineString", coordinates: validSegs }, properties: { name: s.name } };
        }).filter(Boolean) as GeoJSON.Feature[];

      const orbitSrc = map.getSource("satellites-orbits-src") as mapboxgl.GeoJSONSource;
      if (orbitSrc) orbitSrc.setData({ type: "FeatureCollection", features: orbitFeatures });

      setApiStatus(p => ({ ...p, satellites: 'ok' }));
      setCounts(p => ({ ...p, satellites: sats.length }));
      setLastUpdate(new Date());
    } catch (e) {
      setApiStatus(p => ({ ...p, satellites: 'error' }));
    }
  }, [mapReady]);

  // Fetch traffic
  const fetchTraffic = useCallback(async () => {
    await loadLayer("traffic", "traffic-src", "traffic", (d) => {
      const features: GeoJSON.Feature[] = [];
      (d.incidents || []).forEach((i: any) => {
        if (i.lat && i.lon) features.push({ type: "Feature", geometry: { type: "Point", coordinates: [i.lon, i.lat] }, properties: { ...i, type: i.type || 'INCIDENT' } });
      });
      (d.cameras || []).forEach((cam: any) => {
        if (cam.lat && cam.lon) features.push({ type: "Feature", geometry: { type: "Point", coordinates: [cam.lon, cam.lat] }, properties: { ...cam, type: 'TRAFFIC_CAMERA' } });
      });
      return features;
    });
  }, [loadLayer]);

  // Fetch NASA events
  const fetchNasa = useCallback(async () => {
    await loadLayer("nasa-events", "nasa-src", "nasa", (d) =>
      (d.events || [])
        .filter((e: any) => e.lat && e.lon)
        .map((e: any): GeoJSON.Feature => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon, e.lat] },
          properties: { ...e }
        }))
    );
  }, [loadLayer]);

  // Initial data load
  useEffect(() => {
    if (!mapReady) return;
    fetchConflicts();
    fetchFlights();
    fetchVessels();
    if (layers.satellites) fetchSatellites();
    if (layers.traffic) fetchTraffic();
    if (layers.nasaEvents) fetchNasa();

    const i1 = setInterval(fetchFlights, 15000);     // every 15s for real-time feel
    const i2 = setInterval(fetchVessels, 15000);     // every 15s
    const i3 = setInterval(fetchConflicts, 3600000); // hourly
    const i4 = setInterval(fetchTraffic, 300000);
    const i5 = setInterval(fetchNasa, 3600000);

    return () => { clearInterval(i1); clearInterval(i2); clearInterval(i3); clearInterval(i4); clearInterval(i5); };
  }, [mapReady]);

  // Re-fetch when layers toggled on
  useEffect(() => {
    if (!mapReady) return;
    if (layers.satellites) fetchSatellites();
  }, [layers.satellites, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    if (layers.traffic) fetchTraffic();
  }, [layers.traffic, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    if (layers.nasaEvents) fetchNasa();
  }, [layers.nasaEvents, mapReady]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="h-10 bg-slate-900/95 border-b border-slate-700/60 flex items-center pl-12 md:pl-3 pr-3 shrink-0 gap-3 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-300 tracking-widest font-bold hidden sm:block">OPERATIONS MAP</span>
        </div>
        <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
        <div className="flex gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
            <span className="text-blue-400 font-bold">{counts.flights}</span>
            <span className="hidden sm:inline">AIRCRAFT</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span>
            <span className="text-cyan-400 font-bold">{counts.vessels}</span>
            <span className="hidden sm:inline">VESSELS</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
            <span className="text-red-400 font-bold">{counts.conflicts}</span>
            <span className="hidden sm:inline">ZONES</span>
          </span>
          {counts.satellites > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
              <span className="text-purple-400 font-bold">{counts.satellites}</span>
              <span className="hidden sm:inline">SATS</span>
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[9px] text-slate-600 font-mono">
          <span className="hidden md:block">{lastUpdate.toUTCString().replace(' GMT','Z')}</span>
          <button
            onClick={() => { fetchFlights(); fetchVessels(); fetchConflicts(); }}
            className="text-slate-500 hover:text-blue-400 text-[10px] border border-slate-700 rounded px-2 py-0.5 transition-colors"
          >
            ↺ REFRESH
          </button>
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapContainer} className="absolute inset-0 bg-slate-950" />
        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 p-8">
            <div className="text-red-400 text-4xl mb-4">⚠</div>
            <div className="text-red-400 text-sm font-bold tracking-widest mb-2">MAP INIT FAILED</div>
            <div className="text-slate-400 text-xs text-center max-w-md leading-relaxed">{mapError}</div>
          </div>
        )}

        {/* Layer Controls - top left */}
        <div className="absolute top-3 left-3 z-10">
          <LayerControls
            layers={layers}
            onToggle={(k) => setLayers(p => ({ ...p, [k]: !p[k as keyof typeof p] }))}
            apiStatus={apiStatus}
            counts={counts}
          />
        </div>

        {/* Data Panel - right side on desktop, bottom sheet on mobile */}
        {panelOpen && selected && (
          <>
            {/* Desktop: right panel */}
            <div className="hidden md:block absolute top-0 right-0 h-full w-96 bg-slate-900/98 border-l border-slate-700/60 overflow-y-auto z-20 shadow-2xl">
              <DataPanel
                type={selected.type}
                data={selected.data}
                onClose={() => { setPanelOpen(false); setSelected(null); }}
              />
            </div>
            {/* Mobile: bottom sheet */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 bg-slate-900/98 border-t border-slate-700/60 z-20 shadow-2xl max-h-[70vh] overflow-y-auto rounded-t-xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/40">
                <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2"></div>
                <div className="flex-1"></div>
                <button
                  onClick={() => { setPanelOpen(false); setSelected(null); }}
                  className="text-slate-500 hover:text-white text-xl p-1"
                >×</button>
              </div>
              <DataPanel
                type={selected.type}
                data={selected.data}
                onClose={() => { setPanelOpen(false); setSelected(null); }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
