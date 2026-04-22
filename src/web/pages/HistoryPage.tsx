import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

type DataType = "all" | "flights" | "vessels" | "conflicts";

interface HistoryRecord {
  id: string;
  type: DataType;
  title: string;
  subtitle: string;
  timestamp: string;
  data: any;
}

export default function HistoryPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dataType, setDataType] = useState<DataType>("all");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [dbStatus, setDbStatus] = useState<"idle" | "ok" | "error">("idle");

  const search = async () => {
    setLoading(true);
    setSearched(true);
    const results: HistoryRecord[] = [];

    if (!supabase) {
      setDbStatus("error");
      setLoading(false);
      return;
    }

    try {
      if (dataType === "all" || dataType === "flights") {
        const { data } = await supabase
          .from("flights")
          .select("*")
          .gte("timestamp", new Date(startDate).toISOString())
          .lte("timestamp", new Date(endDate + "T23:59:59").toISOString())
          .order("timestamp", { ascending: false })
          .limit(500);
        if (data) {
          data.forEach(d => results.push({
            id: d.id, type: "flights",
            title: d.callsign || d.icao_24 || "Unknown Flight",
            subtitle: `${d.source || "UNKNOWN"} • Alt: ${d.altitude || 0}ft • ${d.heading || 0}°`,
            timestamp: d.timestamp, data: d
          }));
        }
      }

      if (dataType === "all" || dataType === "vessels") {
        const { data } = await supabase
          .from("vessels")
          .select("*")
          .gte("timestamp", new Date(startDate).toISOString())
          .lte("timestamp", new Date(endDate + "T23:59:59").toISOString())
          .order("timestamp", { ascending: false })
          .limit(500);
        if (data) {
          data.forEach(d => results.push({
            id: d.id, type: "vessels",
            title: d.vessel_name || d.mmsi || "Unknown Vessel",
            subtitle: `MMSI: ${d.mmsi} • ${d.vessel_type || "Unknown"} • ${d.speed || 0}kt`,
            timestamp: d.timestamp, data: d
          }));
        }
      }

      if (dataType === "all" || dataType === "conflicts") {
        const { data } = await supabase
          .from("conflict_events")
          .select("*, conflict_zones(zone_name)")
          .gte("event_date", new Date(startDate).toISOString())
          .lte("event_date", new Date(endDate + "T23:59:59").toISOString())
          .order("event_date", { ascending: false })
          .limit(200);
        if (data) {
          data.forEach((d: any) => results.push({
            id: d.id, type: "conflicts",
            title: d.conflict_zones?.zone_name || "Unknown Zone",
            subtitle: `${d.event_type} • ${d.casualty_estimate ? d.casualty_estimate + " casualties" : "No casualty data"} • ${d.source}`,
            timestamp: d.event_date, data: d
          }));
        }
      }

      setDbStatus("ok");
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecords(results);
    } catch (e) {
      setDbStatus("error");
      console.error("History fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const TYPE_ICON: Record<string, string> = { flights: "✈", vessels: "⛵", conflicts: "◉", all: "◈" };
  const TYPE_COLOR: Record<string, string> = { flights: "text-blue-400 border-blue-700", vessels: "text-cyan-400 border-cyan-700", conflicts: "text-red-400 border-red-700" };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-10 bg-slate-900 border-b border-slate-700/60 flex items-center pl-12 md:pl-4 pr-3 shrink-0 gap-4">
        <span className="text-xs text-slate-300 tracking-widest font-bold">HISTORICAL DATABASE</span>
        <div className="h-4 w-px bg-slate-700"></div>
        {dbStatus === "ok" && <span className="text-[10px] text-green-400">DB CONNECTED</span>}
        {dbStatus === "error" && <span className="text-[10px] text-red-400">DB ERROR — Run database-schema.sql in Supabase</span>}
      </div>

      {/* Search Controls */}
      <div className="bg-slate-900 border-b border-slate-700/60 px-4 py-3 flex items-end gap-4 shrink-0">
        <div>
          <label className="text-[9px] text-slate-500 tracking-widest block mb-1">START DATE</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-slate-800 border border-slate-700/60 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-[9px] text-slate-500 tracking-widest block mb-1">END DATE</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-slate-800 border border-slate-700/60 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-[9px] text-slate-500 tracking-widest block mb-1">DATA TYPE</label>
          <select value={dataType} onChange={e => setDataType(e.target.value as DataType)}
            className="bg-slate-800 border border-slate-700/60 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500">
            <option value="all">ALL TYPES</option>
            <option value="flights">AIRCRAFT</option>
            <option value="vessels">VESSELS</option>
            <option value="conflicts">CONFLICT EVENTS</option>
          </select>
        </div>
        <button onClick={search} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs tracking-widest font-bold transition-colors">
          {loading ? "SEARCHING..." : "SEARCH ARCHIVE"}
        </button>
        <div className="ml-auto text-[10px] text-slate-500">
          {searched && !loading && `${records.length} RECORDS`}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {!searched && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <div className="text-6xl mb-4 opacity-30">◷</div>
            <div className="text-sm tracking-widest">SELECT DATE RANGE AND SEARCH ARCHIVE</div>
            <div className="text-xs mt-2 text-slate-700">Historical data stored in Supabase database</div>
            <div className="mt-4 bg-slate-800/50 rounded p-4 max-w-md text-xs text-slate-500 space-y-1">
              <div className="text-slate-400 font-bold mb-2">DATABASE SETUP REQUIRED:</div>
              <div>1. Open Supabase dashboard</div>
              <div>2. Navigate to SQL Editor</div>
              <div>3. Run the contents of database-schema.sql</div>
              <div>4. Historical data will populate automatically</div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 tracking-widest">
            QUERYING DATABASE...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <div className="text-4xl mb-3 opacity-30">○</div>
            <div className="tracking-widest">NO RECORDS IN SELECTED DATE RANGE</div>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => (
              <div key={record.id}
                className={`border-l-2 rounded-r p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer ${TYPE_COLOR[record.type] || "border-slate-700"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{TYPE_ICON[record.type]}</span>
                    <div>
                      <div className="text-sm text-white font-semibold">{record.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{record.subtitle}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono shrink-0">
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
