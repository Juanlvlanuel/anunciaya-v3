// ============================================================
// VARIANT 4b — Dual Tabs v2  (versión con efectos)
// Brand colors: azul (header) + naranja (Comercial)
// Efectos:
//   1. Cross-fade de paleta al cambiar de modo
//   2. Indicador deslizable bajo las tabs
//   3. Hover refinado en filas (barra lateral + chevron desplazado)
//   4. Animación de entrada con origin en esquina superior-derecha
//      (click en el backdrop reabre el drawer)
// ============================================================

window.DUAL_TABS_PALETTES = {
  "azul-naranja": {
    label: "Azul & Naranja (Brand)",
    personal: {
      paper:      "#F5F7FE",
      ink:        "#0E1F5C",
      muted:      "rgba(14,31,92,0.55)",
      accent:     "#2244C8",
      accentSoft: "rgba(34,68,200,0.10)",
      rule:       "rgba(14,31,92,0.08)",
    },
    comercial: {
      paper:      "#FEF6EC",
      ink:        "#4D2308",
      muted:      "rgba(77,35,8,0.55)",
      accent:     "#F58220",
      accentSoft: "rgba(245,130,32,0.13)",
      rule:       "rgba(77,35,8,0.09)",
    },
  },
};

// ---- Inner drawer (re-mounted to replay entrance) ----
const DrawerBody = ({ initialMode, palette }) => {
  const [mode, setMode] = React.useState(initialMode);
  const P = window.DUAL_TABS_PALETTES[palette];
  const d = window.DRAWER_DATA[mode];
  const cur = P[mode];

  // Indicator translateX
  const indicatorX = mode === "personal" ? "0%" : "100%";

  return (
    <div
      className="dt2-shell"
      onClick={(e) => e.stopPropagation()}
      style={{
        "--ink": cur.ink,
        "--paper": cur.paper,
        "--accent": cur.accent,
        "--accent-soft": cur.accentSoft,
        "--rule": cur.rule,
        color: cur.ink,
      }}
    >
      {/* tabs */}
      <div className="dt2-tabs">
        <button
          className={"dt2-tab " + (mode === "personal" ? "active" : "")}
          onClick={() => setMode("personal")}
          style={mode === "personal"
            ? { background: P.personal.paper, color: P.personal.ink }
            : undefined}
        >
          <Icon name="person" size={14} stroke={1.9} /> Personal
        </button>
        <button
          className={"dt2-tab " + (mode === "comercial" ? "active" : "")}
          onClick={() => setMode("comercial")}
          style={mode === "comercial"
            ? { background: P.comercial.paper, color: P.comercial.ink }
            : undefined}
        >
          <Icon name="store" size={14} stroke={1.9} /> Comercial
        </button>
      </div>

      {/* card */}
      <div className="dt2-card" style={{ background: cur.paper }}>
        {/* sliding indicator (effect #2) */}
        <span
          className="dt2-indicator"
          style={{ transform: `translateX(${indicatorX})`, background: cur.accent }}
        />

        {/* content fades on mode change (effect #1 reinforcement) */}
        <div key={mode} className="dt2-fade">
          {/* identity */}
          <div className="dt2-identity">
            <div style={{ position: "relative" }}>
              <div
                className="dt2-avatar"
                style={{
                  background: cur.accent,
                  boxShadow: `0 0 0 4px ${cur.paper}, 0 0 0 5px ${cur.accentSoft}`,
                }}
              >{d.initial}</div>
              <span className="dt2-online" style={{ borderColor: cur.paper }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="dt2-name">{d.name}</div>
              <div className="dt2-email" style={{ color: cur.muted }}>{d.email}</div>
            </div>
          </div>

          {/* nav rows */}
          <div className="dt2-list">
            {d.items.map((it, i) => (
              <div key={it.id} className="dt2-row" style={{ animationDelay: `${i * 40 + 60}ms` }}>
                <span className="dt2-rowbar" />
                <span className="ico"><Icon name={it.icon} size={18} stroke={1.7} /></span>
                <span className="lbl">{it.label}</span>
                <span className="chev"><Icon name="chevron" size={16} stroke={1.8} /></span>
              </div>
            ))}
          </div>

          {/* logout */}
          <button className="dt2-out">
            <span className="lo"><Icon name="logout" size={16} stroke={1.7} /></span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Outer wrapper (handles replay on backdrop click) ----
const DualTabsV2 = ({ initialMode = "personal", palette = "azul-naranja" }) => {
  const [cycleKey, setCycleKey] = React.useState(0);
  const replay = (e) => {
    if (e.target === e.currentTarget) setCycleKey(k => k + 1);
  };

  const css = `
    .dt2-bg {
      position: relative;
      background:
        linear-gradient(180deg, #1E3FAB 0%, #1E3FAB 88px, #E8ECF4 88px, #E8ECF4 100%);
      cursor: pointer;
    }
    .dt2-bg::after {
      content: '↻ click para reabrir';
      position: absolute; left: 50%; bottom: 14px;
      transform: translateX(-50%);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11px; color: rgba(255,255,255,0.55);
      letter-spacing: 0.04em; pointer-events: none;
    }
    .dt2-shell {
      position: relative; width: 332px;
      font-family: 'Inter', system-ui, sans-serif;
      transform-origin: top right;
      cursor: default;
      animation: dt2-pop 320ms cubic-bezier(.2,.7,.35,1) both;
    }
    @keyframes dt2-pop {
      from { opacity: 0; transform: translate(6px,-10px) scale(.94); }
      to   { opacity: 1; transform: translate(0,0) scale(1); }
    }

    .dt2-tabs { display: flex; gap: 0; padding: 0 6px; }
    .dt2-tab {
      all: unset; cursor: pointer; flex: 1;
      padding: 11px 12px 16px; margin-bottom: -10px;
      border-radius: 14px 14px 0 0;
      font-size: 13px; font-weight: 600; letter-spacing: -0.005em;
      text-align: center;
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      transition: background-color 280ms ease, color 280ms ease, border-color 280ms ease;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.6);
      border: 1px solid rgba(255,255,255,0.12);
      border-bottom: none;
    }
    .dt2-tab.active { z-index: 2; border-color: transparent; }
    .dt2-tab:hover:not(.active) { background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.85); }

    .dt2-card {
      position: relative; z-index: 1; overflow: hidden;
      border-radius: 18px;
      box-shadow: 0 30px 70px -20px rgba(10,30,90,0.45), 0 6px 16px rgba(10,30,90,0.15);
      transition: background-color 280ms ease;
    }

    /* Effect #2 — sliding indicator under tabs */
    .dt2-indicator {
      position: absolute; top: 0; left: 0;
      width: 50%; height: 3px;
      transition: transform 340ms cubic-bezier(.4,0,.2,1), background-color 280ms ease;
      z-index: 3;
    }

    /* Effect #1 — content fade on mode change */
    .dt2-fade { animation: dt2-fade 240ms ease both; }
    @keyframes dt2-fade {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dt2-identity {
      display: flex; align-items: center; gap: 14px;
      padding: 22px 22px 18px;
    }
    .dt2-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Instrument Serif', 'Times New Roman', serif;
      font-size: 30px; font-weight: 400; color: #FFFFFF;
      letter-spacing: -0.01em;
      transition: background-color 280ms ease, box-shadow 280ms ease;
    }
    .dt2-online {
      position: absolute; right: -2px; bottom: -2px;
      width: 13px; height: 13px; border-radius: 50%;
      background: #4CC777;
      border: 2.5px solid #fff;
      transition: border-color 280ms ease;
    }
    .dt2-name {
      font-weight: 600; font-size: 16px; letter-spacing: -0.015em;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: color 280ms ease;
    }
    .dt2-email {
      font-size: 13px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: color 280ms ease;
    }

    .dt2-list {
      background: rgba(255,255,255,0.45);
      border-top: 1px solid var(--rule);
      border-bottom: 1px solid var(--rule);
      transition: border-color 280ms ease;
    }
    .dt2-row {
      position: relative;
      display: flex; align-items: center; gap: 14px;
      padding: 13px 18px 13px 21px; cursor: pointer;
      border-bottom: 1px solid var(--rule);
      transition: background-color 200ms ease, border-color 280ms ease, padding-left 220ms cubic-bezier(.4,0,.2,1);
      animation: dt2-row-in 320ms cubic-bezier(.4,0,.2,1) both;
    }
    @keyframes dt2-row-in {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .dt2-row:last-child { border-bottom: none; }
    .dt2-row:hover { background: var(--accent-soft); padding-left: 24px; }

    /* Effect #3 — hover refinement: side bar + chevron shift */
    .dt2-rowbar {
      position: absolute; left: 0; top: 22%; bottom: 22%;
      width: 3px; background: var(--accent);
      border-radius: 0 2px 2px 0;
      transform: scaleY(0); transform-origin: center;
      transition: transform 240ms cubic-bezier(.4,0,.2,1);
    }
    .dt2-row:hover .dt2-rowbar { transform: scaleY(1); }
    .dt2-row .ico {
      color: var(--accent);
      transition: color 280ms ease, transform 220ms cubic-bezier(.4,0,.2,1);
    }
    .dt2-row .lbl {
      flex: 1; font-size: 14.5px; font-weight: 500; letter-spacing: -0.005em;
      transition: color 280ms ease;
    }
    .dt2-row .chev {
      color: rgba(0,0,0,0.25);
      transition: transform 220ms cubic-bezier(.4,0,.2,1), color 200ms ease;
    }
    .dt2-row:hover .chev { transform: translateX(4px); color: var(--accent); }

    .dt2-out {
      all: unset; cursor: pointer; box-sizing: border-box;
      width: 100%; padding: 14px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-family: inherit; font-size: 14px; font-weight: 600;
      color: var(--ink);
      transition: background-color 200ms ease, color 280ms ease;
    }
    .dt2-out:hover { background: rgba(0,0,0,0.04); }
    .dt2-out .lo { opacity: 0.6; transition: opacity 180ms ease; }
    .dt2-out:hover .lo { opacity: 1; }
  `;

  return (
    <div
      className="dt2-bg"
      onClick={replay}
      style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 22, boxSizing: "border-box" }}
    >
      <style>{css}</style>
      <DrawerBody key={cycleKey} initialMode={initialMode} palette={palette} />
    </div>
  );
};

window.DualTabsV2 = DualTabsV2;
