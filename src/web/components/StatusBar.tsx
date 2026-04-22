export default function StatusBar() {
  return (
    <div className="h-6 bg-slate-950 border-t border-slate-800 flex items-center px-4 gap-6 text-[9px] text-slate-600 shrink-0 tracking-widest">
      <span className="text-green-600">SYSTEM NOMINAL</span>
      <span>ADSB.ONE LIVE</span>
      <span>OPENSKY LIVE</span>
      <span>ACLED LIVE</span>
      <span>TFL LIVE</span>
      <span>NASA EONET LIVE</span>
      <span className="ml-auto">E-DGIS v1.0 — CLASSIFIED</span>
    </div>
  );
}
