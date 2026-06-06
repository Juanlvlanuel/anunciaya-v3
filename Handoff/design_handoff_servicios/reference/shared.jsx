/* Shared building blocks for Servicios screens */

const sky = {
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  100: '#e0f2fe',
  50: '#f0f9ff',
  400: '#38bdf8',
  200: '#bae6fd',
};

/* --------------------------- Icons (lucide-style) -------------------------- */
const Ico = ({ d, size = 16, stroke = 1.75, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {d}
  </svg>
);
const I = {
  chevL: (p) => <Ico {...p} d={<polyline points="15 18 9 12 15 6" />} />,
  chevR: (p) => <Ico {...p} d={<polyline points="9 18 15 12 9 6" />} />,
  chevD: (p) => <Ico {...p} d={<polyline points="6 9 12 15 18 9" />} />,
  search: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      }
    />
  ),
  pin: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </>
      }
    />
  ),
  bell: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
      }
    />
  ),
  chat: (p) => (
    <Ico
      {...p}
      d={
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      }
    />
  ),
  briefcase: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </>
      }
    />
  ),
  store: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M3 7l1.5-3h15L21 7" />
          <path d="M3 7v13h18V7" />
          <path d="M3 7h18" />
        </>
      }
    />
  ),
  tag: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <circle cx="7" cy="7" r="1.2" />
        </>
      }
    />
  ),
  cart: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
        </>
      }
    />
  ),
  tool: (p) => (
    <Ico
      {...p}
      d={
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-7 7a2 2 0 1 0 2.8 2.8l7-7a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.1-.6-.6-2.1z" />
      }
    />
  ),
  arrowR: (p) => (
    <Ico
      {...p}
      d={
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      }
    />
  ),
  plus: (p) => (
    <Ico
      {...p}
      d={
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      }
    />
  ),
  heart: (p) => (
    <Ico
      {...p}
      d={
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      }
    />
  ),
  share: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </>
      }
    />
  ),
  star: (p) => (
    <Ico
      {...p}
      d={
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      }
    />
  ),
  check: (p) => <Ico {...p} d={<polyline points="20 6 9 17 4 12" />} />,
  shield: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </>
      }
    />
  ),
  clock: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </>
      }
    />
  ),
  calendar: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </>
      }
    />
  ),
  user: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      }
    />
  ),
  whatsapp: (p) => (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1c-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1s0-.4.1-.6c.1-.1.3-.3.4-.5l.3-.4c.1-.2.1-.3 0-.4 0-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3 2 3.1 4.9 4.4c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4 0-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.4 1.3 4.8L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  ),
  hand: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M9 11V6a2 2 0 1 1 4 0v5" />
          <path d="M13 11V4a2 2 0 1 1 4 0v9" />
          <path d="M17 13V7a2 2 0 1 1 4 0v9a8 8 0 0 1-8 8H8a6 6 0 0 1-6-6v-2l4 1V11a2 2 0 1 1 4 0v3" />
        </>
      }
    />
  ),
  send: (p) => (
    <Ico
      {...p}
      d={
        <>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </>
      }
    />
  ),
  filter: (p) => (
    <Ico
      {...p}
      d={
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      }
    />
  ),
  camera: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </>
      }
    />
  ),
  image: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </>
      }
    />
  ),
  globe: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
        </>
      }
    />
  ),
  x: (p) => (
    <Ico
      {...p}
      d={
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      }
    />
  ),
  trending: (p) => (
    <Ico
      {...p}
      d={
        <>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </>
      }
    />
  ),
  history: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <polyline points="3 3 3 8 8 8" />
          <polyline points="12 7 12 12 15 14" />
        </>
      }
    />
  ),
  alert: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </>
      }
    />
  ),
  pause: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </>
      }
    />
  ),
};
window.I = I;

/* --------------------------- Global navbar -------------------------------- */
function GlobalNavbar({ width = 1440, scope = 'servicios' }) {
  return (
    <div
      style={{ width }}
      className="flex items-center gap-3 bg-blue-600 px-6 py-3 text-white"
    >
      <div className="flex items-center gap-2 mr-2">
        <div className="w-9 h-9 rounded-full bg-white grid place-items-center text-blue-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 12h2"/><path d="M9 9h6"/><path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7l-4 4V8a2 2 0 0 1 2-2z"/></svg>
        </div>
        <div className="leading-tight">
          <div className="text-base font-extrabold tracking-tight">
            Anuncia<span className="text-red-400">YA</span>
          </div>
          <div className="text-[10px] font-medium text-blue-100/90 -mt-0.5">Tu Comunidad Local</div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-sm font-medium">
        <I.pin size={15} />
        <span>Puerto Peñasco, Sonora</span>
        <I.chevD size={14} />
      </div>
      <div className="flex-1 max-w-md mx-auto relative">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 text-slate-400">
          <I.search size={16} />
          <span className="text-sm font-medium">Buscar servicios…</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <NavPill icon={<I.store size={14} />} label="Negocios" />
        <NavPill icon={<I.tag size={14} />} label="Ofertas" />
        <NavPill icon={<I.cart size={14} />} label="Marketplace" />
        <NavPill icon={<I.tool size={14} />} label="Servicios" active />
      </div>
      <div className="ml-2 flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-white/15 grid place-items-center"><I.chat size={16} /></button>
        <button className="w-9 h-9 rounded-full bg-white/15 grid place-items-center"><I.bell size={16} /></button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 grid place-items-center text-sm font-bold">I</div>
      </div>
    </div>
  );
}
function NavPill({ icon, label, active }) {
  return (
    <div
      className={
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ' +
        (active ? 'bg-white text-blue-600 shadow-sm' : 'bg-white/15 text-white')
      }
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
window.GlobalNavbar = GlobalNavbar;

/* --------------------------- Mobile global navbar ------------------------- */
function MobileNavbar({ width = 375 }) {
  return (
    <div style={{ width }} className="bg-blue-600 text-white">
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-2">
        <div className="w-7 h-7 rounded-full bg-white grid place-items-center text-blue-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7l-4 4V8a2 2 0 0 1 2-2z"/></svg>
        </div>
        <div className="text-[15px] font-extrabold tracking-tight">Anuncia<span className="text-red-400">YA</span></div>
        <div className="ml-auto flex items-center gap-1">
          <button className="w-8 h-8 rounded-full bg-white/15 grid place-items-center"><I.chat size={14} /></button>
          <button className="w-8 h-8 rounded-full bg-white/15 grid place-items-center"><I.bell size={14} /></button>
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 text-xs font-medium">
          <I.pin size={12} />
          <span>Peñasco</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-white/95 text-slate-400">
          <I.search size={14} />
          <span className="text-[13px] font-medium">Buscar servicios…</span>
        </div>
      </div>
    </div>
  );
}
window.MobileNavbar = MobileNavbar;

/* --------------------------- Dark section header -------------------------- */
function ServiciosHeaderMobile({ subtitle = 'Encuentra personas que ayudan' }) {
  const parts = subtitle.split('personas');
  return (
    <div className="relative bg-black overflow-hidden">
      <div className="absolute inset-0 ay-grid opacity-90"></div>
      <div className="absolute inset-0 ay-glow-sm"></div>
      <div className="relative px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button className="text-slate-300"><I.chevL size={22} /></button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 grid place-items-center shadow-md shadow-sky-500/30">
            <I.tool size={20} className="text-white" />
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            Servi<span className="text-sky-400">cios</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/70"></div>
          <div className="text-[11px] tracking-[0.18em] uppercase font-semibold text-slate-300">
            {parts[0]}<span className="text-sky-400">personas</span>{parts[1]}
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/70"></div>
        </div>
      </div>
    </div>
  );
}
window.ServiciosHeaderMobile = ServiciosHeaderMobile;

function ServiciosHeaderDesktop({ children, subtitle = 'Encuentra personas que ayudan' }) {
  const parts = subtitle.split('personas');
  return (
    <div className="relative bg-black overflow-hidden">
      <div className="absolute inset-0 ay-grid"></div>
      <div className="absolute inset-0 ay-glow"></div>
      <div className="relative px-8 py-5 flex items-center gap-6">
        <button className="text-slate-300"><I.chevL size={22} /></button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 grid place-items-center shadow-md shadow-sky-500/30">
            <I.tool size={22} className="text-white" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white">
            Servi<span className="text-sky-400">cios</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center gap-3 max-w-md">
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-sky-500/70"></div>
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-slate-300 whitespace-nowrap">
            {parts[0]}<span className="text-sky-400">personas</span>{parts[1]}
          </div>
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-sky-500/70"></div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
window.ServiciosHeaderDesktop = ServiciosHeaderDesktop;

/* --------------------------- Toggle Ofrezco/Solicito ----------------------- */
function OfreceToggle({ value, onChange, embedded = false }) {
  const items = [
    { key: 'ofrezco', label: 'Ofrezco', icon: <I.hand size={16} /> },
    { key: 'solicito', label: 'Solicito', icon: <I.search size={15} /> },
  ];
  if (embedded) {
    return (
      <div className="inline-flex p-1 rounded-full bg-white/10 backdrop-blur border border-white/10">
        {items.map((it) => {
          const active = (value || 'ofrezco') === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange && onChange(it.key)}
              className={
                'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition ' +
                (active
                  ? 'bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40'
                  : 'text-slate-200 hover:text-white')
              }
            >
              {it.icon}
              {it.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
      {items.map((it) => {
        const active = (value || 'ofrezco') === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onChange && onChange(it.key)}
            className={
              'flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-semibold transition ' +
              (active
                ? 'bg-gradient-to-b from-sky-600 to-sky-700 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-600')
            }
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
window.OfreceToggle = OfreceToggle;

/* --------------------------- Chip ----------------------------------------- */
function Chip({ active, children, icon, onClick, dot, removable }) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition border-2 whitespace-nowrap ' +
        (active
          ? 'bg-sky-100 border-sky-500 text-sky-700'
          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400')
      }
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>}
      {icon}
      <span>{children}</span>
      {removable && <I.x size={12} className="ml-0.5 opacity-70" />}
    </button>
  );
}
window.Chip = Chip;

/* --------------------------- Cards ---------------------------------------- */
function CardServicio({ photo = 'sun', avatar = 'JR', name = 'Javier R.', title = 'Plomería residencial 24 horas', price = '$350/hora', modalidad = 'Presencial', dist = '1.2 km · hace 4h' }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md">
      <div className="aspect-[4/3] relative stripe-bg">
        <PhotoPlaceholder kind={photo} />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          Servicio
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 grid place-items-center text-[9px] font-bold text-white">
            {avatar}
          </div>
          <span className="text-[11px] font-semibold text-slate-600">{name}</span>
        </div>
        <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">{title}</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[15px] font-extrabold text-slate-900">{price}</span>
          <span className="text-[11px] font-semibold text-slate-500">· {modalidad}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <I.pin size={11} /> {dist}
        </div>
      </div>
    </div>
  );
}
window.CardServicio = CardServicio;

function CardVacante({ logo = 'RA', empresa = 'Restaurante Aurora', title = 'Mesero(a) turno noche', salario = '$8,500 / mes', zona = 'Centro · Tiempo completo' }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-sky-200 shadow-md">
      <div className="bg-sky-50 px-3 py-4 flex flex-col items-center relative">
        <div className="w-12 h-12 rounded-xl bg-white border border-sky-100 grid place-items-center text-sky-700 font-extrabold text-base shadow-sm">
          {logo}
        </div>
        <div className="mt-1.5 text-[11px] font-semibold text-slate-700">{empresa}</div>
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-600 text-white text-[9px] font-bold">
          <I.check size={9} stroke={3} /> Verificado
        </div>
      </div>
      <div className="p-3">
        <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">{title}</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[15px] font-extrabold text-slate-900">{salario}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wider">
            <I.briefcase size={10} /> Vacante
          </span>
          <span className="text-[11px] font-medium text-slate-500">{zona}</span>
        </div>
      </div>
    </div>
  );
}
window.CardVacante = CardVacante;

function CardSolicito({ icon = 'tool', title = 'Busco: electricista', presupuesto = '$500–$800', zona = 'Las Conchas', who = 'María G.', time = 'hace 2h' }) {
  const iconMap = {
    tool: <I.tool size={26} />,
    briefcase: <I.briefcase size={26} />,
    image: <I.image size={26} />,
    user: <I.user size={26} />,
  };
  return (
    <div className="rounded-2xl overflow-hidden bg-amber-50/70 border border-amber-200/70 shadow-md">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 grid place-items-center text-amber-700 shrink-0">
            {iconMap[icon] || iconMap.tool}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
              Solicito
            </span>
            <div className="mt-1 text-[14px] font-bold text-slate-900 leading-snug truncate">{title}</div>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-700">Presupuesto {presupuesto}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1"><I.user size={11} /> {who}</span>
          <span className="flex items-center gap-1"><I.pin size={11} /> {zona} · {time}</span>
        </div>
      </div>
    </div>
  );
}
window.CardSolicito = CardSolicito;

function CardHorizontal({ photo = 'sun', title = 'Diseño gráfico para negocios', price = '$450', meta = 'Remoto · hace 1h' }) {
  return (
    <div className="w-[220px] rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md shrink-0">
      <div className="aspect-[4/3] relative stripe-bg">
        <PhotoPlaceholder kind={photo} compact />
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-slate-900 leading-snug truncate">{title}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[14px] font-extrabold text-slate-900">{price}</span>
          <span className="text-[10px] font-medium text-slate-500">{meta}</span>
        </div>
      </div>
    </div>
  );
}
window.CardHorizontal = CardHorizontal;

/* Placeholder imagery — striped + mono label */
function PhotoPlaceholder({ kind = 'sun', compact = false, label }) {
  const labelMap = {
    sun: 'foto del trabajo',
    paint: 'foto / portafolio',
    wrench: 'foto / herramientas',
    cake: 'foto / producto',
    code: 'foto / pantalla',
    cam: 'foto / sesión',
    food: 'foto / platillo',
    car: 'foto / vehículo',
  };
  return (
    <>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">
          {label || labelMap[kind] || 'foto'}
        </div>
      </div>
    </>
  );
}
window.PhotoPlaceholder = PhotoPlaceholder;

/* --------------------------- FAB ------------------------------------------ */
function FAB({ label = 'Publicar', inline = false }) {
  return (
    <div className={inline ? '' : 'absolute right-4 bottom-20 z-30'}>
      <button className="flex items-center gap-2 pl-3 pr-5 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40 font-semibold">
        <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center">
          <I.plus size={16} />
        </span>
        {label}
      </button>
    </div>
  );
}
window.FAB = FAB;

/* --------------------------- BottomNav ------------------------------------ */
function BottomNav() {
  const items = [
    { i: <I.store size={18} />, l: 'Negocios' },
    { i: <I.tag size={18} />, l: 'Ofertas' },
    { i: <I.cart size={18} />, l: 'MarketPlace' },
    { i: <I.tool size={18} />, l: 'Servicios', active: true },
    { i: <I.user size={18} />, l: 'Yo' },
  ];
  return (
    <div className="border-t border-slate-200 bg-white px-2 py-1.5 flex items-center justify-between">
      {items.map((it, k) => (
        <div
          key={k}
          className={
            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ' +
            (it.active ? 'text-sky-600' : 'text-slate-500')
          }
        >
          <div className={it.active ? 'text-sky-600' : ''}>{it.i}</div>
          <span className="text-[10px] font-semibold">{it.l}</span>
        </div>
      ))}
    </div>
  );
}
window.BottomNav = BottomNav;

/* --------------------------- Section title (annotation) -------------------- */
function Note({ children }) {
  return (
    <div className="absolute -right-3 top-3 translate-x-full max-w-[200px] z-20 text-[11px] leading-snug text-slate-500 bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
      {children}
    </div>
  );
}
window.Note = Note;
