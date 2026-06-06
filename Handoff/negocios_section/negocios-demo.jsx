/* negocios-demo.jsx — harness SOLO para previsualizar la sección Negocios
   en PC/Móvil y Claro/Oscuro. NO forma parte de la sección; en tu app
   montas <NegociosTable> / <NegociosCards> dentro de tu propio shell. */
(function () {
  const { useState } = React;
  const { NegociosTable, NegociosCards, Detail } = window.Negocios;

  function Demo() {
    const [theme, setTheme] = useState("light");
    const [view, setView] = useState("desktop");
    const [sel, setSel] = useState(null);

    return (
      <div className="demo-root" data-theme={theme}>
        <div className="demo-bar">
          <span className="demo-title">Sección <b>Negocios</b> <span className="muted">· demo de integración</span></span>
          <span className="demo-spacer"></span>
          <div className="demo-seg">
            <button data-on={view === "desktop"} onClick={() => setView("desktop")}>Escritorio</button>
            <button data-on={view === "mobile"} onClick={() => setView("mobile")}>Móvil</button>
          </div>
          <div className="demo-seg">
            <button data-on={theme === "light"} onClick={() => setTheme("light")}>Claro</button>
            <button data-on={theme === "dark"} onClick={() => setTheme("dark")}>Oscuro</button>
          </div>
        </div>

        <div className="demo-stage">
          {view === "desktop" ? (
            <div className="demo-panel">
              <NegociosTable onOpen={setSel} />
              {sel && <Detail biz={sel} view="desktop" onClose={() => setSel(null)} />}
            </div>
          ) : (
            <div className="demo-phone">
              <div className="demo-phone-screen">
                <div className="demo-mcontent">
                  <NegociosCards onOpen={setSel} />
                </div>
                {sel && <Detail biz={sel} view="mobile" onClose={() => setSel(null)} />}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<Demo />);
})();
