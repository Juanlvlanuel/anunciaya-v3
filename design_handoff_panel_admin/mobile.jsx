/* mobile.jsx — MobileShell (phone frame). Exposes window.MobileShell */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { labelOf } = window.PanelData;

  const SHORT = { resumen: "Resumen", metricas: "Métricas", negocios: "Cartera", comisiones: "Comisiones", usuarios: "Usuarios", suscripciones: "Subs", publicidad: "Ads", ciudades: "Ciudades" };

  function StatusBar() {
    return (
      <div className="statusbar">
        <span>9:41</span>
        <span className="sb-right">
          <svg className="ic" viewBox="0 0 24 24"><g fill="currentColor"><rect x="2" y="13" width="3" height="6" rx="1"/><rect x="7" y="9" width="3" height="10" rx="1"/><rect x="12" y="5" width="3" height="14" rx="1"/><rect x="17" y="2" width="3" height="17" rx="1" opacity="0.35"/></g></svg>
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2.5 9.5a14 14 0 0 1 19 0"/><path d="M5.5 13a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>
          <svg className="ic" viewBox="0 0 24 24" style={{ width: 24 }}><rect x="2" y="8" width="18" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><rect x="3.5" y="9.5" width="13" height="6" rx="1.2" fill="currentColor"/><rect x="21" y="11" width="1.6" height="3" rx="0.8" fill="currentColor" opacity="0.5"/></svg>
        </span>
      </div>
    );
  }

  function MobileShell(props) {
    const {
      role, user, regions, regionId, groups,
      activeSection, onSelect, activeStyle, theme,
      logoLight, logoDark, notif, mobileNav, onToggleTheme, variant = "classic",
    } = props;

    const [drawer, setDrawer] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    useEffect(() => { setDrawer(false); setNotifOpen(false); }, [role]);

    const logo = theme === "dark" ? logoDark : logoLight;
    // Inset mobile header is black → use the dark-surface logo there.
    const mLogo = variant === "inset" ? logoDark : logo;
    const region = regions.find((r) => r.id === regionId) || regions[0];
    const items = groups.flatMap((g) => g.items);
    const active = items.find((i) => i.id === activeSection);
    const activeLabel = active ? labelOf(active, role) : null;

    // nav mode: auto → vendedor=tabbar, otherwise drawer
    let mode = mobileNav;
    if (mode === "auto") mode = role === "vendedor" ? "tabbar" : "drawer";

    const tabItems = items.slice(0, mode === "tabbar" ? (items.length > 5 ? 4 : 5) : items.length);
    const overflow = mode === "tabbar" && items.length > 5;

    return (
      <div className="mobile-stage">
        <div className="phone">
          <div className="phone-notch" />
          <div className="phone-screen" data-variant={variant}>
            <StatusBar />

            {/* header */}
            <div className="m-header">
              {mode === "drawer" && (
                <button className="m-iconbtn" onClick={() => setDrawer(true)} aria-label="Menú" style={{ marginRight: 2 }}>
                  <Icon name="menu" />
                </button>
              )}
              <img className="m-logo" src={mLogo} alt="AnunciaYA" />
              <div className="m-spacer" />
              <button className="m-iconbtn m-iconbtn-bare" aria-label="Pendientes por resolver"
                onClick={() => setNotifOpen((v) => !v)}>
                <Icon name="inbox" />
                {notif && notif.count > 0 && <span className="badge">{notif.count > 9 ? "9+" : notif.count}</span>}
              </button>
              <span className="m-avatar" style={{ background: user.color }}>{user.initials}</span>
            </div>

            {/* pendientes dropdown */}
            {notifOpen && notif && (
              <>
                <div className="m-notif-scrim" onClick={() => setNotifOpen(false)} />
                <div className="m-notif fade-in">
                  <div className="m-notif-head"><span>Pendientes por resolver</span><span>{notif.count}</span></div>
                  {notif.items.map((n, i) => (
                    <button className="m-notif-item" key={i}>
                      <span className="mni-icon"><Icon name={n.icon} /></span>
                      <span className="mni-main">
                        <span className="mni-t">{n.t}</span>
                        <span className="mni-s">{n.s}</span>
                      </span>
                      <Icon name="chevronRight" className="mni-chev" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* sub-header: greeting + region */}
            <div className="m-subhead">
              <div className="m-greeting">Hola, <b>{user.name.split(" ")[0]}</b></div>
              <button className="m-region-pill">
                <Icon name="pin" />
                <span>{region.name}</span>
                {role === "super" && <Icon name="chevronDown" className="mrp-chev" />}
              </button>
            </div>

            {/* content */}
            <div className="m-content">
              {!active ? (
                <div className="m-placeholder fade-in">
                  <span className="ph-icon"><Icon name="layers" /></span>
                  <h3>Selecciona una sección</h3>
                  <p>Usa {mode === "tabbar" ? "la barra de abajo" : "el menú"} para empezar.</p>
                  <span className="ph-tag">contenido por diseñar</span>
                </div>
              ) : (
                <div className="m-placeholder fade-in">
                  <span className="ph-icon"><Icon name={active.icon} /></span>
                  <h3>{activeLabel}</h3>
                  <p>El contenido de esta sección se diseñará por separado. Este es el armazón móvil.</p>
                  <span className="ph-tag">sección · por diseñar</span>
                </div>
              )}
            </div>

            {/* bottom tab bar */}
            {mode === "tabbar" && (
              <div className="tabbar">
                {tabItems.map((it) => (
                  <button key={it.id} className="tab" data-active={it.id === activeSection}
                    onClick={() => onSelect(it.id)}>
                    <span className="tab-iconwrap"><Icon name={it.icon} /></span>
                    <span className="tab-label">{SHORT[it.id] || labelOf(it, role)}</span>
                  </button>
                ))}
                {overflow && (
                  <button className="tab" onClick={() => setDrawer(true)}>
                    <span className="tab-iconwrap"><Icon name="menu" /></span>
                    <span className="tab-label">Más</span>
                  </button>
                )}
              </div>
            )}

            {/* drawer */}
            <div className="drawer-scrim" data-open={drawer} onClick={() => setDrawer(false)} />
            <div className="drawer" data-open={drawer} data-active-style={activeStyle}>
              <div className="drawer-head">
                <span className="drawer-title">Panel de Admins</span>
                <button className="m-iconbtn close" onClick={() => setDrawer(false)} aria-label="Cerrar"
                  style={{ width: 34, height: 34 }}><Icon name="x" /></button>
              </div>
              <div className="drawer-scroll">
                {groups.map((g) => (
                  <div className="nav-group" key={g.id}>
                    <div className="nav-group-label">{g.label}</div>
                    {g.items.map((it) => {
                      const count = it.count && it.count[role];
                      return (
                        <button key={it.id} className="nav-item" data-active={it.id === activeSection}
                          onClick={() => { onSelect(it.id); setDrawer(false); }}>
                          <Icon name={it.icon} />
                          <span className="nav-label">{labelOf(it, role)}</span>
                          {count ? <span className="nav-count">{count}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="drawer-foot">
                <button className="m-iconbtn" onClick={onToggleTheme} aria-label="Tema" style={{ width: 36, height: 36 }}>
                  <Icon name={theme === "dark" ? "sun" : "moon"} />
                </button>
                <button className="drawer-logout">
                  <Icon name="logout" /> Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.MobileShell = MobileShell;
})();
