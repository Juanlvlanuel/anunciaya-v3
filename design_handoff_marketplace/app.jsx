// app.jsx — Marketplace AY · 12 pantallas × 3 resoluciones
// Se integra dentro de la cáscara de AnunciaYA (header negro+grid+verde, BottomNav 5 tabs+FAB)

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showHints":   true,
  "showAYShell": true
}/*EDITMODE-END*/;

function MobileFrame({ children }) {
  return (
    <IOSDevice width={360} height={740}>
      {children}
    </IOSDevice>
  );
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const tk = `${tweaks.showHints}|${tweaks.showAYShell}`;

  // Mobile screens — sin onboarding (sesión heredada de AY) · sin "Mis publicaciones" (global)
  const mobile = [
    { id:'m-home',  label:'01 · Home Marketplace',     comp: <B_Home /> },
    { id:'m-busco', label:'02 · Lo busco (modo inverso)', comp: <B_LoBusco /> },
    { id:'m-cat',   label:'03 · Categorías',           comp: <B_Categories /> },
    { id:'m-srch',  label:'04 · Búsqueda + filtros',   comp: <B_Search /> },
    { id:'m-det',   label:'05 · Detalle producto',     comp: <B_Detail /> },
    { id:'m-sel',   label:'06 · Perfil vendedor',      comp: <B_Seller /> },
    { id:'m-p1',    label:'07a · Publicar · fotos',    comp: <B_PostStep step={1} /> },
    { id:'m-p2',    label:'07b · Publicar · detalles', comp: <B_PostStep step={2} /> },
    { id:'m-p3',    label:'07c · Publicar · contacto', comp: <B_PostStep step={3} /> },
    { id:'m-stat',  label:'08 · Estadísticas pub.',    comp: <B_Stats /> },
    { id:'m-chat',  label:'09 · Chat',                 comp: <B_Chat /> },
    { id:'m-notif', label:'10 · Notificaciones',       comp: <B_Notifs /> },
    { id:'m-fav',   label:'11 · Favoritos',            comp: <B_Favs /> },
  ];

  // Desktop screens — sin onboarding · sin "Mis publicaciones"
  const buildDesktop = (d, prefix) => [
    { id:`${prefix}-home`,  label:'01 · Home',                 comp: <D_Home d={d}/> },
    { id:`${prefix}-busco`, label:'02 · Lo busco',             comp: <D_LoBusco d={d}/> },
    { id:`${prefix}-cat`,   label:'03 · Categorías',           comp: <D_Categories d={d}/> },
    { id:`${prefix}-srch`,  label:'04 · Búsqueda + filtros',   comp: <D_Search d={d}/> },
    { id:`${prefix}-det`,   label:'05 · Detalle producto',     comp: <D_Detail d={d}/> },
    { id:`${prefix}-sel`,   label:'06 · Perfil vendedor',      comp: <D_Seller d={d}/> },
    { id:`${prefix}-p1`,    label:'07a · Publicar · fotos',    comp: <D_Post d={d} step={1}/> },
    { id:`${prefix}-p2`,    label:'07b · Publicar · detalles', comp: <D_Post d={d} step={2}/> },
    { id:`${prefix}-p3`,    label:'07c · Publicar · contacto', comp: <D_Post d={d} step={3}/> },
    { id:`${prefix}-stat`,  label:'08 · Estadísticas pub.',    comp: <D_Stats d={d}/> },
    { id:`${prefix}-chat`,  label:'09 · Chat',                 comp: <D_Chat d={d}/> },
    { id:`${prefix}-notif`, label:'10 · Notificaciones',       comp: <D_Notifs d={d}/> },
    { id:`${prefix}-fav`,   label:'11 · Favoritos',            comp: <D_Favs d={d}/> },
  ];
  const lg = buildDesktop(D.lg, 'lg');
  const xxl = buildDesktop(D['2xl'], 'xxl');

  return (
    <>
      <DesignCanvas key={tk}>

        <DCSection
          id="intro"
          title="Marketplace AY · alineado con la cáscara de AnunciaYA"
          subtitle="Mobile · Laptop (1280) · Full HD (1600) — header negro+grid+verde · BottomNav 5 tabs · sin onboarding propio"
        >
          <DCArtboard id="brief" label="Brief + Diferenciadores" width={680} height={680}>
            <BriefCard/>
          </DCArtboard>
          <DCArtboard id="legend" label="Densidades · Tailwind v4" width={680} height={680}>
            <DensityLegend/>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="mobile"
          title="📱 Mobile · base"
          subtitle="iPhone 14 · 360×740 — primero táctil · header AY + 5-tab BottomNav con FAB chat"
        >
          {mobile.map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={360} height={740}>
              <MobileFrame>{s.comp}</MobileFrame>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection
          id="lg"
          title="💻 Laptop · lg (≥1024px)"
          subtitle="1280×720 — header horizontal · 4 cols grid · max-w-[1200px] mx-auto"
        >
          {lg.map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={1280} height={720 + 36}>
              <DesktopFrame d={D.lg}>{s.comp}</DesktopFrame>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection
          id="xxl"
          title="🖥️ Full HD · 2xl (≥1536px)"
          subtitle="1600×900 — más densidad · 6 cols grid · header con nav · hero ampliado · max-w-[1640px]"
        >
          {xxl.map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={1600} height={900 + 36}>
              <DesktopFrame d={D['2xl']}>{s.comp}</DesktopFrame>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="flow" title="Flujo de navegación" subtitle="Cómo se conectan las pantallas — y cómo se conecta con el resto de AY">
          <DCArtboard id="flowmap" label="Mapa de flujo" width={960} height={560}>
            <FlowMap />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Marketplace AY">
        <TweakSection label="Cáscara de AY">
          <TweakToggle
            label="Mostrar header AY (negro+verde)"
            value={tweaks.showAYShell}
            onChange={v => setTweak('showAYShell', v)}
          />
        </TweakSection>
        <TweakSection label="Anotaciones">
          <TweakToggle
            label="Hints Tailwind v4 sobre vistas"
            value={tweaks.showHints}
            onChange={v => setTweak('showHints', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Brief card · refrescado con DIFERENCIADORES vs ML/FB
// ─────────────────────────────────────────────────────────────
function BriefCard() {
  const green = '#10B981', greenDark = '#059669';
  return (
    <div style={{ padding: 32, fontFamily:'"Geist", system-ui', color:'#0F172A', background:'#FAFAFA', height:'100%', overflow:'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: greenDark, letterSpacing: 1.2, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>
        Brief · Marketplace AY
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.1, marginTop: 8, maxWidth: 600 }}>
        Vitrina <span style={{ color: green }}>vecinal</span>, no checkout. <br/>
        Diseñada para que <span style={{ color: green }}>se sienta mejor que Facebook</span>.
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 12, color:'#475569', letterSpacing: -0.1, maxWidth: 560 }}>
        Los usuarios <b style={{ color:'#0F172A' }}>promueven</b> sus artículos. La app no procesa pagos: el contacto va por <b>chat AY</b>, <b>WhatsApp</b> o <b>llamada</b>. Monetización por <b>destacados</b>.
      </div>

      {/* Diferenciadores */}
      <div style={{ marginTop: 22, padding: 16, background:'#fff', border:`1.5px solid ${green}`, borderRadius: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: greenDark, letterSpacing: 1, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace', marginBottom: 12 }}>
          5 cosas que NO tienen ML ni FB Marketplace
        </div>
        {[
          { n:'01', t:'Modo "Lo busco" (inverso)',          d:'El comprador publica qué necesita; los vendedores responden. Cierra la asimetría del catálogo tradicional.' },
          { n:'02', t:'Distancia en cuadras, no km',         d:'Hiperlocal real. "A 8 cuadras" pega más que "1.2 km" cuando hablamos de barrio.' },
          { n:'03', t:'Chips de modalidad de precio',        d:'Acepta oferta · Precio fijo · Trueque OK. Acaba con el "¿lo último?" en chat.' },
          { n:'04', t:'Karma de vecino + verificación',      d:'Score visible basado en transacciones limpias dentro de AY. Cédula verificada = badge verde.' },
          { n:'05', t:'Cupones AY cruzados',                 d:'Si el comercio aliado da cupón AY, aparece en la ficha del producto. Algo que ML jamás te va a dar.' },
        ].map(x => (
          <div key={x.n} style={{ display:'flex', gap: 12, marginBottom: 10 }}>
            <div style={{ fontFamily:'"Geist Mono", monospace', fontSize: 11, color: green, fontWeight: 700, paddingTop: 2 }}>{x.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color:'#0F172A', letterSpacing: -0.2 }}>{x.t}</div>
              <div style={{ fontSize: 11.5, color:'#475569', marginTop: 1, letterSpacing: -0.05, lineHeight: 1.45 }}>{x.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop:'1px solid #E2E8F0', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14 }}>
        {[
          { k:'Resoluciones', v:'3', sub:'Mobile · Laptop · Full HD' },
          { k:'Pantallas', v:'12', sub:'cada una × 3 = 36 vistas' },
          { k:'Mis pubs', v:'global', sub:'/mis-publicaciones (fuera)' },
        ].map(s => (
          <div key={s.k}>
            <div style={{ fontSize: 10, color:'#475569', letterSpacing: 0.4, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>{s.k}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color:'#0F172A', letterSpacing: -0.6, marginTop: 4 }}>{s.v}</div>
            <div style={{ fontSize: 11, color:'#475569', marginTop: 1, letterSpacing: -0.05 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background:'#0F172A', borderRadius: 10, fontSize: 11.5, color:'#FAFAFA', lineHeight: 1.5, letterSpacing: -0.1, fontFamily:'"Geist Mono", monospace' }}>
        <b style={{ color: green }}>nota →</b> "Mis publicaciones" vive a NIVEL APP en /mis-publicaciones, fuera del marketplace. Hub centralizado para anuncios + cupones + dinámicas.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Density legend — Tailwind v4 reference
// ─────────────────────────────────────────────────────────────
function DensityLegend() {
  return (
    <div style={{ padding: 32, fontFamily:'"Geist", system-ui', color:'#0F172A', background:'#FAFAFA', height:'100%', overflow:'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color:'#059669', letterSpacing: 1.2, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>
        Sistema responsive · Tailwind v4
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.1, marginTop: 8, lineHeight: 1.1 }}>
        Densidades por breakpoint
      </div>
      <div style={{ fontSize: 13, color:'#475569', marginTop: 8, letterSpacing: -0.1, maxWidth: 560 }}>
        La app real ya tiene 2 sidebars fijos. El marketplace usa <b style={{ color:'#0F172A' }}>solo header horizontal</b> en desktop, y crece en columnas.
      </div>

      <div style={{ marginTop: 20, background:'#fff', border:'1px solid #E2E8F0', borderRadius: 12, overflow:'hidden' }}>
        <div style={{
          display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr',
          padding:'10px 14px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0',
          fontSize: 11, fontWeight: 600, color:'#475569',
          textTransform:'uppercase', letterSpacing: 0.4, fontFamily:'"Geist Mono", monospace',
        }}>
          <div>Token</div>
          <div>base</div>
          <div>lg: ≥1024</div>
          <div>2xl: ≥1536</div>
        </div>
        {[
          ['Viewport',    '360 × 740',    '1280 × 720',     '1600 × 900'],
          ['Container',   'w-full',       'max-w-[1200px]', 'max-w-[1640px]'],
          ['Padding X',   'px-4',         'lg:px-6',        '2xl:px-10'],
          ['Grid prods',  'grid-cols-2',  'lg:grid-cols-4', '2xl:grid-cols-6'],
          ['Gap',         'gap-3',        'lg:gap-4',       '2xl:gap-5'],
          ['Header',      'AY shell',     'lg:h-14',        '2xl:h-16'],
          ['BottomNav',   'AY 5 tabs',    'oculto',         'oculto'],
          ['Title',       'text-2xl',     'lg:text-3xl',    '2xl:text-4xl'],
          ['Detail hero', 'aspect-square','lg:aspect-square','2xl:w-[700px]'],
        ].map(([k, ...vs], i) => (
          <div key={i} style={{
            display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr',
            padding:'9px 14px', borderBottom: i === 8 ? 'none' : '1px solid #F1F5F9',
            fontSize: 12.5,
          }}>
            <div style={{ fontWeight: 600, color:'#0F172A', letterSpacing: -0.1 }}>{k}</div>
            {vs.map((v, j) => (
              <div key={j} style={{ fontFamily:'"Geist Mono", monospace', fontSize: 11.5, color:'#0F172A', letterSpacing: -0.05 }}>{v}</div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 14, background:'#fff', border:'1px solid #E2E8F0', borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color:'#475569', letterSpacing: 0.6, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace', marginBottom: 8 }}>@theme · CSS-first (v4) · tokens AY</div>
        <pre style={{
          margin: 0, padding: 12, background:'#0F172A', color:'#86EFAC',
          borderRadius: 8, fontFamily:'"Geist Mono", monospace', fontSize: 11, lineHeight: 1.55,
          letterSpacing: -0.05, overflow:'auto',
        }}>{`@theme {
  --color-ay-green:      #10B981;
  --color-ay-green-dark: #059669;
  --color-ay-ink:        #0F172A;
  --color-ay-ink-soft:   #475569;
  --color-ay-line:       #E2E8F0;
  --color-ay-bg:         #F5F7FB;

  /* verde solo en: precios · CTAs · badges activos · verificado */
}`}</pre>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Flow map — actualizado con "Lo busco" + Mis pubs como nodo externo
// ─────────────────────────────────────────────────────────────
function FlowMap() {
  const ink = '#0F172A', green = '#10B981', faint = '#94A3B8', line = '#E2E8F0';
  const nodes = [
    { id:'ay',    x: 30,  y: 30,  w: 130, label:'AY · sesión', external:true },
    { id:'mine',  x: 30,  y: 130, w: 130, label:'/mis-publicaciones', external:true, accent:true },
    { id:'home',  x: 200, y: 30,  w: 130, label:'Home Market',  hub:true },
    { id:'busco', x: 370, y: 30,  w: 130, label:'Lo busco', accent:true },
    { id:'cat',   x: 540, y: 30,  w: 130, label:'Categorías' },
    { id:'srch',  x: 710, y: 30,  w: 130, label:'Búsqueda' },
    { id:'det',   x: 290, y: 160, w: 130, label:'Detalle producto' },
    { id:'sel',   x: 460, y: 160, w: 130, label:'Perfil vendedor' },
    { id:'chat',  x: 290, y: 280, w: 130, label:'Chat AY' },
    { id:'wa',    x: 460, y: 280, w: 130, label:'WhatsApp' },
    { id:'post',  x: 30,  y: 280, w: 130, label:'Publicar (3 pasos)' },
    { id:'stat',  x: 30,  y: 400, w: 130, label:'Estadísticas pub.' },
    { id:'notif', x: 630, y: 280, w: 130, label:'Notificaciones' },
    { id:'fav',   x: 800, y: 280, w: 130, label:'Favoritos' },
    { id:'boost', x: 200, y: 400, w: 130, label:'Destacar (monet.)', accent:true, dashed:true },
  ];
  const edges = [
    ['ay','home'],['home','cat'],['home','srch'],['cat','srch'],
    ['home','busco'],['busco','det'],
    ['home','det'],['srch','det'],['cat','det'],
    ['det','sel'],['sel','det'],
    ['det','chat'],['det','wa'],['sel','chat'],
    ['home','post'],['post','mine'],['post','boost'],['mine','stat'],['mine','boost'],
    ['home','notif'],['home','fav'],['fav','det'],
    ['chat','notif'],
  ];
  const N = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div style={{ height:'100%', background:'#F5F7FB', fontFamily:'"Geist", system-ui', position:'relative', overflow:'hidden', padding: 24 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: ink, letterSpacing:-0.8, lineHeight: 1 }}>Flujo de navegación</div>
      <div style={{ fontSize: 12.5, color:'#475569', marginTop: 6, letterSpacing: -0.1, maxWidth: 760 }}>
        Sesión heredada de AY · sin onboarding propio. <b style={{ color: ink }}>Home</b> es el hub. <b style={{ color: green }}>"Lo busco"</b> y <b style={{ color: green }}>/mis-publicaciones</b> son módulos diferenciados (verde). La app no procesa pagos.
      </div>

      <svg width="950" height="500" style={{ position:'absolute', top: 70, left: 16 }}>
        <defs>
          <marker id="arrM" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={faint}/>
          </marker>
          <marker id="arrG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={green}/>
          </marker>
        </defs>
        {edges.map(([a,b], i) => {
          const na = N[a], nb = N[b];
          if (!na || !nb) return null;
          const x1 = na.x + na.w/2 - 16, y1 = na.y + 8;
          const x2 = nb.x + nb.w/2 - 16, y2 = nb.y + 8;
          const isAccent = b === 'boost' || b === 'busco' || a === 'mine';
          return (
            <path key={i}
              d={`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`}
              stroke={isAccent ? green : faint}
              strokeWidth={isAccent ? 1.5 : 1.2}
              strokeDasharray={b === 'boost' ? '4 4' : undefined}
              fill="none"
              markerEnd={isAccent ? 'url(#arrG)' : 'url(#arrM)'}
              opacity={isAccent ? 0.95 : 0.65}
            />
          );
        })}
      </svg>

      {nodes.map(n => (
        <div key={n.id} style={{
          position:'absolute', left: n.x, top: n.y + 60,
          width: n.w, padding:'10px 12px',
          background: n.hub ? ink : (n.external ? '#F8FAFC' : '#fff'),
          color: n.hub ? '#fff' : (n.accent ? '#059669' : ink),
          border: n.hub ? 'none' : `1.5px ${(n.external || n.dashed) ? 'dashed' : 'solid'} ${n.accent ? green : (n.external ? faint : line)}`,
          borderRadius: 10,
          fontFamily:'"Geist", system-ui', fontSize: 12, fontWeight: 600, letterSpacing: -0.2,
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          textAlign:'center',
        }}>
          {n.label}
          {n.hub && <div style={{ fontFamily:'"Geist Mono", monospace', fontSize: 9, color: green, marginTop: 3, fontWeight: 700, textTransform:'uppercase', letterSpacing: 0.8 }}>HUB</div>}
          {n.external && !n.hub && <div style={{ fontFamily:'"Geist Mono", monospace', fontSize: 8.5, color: faint, marginTop: 2, fontWeight: 600, textTransform:'uppercase', letterSpacing: 0.8 }}>FUERA</div>}
        </div>
      ))}

      <div style={{ position:'absolute', bottom: 16, right: 16, background:'#fff', borderRadius: 10, padding:'10px 12px', border:`1px solid ${line}`, fontFamily:'"Geist Mono", monospace', fontSize: 10, color:'#475569', letterSpacing: 0.3 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 5 }}>
          <div style={{ width: 18, height: 1.5, background: faint }}/> NAVEGACIÓN
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 5 }}>
          <div style={{ width: 18, height: 1.5, background: green }}/> DIFERENCIADOR
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <div style={{ width: 18, borderTop:`1.5px dashed ${green}` }}/> MONETIZACIÓN
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
