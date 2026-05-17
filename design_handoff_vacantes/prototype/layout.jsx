/* global React */

/* ============================================================
   Icons — Lucide-style minimal SVG set
   ============================================================ */
const Icon = ({ name, size = 18, stroke = 1.8 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
              stroke: 'currentColor', strokeWidth: stroke,
              strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'briefcase':  return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>;
    case 'dashboard':  return <svg {...p}><rect x="3" y="3"  width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/></svg>;
    case 'tx':         return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10s.5-2 3-2 3 1.4 3 2.5-.5 2-3 2-3 .9-3 2.5 1.5 2.5 3 2.5 3-1 3-2"/></svg>;
    case 'users':      return <svg {...p}><circle cx="9" cy="8" r="3"/><path d="M3 21c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="8.5" r="2.5"/><path d="M14 16.5c.8-.6 2-1 3-1 2.5 0 4 1.5 4 4"/></svg>;
    case 'chat':       return <svg {...p}><path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.5-.6L3 21l1.6-4.4C3.6 15.1 3 13.6 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z"/></svg>;
    case 'bell':       return <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'bag':        return <svg {...p}><path d="M5 8h14l-1.2 12a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>;
    case 'tag':        return <svg {...p}><path d="M3 13V5a2 2 0 0 1 2-2h8l8 8-9 9Z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case 'coin':       return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg>;
    case 'people':     return <svg {...p}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M15 17c.8-.5 2-1 3-1 2.5 0 4 1.5 4 4"/></svg>;
    case 'report':     return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
    case 'store':      return <svg {...p}><path d="M3 9 5 4h14l2 5v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9Z"/><path d="M4 11v9h16v-9"/></svg>;
    case 'user':       return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'eye':        return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'edit':       return <svg {...p}><path d="m4 20 4-1 11-11-3-3L5 16Z"/></svg>;
    case 'trash':      return <svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6"/></svg>;
    case 'power':      return <svg {...p}><path d="M18 7a8 8 0 1 1-12 0M12 3v9"/></svg>;
    case 'plus':       return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'search':     return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
    case 'x':          return <svg {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'check':      return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>;
    case 'chev-l':     return <svg {...p}><path d="m15 6-6 6 6 6"/></svg>;
    case 'chev-r':     return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case 'arrow':      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'whatsapp':   return <svg {...p}><path d="M3 21l1.65-4.5A8.5 8.5 0 1 1 8.5 19.5L3 21Z"/><path d="M8.5 9c.5 2 1.5 3 3.5 4 0 0 1.4-.2 2-1.5"/></svg>;
    case 'mail':       return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
    case 'phone':      return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>;
    case 'pin':        return <svg {...p}><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'clock':      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'menu':       return <svg {...p}><circle cx="12" cy="5"  r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg>;
    case 'bookmark':   return <svg {...p}><path d="M6 4h12v17l-6-4-6 4Z"/></svg>;
    case 'doc':        return <svg {...p}><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/></svg>;
    case 'send':       return <svg {...p}><path d="M3 11 22 3l-8 19-3-8Z"/></svg>;
    case 'sparkles':   return <svg {...p}><path d="M12 4 13.5 8 17.5 9.5 13.5 11 12 15 10.5 11 6.5 9.5 10.5 8Z"/><path d="M5 3v4M3 5h4M19 13v4M17 15h4"/></svg>;
    default: return null;
  }
};

/* ============================================================
   Topbar
   ============================================================ */
function Topbar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">A</span>
        <span>
          <span className="name">AnunciaYA</span>{' '}
          <span className="sub">Tu Comunidad Local…</span>
        </span>
      </div>

      <div className="biz-switcher">
        <div className="avatar">IF</div>
        <button className="nav-btn"><Icon name="chev-l" size={14} /></button>
        <div>
          <div className="name">Imprenta FindUS</div>
          <div className="branch">Matriz</div>
        </div>
        <button className="nav-btn"><Icon name="chev-r" size={14} /></button>
        <span className="count">1 de 2</span>
      </div>

      <div className="center">
        <div className="studio">
          <span className="icon"><Icon name="store" size={14} /></span>
          <span className="name">Business <span>Studio</span></span>
        </div>
        <button className="chev"><Icon name="chev-l" size={14} /></button>
        <span className="crumb">Vacantes</span>
        <button className="chev"><Icon name="chev-r" size={14} /></button>
      </div>

      <div className="right">
        <button className="vista-previa">
          <Icon name="eye" size={16} /> Vista previa
        </button>
        <button className="icon-btn"><Icon name="chat" size={18} /></button>
        <button className="icon-btn">
          <Icon name="bell" size={18} />
          <span className="badge">3</span>
        </button>
        <button className="icon-btn"><Icon name="chat" size={18} /></button>
      </div>
    </header>
  );
}

/* ============================================================
   Sidebar
   ============================================================ */
const NAV_ITEMS = [
  { id: 'dashboard', name: 'Dashboard',         icon: 'dashboard' },
  { id: 'tx',        name: 'Transacciones',     icon: 'tx' },
  { id: 'clients',   name: 'Clientes',          icon: 'users' },
  { id: 'opinions',  name: 'Opiniones',         icon: 'chat',   badge: 11 },
  { id: 'alerts',    name: 'Alertas',           icon: 'bell',   badge: 47 },
  { id: 'catalog',   name: 'Catálogo',          icon: 'bag' },
  { id: 'promos',    name: 'Promociones',       icon: 'tag' },
  { id: 'points',    name: 'Puntos y Recompensas', icon: 'coin' },
  { id: 'staff',     name: 'Empleados',         icon: 'people' },
  { id: 'vacantes',  name: 'Vacantes',          icon: 'briefcase' },
  { id: 'reports',   name: 'Reportes',          icon: 'report' },
  { id: 'branches',  name: 'Sucursales',        icon: 'store' },
  { id: 'profile',   name: 'Mi Perfil',         icon: 'user' },
];

function Sidebar({ active = 'vacantes' }) {
  return (
    <aside className="sidebar">
      <nav>
        {NAV_ITEMS.map((it) => (
          <a
            key={it.id}
            className={'nav-item' + (active === it.id ? ' active' : '')}
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <Icon name={it.icon} size={18} />
            <span>{it.name}</span>
            {it.badge && active !== it.id ? (
              <span className="badge">{it.badge}</span>
            ) : null}
            {active === it.id ? (
              <Icon name="chev-r" size={16} />
            ) : (
              !it.badge && <span className="dot" />
            )}
          </a>
        ))}
      </nav>
    </aside>
  );
}

/* ============================================================
   Shell (topbar + sidebar + main)
   ============================================================ */
function Shell({ children }) {
  return (
    <div className="app">
      <Topbar />
      <Sidebar active="vacantes" />
      <main className="main">{children}</main>
    </div>
  );
}

window.VacantesLayout = { Icon, Topbar, Sidebar, Shell };
