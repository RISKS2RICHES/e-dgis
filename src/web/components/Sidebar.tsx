import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const NAV = [
  { path: "/", label: "OPERATIONS MAP", icon: "◉", shortLabel: "MAP" },
  { path: "/monitor", label: "CONFLICT MONITOR", icon: "◈", shortLabel: "MONITOR" },
  { path: "/history", label: "HISTORICAL DATA", icon: "◷", shortLabel: "HISTORY" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sidebar]') && !target.closest('[data-hamburger]')) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [mobileOpen]);

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <nav className={`py-3 space-y-1 px-2 ${isMobile ? 'flex-1' : 'flex-1'}`}>
        {NAV.map((item) => {
          const active = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div onClick={() => isMobile && setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded cursor-pointer transition-all ${isMobile ? 'text-sm' : 'text-xs'} ${
                  active
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                }`}>
                <span className={`${isMobile ? 'text-lg' : 'text-sm'} shrink-0`}>{item.icon}</span>
                {(isMobile || !collapsed) && (
                  <span className="tracking-wider truncate">{isMobile ? item.label : item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-slate-700/60 p-3 space-y-2`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
          {(isMobile || !collapsed) && <span className="text-green-400 text-[10px] tracking-widest">SYSTEMS ONLINE</span>}
        </div>
        {(isMobile || !collapsed) && (
          <div className="text-slate-500 text-[10px] font-mono">
            {time.toUTCString().split(' ').slice(0, 5).join(' ')}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── MOBILE HAMBURGER BUTTON (only visible on mobile) ── */}
      <button
        data-hamburger
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-2 left-2 z-50 bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── MOBILE SLIDE-IN DRAWER ── */}
      <div
        data-sidebar
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-700/60 flex flex-col z-50 transition-transform duration-300 shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile header */}
        <div className="border-b border-slate-700/60 p-4 flex items-center justify-between">
          <div>
            <div className="text-blue-400 font-bold text-lg tracking-widest">E-DGIS</div>
            <div className="text-slate-500 text-xs tracking-widest">INTEL SYSTEM v1.0</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-500 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <NavContent isMobile={true} />
      </div>

      {/* ── DESKTOP SIDEBAR ── */}
      <div className={`hidden md:flex ${collapsed ? "w-12" : "w-56"} bg-slate-900 border-r border-slate-700/60 flex-col transition-all duration-200 shrink-0`}>
        {/* Desktop header */}
        <div className="border-b border-slate-700/60 p-3 flex items-center justify-between">
          {!collapsed && (
            <div>
              <div className="text-blue-400 font-bold text-sm tracking-widest">E-DGIS</div>
              <div className="text-slate-500 text-[10px] tracking-widest">INTEL SYSTEM v1.0</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 hover:text-slate-300 text-xs p-1 ml-auto"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "▶" : "◀"}
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-1 px-2">
          {NAV.map((item) => {
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-all text-xs ${
                  active
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                }`}>
                  <span className="text-sm shrink-0">{item.icon}</span>
                  {!collapsed && <span className="tracking-wider truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700/60 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
            {!collapsed && <span className="text-green-400 text-[10px] tracking-widest">ONLINE</span>}
          </div>
          {!collapsed && (
            <div className="text-slate-500 text-[10px] font-mono">
              {time.toUTCString().split(' ').slice(0, 5).join(' ')}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
