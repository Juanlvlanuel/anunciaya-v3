import { Icon } from './icons';

/**
 * Mapa placeholder — radio aproximado sky de ~500m alrededor del punto.
 * NUNCA pin exacto (privacidad del oferente).
 * Cuando integres mapbox/leaflet/google, mantén el círculo de radio difuso y oculta el marker.
 */
export function MapPlaceholder({ small }: { small?: boolean }) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-200 ${small ? 'h-32' : 'h-44'}`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(800px 200px at 50% 50%, rgba(2,132,199,0.08), transparent 60%),
            linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 28px 28px, 28px 28px',
          backgroundColor: '#f1f5f9',
        }}
      />
      <svg viewBox="0 0 400 160" className="absolute inset-0 w-full h-full">
        <path
          d="M0 80 C 80 60, 140 100, 220 70 S 360 100, 400 80"
          stroke="#cbd5e1"
          strokeWidth="6"
          fill="none"
        />
        <path d="M120 0 L 140 160" stroke="#e2e8f0" strokeWidth="3" fill="none" />
        <path d="M260 0 L 280 160" stroke="#e2e8f0" strokeWidth="3" fill="none" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-sky-500/15 border-2 border-sky-500/40" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-600 border-2 border-white shadow" />
      <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-mono text-slate-500 bg-white/80 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
        <Icon.Pin size={10} /> radio aprox. 500 m
      </div>
    </div>
  );
}
