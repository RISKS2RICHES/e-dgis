import { useState } from "react";

interface LayerControlsProps {
  layers: Record<string, boolean>;
  onToggle: (key: string) => void;
  apiStatus: Record<string, string>;
  counts: Record<string, number>;
}

const LAYER_CONFIG = [
  { key: "flights",    label: "AIRCRAFT",    color: "text-blue-400",   dot: "bg-blue-500",   countKey: "flights" },
  { key: "vessels",    label: "VESSELS",     color: "text-cyan-400",   dot: "bg-cyan-500",   countKey: "vessels" },
  { key: "conflicts",  label: "CONFLICTS",   color: "text-red-400",    dot: "bg-red-500",    countKey: "conflicts" },
  { key: "satellites", label: "SATELLITES",  color: "text-purple-400", dot: "bg-purple-500", countKey: "satellites" },
  { key: "traffic",    label: "TFL TRAFFIC", color: "text-amber-400",  dot: "bg-amber-500",  countKey: "traffic" },
  { key: "nasaEvents", label: "NASA EVENTS", color: "text-orange-400", dot: "bg-orange-500", countKey: "nasa" },
];

export default function LayerControls({ layers, onToggle, apiStatus, counts }: LayerControlsProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700/60 rounded shadow-xl max-w-[180px] sm:max-w-[200px]">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span className="tracking-widest font-bold">MAP LAYERS</span>
        <span className="text-slate-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {LAYER_CONFIG.map(({ key, label, color, dot, countKey }) => {
            const active = layers[key];
            const status = apiStatus[key];
            return (
              <label key={key} className="flex items-center gap-2 cursor-pointer group py-0.5">
                {/* Toggle switch */}
                <div
                  className={`w-8 h-4 rounded-full relative transition-all flex-shrink-0 ${active ? "bg-slate-600" : "bg-slate-800"}`}
                  onClick={() => onToggle(key)}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${active ? "left-4 " + dot : "left-0.5 bg-slate-600"}`} />
                </div>
                <span className={`text-[10px] tracking-wider flex-1 ${active ? color : "text-slate-600"}`}>{label}</span>
                <span className="text-[10px] text-slate-600 font-mono min-w-[1.5rem] text-right">
                  {status === 'loading' ? (
                    <span className="inline-block w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                  ) : (counts[countKey] || '')}
                </span>
                {status === 'error' && <span className="text-red-500 text-[8px]">ERR</span>}
              </label>
            );
          })}

          {/* Conflict severity legend */}
          <div className="border-t border-slate-700/60 pt-2 mt-1 space-y-1">
            <div className="text-[9px] text-slate-600 tracking-widest font-bold">SEVERITY</div>
            {[
              { level: 5, label: "CRITICAL", color: "bg-red-600" },
              { level: 4, label: "HIGH", color: "bg-orange-600" },
              { level: 3, label: "MODERATE", color: "bg-amber-600" },
              { level: 2, label: "LOW", color: "bg-lime-600" },
            ].map(({ level, label, color }) => (
              <div key={level} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`}></div>
                <span className="text-[9px] text-slate-500">{level} – {label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
