// ============================================================
// Dual Tabs v2 — Mobile
// Full-height side-drawer dentro de un iPhone, deslizándose
// desde la derecha. Mantiene la identidad cromática brand
// (azul/naranja) + cross-fade entre modos. Más items que en PC
// y tiles de color por item.
// ============================================================

// ---- Faux app backdrop (lo que se ve detrás del drawer) ----
const AppBackdrop = () => (
  <div style={{ position: "absolute", inset: 0, background: "#F3F4F8" }}>
    <div style={{ height: 47 }} />
    <div style={{
      height: 64, background: "#1E3FAB",
      display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.18)" }} />
      <div style={{ flex: 1, height: 34, background: "rgba(255,255,255,0.16)", borderRadius: 10 }} />
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.28)" }} />
    </div>
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          height: 92, background: "#fff", borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }} />
      ))}
    </div>
  </div>
);

// ---- Inner mobile drawer body ----
const DrawerMobileBody = ({ initialMode, deviceWidth }) => {
  const [mode, setMode] = React.useState(initialMode);
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);

  const P = window.DUAL_TABS_PALETTES["azul-naranja"];
  const d = window.DRAWER_DATA_MOBILE[mode];
  const cur = P[mode];

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setToast(`Cambiaste a modo ${next === "personal" ? "Personal" : "Comercial"}`);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  React.useEffect(() => () => clearTimeout(toastTimer.current), []);

  const drawerWidth = Math.round(deviceWidth * 0.88);

  return (
    <React.Fragment>
      {/* Toast */}
      {toast && (
        <div className="dtm-toast">
          <span className="dtm-toast-icon">
            <Icon name="check" size={13} stroke={2.4} />
          </span>
          <span>{toast}</span>
        </div>
      )}

      {/* Drawer */}
      <div
        className="dtm-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: drawerWidth,
          "--ink": cur.ink,
          "--paper": cur.paper,
          "--accent": cur.accent,
          "--accent-soft": cur.accentSoft,
          "--rule": cur.rule,
          color: cur.ink,
        }}
      >
        {/* X close (sits on the scrim, above tabs) */}
        <button className="dtm-close" aria-label="Cerrar">
          <Icon name="close" size={16} stroke={2} />
        </button>

        {/* Tabs */}
        <div className="dtm-tabs">
          <button
            className={"dtm-tab " + (mode === "personal" ? "active" : "")}
            onClick={() => switchMode("personal")}
            style={mode === "personal"
              ? { background: P.personal.paper, color: P.personal.ink }
              : undefined}
          >
            <Icon name="person" size={15} stroke={1.9} /> Personal
          </button>
          <button
            className={"dtm-tab " + (mode === "comercial" ? "active" : "")}
            onClick={() => switchMode("comercial")}
            style={mode === "comercial"
              ? { background: P.comercial.paper, color: P.comercial.ink }
              : undefined}
          >
            <Icon name="store" size={15} stroke={1.9} /> Comercial
          </button>
        </div>

        {/* Card body fills the rest */}
        <div className="dtm-card" style={{ background: cur.paper }}>
          {/* sliding indicator */}
          <span
            className="dtm-indicator"
            style={{
              transform: `translateX(${mode === "personal" ? "0%" : "100%"})`,
              background: cur.accent,
            }}
          />

          {/* content (re-keyed on mode for soft fade) */}
          <div key={mode} className="dtm-fade">
            {/* Identity */}
            <div className="dtm-identity">
              <div style={{ position: "relative" }}>
                <div
                  className="dtm-avatar"
                  style={{
                    background: cur.accent,
                    boxShadow: `0 0 0 4px ${cur.paper}, 0 0 0 5px ${cur.accentSoft}`,
                  }}
                >{d.initial}</div>
                <span className="dtm-online" style={{ borderColor: cur.paper }} />
              </div>
              <div className="dtm-name">{d.name}</div>
              <div className="dtm-email" style={{ color: cur.muted }}>{d.email}</div>
            </div>

            {/* List */}
            <div className="dtm-list">
              {d.items.map((it, i) => (
                <div
                  key={it.id}
                  className="dtm-row"
                  style={{ animationDelay: `${i * 35 + 80}ms` }}
                >
                  <span className="dtm-rowbar" />
                  <span className="dtm-tile" style={{ background: it.tile }}>
                    <Icon name={it.icon} size={17} stroke={1.85} />
                  </span>
                  <span className="dtm-lbl">{it.label}</span>
                  <span className="dtm-chev"><Icon name="chevron" size={16} stroke={1.8} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky bottom: Cerrar Sesión */}
          <div className="dtm-bottom">
            <button className="dtm-out">
              <span className="lo"><Icon name="logout" size={16} stroke={1.7} /></span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

// ---- Wrapper with iPhone frame ----
const DualTabsMobile = ({ initialMode = "personal" }) => {
  const [cycleKey, setCycleKey] = React.useState(0);
  const replay = (e) => {
    if (e.target === e.currentTarget) setCycleKey(k => k + 1);
  };

  const W = 402, H = 874;

  const css = `
    .dtm-wrap {
      width: 100%; height: 100%;
      display: flex; justify-content: center; align-items: center;
      background: #22272F;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .dtm-stage {
      position: relative;
      width: ${W}px; height: ${H}px;
      border-radius: 48px; overflow: hidden;
      box-shadow: 0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.18);
    }
    .dtm-scrim {
      position: absolute; inset: 0; z-index: 30;
      background: rgba(8,20,55,0.42);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
      animation: dtm-scrim 320ms ease both;
      cursor: pointer;
    }
    @keyframes dtm-scrim { from { opacity: 0; } to { opacity: 1; } }

    .dtm-drawer {
      position: absolute; top: 0; right: 0; bottom: 0;
      z-index: 40;
      animation: dtm-slide 380ms cubic-bezier(.2,.7,.35,1) both;
      display: flex; flex-direction: column;
      padding-top: 56px;
      box-sizing: border-box;
      cursor: default;
    }
    @keyframes dtm-slide {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    .dtm-close {
      all: unset; position: absolute; top: 16px; right: 16px;
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.85);
      color: #1F2937; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      backdrop-filter: blur(8px);
      transition: transform .18s ease, background .18s ease;
      z-index: 50;
    }
    .dtm-close:hover { transform: scale(1.05); background: #fff; }
    .dtm-close:active { transform: scale(0.92); }

    .dtm-tabs { display: flex; gap: 0; padding: 0 6px; }
    .dtm-tab {
      all: unset; cursor: pointer; flex: 1;
      padding: 12px 12px 18px; margin-bottom: -12px;
      border-radius: 14px 14px 0 0;
      font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
      text-align: center;
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      transition: background-color 280ms ease, color 280ms ease, border-color 280ms ease;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.62);
      border: 1px solid rgba(255,255,255,0.12);
      border-bottom: none;
    }
    .dtm-tab.active { z-index: 2; border-color: transparent; }
    .dtm-tab:active { transform: scale(0.98); }

    .dtm-card {
      position: relative; flex: 1; min-height: 0;
      border-radius: 22px 0 0 0;
      overflow: hidden;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
      transition: background-color 280ms ease;
      display: flex; flex-direction: column;
    }

    .dtm-indicator {
      position: absolute; top: 0; left: 0;
      width: 50%; height: 3px; z-index: 3;
      transition: transform 340ms cubic-bezier(.4,0,.2,1), background-color 280ms ease;
    }

    .dtm-fade {
      flex: 1; min-height: 0; overflow-y: auto;
      animation: dtm-fade 240ms ease both;
    }
    @keyframes dtm-fade {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dtm-identity {
      display: flex; flex-direction: column; align-items: center;
      padding: 26px 22px 20px;
      text-align: center;
    }
    .dtm-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Instrument Serif', 'Times New Roman', serif;
      font-size: 34px; font-weight: 400; color: #FFFFFF;
      letter-spacing: -0.01em;
      transition: background-color 280ms ease, box-shadow 280ms ease;
    }
    .dtm-online {
      position: absolute; right: -2px; bottom: -2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #4CC777;
      border: 2.5px solid #fff;
      transition: border-color 280ms ease;
    }
    .dtm-name {
      margin-top: 12px;
      font-weight: 600; font-size: 17px; letter-spacing: -0.015em;
      max-width: 260px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: color 280ms ease;
    }
    .dtm-email {
      font-size: 13.5px;
      transition: color 280ms ease;
    }

    .dtm-list {
      padding: 6px 8px 12px;
    }
    .dtm-row {
      position: relative;
      display: flex; align-items: center; gap: 14px;
      padding: 11px 14px 11px 18px; margin: 2px 0;
      border-radius: 12px;
      transition: background-color 200ms ease;
      animation: dtm-row-in 320ms cubic-bezier(.4,0,.2,1) both;
      cursor: pointer;
    }
    @keyframes dtm-row-in {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .dtm-row:active { background: var(--accent-soft); }
    .dtm-row:hover { background: var(--accent-soft); }
    .dtm-rowbar {
      position: absolute; left: 4px; top: 22%; bottom: 22%;
      width: 3px; background: var(--accent);
      border-radius: 0 2px 2px 0;
      transform: scaleY(0); transform-origin: center;
      transition: transform 240ms cubic-bezier(.4,0,.2,1);
    }
    .dtm-row:hover .dtm-rowbar { transform: scaleY(1); }

    .dtm-tile {
      width: 36px; height: 36px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18);
    }
    .dtm-lbl {
      flex: 1; font-size: 15px; font-weight: 500; letter-spacing: -0.005em;
      transition: color 280ms ease;
    }
    .dtm-chev {
      color: rgba(0,0,0,0.28);
      transition: transform 220ms cubic-bezier(.4,0,.2,1), color 200ms ease;
    }
    .dtm-row:hover .dtm-chev { transform: translateX(3px); color: var(--accent); }

    .dtm-bottom {
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 24px));
      border-top: 1px solid var(--rule);
      background: var(--paper);
      transition: background-color 280ms ease, border-color 280ms ease;
    }
    .dtm-out {
      all: unset; cursor: pointer; box-sizing: border-box;
      width: 100%; padding: 14px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-family: inherit; font-size: 14.5px; font-weight: 600;
      color: #C53D3D;
      border: 1.4px solid rgba(197,61,61,0.4);
      border-radius: 14px;
      background: rgba(197,61,61,0.02);
      transition: background-color 200ms ease, border-color 200ms ease, transform .12s ease;
    }
    .dtm-out:hover { background: rgba(197,61,61,0.08); border-color: rgba(197,61,61,0.6); }
    .dtm-out:active { transform: scale(0.985); }

    /* Toast */
    .dtm-toast {
      position: absolute; top: 60px; left: 16px; right: 70px;
      z-index: 60;
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px 12px 14px;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      border-radius: 999px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
      color: #1F2937;
      font-size: 14px; font-weight: 500; letter-spacing: -0.005em;
      animation: dtm-toast-in 360ms cubic-bezier(.2,.8,.3,1) both;
    }
    @keyframes dtm-toast-in {
      from { opacity: 0; transform: translateY(-12px) scale(.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dtm-toast-icon {
      width: 22px; height: 22px; border-radius: 50%;
      background: #2D9C5F; color: #fff;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    /* iPhone status bar/dyn island/home indicator */
    .dtm-statusbar {
      position: absolute; top: 0; left: 0; right: 0; height: 47px;
      z-index: 70; pointer-events: none;
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 28px 0;
      font-family: -apple-system, 'SF Pro Display', system-ui, sans-serif;
      font-weight: 600; font-size: 15.5px;
      color: #fff;
    }
    .dtm-island {
      position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
      width: 124px; height: 36px; border-radius: 22px;
      background: #000; z-index: 75;
    }
    .dtm-home {
      position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%);
      width: 139px; height: 5px; border-radius: 99px;
      background: rgba(255,255,255,0.75); z-index: 80;
    }
  `;

  return (
    <div className="dtm-wrap">
      <style>{css}</style>
      <div className="dtm-stage">
        {/* Faux app behind */}
        <AppBackdrop />

        {/* Scrim that backgrounds the drawer + replay click target */}
        <div className="dtm-scrim" onClick={replay} />

        {/* Drawer (re-keyed for replay) */}
        <DrawerMobileBody key={cycleKey} initialMode={initialMode} deviceWidth={W} />

        {/* iPhone chrome on top of everything */}
        <div className="dtm-statusbar">
          <span>9:41</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 16, height: 11, background: "#fff", borderRadius: 2, opacity: 0.95 }} />
            <span style={{ width: 24, height: 11, border: "1.2px solid rgba(255,255,255,0.9)", borderRadius: 3, position: "relative" }}>
              <span style={{ position: "absolute", inset: 1.5, background: "#fff", borderRadius: 1.5 }} />
            </span>
          </span>
        </div>
        <div className="dtm-island" />
        <div className="dtm-home" />
      </div>
    </div>
  );
};

window.DualTabsMobile = DualTabsMobile;
