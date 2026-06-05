/* desktop.jsx — DesktopShell. Exposes window.DesktopShell */
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;
  const { labelOf } = window.PanelData;

  function useClickOutside(ref, onOut, active) {
    useEffect(() => {
      if (!active) return;
      function h(e) { if (ref.current && !ref.current.contains(e.target)) onOut(); }
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [active]);
  }

  function RegionControl({ role, regions, regionId, onRegion }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useClickOutside(ref, () => setOpen(false), open);
    const current = regions.find((r) => r.id === regionId) || regions[0];

    if (role === "gerente") {
      return (
        <div className="region-fixed">
          <Icon name="pin" />
          <span className="label-strong">{current.name}</span>
          <span className="pin-pill">tu región</span>
        </div>
      );
    }
    if (role === "vendedor") {
      return (
        <div className="region-fixed">
          <Icon name="pin" />
          <span className="label-strong">{current.name}</span>
        </div>
      );
    }
    // superadmin → selector
    return (
      <div className="region" ref={ref}>
        <button className="region-btn" data-open={open} onClick={() => setOpen((v) => !v)}>
          <Icon name={current.id === "all" ? "globe" : "pin"} />
          <span className="label-strong">{current.name}</span>
          <Icon name="chevronDown" className="ic chev" />
        </button>
        {open && (
          <div className="region-menu fade-in">
            <div className="rm-head">Ámbito de la plataforma</div>
            {regions.map((r, i) => (
              <React.Fragment key={r.id}>
                {i === 1 && <div className="region-sep" />}
                <button className="region-item" data-sel={r.id === regionId}
                  onClick={() => { onRegion(r.id); setOpen(false); }}>
                  <Icon name={r.id === "all" ? "globe" : "pin"} className="ic" strokeWidth={1.6}
                    style={{ width: 16, height: 16, color: "var(--text-3)" }} />
                  <span className="ri-main">
                    <span>{r.name}</span>
                    <span className="ri-sub">{r.sub}</span>
                  </span>
                  <Icon name="check" className="ic check" />
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  }

  function NotifBell({ notif }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useClickOutside(ref, () => setOpen(false), open);
    if (!notif) return null;
    return (
      <div className="region" ref={ref} style={{ position: "relative" }}>
        <button className="icon-action" onClick={() => setOpen((v) => !v)} aria-label="Pendientes por resolver">
          <Icon name="inbox" />
          {notif.count > 0 && <span className="badge">{notif.count > 9 ? "9+" : notif.count}</span>}
        </button>
        {open && (
          <div className="region-menu fade-in" style={{ width: 312 }}>
            <div className="rm-head" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Pendientes por resolver</span><span>{notif.count}</span>
            </div>
            {notif.items.map((n, i) => (
              <button className="region-item" key={i} style={{ alignItems: "flex-start" }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand-weak)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", flex: "none", marginTop: 1 }}>
                  <Icon name={n.icon} style={{ width: 15, height: 15 }} />
                </span>
                <span className="ri-main">
                  <span style={{ fontWeight: 500 }}>{n.t}</span>
                  <span className="ri-sub">{n.s}</span>
                </span>
                <Icon name="chevronRight" style={{ width: 15, height: 15, color: "var(--text-4)", flex: "none", marginTop: 6 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function DesktopShell(props) {
    const {
      role, user, regions, regionId, onRegion, groups,
      activeSection, onSelect, activeStyle, density, showGroups,
      theme, logoLight, logoDark, notif, onToggleTheme, variant = "classic",
    } = props;
    const logo = theme === "dark" ? logoDark : logoLight;
    // Inset header is black in both themes → always use the dark-surface logo there.
    const sideLogo = variant === "inset" ? logoDark : logo;
    const active = groups.flatMap((g) => g.items).find((i) => i.id === activeSection);
    const activeLabel = active ? labelOf(active, role) : null;
    const scope = active ? subFor(active.id, role, regions, regionId) : null;

    return (
      <div className="app-desktop" data-variant={variant}>
        <header className="app-header">
          <div className="brand-lockup">
            <img src={logo} alt="AnunciaYA" />
            <span className="divider-v"></span>
            <span className="panel-tag">Panel de Administradores</span>
          </div>
          <div className="header-context">
            {active && <span className="hc-icon"><Icon name={active.icon} /></span>}
            <span className="hc-title">{activeLabel || "Inicio"}</span>
            {scope && <span className="hc-scope">{scope}</span>}
          </div>
          <div className="header-spacer" />
          <RegionControl role={role} regions={regions} regionId={regionId} onRegion={onRegion} />
          <div className="divider-v" />
          <div className="header-tools">
            <button className="icon-action" aria-label="Buscar"><Icon name="search" /></button>
            <button className="icon-action" aria-label="Cambiar tema" onClick={onToggleTheme}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <NotifBell notif={notif} />
            <div className="divider-v" />
            <div className="user-chip">
              <span className="avatar" style={{ background: user.color }}>{user.initials}</span>
              <span className="user-meta">
                <span className="name">{user.name}</span>
                <span className="role">{user.role}</span>
              </span>
              <span className="role-tag">{roleTag(role)}</span>
            </div>
          </div>
        </header>

        <aside className="app-side" data-active-style={activeStyle} data-density={density}>
          <div className="side-brand">
            <img src={sideLogo} alt="AnunciaYA" />
            <span className="divider-v"></span>
            <span className="panel-tag">Panel de Administradores</span>
          </div>
          <nav className="side-scroll">
            {groups.map((g) => (
              <div className="nav-group" key={g.id}>
                {showGroups && <div className="nav-group-label">{g.label}</div>}
                {g.items.map((it) => {
                  const isActive = it.id === activeSection;
                  const count = it.count && it.count[role];
                  return (
                    <button key={it.id} className="nav-item" data-active={isActive}
                      onClick={() => onSelect(it.id)}>
                      <Icon name={it.icon} />
                      <span className="nav-label">{labelOf(it, role)}</span>
                      {count ? <span className="nav-count">{count}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="side-foot">
            <div className="side-user">
              <span className="avatar" style={{ background: user.color }}>{user.initials}</span>
              <span className="user-meta">
                <span className="name">{user.name}</span>
                <span className="role">{user.role}</span>
              </span>
              <span className="role-tag">{roleTag(role)}</span>
            </div>
            <span className="help"><Icon name="help" /> Centro de ayuda</span>
          </div>
        </aside>

        <main className="app-main">
          {!active ? (
            <div className="placeholder fade-in">
              <span className="ph-icon"><Icon name="layers" /></span>
              <h3>Selecciona una sección</h3>
              <p>Elige una opción del menú de la izquierda para empezar a trabajar en el panel.</p>
              <span className="ph-tag">contenido por diseñar</span>
            </div>
          ) : (
            <>
              <div className="content-head fade-in">
                <div>
                  <div className="ch-title">{activeLabel}</div>
                  <div className="ch-sub">{subFor(active.id, role, regions, regionId)}</div>
                </div>
                <button className="btn-primary"><Icon name="dot" style={{ width: 8, height: 8 }} /> Acción principal</button>
              </div>
              <div className="placeholder fade-in">
                <span className="ph-icon"><Icon name={active.icon} /></span>
                <h3>{activeLabel}</h3>
                <p>El contenido de esta sección se diseñará por separado. Este es el armazón del panel.</p>
                <span className="ph-tag">sección · contenido por diseñar</span>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  function roleTag(role) {
    return role === "super" ? "SuperAdmin" : role === "gerente" ? "Gerente" : "Vendedor";
  }
  function subFor(id, role, regions, regionId) {
    const reg = regions.find((r) => r.id === regionId);
    const scope = role === "super"
      ? (regionId === "all" ? "Toda la plataforma" : reg.name)
      : reg.name;
    return scope;
  }

  window.DesktopShell = DesktopShell;
})();
