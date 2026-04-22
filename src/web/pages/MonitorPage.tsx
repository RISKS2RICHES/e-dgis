import { useEffect, useState, useCallback } from "react";

interface Update {
  id: string;
  zone: string;
  type: string;
  severity: number;
  desc: string;
  source: string;
  ts: string;
  lat?: number;
  lon?: number;
}

const ZONE_INFO: Record<string, { flag: string; color: string }> = {
  "Ukraine": { flag: "🇺🇦", color: "border-red-600" },
  "Gaza Strip": { flag: "🇵🇸", color: "border-red-600" },
  "West Bank": { flag: "🇵🇸", color: "border-orange-600" },
  "Lebanon": { flag: "🇱🇧", color: "border-orange-600" },
  "Syria": { flag: "🇸🇾", color: "border-orange-600" },
  "Yemen": { flag: "🇾🇪", color: "border-orange-600" },
  "Sudan": { flag: "🇸🇩", color: "border-red-600" },
  "Myanmar": { flag: "🇲🇲", color: "border-orange-600" },
  "Eastern DRC": { flag: "🇨🇩", color: "border-orange-600" },
  "Somalia": { flag: "🇸🇴", color: "border-amber-600" },
  "default": { flag: "⚠", color: "border-slate-600" },
};

const SEV_COLOR: Record<number, string> = { 5: "text-red-400", 4: "text-orange-400", 3: "text-amber-400", 2: "text-lime-400", 1: "text-green-400" };
const SEV_LABEL: Record<number, string> = { 5: "CRITICAL", 4: "HIGH", 3: "MODERATE", 2: "LOW", 1: "MINIMAL" };
const SEV_BAR: Record<number, string> = { 5: "bg-red-600 w-full", 4: "bg-orange-600 w-4/5", 3: "bg-amber-600 w-3/5", 2: "bg-lime-600 w-2/5", 1: "bg-green-600 w-1/5" };

export default function MonitorPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filter, setFilter] = useState<string>("ALL");

  const fetchUpdates = useCallback(async () => {
    try {
      const r = await fetch("/api/conflict-monitor");
      const d = await r.json();
      if (d.updates) {
        setUpdates(d.updates);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error("Monitor fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
    if (!autoRefresh) return;
    const t = setInterval(fetchUpdates, 180000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchUpdates]);

  // Group by zone
  const grouped = updates.reduce((acc: Record<string, Update[]>, u) => {
    if (!acc[u.zone]) acc[u.zone] = [];
    acc[u.zone].push(u);
    return acc;
  }, {});

  const zones = Object.keys(grouped).sort((a, b) => {
    const maxSev = (z: string) => Math.max(...grouped[z].map(u => u.severity));
    return maxSev(b) - maxSev(a);
  });

  const filteredUpdates = selectedZone
    ? (grouped[selectedZone] || [])
    : updates.filter(u => filter === "ALL" || String(u.severity) === filter);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="min-h-10 bg-slate-900 border-b border-slate-700/60 flex flex-wrap items-center pl-12 md:pl-4 pr-3 shrink-0 gap-2 md:gap-4 py-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        <span className="text-xs text-slate-300 tracking-widest font-bold">CONFLICT MONITOR</span>
        <span className="text-[10px] text-slate-500">{updates.length} REPORTS</span>
        <div className="ml-auto flex items-center gap-2 md:gap-4 text-[10px]">
          <label className="hidden sm:flex items-center gap-1.5 cursor-pointer text-slate-400">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-3 h-3" />
            AUTO
          </label>
          <button onClick={fetchUpdates} className="text-blue-400 hover:text-blue-300 tracking-wider border border-slate-700 px-2 py-0.5 rounded">↺</button>
          <span className="text-slate-600 hidden sm:block">{lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Zone List */}
        <div className="w-36 sm:w-48 md:w-52 bg-slate-900 border-r border-slate-700/60 overflow-y-auto flex-shrink-0">
          <div className="p-2">
            <div className="text-[9px] text-slate-500 tracking-widest px-2 py-1">ACTIVE ZONES ({zones.length})</div>
            <button
              onClick={() => setSelectedZone(null)}
              className={`w-full text-left px-3 py-2 rounded text-[10px] mb-1 tracking-wider transition-colors ${!selectedZone ? "bg-blue-600/20 text-blue-400 border border-blue-600/40" : "text-slate-400 hover:bg-slate-800"}`}
            >
              ALL ZONES
            </button>
            {zones.map(zone => {
              const maxSev = Math.max(...grouped[zone].map(u => u.severity));
              const info = ZONE_INFO[zone] || ZONE_INFO.default;
              return (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(selectedZone === zone ? null : zone)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors text-[10px] tracking-wider mb-0.5 border-l-2 ${
                    selectedZone === zone ? "bg-slate-700 text-white " + info.color : "text-slate-400 hover:bg-slate-800 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{info.flag} {zone}</span>
                    <span className={`font-bold ${SEV_COLOR[maxSev]}`}>{maxSev}</span>
                  </div>
                  <div className="mt-1 h-1 bg-slate-800 rounded overflow-hidden">
                    <div className={`h-full rounded ${SEV_BAR[maxSev]}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Updates Feed */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filter bar */}
          {!selectedZone && (
            <div className="flex gap-2 px-4 py-2 border-b border-slate-700/60 bg-slate-900 shrink-0">
              <span className="text-[9px] text-slate-500 tracking-widest self-center">SEVERITY:</span>
              {["ALL", "5", "4", "3", "2", "1"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded text-[9px] tracking-wider transition-colors ${
                    filter === f ? "bg-blue-600/30 text-blue-400 border border-blue-600/40" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f === "ALL" ? "ALL" : `${SEV_LABEL[parseInt(f)]} (${f})`}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-slate-500 text-center py-12 tracking-widest">LOADING INTELLIGENCE FEEDS...</div>
            ) : filteredUpdates.length === 0 ? (
              <div className="text-slate-600 text-center py-12">NO REPORTS MATCHING CRITERIA</div>
            ) : (
              filteredUpdates.map(update => <UpdateCard key={update.id} update={update} />)
            )}
          </div>
        </div>

        {/* Zone Stats Panel */}
        {selectedZone && grouped[selectedZone] && (
          <ZoneStatsPanel zone={selectedZone} updates={grouped[selectedZone]} />
        )}
      </div>
    </div>
  );
}

function UpdateCard({ update }: { update: Update }) {
  const [expanded, setExpanded] = useState(false);
  const tAgo = getTimeAgo(update.ts);

  return (
    <div
      className={`border-l-2 rounded-r p-3 cursor-pointer transition-all bg-slate-800/50 hover:bg-slate-800 ${
        update.severity === 5 ? "border-red-600" :
        update.severity === 4 ? "border-orange-600" :
        update.severity === 3 ? "border-amber-600" : "border-slate-600"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded ${
            update.severity === 5 ? "bg-red-900/50 text-red-400" :
            update.severity === 4 ? "bg-orange-900/50 text-orange-400" :
            update.severity === 3 ? "bg-amber-900/50 text-amber-400" : "bg-slate-700 text-slate-400"
          }`}>{SEV_LABEL[update.severity] || 'INFO'}</span>
          <span className="text-[10px] text-slate-400 tracking-wider">{update.zone}</span>
          <span className="text-[9px] text-slate-600 tracking-widest">{update.type}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-slate-600">{tAgo}</span>
          <span className="text-[9px] text-slate-700">{update.source}</span>
        </div>
      </div>
      <p className={`text-slate-300 text-[11px] leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>{update.desc}</p>
      {update.lat && update.lon && (
        <div className="mt-1 text-[9px] text-slate-600 font-mono">{update.lat?.toFixed(3)}, {update.lon?.toFixed(3)}</div>
      )}
    </div>
  );
}

function ZoneStatsPanel({ zone, updates }: { zone: string; updates: Update[] }) {
  const maxSev = Math.max(...updates.map(u => u.severity));
  const critical = updates.filter(u => u.severity >= 4).length;
  const info = ZONE_INFO[zone] || ZONE_INFO.default;

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-700/60 p-4 overflow-y-auto shrink-0">
      <div className="text-[9px] text-slate-500 tracking-widest mb-3">ZONE ANALYSIS</div>
      <div className="text-lg font-bold text-white mb-1">{info.flag} {zone}</div>
      <div className={`text-xs ${SEV_COLOR[maxSev]} mb-3`}>{SEV_LABEL[maxSev]} THREAT</div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-800 rounded p-2 text-center">
          <div className="text-xl font-bold text-white">{updates.length}</div>
          <div className="text-[9px] text-slate-500">REPORTS</div>
        </div>
        <div className="bg-slate-800 rounded p-2 text-center">
          <div className="text-xl font-bold text-red-400">{critical}</div>
          <div className="text-[9px] text-slate-500">CRITICAL</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[9px] text-slate-500 tracking-widest mb-1">EVENT TYPES</div>
        {[...new Set(updates.map(u => u.type))].map(type => (
          <div key={type} className="flex items-center justify-between bg-slate-800 rounded px-2 py-1">
            <span className="text-[9px] text-slate-400">{type}</span>
            <span className="text-[9px] text-slate-200">{updates.filter(u => u.type === type).length}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTimeAgo(ts: string): string {
  const d = new Date(ts).getTime();
  if (isNaN(d)) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
