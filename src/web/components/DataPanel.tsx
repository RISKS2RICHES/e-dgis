import { useState, useEffect } from "react";

interface DataPanelProps {
  type: string;
  data: any;
  onClose: () => void;
}

export default function DataPanel({ type, data, onClose }: DataPanelProps) {
  const [conflictDetail, setConflictDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (type === "conflict" && data?.id) {
      setConflictDetail(null);
      setLoadingDetail(true);
      fetch(`/api/conflict-detail/${data.id}`)
        .then(r => r.json())
        .then(d => { setConflictDetail(d); setLoadingDetail(false); })
        .catch(() => setLoadingDetail(false));
    }
  }, [type, data?.id]);

  const TITLES: Record<string, string> = {
    flight: "AIRCRAFT DETAIL",
    vessel: "VESSEL DETAIL",
    conflict: "CONFLICT ZONE",
    satellite: "SATELLITE",
    traffic: "TRAFFIC / CAMERA",
    nasa: "NASA EARTH EVENT",
  };

  const SEVERITY_COLOR: Record<number, string> = {
    5: "text-red-400 border-red-600",
    4: "text-orange-400 border-orange-600",
    3: "text-amber-400 border-amber-600",
    2: "text-lime-400 border-lime-600",
    1: "text-green-400 border-green-600",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800 shrink-0">
        <div>
          <div className="text-[10px] text-slate-500 tracking-widest">{TITLES[type] || type.toUpperCase()}</div>
          {type === "conflict" && <div className="text-white font-bold text-sm mt-0.5">{data.name || data.zone}</div>}
          {type === "flight" && <div className="text-blue-300 font-bold text-sm mt-0.5">{data.callsign || data.icao24 || "Unknown"}</div>}
          {type === "vessel" && <div className="text-cyan-300 font-bold text-sm mt-0.5">{data.name || data.mmsi || "Unknown"}</div>}
          {type === "satellite" && <div className="text-purple-300 font-bold text-sm mt-0.5">{data.name || data.norad}</div>}
          {type === "traffic" && <div className="text-yellow-300 font-bold text-sm mt-0.5">{data.name || data.type || "Incident"}</div>}
          {type === "nasa" && <div className="text-orange-300 font-bold text-sm mt-0.5">{data.title || "Event"}</div>}
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none p-1 ml-4">×</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {type === "flight" && <FlightDetail data={data} />}
        {type === "vessel" && <VesselDetail data={data} />}
        {type === "satellite" && <SatelliteDetail data={data} />}
        {type === "traffic" && <TrafficDetail data={data} />}
        {type === "nasa" && <NasaDetail data={data} />}
        {type === "conflict" && (
          <ConflictDetail
            data={data}
            detail={conflictDetail}
            loading={loadingDetail}
            severityColor={SEVERITY_COLOR[data.severity] || "text-slate-400 border-slate-600"}
          />
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-slate-800">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 text-right font-mono">{String(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] text-slate-500 tracking-widest mb-2 font-bold border-b border-slate-700/60 pb-1">{title}</div>
      {children}
    </div>
  );
}

function FlightDetail({ data }: { data: any }) {
  const alt = data.alt ?? data.altitude;
  const spd = data.spd ?? data.speed;
  const hdg = data.hdg ?? data.heading;
  const vs = data.vs ?? data.vrate;
  const airline = data.airline ?? data.operator;
  return (
    <>
      <Section title="IDENTIFICATION">
        <Row label="ICAO24" value={data.icao24} />
        <Row label="Callsign" value={data.callsign} />
        <Row label="Registration" value={data.reg ?? data.registration} />
        <Row label="Type" value={data.type} />
        <Row label="Airline" value={airline} />
        <Row label="Flag" value={data.flag} />
      </Section>
      <Section title="POSITION">
        <Row label="Latitude" value={data.lat?.toFixed?.(5)} />
        <Row label="Longitude" value={data.lon?.toFixed?.(5)} />
        <Row label="Altitude" value={alt ? `${alt} ft` : null} />
        <Row label="Speed" value={spd ? `${spd} kts` : null} />
        <Row label="Heading" value={hdg ? `${hdg}°` : null} />
        <Row label="V/S" value={vs ? `${vs} ft/min` : null} />
        <Row label="Squawk" value={data.squawk} />
        <Row label="Source" value={data.source} />
      </Section>
      <Section title="ROUTE">
        <Row label="Origin" value={data.from} />
        <Row label="Destination" value={data.to} />
      </Section>
    </>
  );
}

function VesselDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="IDENTIFICATION">
        <Row label="MMSI" value={data.mmsi} />
        <Row label="Name" value={data.name} />
        <Row label="IMO" value={data.imo} />
        <Row label="Callsign" value={data.callsign} />
        <Row label="Type" value={data.type} />
        <Row label="Flag" value={data.flag} />
      </Section>
      <Section title="NAVIGATION">
        <Row label="Latitude" value={data.lat?.toFixed?.(5)} />
        <Row label="Longitude" value={data.lon?.toFixed?.(5)} />
        <Row label="Speed" value={data.sog ? `${data.sog} kn` : null} />
        <Row label="Course" value={data.cog ? `${data.cog}°` : null} />
        <Row label="Heading" value={data.heading ? `${data.heading}°` : null} />
        <Row label="Status" value={data.status} />
      </Section>
    </>
  );
}

function SatelliteDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="IDENTIFICATION">
        <Row label="Name" value={data.name} />
        <Row label="NORAD ID" value={data.norad} />
        <Row label="Intl. Desig." value={data.intldes} />
      </Section>
      <Section title="ORBITAL POSITION">
        <Row label="Latitude" value={data.lat?.toFixed?.(4)} />
        <Row label="Longitude" value={data.lon?.toFixed?.(4)} />
        <Row label="Altitude" value={data.alt ? `${Math.round(data.alt)} km` : null} />
        <Row label="Velocity" value={data.vel ? `${Math.round(data.vel)} km/s` : null} />
        <Row label="Inclination" value={data.inc ? `${data.inc?.toFixed?.(2)}°` : null} />
        <Row label="Period" value={data.period ? `${data.period?.toFixed?.(1)} min` : null} />
      </Section>
    </>
  );
}

function TrafficDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="INCIDENT / CAMERA">
        <Row label="ID" value={data.id} />
        <Row label="Type" value={data.type} />
        <Row label="Severity" value={data.severity} />
        <Row label="Road" value={data.road} />
        <Row label="Latitude" value={data.lat?.toFixed?.(5)} />
        <Row label="Longitude" value={data.lon?.toFixed?.(5)} />
        <Row label="Start" value={data.start?.substring(0, 19)} />
        <Row label="End" value={data.end?.substring(0, 19)} />
      </Section>
      {data.desc && (
        <div className="bg-slate-800 rounded p-3">
          <div className="text-[9px] text-slate-500 tracking-widest mb-1">DESCRIPTION</div>
          <p className="text-slate-300 leading-relaxed">{data.desc}</p>
        </div>
      )}
      {data.imageUrl && (
        <div>
          <div className="text-[9px] text-slate-500 tracking-widest mb-1">LIVE CAMERA</div>
          <img src={data.imageUrl} alt="Traffic cam" className="w-full rounded border border-slate-700" />
        </div>
      )}
    </>
  );
}

function NasaDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="EARTH EVENT">
        <Row label="ID" value={data.id} />
        <Row label="Title" value={data.title} />
        <Row label="Category" value={data.category} />
        <Row label="Latitude" value={data.lat?.toFixed?.(4)} />
        <Row label="Longitude" value={data.lon?.toFixed?.(4)} />
        <Row label="Date" value={data.date?.substring?.(0, 10)} />
        <Row label="Status" value={data.closed ? "Closed" : "Open"} />
      </Section>
    </>
  );
}

function NewsCard({ n, i }: { n: any; i: number }) {
  return (
    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
      className="block bg-slate-800 hover:bg-slate-700 rounded p-2.5 transition-colors cursor-pointer border border-slate-700/40 hover:border-slate-600">
      <div className="text-slate-200 font-semibold text-[11px] mb-1 leading-tight">{n.title}</div>
      <div className="text-slate-500 text-[9px] tracking-wide">{n.source} · {n.date ? new Date(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
      {n.excerpt && <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed line-clamp-3">{n.excerpt}</p>}
    </a>
  );
}

function ConflictDetail({ data, detail, loading, severityColor }: { data: any; detail: any; loading: boolean; severityColor: string }) {
  const [tab, setTab] = useState<"overview" | "intel" | "news" | "videos">("overview");

  const TABS = [
    { id: "overview", label: "OVERVIEW" },
    { id: "intel", label: "INTEL" },
    { id: "news", label: "NEWS" },
    { id: "videos", label: "VIDEO" },
  ] as const;

  const newsItems = detail?.news || [];
  // Separate Google News from Reliefweb by checking if source is 'Reliefweb'
  const intelItems = newsItems.filter((n: any) => !n.id?.toString().startsWith('gn_'));
  const gnItems = newsItems.filter((n: any) => n.id?.toString().startsWith('gn_'));

  return (
    <div className="space-y-3">
      {/* Severity badge */}
      <div className={`border rounded p-2 text-center ${severityColor}`}>
        <div className="text-[9px] tracking-widest">THREAT LEVEL</div>
        <div className="text-2xl font-bold">{data.severity}/5</div>
        <div className="text-[9px]">{data.status}</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/60">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 py-1.5 text-[9px] tracking-widest transition-colors ${tab === t.id ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-2">
          <Row label="Zone" value={data.name} />
          <Row label="Country" value={data.country} />
          <Row label="Region" value={data.region} />
          <Row label="Type" value={data.type} />
          <Row label="Started" value={data.started} />
          <Row label="Coordinates" value={`${data.lat?.toFixed?.(4)}, ${data.lon?.toFixed?.(4)}`} />
          <div className="bg-slate-800 rounded p-3 mt-2">
            <div className="text-[9px] text-slate-500 tracking-widest mb-1">SITUATION SUMMARY</div>
            <p className="text-slate-300 leading-relaxed">{data.desc}</p>
          </div>
        </div>
      )}

      {tab === "intel" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 text-[10px]">Fetching intelligence...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-slate-800/80 rounded p-3 border border-slate-700/40">
                <div className="text-[9px] text-slate-500 tracking-widest mb-1">SITUATION ASSESSMENT</div>
                <p className="text-slate-300 leading-relaxed">{data.desc}</p>
              </div>
              {intelItems.length > 0 ? (
                <>
                  <div className="text-[9px] text-slate-500 tracking-widest pt-1">RELIEFWEB REPORTS</div>
                  {intelItems.slice(0, 5).map((n: any, i: number) => (
                    <NewsCard key={i} n={n} i={i} />
                  ))}
                </>
              ) : gnItems.length > 0 ? (
                <>
                  <div className="text-[9px] text-slate-500 tracking-widest pt-1">LATEST REPORTS</div>
                  {gnItems.slice(0, 5).map((n: any, i: number) => (
                    <NewsCard key={i} n={n} i={i} />
                  ))}
                </>
              ) : !loading ? (
                <div className="text-slate-500 text-center py-4 text-[10px]">No reports available</div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {tab === "news" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 text-[10px]">Loading news feed...</span>
            </div>
          ) : newsItems.length > 0 ? (
            <>
              <div className="text-[9px] text-slate-500 tracking-widest pb-1">
                {newsItems.length} ARTICLES · SORTED BY DATE
              </div>
              {newsItems.map((n: any, i: number) => (
                <NewsCard key={i} n={n} i={i} />
              ))}
            </>
          ) : (
            <div className="text-slate-500 text-center py-4 text-[10px]">No recent news found</div>
          )}
        </div>
      )}

      {tab === "videos" && (
        <VideoTab keyword={data.id} label={data.name} />
      )}
    </div>
  );
}

function VideoTab({ keyword, label }: { keyword: string; label: string }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const QUERY_MAP: Record<string, string> = {
    ukraine: 'ukraine russia war 2025',
    gaza: 'gaza war 2025',
    west_bank: 'west bank israel conflict',
    lebanon: 'lebanon israel war',
    syria: 'syria conflict 2025',
    yemen: 'yemen houthi war',
    sudan: 'sudan civil war',
    myanmar: 'myanmar war junta',
    drc_east: 'DRC congo war M23',
    somalia: 'somalia al-shabaab',
    kashmir: 'kashmir india pakistan',
    sahel_mali: 'mali sahel conflict',
    burkina_faso: 'burkina faso conflict',
    haiti: 'haiti gang violence',
    taiwan_strait: 'taiwan china military',
    south_china_sea: 'south china sea military',
  };

  const q = QUERY_MAP[keyword] || (label || keyword).replace(/_/g, ' ');

  useEffect(() => {
    setLoading(true);
    // Use YouTube RSS/search via a CORS-friendly approach
    const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=CAI%253D`; // sort by date
    
    // Fetch video IDs from YouTube search via noembed/invidious API
    const invidiousUrl = `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort_by=upload_date&page=1`;
    
    fetch(invidiousUrl, { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const vids = data.slice(0, 8).map((v: any) => ({
            id: v.videoId,
            title: v.title,
            channel: v.author,
            duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, '0')}` : '',
            published: v.published ? new Date(v.published * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            views: v.viewCount ? Intl.NumberFormat('en', { notation: 'compact' }).format(v.viewCount) : '',
            thumb: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          }));
          setVideos(vids);
        }
        setLoading(false);
      })
      .catch(() => {
        // fallback: try another invidious instance
        fetch(`https://invidious.io.lol/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort_by=upload_date`, { signal: AbortSignal.timeout(6000) })
          .then(r => r.json())
          .then((data: any[]) => {
            if (Array.isArray(data)) {
              const vids = data.slice(0, 8).map((v: any) => ({
                id: v.videoId,
                title: v.title,
                channel: v.author,
                duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, '0')}` : '',
                published: v.published ? new Date(v.published * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
                views: v.viewCount ? Intl.NumberFormat('en', { notation: 'compact' }).format(v.viewCount) : '',
                thumb: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
              }));
              setVideos(vids);
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, [q]);

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-[10px]">Loading video feed...</span>
        </div>
      ) : videos.length > 0 ? (
        <>
          <div className="text-[9px] text-slate-500 tracking-widest pb-1">
            RECENT VIDEOS · {q.toUpperCase()}
          </div>
          {videos.map((v, i) => (
            <a key={i} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
              className="flex gap-2.5 bg-slate-800 hover:bg-slate-700 rounded p-2 transition-colors border border-slate-700/40 hover:border-slate-600">
              <div className="relative shrink-0">
                <img src={v.thumb} alt="" className="w-24 h-14 object-cover rounded" />
                {v.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{v.duration}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-[10px] font-semibold leading-tight line-clamp-2">{v.title}</div>
                <div className="text-slate-500 text-[9px] mt-1">{v.channel}</div>
                <div className="text-slate-600 text-[9px]">{v.published} · {v.views} views</div>
              </div>
            </a>
          ))}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=CAI%253D`}
            target="_blank" rel="noopener noreferrer"
            className="block text-center text-[10px] text-blue-400 hover:text-blue-300 py-2 transition-colors">
            View all on YouTube →
          </a>
        </>
      ) : (
        <div className="text-center py-6">
          <div className="text-slate-500 text-[10px] mb-3">Video feed unavailable</div>
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=CAI%253D`}
            target="_blank" rel="noopener noreferrer"
            className="inline-block bg-red-900/40 border border-red-700/60 text-red-400 hover:text-red-300 text-[10px] px-3 py-1.5 rounded transition-colors">
            Search on YouTube →
          </a>
        </div>
      )}
    </div>
  );
}
