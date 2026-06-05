/* app.jsx — harness + state + assembly. Mounts #root */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { REGIONS, USERS, NOTIF, groupsForRole } = window.PanelData;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakColor } = window;

  const LOGO_LIGHT = "assets/logo-blanco.webp"; // dark text — for light surfaces
  const LOGO_DARK = "assets/logo-azul.webp";    // haloed — for dark surfaces

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "dark": false,
    "activeStyle": "bar",
    "density": "comfortable",
    "showGroups": true,
    "mobileNav": "tabbar",
    "accent": "#2563eb",
    "canvas": "#e5f1ff"
  }/*EDITMODE-END*/;

  const ACCENTS = ["#2f80ed", "#1c5bd6", "#2563eb", "#0e7c86"];
  const CANVASES = ["#e5f1ff", "#eef0f4", "#e9f1ec", "#f3eee8", "#ece9f6"];

  // Manual color picker — native color box + hex field. Reused for accent + canvas.
  function ColorField({ value, onChange }) {
    const [text, setText] = useState(value);
    useEffect(() => { setText(value); }, [value]);
    const norm = (s) => {
      let h = s.trim().replace(/^#?/, "#");
      if (/^#([0-9a-fA-F]{3})$/.test(h)) h = "#" + h.slice(1).replace(/./g, (c) => c + c);
      return /^#([0-9a-fA-F]{6})$/.test(h) ? h.toLowerCase() : null;
    };
    const commit = (s) => { const n = norm(s); if (n) onChange(n); else setText(value); };
    return (
      <div className="accent-picker">
        <label className="ap-swatch" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
        <div className="ap-hex">
          <span>#</span>
          <input type="text" spellCheck="false" maxLength={7}
            value={text.replace(/^#/, "")}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(e.currentTarget.value); }} />
        </div>
      </div>
    );
  }

  function Seg({ value, options, onChange }) {
    return (
      <div className="seg">
        {options.map((o) => (
          <button key={o.v} data-on={value === o.v} onClick={() => onChange(o.v)}>
            {o.icon && <Icon name={o.icon} className="ic" />}{o.label}
          </button>
        ))}
      </div>
    );
  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [role, setRole] = useState("super");
    const [view, setView] = useState("desktop");
    const [variant, setVariant] = useState("inset");
    const [activeSection, setActiveSection] = useState("resumen");
    const [regionId, setRegionId] = useState(USERS.super.region);

    const theme = t.dark ? "dark" : "light";

    function changeRole(r) {
      setRole(r);
      setRegionId(USERS[r].region);
      setActiveSection("resumen");
      // two realities: vendedor works on the phone, the rest on desktop
      setView(r === "vendedor" ? "mobile" : "desktop");
    }

    const groups = groupsForRole(role);
    const user = USERS[role];
    const notif = NOTIF[role];

    const brandVar = theme === "dark"
      ? `color-mix(in srgb, ${t.accent} 58%, white)`
      : t.accent;

    // Custom canvas tint only applies in light mode; dark keeps its dark canvas.
    const stageStyle = { "--brand": brandVar };
    if (theme !== "dark") stageStyle["--canvas"] = t.canvas;

    const shellProps = {
      role, user, regions: REGIONS, regionId, onRegion: setRegionId,
      groups, activeSection, onSelect: setActiveSection,
      activeStyle: t.activeStyle, density: t.density, showGroups: t.showGroups,
      theme, logoLight: LOGO_LIGHT, logoDark: LOGO_DARK, notif,
      mobileNav: t.mobileNav, onToggleTheme: () => setTweak("dark", !t.dark),
      variant,
    };

    return (
      <>
        <div className="harness">
          <span className="harness-brand">
            <span className="dot" />AnunciaYA <span className="muted">· Panel Admin — vista previa del shell</span>
          </span>
          <span className="harness-spacer" />
          <span className="harness-group">
            <span className="harness-label">Rol</span>
            <Seg value={role} onChange={changeRole} options={[
              { v: "super", label: "SuperAdmin" },
              { v: "gerente", label: "Gerente" },
              { v: "vendedor", label: "Vendedor" },
            ]} />
          </span>
          <span className="harness-group">
            <span className="harness-label">Vista</span>
            <Seg value={view} onChange={setView} options={[
              { v: "desktop", label: "Escritorio", icon: "monitor" },
              { v: "mobile", label: "Móvil", icon: "smartphone" },
            ]} />
          </span>
          <span className="harness-group">
            <span className="harness-label">Propuesta</span>
            <Seg value={variant} onChange={setVariant} options={[
              { v: "classic", label: "Clásico" },
              { v: "inset", label: "Inset" },
            ]} />
          </span>
          <button className="icon-btn" onClick={() => setTweak("dark", !t.dark)} aria-label="Tema">
            <Icon name={t.dark ? "sun" : "moon"} className="ic" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="stage" data-theme={theme} style={stageStyle}>
          {view === "desktop"
            ? <window.DesktopShell {...shellProps} />
            : <window.MobileShell {...shellProps} />}
        </div>

        <TweaksPanel>
          <TweakSection label="Menú" />
          <TweakRadio label="Sección activa" value={t.activeStyle}
            options={[{ value: "soft", label: "Fondo" }, { value: "bar", label: "Barra" }, { value: "text", label: "Texto" }]}
            onChange={(v) => setTweak("activeStyle", v)} />
          <TweakRadio label="Densidad" value={t.density}
            options={[{ value: "comfortable", label: "Cómoda" }, { value: "compact", label: "Compacta" }]}
            onChange={(v) => setTweak("density", v)} />
          <TweakToggle label="Encabezados de grupo" value={t.showGroups}
            onChange={(v) => setTweak("showGroups", v)} />
          <TweakSection label="Móvil" />
          <TweakRadio label="Navegación" value={t.mobileNav}
            options={[{ value: "auto", label: "Auto" }, { value: "tabbar", label: "Inferior" }, { value: "drawer", label: "Drawer" }]}
            onChange={(v) => setTweak("mobileNav", v)} />
          <TweakSection label="Marca" />
          <TweakColor label="Acento" value={t.accent} options={ACCENTS}
            onChange={(v) => setTweak("accent", v)} />
          <ColorField value={t.accent} onChange={(v) => setTweak("accent", v)} />
          <TweakColor label="Fondo (Inset)" value={t.canvas} options={CANVASES}
            onChange={(v) => setTweak("canvas", v)} />
          <ColorField value={t.canvas} onChange={(v) => setTweak("canvas", v)} />
          <TweakToggle label="Modo oscuro" value={t.dark}
            onChange={(v) => setTweak("dark", v)} />
        </TweaksPanel>
      </>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
