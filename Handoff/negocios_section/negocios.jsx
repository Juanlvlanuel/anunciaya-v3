/* negocios.jsx — Negocios page: table (desktop) + cards (mobile) + detail modal/sheet */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;
  const Icon = window.Icon;
  const { STATUS, BUSINESSES, VENDEDORES, counts } = window.NegociosData;

  const PER_PAGE = 20;
  const VEND_COLORS = ["#2563eb", "#0e7c66", "#b3541e", "#5b5bd6", "#b03a86", "#0e7490"];
  function vendColor(name) {
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return VEND_COLORS[h % VEND_COLORS.length];
  }
  function vendInitials(name) {
    const w = name.split(/\s+/); return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase();
  }
  const CITIES = Array.from(new Set(BUSINESSES.map((b) => b.city).filter((c) => c && c !== "—"))).sort((a, b) => a.localeCompare(b, "es"));

  // ---- sorting ----
  const MONTHS = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
  function dnum(str) {
    if (!str || str === "—") return null;
    const p = str.toLowerCase().split(/\s+/);
    const d = parseInt(p[0], 10), m = MONTHS[p[1]] || 0, y = parseInt(p[2], 10) || 0;
    return y * 10000 + m * 100 + d;
  }
  const STATUS_ORDER = { corriente: 0, gracia: 1, suspendido: 2, cancelado: 3 };
  const SORTS = [
    { id: "nombre_az", label: "Nombre (A–Z)" },
    { id: "nombre_za", label: "Nombre (Z–A)" },
    { id: "alta_new",  label: "Alta (recientes)" },
    { id: "alta_old",  label: "Alta (antiguos)" },
    { id: "cobro",     label: "Próximo cobro" },
    { id: "estado",    label: "Estado de pago" },
  ];
  function sortList(list, sort) {
    const arr = [...list];
    const byName = (a, b) => a.name.localeCompare(b.name, "es");
    const nullsLast = (a, b, get) => {
      const x = get(a), y = get(b);
      if (x == null && y == null) return byName(a, b);
      if (x == null) return 1; if (y == null) return -1;
      return x - y;
    };
    switch (sort) {
      case "nombre_za": arr.sort((a, b) => byName(b, a)); break;
      case "alta_new":  arr.sort((a, b) => nullsLast(b, a, (x) => dnum(x.alta))); break;
      case "alta_old":  arr.sort((a, b) => nullsLast(a, b, (x) => dnum(x.alta))); break;
      case "cobro":     arr.sort((a, b) => nullsLast(a, b, (x) => dnum(x.proximo))); break;
      case "estado":    arr.sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || byName(a, b)); break;
      default:          arr.sort(byName);
    }
    return arr;
  }

  // ---------- shared atoms ----------
  function BizAvatar({ biz, className }) {
    return (
      <span className={"biz-av " + (className || "")} style={{
        background: `color-mix(in srgb, ${biz.accent} 16%, var(--surface))`,
        color: biz.accent,
      }}>{biz.initials}</span>
    );
  }

  function PayBadge({ status, small }) {
    const s = STATUS[status];
    return (
      <span className={"badge-pay" + (small ? " sm" : "")} style={{
        background: `color-mix(in srgb, ${s.bg} 13%, transparent)`,
        color: s.color,
      }}>
        <span className="dot" style={{ background: s.bg }}></span>{s.label}
      </span>
    );
  }

  function VendCell({ name }) {
    if (!name) return (
      <span className="vend-none">
        <span className="av-empty"><Icon name="userPlus" /></span> Sin asignar
      </span>
    );
    return (
      <span className="cell-vend">
        <span className="vend-av" style={{ background: vendColor(name) }}>{vendInitials(name)}</span>
        <span className="vend-name">{name}</span>
      </span>
    );
  }

  // ---------- DETAIL (modal / sheet) ----------
  function Detail({ biz, view, onClose }) {
    useEffect(() => {
      function onKey(e) { if (e.key === "Escape") onClose(); }
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, []);
    if (!biz) return null;
    const isSheet = view === "mobile";
    const webOk = biz.web && biz.web !== "—";

    function Row({ k, v, muted, children }) {
      return (
        <div className="det-row">
          <span className="dr-k">{k}</span>
          {children ? children : <span className={"dr-v" + (muted || v === "—" ? " muted" : "")}>{v}</span>}
        </div>
      );
    }

    return (
      <div className={"det-scrim" + (isSheet ? " sheet" : "")} onMouseDown={onClose}>
        <div className="det" onMouseDown={(e) => e.stopPropagation()}>
          <div className="sheet-grip"></div>
          <div className="det-head">
            <BizAvatar biz={biz} />
            <span className="dh-main">
              <span className="dh-name">{biz.name}</span>
              <PayBadge status={biz.status} small />
            </span>
            <button className="det-close" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
          </div>

          <div className="det-body">
            <div className="det-section">
              <div className="ds-label"><Icon name="creditCard" /> Membresía</div>
              <Row k="Estado de pago">
                <span className="dr-v"><PayBadge status={biz.status} small /></span>
              </Row>
              <Row k="Vence" v={biz.vence} />
              <Row k="Próximo cobro" v={biz.proximo} />
              <Row k="Primer pago" v={biz.primer} />
            </div>

            <div className="det-section">
              <div className="ds-label"><Icon name="userSingle" /> Vendedor atribuido</div>
              {biz.vendedor ? (
                <div className="vend-line">
                  <span className="vl-av" style={{ background: vendColor(biz.vendedor) }}>{vendInitials(biz.vendedor)}</span>
                  <span className="vl-main">
                    <span className="vl-name">{biz.vendedor}</span>
                    <span className="vl-role">Vendedor de campo</span>
                  </span>
                </div>
              ) : (
                <div className="vend-line none">
                  <span className="vl-av"><Icon name="userPlus" style={{ width: 16, height: 16 }} /></span>
                  <span className="vl-main"><span className="vl-name">Sin vendedor atribuido</span></span>
                </div>
              )}
            </div>

            <div className="det-section">
              <div className="ds-label"><Icon name="userSingle" /> Dueño de la cuenta</div>
              <Row k="Nombre" v={biz.owner.nombre} />
              <Row k="Correo" v={biz.owner.correo} />
              <Row k="Teléfono" v={biz.owner.tel} />
            </div>

            <div className="det-section">
              <div className="ds-label"><Icon name="store" /> Negocio</div>
              <Row k="Ubicación" v={[biz.city, biz.region].filter((x) => x && x !== "—").join(", ") || "—"} />
              <Row k="Dirección" v={biz.dir} />
              <Row k="Teléfono sucursal" v={biz.tel} />
              <Row k="Sitio web">
                {webOk
                  ? <span className="dr-v"><a href={"https://" + biz.web} target="_blank" rel="noreferrer">Abrir <Icon name="externalLink" /></a></span>
                  : <span className="dr-v muted">—</span>}
              </Row>
              <Row k="Alta" v={biz.alta} />
              <Row k="Onboarding" v={biz.onboarding} />
              {biz.tags.length > 0 && (
                <div className="det-tags">
                  {biz.tags.map((t) => <span className="det-tag" key={t}>{t}</span>)}
                </div>
              )}
            </div>
          </div>

          <div className="det-foot">
            <div className="det-actions">
              <button className="det-act primary"><Icon name="checkCircle" /> Marcar pagado</button>
              <button className="det-act ghost"><Icon name="userPlus" /> Reasignar</button>
              <button className="det-act ghost"><Icon name="pauseCircle" /> Suspender</button>
              <button className="det-act danger"><Icon name="ban" /> Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- FILTER HOOK ----------
  function useFiltered(query, status, vend, city) {
    return useMemo(() => {
      const q = query.trim().toLowerCase();
      return BUSINESSES.filter((b) => {
        if (status !== "all" && b.status !== status) return false;
        if (vend === "__none" && b.vendedor) return false;
        if (vend && vend !== "all" && vend !== "__none" && b.vendedor !== vend) return false;
        if (city && city !== "all") {
          if (city === "__none") { if (b.city && b.city !== "—") return false; }
          else if (b.city !== city) return false;
        }
        if (q && !b.name.toLowerCase().includes(q)) return false;
        return true;
      });
    }, [query, status, vend, city]);
  }

  const STATUS_TABS = [
    { id: "all", label: "Todos" },
    { id: "corriente", label: "Al corriente" },
    { id: "gracia", label: "En gracia" },
    { id: "suspendido", label: "Suspendido" },
    { id: "cancelado", label: "Cancelado" },
  ];

  // ---------- DESKTOP TABLE ----------
  function NegociosTable({ onOpen }) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");
    const [vend, setVend] = useState("all");
    const [city, setCity] = useState("all");
    const [page, setPage] = useState(0);
    const [vendOpen, setVendOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);
    const [sort, setSort] = useState("nombre_az");
    const [sortOpen, setSortOpen] = useState(false);
    const vendRef = useRef(null);
    const cityRef = useRef(null);
    const sortRef = useRef(null);
    const c = counts(BUSINESSES);
    const filtered = useFiltered(query, status, vend, city);
    const list = useMemo(() => sortList(filtered, sort), [filtered, sort]);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const cur = Math.min(page, pages - 1);
    const slice = list.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE);
    useEffect(() => { setPage(0); }, [query, status, vend, city]);
    useEffect(() => {
      function h(e) { if (vendRef.current && !vendRef.current.contains(e.target)) setVendOpen(false); }
      if (vendOpen) document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [vendOpen]);
    useEffect(() => {
      function h(e) { if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false); }
      if (cityOpen) document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [cityOpen]);
    useEffect(() => {
      function h(e) { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); }
      if (sortOpen) document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [sortOpen]);

    const vendLabel = vend === "all" ? "Todos los vendedores" : vend === "__none" ? "Sin asignar" : vend;
    const cityLabel = city === "all" ? "Todas las ciudades" : city === "__none" ? "Sin ciudad" : city;

    return (
      <div className="neg">
        <div className="neg-toolbar">
          <div className="neg-search">
            <Icon name="search" className="ic lead" />
            <input placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="neg-filters">
            {STATUS_TABS.map((t) => (
              <button key={t.id} className="seg-pill" data-on={status === t.id} onClick={() => setStatus(t.id)}>
                {t.id !== "all" && <span className="dot-s" style={{ background: STATUS[t.id].bg }}></span>}
                {t.label}<span className="cnt">{t.id === "all" ? c.all : c[t.id]}</span>
              </button>
            ))}
          </div>
          <div className="neg-select" ref={vendRef}>
            <button className="neg-select-btn" data-open={vendOpen} onClick={() => setVendOpen((v) => !v)}>
              <Icon name="userSingle" />{vendLabel}<Icon name="chevronDown" className="ic chev" />
            </button>
            {vendOpen && (
              <div className="neg-select-menu">
                {[{ v: "all", l: "Todos los vendedores" }, { v: "__none", l: "Sin asignar" }].map((o) => (
                  <button key={o.v} className="neg-select-item" data-sel={vend === o.v} onClick={() => { setVend(o.v); setVendOpen(false); }}>
                    {o.l}<Icon name="check" className="ic check" />
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }}></div>
                {VENDEDORES.map((vn) => (
                  <button key={vn} className="neg-select-item" data-sel={vend === vn} onClick={() => { setVend(vn); setVendOpen(false); }}>
                    <span className="av" style={{ background: vendColor(vn) }}>{vendInitials(vn)}</span>{vn}
                    <Icon name="check" className="ic check" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="neg-select" ref={cityRef}>
            <button className="neg-select-btn" data-open={cityOpen} onClick={() => setCityOpen((v) => !v)}>
              <Icon name="mapPin" />{cityLabel}<Icon name="chevronDown" className="ic chev" />
            </button>
            {cityOpen && (
              <div className="neg-select-menu">
                {[{ v: "all", l: "Todas las ciudades" }, { v: "__none", l: "Sin ciudad" }].map((o) => (
                  <button key={o.v} className="neg-select-item" data-sel={city === o.v} onClick={() => { setCity(o.v); setCityOpen(false); }}>
                    {o.l}<Icon name="check" className="ic check" />
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }}></div>
                {CITIES.map((cn) => (
                  <button key={cn} className="neg-select-item" data-sel={city === cn} onClick={() => { setCity(cn); setCityOpen(false); }}>
                    <Icon name="mapPin" className="ic" style={{ width: 16, height: 16, color: "var(--text-3)" }} />{cn}
                    <Icon name="check" className="ic check" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="neg-subhead">
          <span className="neg-count"><b>{list.length}</b> {list.length === 1 ? "negocio" : "negocios"}{status !== "all" || vend !== "all" || city !== "all" || query ? " · filtrado" : ""}</span>
          <div className="neg-select" ref={sortRef} style={{ position: "relative" }}>
            <button className="neg-sort" data-open={sortOpen} onClick={() => setSortOpen((v) => !v)}>
              <Icon name="sort" /> Ordenar: {SORTS.find((s) => s.id === sort).label}
              <Icon name="chevronDown" className="ic chev" style={{ width: 14, height: 14 }} />
            </button>
            {sortOpen && (
              <div className="neg-select-menu" style={{ minWidth: 200 }}>
                {SORTS.map((s) => (
                  <button key={s.id} className="neg-select-item" data-sel={sort === s.id} onClick={() => { setSort(s.id); setSortOpen(false); }}>
                    {s.label}<Icon name="check" className="ic check" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="neg-body">
          {list.length === 0 ? (
            <div className="neg-empty">
              <Icon name="store" />
              <h4>Sin resultados</h4>
              <p>Ajusta la búsqueda o los filtros.</p>
            </div>
          ) : (
            <div className="neg-table">
              <div className="thead tcols">
                <span className="th">Negocio</span>
                <span className="th">Vendedor</span>
                <span className="th">Estado de pago</span>
                <span className="th">Próximo cobro</span>
                <span className="th">Alta</span>
                <span className="th"></span>
              </div>
              {slice.map((b) => (
                <button className="trow tcols" key={b.id} onClick={() => onOpen(b)}>
                  <span className="cell-biz">
                    <BizAvatar biz={b} />
                    <span className="biz-meta">
                      <span className="biz-name">{b.name}</span>
                      <span className={"biz-city" + (b.city === "—" ? " muted" : "")}>
                        <Icon name="mapPin" />{b.city === "—" ? "Sin ciudad" : b.city}
                      </span>
                    </span>
                  </span>
                  <span className="cell-vend-wrap"><VendCell name={b.vendedor} /></span>
                  <span><PayBadge status={b.status} /></span>
                  <span className={"cell-date" + (b.proximo === "—" ? " muted" : "")}>{b.proximo}</span>
                  <span className="cell-date">{b.alta}</span>
                  <span className="cell-chev"><Icon name="chevronRight" /></span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="neg-foot">
          <span className="range">
            {list.length === 0 ? "0" : `${cur * PER_PAGE + 1}–${Math.min(cur * PER_PAGE + PER_PAGE, list.length)}`} de {list.length}
          </span>
          <div className="pager">
            <button className="pg" disabled={cur === 0} onClick={() => setPage(cur - 1)}><Icon name="chevronDown" className="ic" style={{ transform: "rotate(90deg)" }} /> Anterior</button>
            <span className="pos">{cur + 1} / {pages}</span>
            <button className="pg" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Siguiente <Icon name="chevronRight" className="ic" /></button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- MOBILE CARDS ----------
  function NegociosCards({ onOpen }) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");
    const [city, setCity] = useState("all");
    const [cityOpen, setCityOpen] = useState(false);
    const cityRef = useRef(null);
    const c = counts(BUSINESSES);
    const list = useFiltered(query, status, "all", city);
    useEffect(() => {
      function h(e) { if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false); }
      if (cityOpen) document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [cityOpen]);
    const cityLabel = city === "all" ? "Todas las ciudades" : city === "__none" ? "Sin ciudad" : city;

    return (
      <div className="neg" style={{ height: "100%" }}>
        <div className="mneg-search">
          <Icon name="search" className="ic lead" />
          <input placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mneg-filters">
          {STATUS_TABS.map((t) => (
            <button key={t.id} className="mneg-pill" data-on={status === t.id} onClick={() => setStatus(t.id)}>
              {t.id !== "all" && <span className="dot-s" style={{ width: 7, height: 7, borderRadius: "50%", background: status === t.id ? "#fff" : STATUS[t.id].bg }}></span>}
              {t.label} <span className="cnt">{t.id === "all" ? c.all : c[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="mneg-row">
          <span className="neg-count"><b>{list.length}</b> {list.length === 1 ? "negocio" : "negocios"}</span>
          <div className="neg-select" ref={cityRef}>
            <button className="neg-select-btn sm" data-open={cityOpen} onClick={() => setCityOpen((v) => !v)}>
              <Icon name="mapPin" /><span className="nm">{cityLabel}</span><Icon name="chevronDown" className="ic chev" />
            </button>
            {cityOpen && (
              <div className="neg-select-menu" style={{ left: "auto", right: 0 }}>
                {[{ v: "all", l: "Todas las ciudades" }, { v: "__none", l: "Sin ciudad" }].map((o) => (
                  <button key={o.v} className="neg-select-item" data-sel={city === o.v} onClick={() => { setCity(o.v); setCityOpen(false); }}>
                    {o.l}<Icon name="check" className="ic check" />
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }}></div>
                {CITIES.map((cn) => (
                  <button key={cn} className="neg-select-item" data-sel={city === cn} onClick={() => { setCity(cn); setCityOpen(false); }}>
                    <Icon name="mapPin" className="ic" style={{ width: 16, height: 16, color: "var(--text-3)" }} />{cn}
                    <Icon name="check" className="ic check" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="neg-empty"><Icon name="store" /><h4>Sin resultados</h4><p>Ajusta la búsqueda o filtros.</p></div>
        ) : (
          <div className="neg-cards">
            {list.map((b) => (
              <button className="bizcard" key={b.id} onClick={() => onOpen(b)}>
                <BizAvatar biz={b} />
                <span className="bc-main">
                  <span className="bc-name">{b.name}</span>
                  <span className="bc-sub">
                    <span>{b.city === "—" ? "Sin ciudad" : b.city}</span>
                    <span className="sep"></span>
                    <span className="bc-vend">
                      <Icon name="userSingle" />{b.vendedor || "Sin asignar"}
                    </span>
                  </span>
                </span>
                <span className="bc-right">
                  <PayBadge status={b.status} small />
                  <Icon name="chevronRight" style={{ width: 16, height: 16, color: "var(--text-4)" }} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.Negocios = { NegociosTable, NegociosCards, Detail };
})();
