/* login.jsx — AnunciaYA login flow. Mounts #root */
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;

  const LOGO_LIGHT = "assets/logo-blanco.webp"; // full color — for light card
  const LOGO_DARK = "assets/logo-azul.webp";    // haloed — for dark card

  const DEMO = [
    { role: "SuperAdmin", mail: "carlos.mendoza@anunciaya.mx", initials: "CM", color: "#2563eb", twofa: true },
    { role: "Gerente regional", mail: "laura.rios@anunciaya.mx", initials: "LR", color: "#0e7c66", twofa: false },
    { role: "Vendedor", mail: "diego.salas@anunciaya.mx", initials: "DS", color: "#b3541e", twofa: false },
  ];

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

  // ---- LOGIN FORM ----
  function LoginForm({ theme, onForgot, onSubmit, email, setEmail, error, loading }) {
    const [pw, setPw] = useState("");
    const [show, setShow] = useState(false);
    const [remember, setRemember] = useState(true);
    const logo = theme === "dark" ? LOGO_DARK : LOGO_LIGHT;

    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(email, pw); }} noValidate>
        <div className="login-logo"><img src={logo} alt="AnunciaYA" /></div>
        <div className="login-head">
          <h1>Inicia sesión</h1>
          <p>Panel de administración de AnunciaYA</p>
        </div>

        {error && (
          <div className="alert fade-in" role="alert">
            <Icon name="alert" />
            <div className="a-main"><b>No pudimos iniciar sesión.</b> Revisa tu correo y contraseña e inténtalo de nuevo.</div>
          </div>
        )}

        <div className="field" data-error={error}>
          <label className="field-label" htmlFor="email">Correo electrónico</label>
          <div className="input-wrap">
            <Icon name="mail" className="ic lead" />
            <input id="email" className="input" type="email" autoComplete="username"
              placeholder="tucorreo@anunciaya.mx" value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="field" data-error={error}>
          <label className="field-label" htmlFor="pw">Contraseña</label>
          <div className="input-wrap">
            <Icon name="lock" className="ic lead" />
            <input id="pw" className="input has-trail" type={show ? "text" : "password"}
              autoComplete="current-password" placeholder="••••••••" value={pw}
              onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="trail-btn" onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
              <Icon name={show ? "eyeOff" : "eye"} />
            </button>
          </div>
        </div>

        <div className="form-row">
          <label className="remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className="checkbox"><Icon name="check" /></span>
            Recordar mi sesión
          </label>
          <button type="button" className="link" onClick={onForgot}>¿Olvidaste tu contraseña?</button>
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? <><span className="spinner"></span> Entrando…</> : <>Entrar</>}
        </button>

        <div className="card-foot">
          <span className="sec-note"><Icon name="lock" /> Conexión segura · acceso solo para personal autorizado</span>
        </div>
      </form>
    );
  }

  // ---- 2FA ----
  function TwoFA({ email, onBack, onVerify, error, loading }) {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const refs = useRef([]);
    function setDigit(i, v) {
      v = v.replace(/\D/g, "").slice(-1);
      const next = [...code]; next[i] = v; setCode(next);
      if (v && i < 5) refs.current[i + 1] && refs.current[i + 1].focus();
    }
    function onKey(i, e) {
      if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1] && refs.current[i - 1].focus();
    }
    function onPaste(e) {
      const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6).split("");
      if (t.length) { e.preventDefault(); const next = ["","","","","",""]; t.forEach((d, k) => next[k] = d); setCode(next); refs.current[Math.min(t.length, 5)] && refs.current[Math.min(t.length, 5)].focus(); }
    }
    return (
      <form onSubmit={(e) => { e.preventDefault(); onVerify(code.join("")); }}>
        <button type="button" className="back-link" onClick={onBack}><Icon name="arrowLeft" /> Volver</button>
        <div className="emblem"><Icon name="shieldCheck" /></div>
        <div className="login-head">
          <h1>Verificación en dos pasos</h1>
          <p>Ingresa el código de 6 dígitos enviado a<br/><b style={{ color: "var(--text-2)" }}>{email || "tu correo"}</b></p>
        </div>

        {error && (
          <div className="alert fade-in" role="alert">
            <Icon name="alert" />
            <div className="a-main"><b>Código incorrecto.</b> Verifica los 6 dígitos e inténtalo otra vez.</div>
          </div>
        )}

        <div className="code-row" onPaste={onPaste}>
          {code.map((d, i) => (
            <input key={i} ref={(el) => refs.current[i] = el} className={"code-box" + (d ? " filled" : "")}
              inputMode="numeric" maxLength={1} value={d}
              onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} />
          ))}
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? <><span className="spinner"></span> Verificando…</> : <>Verificar e ingresar</>}
        </button>
        <div className="resend">¿No llegó? <button type="button" className="link">Reenviar código</button> · disponible en 0:30</div>
      </form>
    );
  }

  // ---- RECOVER ----
  function Recover({ onBack, onSend, sent, sentTo, loading, theme }) {
    const [mail, setMail] = useState("");
    if (sent) {
      return (
        <div>
          <div className="emblem ok"><Icon name="mail" /></div>
          <div className="login-head">
            <h1>Revisa tu correo</h1>
            <p>Si la cuenta existe, te enviamos un enlace para restablecer tu contraseña.</p>
          </div>
          <div className="sent-to">Enviado a <b>{sentTo}</b></div>
          <button className="btn" type="button" onClick={onBack}>Volver a iniciar sesión</button>
          <div className="resend" style={{ marginTop: 14 }}>¿No lo recibiste? <button type="button" className="link">Reenviar enlace</button></div>
        </div>
      );
    }
    return (
      <form onSubmit={(e) => { e.preventDefault(); onSend(mail); }}>
        <button type="button" className="back-link" onClick={onBack}><Icon name="arrowLeft" /> Volver</button>
        <div className="login-head" style={{ textAlign: "left", marginBottom: 22 }}>
          <h1>Recuperar contraseña</h1>
          <p>Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rmail">Correo electrónico</label>
          <div className="input-wrap">
            <Icon name="mail" className="ic lead" />
            <input id="rmail" className="input" type="email" placeholder="tucorreo@anunciaya.mx"
              value={mail} onChange={(e) => setMail(e.target.value)} />
          </div>
        </div>
        <button className="btn" type="submit" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? <><span className="spinner"></span> Enviando…</> : <>Enviar enlace de recuperación</>}
        </button>
      </form>
    );
  }

  // ---- APP ----
  function LoginApp() {
    const [theme, setTheme] = useState("light");
    const [view, setView] = useState("desktop");
    const [screen, setScreen] = useState("login"); // login | twofa | recover
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [demoOpen, setDemoOpen] = useState(false);
    const demoRef = useRef(null);
    const tRef = useRef(null);

    useEffect(() => () => clearTimeout(tRef.current), []);
    useEffect(() => {
      function h(e) { if (demoRef.current && !demoRef.current.contains(e.target)) setDemoOpen(false); }
      if (demoOpen) document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [demoOpen]);

    const isSuper = /carlos|super|admin/i.test(email);

    function submitLogin(mail, pw) {
      setError(false); setLoading(true);
      tRef.current = setTimeout(() => {
        setLoading(false);
        // demo rule: empty fields or "wrong" → error; superadmin → 2FA; else → enter shell
        if (!mail || !pw || /wrong|error/i.test(pw)) { setError(true); return; }
        if (/carlos|super|admin/i.test(mail)) { setScreen("twofa"); setError(false); }
        else { window.location.href = "Panel Admin AnunciaYA.html"; }
      }, 1100);
    }
    function verify(code) {
      setError(false); setLoading(true);
      tRef.current = setTimeout(() => {
        setLoading(false);
        if (code.length < 6 || code === "000000") { setError(true); return; }
        window.location.href = "Panel Admin AnunciaYA.html";
      }, 1100);
    }
    function sendRecover(mail) {
      setLoading(true);
      tRef.current = setTimeout(() => { setLoading(false); setEmail(mail); setSent(true); }, 1000);
    }
    function gotoScreen(s) {
      setScreen(s); setError(false); setLoading(false); setSent(false);
    }
    function useDemo(d) {
      setEmail(d.mail); setDemoOpen(false); setScreen("login"); setError(false);
    }

    let body;
    if (screen === "twofa") body = <TwoFA email={email} error={error} loading={loading}
      onBack={() => gotoScreen("login")} onVerify={verify} />;
    else if (screen === "recover") body = <Recover theme={theme} sent={sent} sentTo={email} loading={loading}
      onBack={() => gotoScreen("login")} onSend={sendRecover} />;
    else body = <LoginForm theme={theme} email={email} setEmail={setEmail} error={error} loading={loading}
      onForgot={() => gotoScreen("recover")} onSubmit={submitLogin} />;

    const stage = (
      <div className="login-stage" data-theme={theme}>
        <div className="login-bg"><div className="login-grid"></div></div>
        <div className="login-scroll">
          <div className={"login-card fade-in" + (view === "mobile" ? " sheet" : "")} key={screen}>
            {body}
          </div>
          {view === "desktop" && (
            <div className="below-card">© 2026 AnunciaYA · <a href="#">Soporte</a> · <a href="#">Privacidad</a></div>
          )}
        </div>
      </div>
    );

    return (
      <>
        <div className="harness">
          <span className="harness-brand"><span className="dot"></span> AnunciaYA <span className="muted">· Acceso al Panel</span></span>
          <span className="harness-spacer"></span>

          <span className="harness-group" ref={demoRef} style={{ position: "relative" }}>
            <button className="icon-btn" style={{ width: "auto", padding: "0 10px", gap: 6, fontSize: 12.5 }}
              onClick={() => setDemoOpen((v) => !v)}>
              Cuentas de prueba
            </button>
            {demoOpen && (
              <div className="demo">
                <div className="d-head">Toca una cuenta para rellenar el correo · contraseña: cualquiera</div>
                {DEMO.map((d) => (
                  <button className="demo-item" key={d.mail} onClick={() => useDemo(d)}>
                    <span className="di-av" style={{ background: d.color }}>{d.initials}</span>
                    <span className="di-main">
                      <span className="di-role">{d.role}</span>
                      <span className="di-mail">{d.mail}</span>
                    </span>
                    {d.twofa && <span className="di-2fa">2FA</span>}
                  </button>
                ))}
              </div>
            )}
          </span>

          <span className="harness-group">
            <span className="harness-label">Pantalla</span>
            <div className="seg">
              <button data-on={screen === "login"} onClick={() => gotoScreen("login")}>Acceso</button>
              <button data-on={screen === "twofa"} onClick={() => gotoScreen("twofa")}>2FA</button>
              <button data-on={screen === "recover"} onClick={() => gotoScreen("recover")}>Recuperar</button>
            </div>
          </span>
          <span className="harness-group">
            <span className="harness-label">Vista</span>
            <div className="seg">
              <button data-on={view === "desktop"} onClick={() => setView("desktop")}><Icon name="monitor" className="ic" /> Escritorio</button>
              <button data-on={view === "mobile"} onClick={() => setView("mobile")}><Icon name="smartphone" className="ic" /> Móvil</button>
            </div>
          </span>
          <button className="icon-btn" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} aria-label="Tema">
            <Icon name={theme === "dark" ? "sun" : "moon"} className="ic" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {view === "desktop" ? stage : (
          <div className="phone-stage">
            <div className="phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="login-stage" data-theme={theme} style={{ height: "100%" }}>
                  <div className="login-bg"><div className="login-grid"></div></div>
                  <StatusBar />
                  <div className="login-scroll" style={{ flex: 1 }}>
                    <div className="login-card sheet fade-in" key={screen}>{body}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<LoginApp />);
})();
