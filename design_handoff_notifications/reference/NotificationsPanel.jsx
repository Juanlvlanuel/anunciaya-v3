// ============================================================
// Notifications Panel — alineado con MenuDrawer v3.0
// Cambios respecto a la versión anterior:
//   - Inter en todo (sin Instrument Serif)
//   - Tabs inactivas estilo slate-200 (fondo claro real)
//   - Tiles con linear-gradient
//   - Pesos 700/600 más enfáticos
//   - Sin opacity en fades (solo translate)
//   - Sin transición de color al cambiar tab (instantáneo)
//   - Sin animated padding-left en hover de fila
// ============================================================

const bucketOf = (age) => {
  const m = age.match(/(\d+)\s*d/);
  if (!m) return "old";
  const d = parseInt(m[1], 10);
  if (d <= 1) return "today";
  if (d <= 7) return "week";
  if (d <= 30) return "month";
  return "old";
};
const BUCKET_LABEL = {
  today: "Hoy",
  week:  "Esta semana",
  month: "Este mes",
  old:   "Anteriores",
};

// Gradientes por tipo de notificación (mismo enfoque que MenuDrawer)
const TILE_GRADIENT = {
  "sales-drop":       "linear-gradient(135deg, #1e3a8a, #2563eb)",
  "reward-pending":   "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  "reward-delivered": "linear-gradient(135deg, #10b981, #059669)",
  "low-stock":        "linear-gradient(135deg, #f43f5e, #e11d48)",
};

// Avatar — circular en ambos casos
const NotifAvatar = ({ person, type }) => {
  const meta = window.NOTIF_TYPE_META[type];
  if (person) {
    return (
      <div className="np-av" style={{ background: person.color }}>
        <span style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em",
          color: "#fff",
        }}>{person.initial}</span>
      </div>
    );
  }
  return (
    <div className="np-av" style={{
      background: TILE_GRADIENT[type] || meta.tile,
      borderRadius: 14,
    }}>
      <Icon name={meta.icon} size={22} stroke={1.85} style={{ color: "#fff" }} />
    </div>
  );
};

// Tiny status badge
const NotifBadge = ({ type }) => {
  const meta = window.NOTIF_TYPE_META[type];
  if (!meta?.badge) return null;
  const styles = {
    coin:    { bg: "#F58220", icon: "coin"    },
    star:    { bg: "#1F2937", icon: "star"    },
    clock:   { bg: "#F58220", icon: "clock"   },
    check:   { bg: "#2D9C5F", icon: "check"   },
    warning: { bg: "#DC3545", icon: "warning" },
  }[meta.badge];
  return (
    <span className="np-badge" style={{ background: styles.bg }}>
      <Icon name={styles.icon} size={11} stroke={2.4} style={{ color: "#fff" }} />
    </span>
  );
};

const Stars = ({ n }) => (
  <span style={{ display: "inline-flex", gap: 1.5, marginLeft: 4, verticalAlign: "middle" }}>
    {Array.from({ length: n }).map((_, i) => (
      <Icon key={i} name="star" size={11} style={{ color: "#F5B53A" }} />
    ))}
  </span>
);

const NotifRow = ({ n, accent }) => {
  return (
    <div className={"np-row " + (n.read ? "" : "unread")}>
      <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
        <NotifAvatar person={n.person} type={n.type} />
        <NotifBadge type={n.type} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {n.person && (
          <div className="np-person" style={{ color: accent }}>
            {n.person.name}
            {n.branch && <span className="np-branch"> · {n.branch}</span>}
          </div>
        )}
        <div className="np-title">
          {n.title}
          {n.type === "review" && n.rating && <Stars n={n.rating} />}
          {!n.read && <span className="np-dot" style={{ background: accent }} />}
        </div>
        <div className="np-body">{n.body}</div>
        <div className="np-age">{n.age}</div>
      </div>

      <button className="np-trash" aria-label="Eliminar notificación">
        <Icon name="trash" size={18} stroke={1.8} />
      </button>
    </div>
  );
};

const NotifBody = () => {
  const [filter, setFilter] = React.useState("todas");
  const all = window.NOTIF_DATA;

  const cur = {
    paper:      "#F5F7FE",
    ink:        "#0E1F5C",
    muted:      "rgba(14,31,92,0.55)",
    accent:     "#2244C8",
    accentBg:   "#2244C8",
    accentSoft: "rgba(34,68,200,0.10)",
    rule:       "rgba(14,31,92,0.08)",
  };

  const unread = all.filter(n => !n.read);
  const visible = filter === "todas" ? all : unread;

  const groups = {};
  visible.forEach(n => {
    const b = bucketOf(n.age);
    (groups[b] = groups[b] || []).push(n);
  });
  const orderedBuckets = ["today", "week", "month", "old"].filter(b => groups[b]);

  const indicatorX = filter === "todas" ? "0%" : "100%";

  return (
    <div
      className="np-shell"
      onClick={(e) => e.stopPropagation()}
      style={{
        "--ink": cur.ink,
        "--paper": cur.paper,
        "--accent": cur.accent,
        "--accent-soft": cur.accentSoft,
        "--rule": cur.rule,
        "--muted": cur.muted,
        color: cur.ink,
      }}
    >
      {/* Tabs */}
      <div className="np-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={filter === "todas"}
          className={"np-tab " + (filter === "todas" ? "active" : "")}
          onClick={() => setFilter("todas")}
        >
          <Icon name="bell" size={13} stroke={1.9} />
          Todas
          <span className={"np-tab-count " + (filter === "todas" ? "on" : "")}>
            {all.length}
          </span>
        </button>
        <button
          role="tab"
          aria-selected={filter === "no-leidas"}
          className={"np-tab " + (filter === "no-leidas" ? "active" : "")}
          onClick={() => setFilter("no-leidas")}
        >
          <Icon name="sparkle" size={13} />
          No leídas
          <span className={"np-tab-count " + (filter === "no-leidas" ? "on" : "")}>
            {unread.length}
          </span>
        </button>
      </div>

      {/* Card */}
      <div className="np-card">
        <span
          className="np-indicator"
          style={{ transform: `translateX(${indicatorX})` }}
        />

        {/* In-card header */}
        <div className="np-header">
          <div className="np-title-row">
            <span className="np-bellbubble">
              <Icon name="bell" size={15} stroke={1.9} />
            </span>
            <span className="np-htitle">Notificaciones</span>
            {unread.length > 0 && (
              <span className="np-hcount">{unread.length}</span>
            )}
            <button className="np-iconbtn" aria-label="Filtrar">
              <Icon name="filter" size={15} stroke={1.85} />
            </button>
          </div>
        </div>

        {/* Scroll area (re-keyed per filter, only translate fade) */}
        <div key={filter} className="np-fade np-scroll">
          {orderedBuckets.length === 0 && (
            <div className="np-empty">
              <span className="np-empty-icon"><Icon name="check-circle" size={26} stroke={1.5} /></span>
              <div className="np-empty-title">Sin notificaciones</div>
              <div className="np-empty-sub">Te avisamos cuando algo nuevo pase.</div>
            </div>
          )}

          {orderedBuckets.map((b, gi) => (
            <div key={b} className="np-group">
              <div className="np-group-label">
                <span className="np-group-text">{BUCKET_LABEL[b]}</span>
                <span className="np-group-line" />
                <span className="np-group-count">{groups[b].length}</span>
              </div>
              <div className="np-list">
                {groups[b].map((n, i) => (
                  <div
                    key={n.id}
                    style={{ animationDelay: `${(gi * 80) + i * 40 + 80}ms` }}
                    className="np-row-wrap"
                  >
                    <NotifRow n={n} accent={cur.accent} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="np-footer">
          <button className="np-cta" disabled={unread.length === 0}>
            <Icon name="sparkle" size={14} />
            Marcar todas como leídas
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationsPanel = () => {
  const [cycleKey, setCycleKey] = React.useState(0);
  const replay = (e) => { if (e.target === e.currentTarget) setCycleKey(k => k + 1); };

  const css = `
    /* Fondo: tira angosta de header azul + área clara (contexto real del popover) */
    .np-bg {
      position: relative;
      background:
        linear-gradient(180deg, #1E3FAB 0%, #1E3FAB 64px, #F1F5F9 64px, #F1F5F9 100%);
      cursor: pointer;
    }
    .np-bg::after {
      content: '↻ click para reabrir';
      position: absolute; left: 50%; bottom: 14px;
      transform: translateX(-50%);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11px; color: rgba(14,31,92,0.45);
      letter-spacing: 0.04em; pointer-events: none;
    }

    .np-shell {
      position: relative; width: 392px;
      font-family: 'Inter', system-ui, sans-serif;
      transform-origin: top right;
      cursor: default;
      animation: np-pop 320ms cubic-bezier(.2,.7,.35,1) both;
    }
    /* Sin opacity — solo translate + scale (igual que dd-pop final) */
    @keyframes np-pop {
      from { transform: translate(6px,-10px) scale(.96); }
      to   { transform: translate(0,0) scale(1); }
    }

    /* ───── Tabs ───── */
    .np-tabs { display: flex; gap: 0; padding: 0 6px; }
    .np-tab {
      all: unset; cursor: pointer; flex: 1;
      padding: 10px 12px 16px; margin-bottom: -10px;
      border-radius: 14px 14px 0 0;
      font-size: 13px; font-weight: 600; letter-spacing: -0.005em;
      text-align: center;
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;

      /* Estilo MenuDrawer v3: slate sobre fondo claro */
      background: #E2E8F0;       /* slate-200 */
      color: #475569;            /* slate-600 */
      border: 1px solid #CBD5E1; /* slate-300 */
      border-bottom: none;
      /* Sin transición de color — el cambio de tab es instantáneo */
    }
    .np-tab:hover:not(.active) { background: #CBD5E1; }
    .np-tab.active {
      z-index: 2;
      background: #F5F7FE; /* paper */
      color: #0E1F5C;      /* ink */
      border-color: transparent;
    }
    .np-tab-count {
      min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      background: rgba(14,31,92,0.10);
      color: #0E1F5C;
    }
    .np-tab-count.on {
      background: #2244C8;
      color: #fff;
    }

    /* ───── Card ───── */
    .np-card {
      position: relative; z-index: 1; overflow: hidden;
      background: #F5F7FE;
      border-radius: 18px;
      box-shadow: 0 30px 70px -20px rgba(10,30,90,0.30), 0 6px 16px rgba(10,30,90,0.10);
      display: flex; flex-direction: column;
      max-height: 620px; min-height: 460px;
    }
    .np-indicator {
      position: absolute; top: 0; left: 0;
      width: 50%; height: 3px;
      background: #2244C8;
      transition: transform 340ms cubic-bezier(.4,0,.2,1);
      z-index: 5;
    }

    /* ───── Header dentro del card ───── */
    .np-header { padding: 16px 18px 8px; }
    .np-title-row { display: flex; align-items: center; gap: 10px; }
    .np-bellbubble {
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(34,68,200,0.10); color: #2244C8;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .np-htitle {
      font-size: 16px; font-weight: 700; letter-spacing: -0.015em;
      color: #0E1F5C;
    }
    .np-hcount {
      min-width: 26px; height: 26px; padding: 0 9px;
      border-radius: 999px; color: #fff; background: #2244C8;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; letter-spacing: -0.005em;
      box-shadow: 0 2px 6px rgba(34,68,200,0.30);
    }
    .np-iconbtn {
      all: unset; cursor: pointer;
      margin-left: auto;
      width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      color: rgba(14,31,92,0.55);
      transition: background-color .15s ease, color .2s ease;
    }
    .np-iconbtn:hover { background: rgba(14,31,92,0.06); color: #0E1F5C; }

    /* ───── Scroll area ───── */
    /* Sin opacity — solo translate (alineado con dd-fade / md4-fade) */
    .np-fade { animation: np-fade 220ms ease both; }
    @keyframes np-fade {
      from { transform: translateY(4px); }
      to   { transform: translateY(0); }
    }
    .np-scroll {
      flex: 1; min-height: 0; overflow-y: auto;
      padding: 4px 0 8px;
    }
    .np-scroll::-webkit-scrollbar { width: 6px; }
    .np-scroll::-webkit-scrollbar-thumb { background: rgba(14,31,92,0.18); border-radius: 999px; }

    /* ───── Grupo (eyebrow Inter, sin serif italic) ───── */
    .np-group { padding: 4px 0 6px; }
    .np-group-label {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 22px 6px;
    }
    .np-group-text {
      font-size: 11px; font-weight: 700; letter-spacing: 0.10em;
      text-transform: uppercase;
      color: rgba(14,31,92,0.78);
    }
    .np-group-line {
      flex: 1; height: 1px; background: rgba(14,31,92,0.14);
    }
    .np-group-count {
      font-size: 11px; font-weight: 700;
      color: rgba(14,31,92,0.78);
      padding: 2px 8px; border-radius: 999px;
      background: rgba(14,31,92,0.08);
    }

    /* ───── Fila ───── */
    .np-list { padding: 0 8px; }
    /* Sin opacity — solo translateX (alineado con dd-row-in) */
    .np-row-wrap { animation: np-row-in 320ms cubic-bezier(.4,0,.2,1) both; }
    @keyframes np-row-in {
      from { transform: translateX(-6px); }
      to   { transform: translateX(0); }
    }

    .np-row {
      position: relative;
      display: flex; gap: 12px;
      padding: 11px 14px 11px 18px;   /* alineado con MenuDrawer v3 */
      margin: 2px 0;
      border-radius: 12px;
      cursor: pointer;
      transition: background-color .18s ease;
      /* sin animación de padding-left en hover (alineado con MenuDrawer v3) */
    }
    .np-row:hover { background: rgba(34,68,200,0.08); }
    .np-row.unread::before {
      content: ''; position: absolute;
      left: 4px; top: 22%; bottom: 22%;
      width: 3px; border-radius: 0 2px 2px 0;
      background: #2244C8;
    }

    .np-av {
      width: 46px; height: 46px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    .np-badge {
      position: absolute; right: -3px; bottom: -3px;
      width: 19px; height: 19px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 2.5px #F5F7FE, 0 1px 3px rgba(0,0,0,0.18);
    }

    .np-person {
      font-size: 13px; font-weight: 600; letter-spacing: -0.005em;
      line-height: 1.2;
      color: #2244C8;
    }
    .np-branch { font-weight: 500; opacity: 0.85; }

    .np-title {
      margin-top: 1px;
      font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
      color: #0E1F5C; line-height: 1.3;
      display: flex; align-items: center; flex-wrap: wrap;
      gap: 0 6px;
    }
    .np-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #2244C8;
      flex-shrink: 0;
    }
    .np-body {
      margin-top: 2px;
      font-size: 13.5px; font-weight: 500; letter-spacing: -0.005em;
      color: rgba(14,31,92,0.74);
      line-height: 1.4;
    }
    .np-age {
      margin-top: 6px;
      font-size: 12.5px; font-weight: 500; letter-spacing: -0.005em;
      color: rgba(14,31,92,0.62);
    }

    .np-trash {
      all: unset; cursor: pointer;
      width: 36px; height: 36px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      color: rgba(14,31,92,0.55);
      opacity: 0; transform: translateX(4px);
      transition: opacity .18s ease, transform .18s ease, background-color .15s ease, color .15s ease;
      align-self: center;
    }
    .np-row:hover .np-trash { opacity: 1; transform: translateX(0); }
    .np-trash:hover { background: rgba(220,53,69,0.12); color: #C53D3D; }

    /* ───── Empty state (Inter, sin serif) ───── */
    .np-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 24px; text-align: center;
      color: rgba(14,31,92,0.70);
    }
    .np-empty-icon {
      width: 54px; height: 54px; border-radius: 50%;
      background: rgba(34,68,200,0.10); color: #2244C8;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
    }
    .np-empty-title {
      font-size: 17px; font-weight: 700; letter-spacing: -0.015em;
      color: #0E1F5C; margin-bottom: 4px;
    }
    .np-empty-sub {
      font-size: 13.5px; font-weight: 500;
      letter-spacing: -0.005em;
    }

    /* ───── Footer CTA ───── */
    .np-footer {
      padding: 10px 14px 14px;
      border-top: 1px solid rgba(14,31,92,0.08);
      background: #F5F7FE;
    }
    .np-cta {
      all: unset; cursor: pointer; box-sizing: border-box;
      width: 100%; padding: 12px 16px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: inherit;
      font-size: 14px; font-weight: 700; letter-spacing: -0.005em;
      color: #fff;
      background: linear-gradient(180deg, #19295C, #0E1F4A);
      border-radius: 12px;
      box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(14,31,92,0.22);
      transition: transform .12s ease, box-shadow .18s ease, opacity .18s ease;
    }
    .np-cta:hover:not(:disabled) {
      box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 6px 16px rgba(14,31,92,0.30);
    }
    .np-cta:active:not(:disabled) { transform: scale(.985); }
    .np-cta:disabled { opacity: 0.45; cursor: default; }

    @media (prefers-reduced-motion: reduce) {
      .np-shell, .np-fade, .np-row-wrap, .np-indicator { animation: none !important; transition: none !important; }
    }
  `;

  return (
    <div
      className="np-bg"
      onClick={replay}
      style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 22, boxSizing: "border-box" }}
    >
      <style>{css}</style>
      <NotifBody key={cycleKey} />
    </div>
  );
};

window.NotificationsPanel = NotificationsPanel;
