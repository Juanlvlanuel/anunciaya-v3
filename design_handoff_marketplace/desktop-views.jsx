// desktop-views.jsx — 12 pantallas en desktop · lg (1280×720 panel) y 2xl (1600×900 panel)
// Sin sidebar (la app real ya tiene 2 sidebars). Header horizontal denso.
// Geist + Lucide + Unsplash. Tokens del Plaza Clean (window.B_TOKENS).
//
// Densities:
//   lg:  cols=4, padX=24, gap=16, contentMax=1200, headerH=56
//   2xl: cols=6, padX=40, gap=20, contentMax=1640, headerH=64
//
// Todos los componentes reciben `d` (density object) y `T` (tokens en vivo).

const D = {
  lg: {
    name: 'lg',
    label: 'Laptop · 1280×720',
    res: '1280 × 720',
    tw: 'lg:',
    cols: 4,
    padX: 24,
    gap: 16,
    contentMax: 1200,
    headerH: 56,
    fsTitle: 28,
    fsCard: 14,
    fsBody: 13,
    detailHero: 540,
  },
  '2xl': {
    name: '2xl',
    label: 'Full HD · 1600×900',
    res: '1600 × 900',
    tw: '2xl:',
    cols: 6,
    padX: 40,
    gap: 20,
    contentMax: 1640,
    headerH: 64,
    fsTitle: 34,
    fsCard: 15,
    fsBody: 13.5,
    detailHero: 700,
  },
};

const T = () => window.B_TOKENS; // live tokens (mutated by tweaks)

// ─────────────────────────────────────────────────────────────
// Browser frame — wraps a fixed-size desktop screen with realistic chrome
// ─────────────────────────────────────────────────────────────
function DesktopFrame({ d, children }) {
  const W = d.name === 'lg' ? 1280 : 1600;
  const H = d.name === 'lg' ? 720 : 900;
  return (
    <div style={{
      width: W, height: H + 36, // +chrome
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 0 rgba(0,0,0,.04), 0 0 0 1px #E4E4E7',
      fontFamily: '"Geist", "Inter", system-ui, sans-serif',
    }}>
      {/* Browser chrome */}
      <div style={{
        height: 36, background: '#F4F4F5', borderBottom: '1px solid #E4E4E7',
        display:'flex', alignItems:'center', padding: '0 14px', gap: 12,
      }}>
        <div style={{ display:'flex', gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background:'#FF5F57' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', background:'#FEBC2E' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', background:'#28C840' }} />
        </div>
        <div style={{
          flex: 1, maxWidth: 500, margin: '0 auto',
          background: '#fff', borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: '#71717A', textAlign: 'center',
          fontFamily: 'ui-monospace, monospace', letterSpacing: -0.1,
          border: '1px solid #E4E4E7',
        }}>
          anunciaya.com/marketplace
        </div>
        <div style={{ width: 80, fontSize: 10, color:'#A1A1AA', fontFamily:'ui-monospace, monospace', textAlign:'right' }}>{d.res}</div>
      </div>
      <div style={{ height: H, overflow: 'hidden', background: T().bg }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TW hint — small floating tag with Tailwind classes for that section
// ─────────────────────────────────────────────────────────────
function TWHint({ children, top = 12, right = 12, position = 'absolute' }) {
  return (
    <div style={{
      position, top, right,
      background: '#0A0A0A', color: '#A5F3FC',
      fontFamily: 'ui-monospace, "Geist Mono", monospace',
      fontSize: 10.5, fontWeight: 500, letterSpacing: -0.05,
      padding: '5px 9px', borderRadius: 6,
      lineHeight: 1.4,
      boxShadow: '0 4px 12px -4px rgba(0,0,0,.4)',
      zIndex: 20,
      maxWidth: 320,
      whiteSpace: 'pre-line',
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Header — top horizontal nav (no sidebar) — answers question pattern
// Logo · Ubicación · Buscar · Nav cat · Publicar CTA · íconos
// ─────────────────────────────────────────────────────────────
function DHeader({ d, page = 'home' }) {
  const t = T();
  const cats = ['Inicio', 'Categorías', 'Cerca de mí', 'Trending', 'Publicaciones'];
  const padX = d.padX;

  return (
    <header style={{
      height: d.headerH,
      background: t.surface,
      borderBottom: `1px solid ${t.line}`,
      display: 'flex', alignItems: 'center',
      padding: `0 ${padX}px`,
      gap: d.name === '2xl' ? 24 : 16,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: t.btnGrad,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 1px 2px rgba(0,0,0,.2)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background:'#fff' }}/>
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, color: t.ink, letterSpacing: -0.4 }}>Marketplace</div>
      </div>

      {/* Location selector */}
      <button style={{
        display:'inline-flex', alignItems:'center', gap: 6,
        background: t.surface2, border: `1px solid ${t.lineSoft}`,
        borderRadius: 8, padding: '6px 10px',
        fontSize: 12.5, fontWeight: 500, color: t.ink, letterSpacing: -0.1,
        cursor: 'default',
      }}>
        <Icon name="map-pin" size={13} stroke={t.ink} sw={2}/>
        Palermo
        <span style={{ color: t.inkFaint, fontWeight: 400 }}>· 3km</span>
        <Icon name="chev-down" size={11} stroke={t.inkSoft}/>
      </button>

      {/* Search */}
      <div style={{
        flex: 1, maxWidth: d.name === '2xl' ? 560 : 420,
        background: t.surface2, border: `1px solid ${t.lineSoft}`,
        borderRadius: 8, padding: '7px 12px',
        display:'flex', alignItems:'center', gap: 9,
      }}>
        <Icon name="search" size={14} stroke={t.inkSoft}/>
        <input
          placeholder="Buscar productos, vendedores, categorías..."
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontFamily: 'inherit', fontSize: 13, color: t.ink, letterSpacing: -0.1,
          }}
        />
        <div style={{
          fontFamily:'"Geist Mono", monospace', fontSize: 10, color: t.inkFaint,
          border:`1px solid ${t.line}`, borderRadius: 4, padding:'1px 5px',
        }}>⌘K</div>
      </div>

      {/* Nav (only at 2xl shows full, lg shows abbreviated) */}
      {d.name === '2xl' && (
        <nav style={{ display:'flex', gap: 4, fontSize: 13 }}>
          {cats.map((c, i) => (
            <a key={i} style={{
              padding:'6px 10px', borderRadius: 6,
              fontWeight: i === 0 ? 600 : 500,
              color: i === 0 ? t.ink : t.inkSoft,
              background: i === 0 ? t.surface2 : 'transparent',
              letterSpacing: -0.1, cursor:'default',
            }}>{c}</a>
          ))}
        </nav>
      )}

      <div style={{ flex: d.name === '2xl' ? 0 : 1 }}/>

      {/* CTA Publicar — gradient ink */}
      <button style={{
        display:'inline-flex', alignItems:'center', gap: 7,
        background: t.btnGrad, color: '#fff',
        border: '1px solid rgba(0,0,0,.1)',
        borderRadius: 9, padding: '8px 14px',
        fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
        boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.25)',
        cursor: 'default',
      }}>
        <Icon name="plus" size={14} stroke="#fff" sw={2.4}/>
        Publicar
      </button>

      {/* Icons */}
      <div style={{ display:'flex', gap: 4 }}>
        {['heart','message-circle','bell'].map((ic, i) => (
          <div key={ic} style={{
            width: 34, height: 34, borderRadius: 8,
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative',
          }}>
            <Icon name={ic} size={17} stroke={t.ink} sw={1.8}/>
            {i === 2 && <div style={{
              position:'absolute', top: 7, right: 7, width: 7, height: 7,
              borderRadius:'50%', background: t.accent, border:'2px solid '+t.surface,
            }}/>}
          </div>
        ))}
      </div>

      {/* Avatar */}
      <Avatar name="Tu" size={30}/>
    </header>
  );
}

// Tab indicator (alt to horizontal nav, used in some pages — like inline section tabs)
function DSecTabs({ d, items, active = 0 }) {
  const t = T();
  return (
    <div style={{ display:'flex', gap: 0, borderBottom: `1px solid ${t.line}` }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding:'10px 14px',
          fontSize: 13, fontWeight: i === active ? 600 : 500,
          color: i === active ? t.ink : t.inkSoft,
          borderBottom: i === active ? `2px solid ${t.ink}` : '2px solid transparent',
          marginBottom: -1,
          letterSpacing: -0.1,
          display:'inline-flex', alignItems:'center', gap: 6,
        }}>
          {it.icon && <Icon name={it.icon} size={13} stroke={i === active ? t.ink : t.inkSoft}/>}
          {it.name}
          {it.count !== undefined && <span style={{
            fontFamily:'"Geist Mono", monospace', fontSize: 10,
            background: t.surface2, padding:'1px 6px', borderRadius: 999,
            color: t.inkSoft, fontWeight: 500,
          }}>{it.count}</span>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card — desktop product card. Cleaner, more horizontal.
// ─────────────────────────────────────────────────────────────
function DCard({ p, d }) {
  const t = T();
  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative', borderRadius: 10, overflow:'hidden', background: t.surface2 }}>
        <ProductImage src={p.img} aspect={1} rounded={0}/>
        {p.boost && (
          <div style={{
            position:'absolute', top: 8, left: 8,
            background: t.surface, color: t.ink,
            fontSize: 10, fontWeight: 600, letterSpacing: -0.1,
            padding:'3px 7px', borderRadius: 5,
            display:'inline-flex', alignItems:'center', gap: 4,
            boxShadow:'0 1px 2px rgba(0,0,0,.08)',
          }}>
            <Icon name="sparkles" size={10} stroke={t.ink} sw={2.2}/> Destacado
          </div>
        )}
        {p.new && !p.boost && (
          <div style={{
            position:'absolute', top: 8, left: 8,
            background: t.ink, color: '#fff',
            fontSize: 10, fontWeight: 600, letterSpacing: -0.1,
            padding:'3px 7px', borderRadius: 5,
          }}>Nuevo</div>
        )}
        <div style={{
          position:'absolute', top: 8, right: 8,
          width: 30, height: 30, borderRadius:'50%',
          background:'rgba(255,255,255,0.95)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 1px 2px rgba(0,0,0,.06)',
        }}>
          <Icon name="heart" size={13} stroke={t.ink} sw={2}/>
        </div>
      </div>
      <div style={{ fontSize: d.fsCard + 1, fontWeight: 600, color: t.ink, marginTop: 8, letterSpacing: -0.3 }}>
        {fmtPrice(p.price)}
      </div>
      <div style={{
        fontSize: d.fsCard - 2, color: t.inkSoft, marginTop: 1,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        letterSpacing: -0.1,
      }}>{p.title}</div>
      <div style={{ fontSize: 11, color: t.inkFaint, marginTop: 4, display:'flex', alignItems:'center', gap: 4 }}>
        <Icon name="map-pin" size={10} stroke={t.inkFaint} sw={2}/>
        {p.dist} · {p.hood}
      </div>
    </div>
  );
}

// Common page chrome (header + scroll region)
function DPage({ d, children, hint }) {
  return (
    <div style={{ height: '100%', overflow:'auto', position:'relative' }}>
      <DHeader d={d}/>
      <div style={{ position:'relative' }}>
        {children}
      </div>
      {hint && <TWHint>{hint}</TWHint>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 01 — Onboarding (login/sign-up)
// ─────────────────────────────────────────────────────────────
function D_Onboarding({ d }) {
  const t = T();
  return (
    <div style={{ height: '100%', background: t.bg, position:'relative', display:'flex' }}>
      {/* Left — Hero */}
      <div style={{
        flex: 1, padding: `${d.padX + 30}px ${d.padX + 20}px`,
        background: t.btnGrad, color:'#fff', position:'relative', overflow:'hidden',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background:'#fff' }}/>
          </div>
          <div style={{ fontWeight: 600, fontSize: 17, letterSpacing: -0.5 }}>Marketplace</div>
        </div>
        <div style={{
          fontSize: d.name === '2xl' ? 64 : 52, fontWeight: 600,
          letterSpacing: -2.4, lineHeight: 1.0, marginTop: d.name === '2xl' ? 80 : 54,
          maxWidth: 600,
        }}>
          Publicá.<br/>Conectá.<br/>Arreglá en persona.
        </div>
        <div style={{ fontSize: 16, color:'rgba(255,255,255,.6)', marginTop: 22, letterSpacing: -0.1, maxWidth: 480, lineHeight: 1.5 }}>
          Vitrina local sin comisiones. La app te conecta — el trato lo cerrás vos, en persona o por WhatsApp.
        </div>
        {/* 2x2 image collage decoratively */}
        <div style={{
          position:'absolute', right: -60, bottom: -60,
          display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12,
          width: d.name === '2xl' ? 480 : 380,
          transform: 'rotate(-8deg)',
        }}>
          {[PRODUCTS[0], PRODUCTS[7], PRODUCTS[4], PRODUCTS[1]].map((p, i) => (
            <div key={p.id} style={{ borderRadius: 12, overflow:'hidden', boxShadow:'0 12px 40px -10px rgba(0,0,0,.5)' }}>
              <ProductImage src={p.img} aspect={i % 2 ? 1 : 0.85} rounded={0}/>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        width: d.name === '2xl' ? 520 : 420,
        background: t.surface,
        padding: `${d.padX + 30}px ${d.padX + 20}px`,
        display:'flex', flexDirection:'column', justifyContent:'center',
      }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: t.ink, letterSpacing: -0.8 }}>
          Crear cuenta
        </div>
        <div style={{ fontSize: 13.5, color: t.inkSoft, marginTop: 4, letterSpacing: -0.1 }}>
          Empezá a vender en menos de 2 minutos.
        </div>

        <div style={{ marginTop: 26 }}>
          {[
            { label: 'Nombre completo', val: 'Lucía M.', ico: 'user' },
            { label: 'Email', val: 'lucia.m@email.com', ico: 'at-sign' },
            { label: 'Contraseña', val: '••••••••••', ico: 'shield' },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: t.inkSoft, marginBottom: 6, letterSpacing: -0.05, textTransform:'uppercase' }}>{f.label}</div>
              <div style={{
                display:'flex', alignItems:'center', gap: 10,
                background: t.surface2, border: `1px solid ${t.lineSoft}`,
                borderRadius: 9, padding: '10px 12px',
              }}>
                <Icon name={f.ico} size={15} stroke={t.inkSoft}/>
                <div style={{ fontSize: 13.5, color: t.ink, letterSpacing: -0.1 }}>{f.val}</div>
              </div>
            </div>
          ))}
        </div>

        <button style={{
          marginTop: 8, background: t.btnGrad, color:'#fff',
          border: '1px solid rgba(0,0,0,.1)', borderRadius: 10,
          padding: '12px 18px', fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
          boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.25)',
        }}>Crear cuenta</button>

        <div style={{ display:'flex', alignItems:'center', gap: 8, margin: '20px 0', fontSize: 11, color: t.inkFaint, fontFamily:'"Geist Mono", monospace' }}>
          <div style={{ flex: 1, height: 1, background: t.lineSoft }}/>
          <span>O CONTINUÁ CON</span>
          <div style={{ flex: 1, height: 1, background: t.lineSoft }}/>
        </div>

        <div style={{ display:'flex', gap: 8 }}>
          {['Google', 'Apple', 'Email'].map(p => (
            <button key={p} style={{
              flex: 1, background: t.surface, border: `1px solid ${t.line}`,
              borderRadius: 9, padding: '10px 0', fontSize: 12.5, fontWeight: 500, color: t.ink,
            }}>{p}</button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 12, color: t.inkSoft, letterSpacing: -0.1, textAlign:'center' }}>
          ¿Ya tenés cuenta? <span style={{ color: t.ink, fontWeight: 600, textDecoration:'underline', textUnderlineOffset: 3 }}>Iniciar sesión</span>
        </div>
      </div>

      <TWHint>{`grid: hidden ${d.tw}flex
left: ${d.tw}flex-1 bg-gradient
right: w-[420px] ${d.tw}w-[520px]`}</TWHint>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 — Home
// ─────────────────────────────────────────────────────────────
function D_Home({ d }) {
  const t = T();
  return (
    <DPage d={d} hint={`grid-cols-2 sm:grid-cols-3 lg:grid-cols-${d.cols} ${d.tw}gap-${d.gap === 16 ? 4 : 5}`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `0 ${d.padX}px` }}>

        {/* Hero — banner destacado */}
        <div style={{
          marginTop: 24,
          background: t.btnGrad, color: '#fff',
          borderRadius: 16,
          padding: d.name === '2xl' ? '28px 32px' : '22px 26px',
          display:'flex', alignItems:'center', gap: 24,
          boxShadow:'0 1px 0 rgba(255,255,255,.06) inset, 0 8px 32px -16px rgba(0,0,0,.3)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', fontFamily:'"Geist Mono", monospace' }}>
              Cerca de Palermo · 247 nuevos hoy
            </div>
            <div style={{ fontSize: d.name === '2xl' ? 36 : 28, fontWeight: 600, letterSpacing: -1, marginTop: 8 }}>
              Lo que tu barrio está vendiendo
            </div>
            <div style={{ display:'flex', gap: 8, marginTop: 16 }}>
              <button style={{
                background:'#fff', color: t.ink, border:'none',
                padding:'8px 14px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
                display:'inline-flex', alignItems:'center', gap: 6,
              }}>
                <Icon name="zap" size={14} stroke={t.ink} sw={2.2}/> Explorar trending
              </button>
              <button style={{
                background:'transparent', color:'#fff', border:'1px solid rgba(255,255,255,.25)',
                padding:'8px 14px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
              }}>
                Ver categorías
              </button>
            </div>
          </div>

          {/* Right collage */}
          <div style={{ display:'flex', gap: 8 }}>
            {[PRODUCTS[0], PRODUCTS[6], PRODUCTS[9]].slice(0, d.name === '2xl' ? 3 : 2).map(p => (
              <div key={p.id} style={{ width: d.name === '2xl' ? 130 : 110, borderRadius: 10, overflow:'hidden' }}>
                <ProductImage src={p.img} aspect={1} rounded={0}/>
              </div>
            ))}
          </div>
        </div>

        {/* Categorías row */}
        <div style={{ marginTop: 28, display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.ink, letterSpacing: -0.5 }}>Categorías</div>
          <div style={{ fontSize: 12.5, color: t.inkSoft, fontWeight: 500 }}>Ver todas →</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: `repeat(${d.cols * 2}, 1fr)`, gap: 10 }}>
          {CATS.map(c => (
            <div key={c.id} style={{
              background: t.surface, border: `1px solid ${t.lineSoft}`,
              borderRadius: 10, padding: '12px 10px',
              display:'flex', flexDirection:'column', alignItems:'center', gap: 8,
              textAlign:'center',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: t.surface2,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon name={c.icon} size={17} stroke={t.ink} sw={1.7}/>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: t.ink, letterSpacing: -0.1 }}>{c.name}</div>
            </div>
          ))}
        </div>

        {/* Chips & filters bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 32, marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.ink, letterSpacing: -0.5 }}>Recién publicado</div>
          <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
            {['Cerca', 'Más nuevo', 'Precio ↑', 'Trending'].map((c, i) => (
              <BChip key={i} active={i === 0}>{c}</BChip>
            ))}
            <div style={{ width: 1, height: 18, background: t.line, margin: '0 6px' }}/>
            <BChip icon="grid">Grid</BChip>
          </div>
        </div>

        {/* Product grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns: `repeat(${d.cols}, 1fr)`,
          gap: d.gap, rowGap: d.gap + 8,
          paddingBottom: 60,
        }}>
          {Array.from({length: d.cols * 2}).map((_, i) => {
            const p = PRODUCTS[i % PRODUCTS.length];
            return <DCard key={i} p={p} d={d}/>;
          })}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 03 — Categorías
// ─────────────────────────────────────────────────────────────
function D_Categories({ d }) {
  const t = T();
  return (
    <DPage d={d} hint={`grid grid-cols-2 ${d.tw}grid-cols-4 gap-4
each card: aspect-[4/3] rounded-xl`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `28px ${d.padX}px 60px` }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: d.fsTitle, fontWeight: 600, color: t.ink, letterSpacing: -1, lineHeight: 1.0 }}>
              Categorías
            </div>
            <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 6, letterSpacing: -0.1 }}>
              Explorá por tipo de producto en tu zona.
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: t.inkSoft, letterSpacing: -0.1 }}>
            <span style={{ fontFamily:'"Geist Mono", monospace', color: t.ink, fontWeight: 600 }}>1.704</span> publicaciones activas
          </div>
        </div>

        {/* Featured cat — wide */}
        <div style={{
          marginTop: 24,
          background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 16, padding: 24,
          display:'flex', alignItems:'center', gap: 24,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 14,
            background: t.btnGrad,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Icon name="flame" size={36} stroke="#fff" sw={1.5}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: t.inkSoft, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>Más buscado esta semana</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: t.ink, marginTop: 4, letterSpacing: -0.7 }}>Muebles & decoración</div>
            <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 2, letterSpacing: -0.1 }}>337 publicaciones · 1.2k búsquedas hoy</div>
          </div>
          <button style={{
            background: t.btnGrad, color: '#fff',
            border: '1px solid rgba(0,0,0,.1)', borderRadius: 9,
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
          }}>Explorar →</button>
        </div>

        {/* Grid of categories with image preview */}
        <div style={{
          marginTop: 18,
          display:'grid', gridTemplateColumns: `repeat(${d.cols}, 1fr)`,
          gap: d.gap,
        }}>
          {CATS.map((c, i) => {
            const sample = PRODUCTS.find(p => p.cat === c.id) || PRODUCTS[i % PRODUCTS.length];
            const counts = [412, 186, 94, 251, 128, 337, 219, 77];
            return (
              <div key={c.id} style={{
                background: t.surface, border: `1px solid ${t.lineSoft}`,
                borderRadius: 12, padding: 14,
                display:'flex', flexDirection:'column', gap: 12,
                position:'relative', overflow:'hidden',
              }}>
                <div style={{ position:'relative', borderRadius: 8, overflow:'hidden', aspectRatio: '4/3' }}>
                  <ProductImage src={sample.img} aspect={4/3} rounded={0}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: t.surface2,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <Icon name={c.icon} size={16} stroke={t.ink} sw={1.7}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: t.inkSoft, fontFamily:'"Geist Mono", monospace' }}>{counts[i]} en zona</div>
                  </div>
                  <Icon name="chev-right" size={14} stroke={t.inkFaint}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 04 — Búsqueda + filtros (filters as TOP BAR — no left sidebar)
// ─────────────────────────────────────────────────────────────
function D_Search({ d }) {
  const t = T();
  return (
    <DPage d={d} hint={`flex flex-col
filters: sticky top-[56px] z-10
results: grid grid-cols-3 ${d.tw}grid-cols-${d.cols}`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `24px ${d.padX}px 60px` }}>

        {/* Result header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 500, letterSpacing: 0.4, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>Búsqueda</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: t.ink, letterSpacing: -0.8, marginTop: 4 }}>
              "silla vintage" <span style={{ color: t.inkFaint, fontWeight: 500, fontSize: 18 }}>· 24 resultados</span>
            </div>
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap: 6,
            background: t.surface, border: `1px solid ${t.line}`,
            borderRadius: 8, padding:'7px 12px',
            fontSize: 12.5, fontWeight: 500, color: t.ink,
          }}>
            <Icon name="sliders" size={13} stroke={t.ink}/>
            Más relevantes
            <Icon name="chev-down" size={11} stroke={t.inkSoft}/>
          </div>
        </div>

        {/* Filter bar — horizontal, sticky */}
        <div style={{
          marginTop: 18, padding: '12px 14px',
          background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 12,
          display:'flex', alignItems:'center', gap: 10,
          flexWrap:'wrap',
        }}>
          {/* Category filter */}
          <div style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, color: t.inkSoft, fontWeight: 500, letterSpacing: -0.1 }}>
            <Icon name="filter" size={13} stroke={t.inkSoft}/> Filtros activos:
          </div>
          <BChip active icon="x">Palermo + 3km</BChip>
          <BChip active icon="x">$0 – $30k</BChip>
          <BChip active icon="x">Como nuevo</BChip>
          <div style={{ width: 1, height: 18, background: t.line }}/>
          <BChip icon="plus">Categoría</BChip>
          <BChip icon="plus">Estado</BChip>
          <BChip icon="plus">Vendedor verificado</BChip>
          <div style={{ flex: 1 }}/>
          <button style={{
            background:'transparent', color: t.inkSoft,
            border:'none', fontSize: 12, fontWeight: 500, letterSpacing: -0.1,
          }}>Limpiar filtros</button>
        </div>

        {/* Price slider full-width */}
        <div style={{
          marginTop: 12, padding: 14,
          background: t.surface, border: `1px solid ${t.lineSoft}`,
          borderRadius: 12,
          display:'flex', alignItems:'center', gap: 18,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.ink, letterSpacing: -0.1, minWidth: 110 }}>Rango de precio</div>
          <div style={{ flex: 1, position:'relative', height: 4, background: t.surface2, borderRadius: 999 }}>
            <div style={{ position:'absolute', left:'10%', right:'30%', height: 4, background: t.ink, borderRadius: 999 }}/>
            <div style={{ position:'absolute', top: -6, left:'10%', width: 16, height: 16, borderRadius:'50%', background: t.surface, border: `2px solid ${t.ink}`, transform:'translateX(-50%)' }}/>
            <div style={{ position:'absolute', top: -6, left:'70%', width: 16, height: 16, borderRadius:'50%', background: t.surface, border: `2px solid ${t.ink}`, transform:'translateX(-50%)' }}/>
          </div>
          <div style={{ fontFamily:'"Geist Mono", monospace', fontSize: 11.5, color: t.ink, minWidth: 120, textAlign:'right' }}>$0 — $30.000</div>

          {/* Histogram */}
          <div style={{ display:'flex', alignItems:'flex-end', gap: 2, height: 28, width: 180 }}>
            {[4,6,12,18,22,16,10,7,14,9,5,3,2,1].map((v, i) => (
              <div key={i} style={{
                flex: 1, height: `${v/22*100}%`,
                background: i >= 1 && i <= 9 ? t.ink : t.line,
                borderRadius: 1,
              }}/>
            ))}
          </div>
        </div>

        {/* Results grid */}
        <div style={{
          marginTop: 24,
          display:'grid',
          gridTemplateColumns: `repeat(${d.cols}, 1fr)`,
          gap: d.gap, rowGap: d.gap + 8,
        }}>
          {Array.from({length: d.cols * 2}).map((_, i) => {
            const p = PRODUCTS[i % PRODUCTS.length];
            return <DCard key={i} p={p} d={d}/>;
          })}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 05 — Detalle producto (2-col layout with sticky right)
// ─────────────────────────────────────────────────────────────
function D_Detail({ d }) {
  const t = T();
  const p = PRODUCTS[0];
  const seller = MOCK_SELLERS.find(s => s.id === p.seller);
  const heroH = d.detailHero;
  return (
    <DPage d={d} hint={`grid grid-cols-1 ${d.tw}grid-cols-[1fr_400px]
gallery: ${d.tw}sticky ${d.tw}top-[80px]
right: sticky top-[80px]`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `24px ${d.padX}px 60px` }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 11.5, color: t.inkSoft, fontFamily:'"Geist Mono", monospace', display:'flex', gap: 6, alignItems:'center' }}>
          <span>Inicio</span>
          <Icon name="chev-right" size={11} stroke={t.inkFaint}/>
          <span>Muebles</span>
          <Icon name="chev-right" size={11} stroke={t.inkFaint}/>
          <span style={{ color: t.ink }}>{p.title}</span>
        </div>

        <div style={{
          marginTop: 16,
          display:'grid', gridTemplateColumns: d.name === '2xl' ? `${heroH}px 1fr 380px` : `1fr 380px`,
          gap: d.gap + 8,
          alignItems:'flex-start',
        }}>

          {/* Main gallery */}
          <div>
            <div style={{ borderRadius: 14, overflow:'hidden', position:'relative', background: t.surface2 }}>
              <ProductImage src={p.img} aspect={1} rounded={0}/>
              <div style={{ position:'absolute', top: 14, left: 14, display:'inline-flex', alignItems:'center', gap: 5, background:'rgba(255,255,255,0.95)', padding:'5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: -0.1, boxShadow:'0 1px 2px rgba(0,0,0,.08)' }}>
                <Icon name="sparkles" size={11} stroke={t.ink} sw={2.2}/> Destacado
              </div>
              <div style={{ position:'absolute', bottom: 14, right: 14, background:'rgba(10,10,10,0.7)', color:'#fff', padding:'4px 10px', borderRadius: 999, fontSize: 11, fontFamily:'"Geist Mono", monospace' }}>1 / 4</div>
            </div>
            {/* Thumbnails */}
            <div style={{ display:'flex', gap: 8, marginTop: 10 }}>
              {[0, 6, 9, 4].map((idx, i) => (
                <div key={i} style={{
                  flex: 1, aspectRatio: 1, borderRadius: 8, overflow:'hidden',
                  border: i === 0 ? `2px solid ${t.ink}` : `1px solid ${t.line}`,
                }}>
                  <ProductImage src={PRODUCTS[idx].img} aspect={1} rounded={0}/>
                </div>
              ))}
            </div>
          </div>

          {/* Middle column @2xl: description + specs */}
          {d.name === '2xl' && (
            <div>
              <div style={{ fontSize: 14, color: t.inkSoft, letterSpacing: -0.1 }}>{p.title}</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: t.ink, letterSpacing: -1.4, marginTop: 4 }}>{fmtPrice(p.price)}</div>

              <div style={{ display:'flex', gap: 20, marginTop: 14, fontSize: 12.5, color: t.inkSoft, letterSpacing: -0.1 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><Icon name="map-pin" size={13} stroke={t.inkSoft}/> {p.dist}</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><Icon name="eye" size={13} stroke={t.inkSoft}/> {p.views} vistas</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><Icon name="clock" size={13} stroke={t.inkSoft}/> hace 3 días</span>
              </div>

              <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${t.lineSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.ink, marginBottom: 8, letterSpacing: -0.2 }}>Descripción</div>
                <div style={{ fontSize: 14, color: t.ink, lineHeight: 1.6, letterSpacing: -0.1 }}>
                  Silla vintage de mimbre restaurada a mano. Estructura de madera noble, tejido original en excelente estado. Ideal para rincón de lectura o entrada. Medidas 92×52×48cm. Retiro en Palermo o coordino entrega cercana.
                </div>
              </div>

              <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${t.lineSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.ink, marginBottom: 12, letterSpacing: -0.2 }}>Detalles</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
                  {[
                    ['Estado', 'Como nuevo'],
                    ['Categoría', 'Muebles'],
                    ['Entrega', 'Retiro / acuerdan'],
                    ['Material', 'Mimbre + roble'],
                    ['Año', '~1970'],
                    ['Marca', 'Sin marca'],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      background: t.surface2, border: `1px solid ${t.lineSoft}`,
                      borderRadius: 9, padding: '9px 12px',
                    }}>
                      <div style={{ fontSize: 10.5, color: t.inkSoft, fontWeight: 500, textTransform:'uppercase', letterSpacing: 0.4, fontFamily:'"Geist Mono", monospace' }}>{k}</div>
                      <div style={{ fontSize: 13, color: t.ink, fontWeight: 500, marginTop: 2, letterSpacing: -0.1 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Right sidebar — sticky contact */}
          <div style={{
            background: t.surface, border: `1px solid ${t.line}`,
            borderRadius: 14, padding: 18,
            position:'sticky', top: d.headerH + 16,
          }}>
            {d.name !== '2xl' && (
              <>
                <div style={{ fontSize: 13, color: t.inkSoft, letterSpacing: -0.1 }}>{p.title}</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: t.ink, letterSpacing: -1.1, marginTop: 4 }}>{fmtPrice(p.price)}</div>
                <div style={{ display:'flex', gap: 14, marginTop: 10, fontSize: 12, color: t.inkSoft, letterSpacing: -0.1 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="map-pin" size={11} stroke={t.inkSoft}/> {p.dist}</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="eye" size={11} stroke={t.inkSoft}/> {p.views}</span>
                </div>
                <div style={{ height: 1, background: t.lineSoft, margin: '16px 0' }}/>
              </>
            )}

            {/* Seller card */}
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
              <Avatar name={seller.name} size={38}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2, display:'flex', alignItems:'center', gap: 4 }}>
                  {seller.name}
                  {seller.verified && <Icon name="badge" size={13} stroke={t.accent} sw={2}/>}
                </div>
                <div style={{ fontSize: 11.5, color: t.inkSoft, marginTop: 1, display:'flex', alignItems:'center', gap: 4 }}>
                  <Icon name="star" size={10} stroke={t.ink} fill={t.ink}/> {seller.rating} · {seller.items} items
                </div>
              </div>
              <Icon name="chev-right" size={14} stroke={t.inkFaint}/>
            </div>

            {/* CTA stack */}
            <div style={{ display:'flex', flexDirection:'column', gap: 8, marginTop: 16 }}>
              <button style={{
                background: t.btnGrad, color:'#fff', border:'1px solid rgba(0,0,0,.1)',
                borderRadius: 10, padding: '12px 14px',
                fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 7,
                boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.25)',
              }}>
                <Icon name="message-circle" size={15} stroke="#fff" sw={2}/> Enviar mensaje
              </button>
              <div style={{ display:'flex', gap: 8 }}>
                <button style={{
                  flex: 1, background: '#16A34A', color:'#fff', border:'1px solid rgba(0,0,0,.1)',
                  borderRadius: 10, padding: '10px 12px',
                  fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
                  display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6,
                }}>
                  <Icon name="message-circle" size={14} stroke="#fff" sw={2.2}/> WhatsApp
                </button>
                <button style={{
                  flex: 1, background: t.surface, color: t.ink, border:`1px solid ${t.line}`,
                  borderRadius: 10, padding: '10px 12px',
                  fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
                  display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6,
                }}>
                  <Icon name="phone" size={14} stroke={t.ink} sw={2}/> Llamar
                </button>
              </div>
              <button style={{
                background: 'transparent', color: t.ink, border:`1px solid ${t.line}`,
                borderRadius: 10, padding: '10px 12px',
                fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6,
              }}>
                <Icon name="heart" size={14} stroke={t.ink} sw={2}/> Guardar en favoritos
              </button>
            </div>

            <div style={{
              marginTop: 14, padding: 10,
              background: t.surface2, border: `1px solid ${t.lineSoft}`,
              borderRadius: 9,
              fontSize: 11.5, color: t.inkSoft, letterSpacing: -0.1, lineHeight: 1.5,
              display:'flex', gap: 8, alignItems:'flex-start',
            }}>
              <Icon name="shield" size={13} stroke={t.inkSoft} sw={1.7}/>
              <div>Comprá en persona y revisá el artículo. La app no procesa pagos. <span style={{ color: t.ink, fontWeight: 600, textDecoration:'underline', textUnderlineOffset: 2 }}>Tips de seguridad</span></div>
            </div>
          </div>
        </div>

        {/* If lg, description + specs go below */}
        {d.name === 'lg' && (
          <div style={{ marginTop: 32, display:'grid', gridTemplateColumns:'2fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: t.ink, marginBottom: 10, letterSpacing: -0.4 }}>Descripción</div>
              <div style={{ fontSize: 14, color: t.ink, lineHeight: 1.65, letterSpacing: -0.1 }}>
                Silla vintage de mimbre restaurada a mano. Estructura de madera noble, tejido original en excelente estado. Ideal para rincón de lectura o entrada. Medidas 92×52×48cm. Retiro en Palermo o coordino entrega cercana.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: t.ink, marginBottom: 10, letterSpacing: -0.4 }}>Detalles</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
                {[
                  ['Estado', 'Como nuevo'],
                  ['Categoría', 'Muebles'],
                  ['Entrega', 'Retiro'],
                  ['Material', 'Mimbre'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: t.surface2, border: `1px solid ${t.lineSoft}`, borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: t.inkSoft, textTransform:'uppercase', letterSpacing: 0.4, fontFamily:'"Geist Mono", monospace' }}>{k}</div>
                    <div style={{ fontSize: 12.5, color: t.ink, fontWeight: 500, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Related products */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.ink, letterSpacing: -0.4, marginBottom: 14 }}>Más de este vendedor</div>
          <div style={{ display:'grid', gridTemplateColumns: `repeat(${d.cols}, 1fr)`, gap: d.gap }}>
            {PRODUCTS.slice(1, 1 + d.cols).map(rp => <DCard key={rp.id} p={rp} d={d}/>)}
          </div>
        </div>

      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 06 — Perfil vendedor
// ─────────────────────────────────────────────────────────────
function D_Seller({ d }) {
  const t = T();
  const seller = MOCK_SELLERS[2];
  const items = PRODUCTS.filter(p => p.seller === 's3').concat(PRODUCTS.slice(0, 6));
  return (
    <DPage d={d} hint={`profile-hero: flex
items: grid-cols-3 ${d.tw}grid-cols-${d.cols}`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `0 ${d.padX}px 60px` }}>

        {/* Cover band */}
        <div style={{
          height: d.name === '2xl' ? 200 : 160,
          background: t.btnGrad,
          marginTop: 20, borderRadius: 14,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', inset:0, opacity: 0.15, backgroundImage:`url(${seller.id ? PRODUCTS[2].img : ''})`, backgroundSize:'cover', backgroundPosition:'center' }}/>
        </div>

        {/* Profile bar */}
        <div style={{
          marginTop: -50,
          padding: '0 28px',
          display:'flex', alignItems:'flex-end', gap: 18,
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: 16, overflow:'hidden',
            border: `4px solid ${t.surface}`,
            background: t.surface2,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: 32, fontWeight: 600, color: t.ink, letterSpacing: -0.5,
          }}>{seller.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
          <div style={{ flex: 1, paddingBottom: 10 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: t.ink, letterSpacing: -0.8, display:'flex', alignItems:'center', gap: 8 }}>
              {seller.name}
              {seller.verified && (
                <span style={{ display:'inline-flex', alignItems:'center', gap: 4, background: t.accentSoft, color: t.accent, padding:'2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                  <Icon name="badge" size={11} stroke={t.accent} sw={2.4}/> Verificada
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 4, display:'flex', gap: 12, letterSpacing: -0.1 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="map-pin" size={12} stroke={t.inkSoft}/> {seller.hood}</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="star" size={12} stroke={t.ink} fill={t.ink}/> {seller.rating} · 87 reseñas</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="calendar" size={12} stroke={t.inkSoft}/> {seller.joined}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap: 8, paddingBottom: 10 }}>
            <button style={{
              background: t.btnGrad, color:'#fff', border:'1px solid rgba(0,0,0,.1)',
              borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
              display:'inline-flex', alignItems:'center', gap: 6,
            }}>
              <Icon name="message-circle" size={14} stroke="#fff" sw={2}/> Mensaje
            </button>
            <button style={{
              background: t.surface, color: t.ink, border: `1px solid ${t.line}`,
              borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
            }}>Seguir</button>
            <button style={{
              width: 38, height: 38, borderRadius: 9, background: t.surface, border: `1px solid ${t.line}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><Icon name="more" size={16} stroke={t.ink}/></button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          marginTop: 20, padding: '14px 28px',
          background: t.surface, border: `1px solid ${t.lineSoft}`,
          borderRadius: 12,
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 0,
        }}>
          {[
            { v: seller.items, l: 'Publicaciones activas' },
            { v: '142', l: 'Ventas confirmadas' },
            { v: '< 1h', l: 'Tiempo de respuesta' },
            { v: '98%', l: 'Tasa de respuesta' },
          ].map((s, i) => (
            <div key={i} style={{ borderLeft: i === 0 ? 'none' : `1px solid ${t.lineSoft}`, paddingLeft: i === 0 ? 0 : 18 }}>
              <div style={{ fontSize: d.name === '2xl' ? 26 : 22, fontWeight: 600, color: t.ink, letterSpacing: -0.6 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 2, letterSpacing: -0.05 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 24 }}>
          <DSecTabs d={d} active={0} items={[
            { name:'Publicaciones', icon:'grid', count: seller.items },
            { name:'Reseñas', icon:'star', count: 87 },
            { name:'Acerca de', icon:'user' },
          ]}/>
        </div>

        {/* Items grid */}
        <div style={{
          marginTop: 20,
          display:'grid', gridTemplateColumns: `repeat(${d.cols}, 1fr)`,
          gap: d.gap, rowGap: d.gap + 8,
        }}>
          {items.slice(0, d.cols * 2).map((p, i) => <DCard key={i} p={p} d={d}/>)}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 07 — Publicar (3 pasos en una vista wide)
// ─────────────────────────────────────────────────────────────
function D_Post({ d, step = 1 }) {
  const t = T();
  return (
    <DPage d={d} hint={`max-w-3xl ${d.tw}max-w-5xl mx-auto
sticky bottom action bar: ${d.tw}sticky bottom-0`}>
      <div style={{ maxWidth: d.name === '2xl' ? 1200 : 960, margin: '0 auto', padding: `28px ${d.padX}px 100px` }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 500, letterSpacing: 1, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>Nueva publicación</div>
            <div style={{ fontSize: d.fsTitle, fontWeight: 600, color: t.ink, letterSpacing: -1, marginTop: 4, lineHeight: 1.0 }}>
              {step === 1 ? 'Subí tus fotos' : step === 2 ? 'Detalles del producto' : 'Cómo te contactan'}
            </div>
          </div>
          <button style={{ fontSize: 12.5, color: t.inkSoft, letterSpacing: -0.1, fontWeight: 500 }}>Cancelar y guardar borrador</button>
        </div>

        {/* Stepper */}
        <div style={{
          marginTop: 22, padding: '14px 18px',
          background: t.surface, border: `1px solid ${t.lineSoft}`,
          borderRadius: 12,
          display:'flex', alignItems:'center', gap: 0,
        }}>
          {[
            { n: 1, name: 'Fotos', icon: 'camera' },
            { n: 2, name: 'Detalles', icon: 'edit' },
            { n: 3, name: 'Contacto', icon: 'phone' },
          ].map((s, i) => {
            const active = s.n === step;
            const done = s.n < step;
            return (
              <React.Fragment key={s.n}>
                <div style={{ display:'flex', alignItems:'center', gap: 10, flex: 'none' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: done ? t.ink : (active ? t.btnGrad : t.surface2),
                    color: (done || active) ? '#fff' : t.inkSoft,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize: 12, fontWeight: 600,
                    border: !done && !active ? `1px solid ${t.line}` : 'none',
                  }}>
                    {done ? <Icon name="check" size={14} stroke="#fff" sw={2.4}/> : s.n}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? t.ink : t.inkSoft, letterSpacing: -0.2 }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: t.inkFaint, fontFamily:'"Geist Mono", monospace' }}>STEP {String(s.n).padStart(2, '0')}</div>
                  </div>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: done ? t.ink : t.lineSoft, margin: '0 16px' }}/>}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form */}
        <div style={{ marginTop: 20, display:'grid', gridTemplateColumns: d.name === '2xl' ? '1.5fr 1fr' : '1fr', gap: d.gap + 8 }}>
          <div style={{
            background: t.surface, border: `1px solid ${t.line}`,
            borderRadius: 14, padding: 24,
          }}>
            {step === 1 && <_PostStep1 t={t}/>}
            {step === 2 && <_PostStep2 t={t}/>}
            {step === 3 && <_PostStep3 t={t}/>}
          </div>

          {/* Live preview */}
          {d.name === '2xl' && (
            <div style={{
              background: t.surface, border: `1px solid ${t.lineSoft}`,
              borderRadius: 14, padding: 18,
              position:'sticky', top: d.headerH + 16,
            }}>
              <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 500, letterSpacing: 0.6, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace', marginBottom: 12 }}>Vista previa en feed</div>
              <DCard p={{ ...PRODUCTS[0], title:'Silla de mimbre vintage', price: 18000, dist:'1.2 km', hood:'Palermo', boost: false, new: true }} d={{ ...d, fsCard: 14 }}/>
              <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 14, lineHeight: 1.5, letterSpacing: -0.1 }}>
                Así te ven los compradores en el feed. Las primeras 3 fotos son las que más impactan en el CTR.
              </div>
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <div style={{
          position:'sticky', bottom: 0, marginTop: 20,
          background: t.surface, borderTop: `1px solid ${t.line}`,
          padding: '14px 18px', borderRadius: 0,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ display:'flex', gap: 8 }}>
            {step > 1 && (
              <button style={{
                background: t.surface, color: t.ink, border: `1px solid ${t.line}`,
                borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
                display:'inline-flex', alignItems:'center', gap: 6,
              }}>
                <Icon name="arrow-left" size={13} stroke={t.ink} sw={2}/> Anterior
              </button>
            )}
            <button style={{
              background:'transparent', color: t.inkSoft, border:'none',
              fontSize: 12.5, fontWeight: 500,
            }}>Guardar borrador</button>
          </div>
          <button style={{
            background: t.btnGrad, color:'#fff', border:'1px solid rgba(0,0,0,.1)',
            borderRadius: 9, padding: '10px 18px',
            fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1,
            display:'inline-flex', alignItems:'center', gap: 6,
            boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.25)',
          }}>
            {step === 3 ? <>Publicar <Icon name="check" size={14} stroke="#fff" sw={2.4}/></> : <>Continuar <Icon name="arrow-right" size={13} stroke="#fff" sw={2}/></>}
          </button>
        </div>
      </div>
    </DPage>
  );
}

function _PostStep1({ t }) {
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.ink, marginBottom: 4, letterSpacing: -0.2 }}>Fotos del producto</div>
      <div style={{ fontSize: 12.5, color: t.inkSoft, letterSpacing: -0.1 }}>Subí entre 3 y 8 fotos. La primera es la portada — elegila bien.</div>

      {/* Drop zone */}
      <div style={{
        marginTop: 16, padding: 28,
        border: `2px dashed ${t.line}`, borderRadius: 12,
        background: t.surface2,
        display:'flex', flexDirection:'column', alignItems:'center', gap: 8, textAlign:'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: t.surface, border: `1px solid ${t.line}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon name="image" size={22} stroke={t.ink} sw={1.6}/>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.ink, letterSpacing: -0.2 }}>Arrastrá tus fotos acá</div>
        <div style={{ fontSize: 12, color: t.inkSoft, letterSpacing: -0.1 }}>o <span style={{ color: t.ink, fontWeight: 600, textDecoration:'underline', textUnderlineOffset: 2 }}>seleccionalas</span> · JPG, PNG · max 8MB</div>
      </div>

      {/* Already uploaded */}
      <div style={{ marginTop: 18, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
        {[0, 6, 9].map((idx, i) => (
          <div key={i} style={{ position:'relative', aspectRatio: 1, borderRadius: 10, overflow:'hidden' }}>
            <ProductImage src={PRODUCTS[idx].img} aspect={1} rounded={0}/>
            {i === 0 && <div style={{ position:'absolute', top: 6, left: 6, background:'rgba(255,255,255,.95)', padding:'2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: t.ink, letterSpacing: -0.1 }}>Portada</div>}
            <div style={{ position:'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background:'rgba(10,10,10,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="x" size={12} stroke="#fff" sw={2.4}/>
            </div>
          </div>
        ))}
        <div style={{
          aspectRatio: 1, borderRadius: 10,
          background: t.surface2, border: `1px dashed ${t.line}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon name="plus" size={20} stroke={t.inkSoft}/>
        </div>
      </div>
    </>
  );
}

function _PostStep2({ t }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <_Field t={t} label="Título" val="Silla de mimbre vintage" hint="58/80"/>
      <_Field t={t} label="Categoría" val="Muebles · Segunda mano" pill/>
      <_Field t={t} label="Precio" val="$ 18.000 ARS" mono/>
      <_Field t={t} label="Estado" val="Como nuevo" pill/>
      <div style={{ gridColumn: '1 / -1' }}>
        <_Field t={t} label="Descripción" val="Silla restaurada a mano. Estructura noble, mimbre original. Ideal rincón de lectura. 92×52×48cm. Retiro en Palermo." multi/>
      </div>
      <_Field t={t} label="Material" val="Mimbre + roble"/>
      <_Field t={t} label="Año" val="~1970" mono/>
    </div>
  );
}
function _PostStep3({ t }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.ink, marginBottom: 14, letterSpacing: -0.2 }}>Cómo te contactan los compradores</div>
      {[
        { ico:'message-circle', name:'Chat interno', sub:'Recomendado · todos los mensajes en la app', on: true },
        { ico:'phone', name:'WhatsApp', sub:'+54 11 5555 1234', on: true },
        { ico:'phone', name:'Llamada', sub:'+54 11 5555 1234', on: false },
      ].map((opt, i) => (
        <div key={i} style={{
          padding: '14px 16px', marginBottom: 8,
          background: opt.on ? t.surface : t.surface2,
          border: `1px solid ${opt.on ? t.ink : t.lineSoft}`,
          borderRadius: 10,
          display:'flex', alignItems:'center', gap: 14,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9,
            background: opt.on ? t.btnGrad : t.surface2,
            display:'flex', alignItems:'center', justifyContent:'center',
            border: opt.on ? 'none' : `1px solid ${t.line}`,
          }}>
            <Icon name={opt.ico} size={17} stroke={opt.on ? '#fff' : t.inkSoft} sw={1.8}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2 }}>{opt.name}</div>
            <div style={{ fontSize: 12, color: t.inkSoft, marginTop: 2, letterSpacing: -0.1 }}>{opt.sub}</div>
          </div>
          <BToggle on={opt.on}/>
        </div>
      ))}

      {/* Boost CTA */}
      <div style={{
        marginTop: 18, padding: 18,
        background: t.btnGrad, color:'#fff',
        borderRadius: 12,
        display:'flex', alignItems:'center', gap: 16,
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="sparkles" size={20} stroke="#fff" sw={1.8}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.3 }}>Destacá esta publicación</div>
          <div style={{ fontSize: 12, color:'rgba(255,255,255,.65)', marginTop: 2, letterSpacing: -0.1 }}>Hasta 5× más vistas · desde $600</div>
        </div>
        <button style={{
          background:'#fff', color: t.ink, border:'none', borderRadius: 8,
          padding:'8px 14px', fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1,
        }}>Ver opciones</button>
      </div>
    </div>
  );
}
function _Field({ t, label, val, hint, mono, pill, multi }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: t.inkSoft, marginBottom: 6, textTransform:'uppercase', letterSpacing: 0.4, fontFamily:'"Geist Mono", monospace', display:'flex', justifyContent:'space-between' }}>
        <span>{label}</span>
        {hint && <span style={{ textTransform:'none', fontWeight: 400, color: t.inkFaint }}>{hint}</span>}
      </div>
      <div style={{
        background: t.surface2, border: `1px solid ${t.lineSoft}`,
        borderRadius: 9, padding: pill ? '8px 12px' : (multi ? '12px 14px' : '10px 12px'),
        fontSize: 13.5, color: t.ink, letterSpacing: -0.1,
        fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
        minHeight: multi ? 64 : 'auto',
        display:'flex', alignItems: multi ? 'flex-start' : 'center', gap: 8,
      }}>
        {pill && <Icon name="chev-down" size={12} stroke={t.inkSoft}/>}
        {val}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 08 — Mis publicaciones (table layout)
// ─────────────────────────────────────────────────────────────
function D_MyListings({ d }) {
  const t = T();
  const mine = [PRODUCTS[0], PRODUCTS[6], PRODUCTS[10], PRODUCTS[3], PRODUCTS[8]];
  return (
    <DPage d={d} hint={`table layout · ${d.tw}grid grid-cols-[80px_1fr_120px_100px_100px_140px]
or use a real <table> with sticky header`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `28px ${d.padX}px 60px` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: d.fsTitle, fontWeight: 600, color: t.ink, letterSpacing: -1, lineHeight: 1.0 }}>Mis publicaciones</div>
            <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 6, letterSpacing: -0.1 }}>Gestioná tus 5 publicaciones activas y revisá borradores.</div>
          </div>
          <button style={{
            background: t.btnGrad, color:'#fff', border:'1px solid rgba(0,0,0,.1)',
            borderRadius: 9, padding:'10px 16px', fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
            display:'inline-flex', alignItems:'center', gap: 6,
            boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.25)',
          }}>
            <Icon name="plus" size={14} stroke="#fff" sw={2.4}/> Nueva publicación
          </button>
        </div>

        {/* Tabs + filters */}
        <div style={{ marginTop: 18, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <DSecTabs d={d} active={0} items={[
            { name:'Activas', count: 5 },
            { name:'Pausadas', count: 2 },
            { name:'Vendidas', count: 23 },
            { name:'Borradores', count: 1 },
          ]}/>
          <div style={{
            display:'flex', alignItems:'center', gap: 6,
            background: t.surface, border: `1px solid ${t.line}`,
            borderRadius: 8, padding:'6px 10px',
            fontSize: 12, fontWeight: 500, color: t.ink,
          }}>
            <Icon name="search" size={13} stroke={t.inkSoft}/>
            Buscar en mis publicaciones
          </div>
        </div>

        {/* KPIs */}
        <div style={{
          marginTop: 18, padding: '16px 0',
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 0,
          background: t.surface, border: `1px solid ${t.lineSoft}`,
          borderRadius: 12, paddingLeft: 24, paddingRight: 24,
        }}>
          {[
            { v: '742', l: 'Vistas (7d)', d: '+12%', up: true },
            { v: '48', l: 'Contactos', d: '+5%', up: true },
            { v: '6.4%', l: 'Tasa contacto', d: '−1.2%', up: false },
            { v: '$ 142.000', l: 'Valor en venta', d: 'estable', up: null },
          ].map((s, i) => (
            <div key={i} style={{ borderLeft: i === 0 ? 'none' : `1px solid ${t.lineSoft}`, paddingLeft: i === 0 ? 0 : 18 }}>
              <div style={{ fontSize: 11, color: t.inkSoft, letterSpacing: 0.4, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>{s.l}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: t.ink, letterSpacing: -0.6, marginTop: 4 }}>{s.v}</div>
              <div style={{
                fontSize: 11.5, marginTop: 2, fontWeight: 500, letterSpacing: -0.05,
                color: s.up === null ? t.inkSoft : (s.up ? '#16A34A' : '#DC2626'),
              }}>{s.up === true && '↑ '}{s.up === false && '↓ '}{s.d}</div>
            </div>
          ))}
        </div>

        {/* Listings table */}
        <div style={{
          marginTop: 18,
          background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 12, overflow:'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display:'grid',
            gridTemplateColumns: d.name === '2xl'
              ? '64px 2fr 130px 100px 110px 110px 110px 50px'
              : '56px 2fr 110px 90px 100px 100px 50px',
            padding: '10px 16px', gap: 14,
            background: t.surface2, borderBottom: `1px solid ${t.line}`,
            fontSize: 11, fontWeight: 600, color: t.inkSoft,
            textTransform:'uppercase', letterSpacing: 0.4, fontFamily:'"Geist Mono", monospace',
          }}>
            <div></div>
            <div>Título</div>
            <div>Precio</div>
            <div>Estado</div>
            <div>Vistas</div>
            <div>Contactos</div>
            {d.name === '2xl' && <div>Boost</div>}
            <div></div>
          </div>

          {mine.map((p, i) => (
            <div key={p.id} style={{
              display:'grid',
              gridTemplateColumns: d.name === '2xl'
                ? '64px 2fr 130px 100px 110px 110px 110px 50px'
                : '56px 2fr 110px 90px 100px 100px 50px',
              padding: '12px 16px', gap: 14, alignItems:'center',
              borderBottom: i === mine.length - 1 ? 'none' : `1px solid ${t.lineSoft}`,
            }}>
              <div style={{ width: d.name === '2xl' ? 56 : 48, aspectRatio: 1, borderRadius: 8, overflow:'hidden' }}>
                <ProductImage src={p.img} aspect={1} rounded={0}/>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
                <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 2, fontFamily:'"Geist Mono", monospace' }}>publicada hace {[3, 7, 14, 21, 4][i]} días</div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2, fontFamily:'"Geist Mono", monospace' }}>{fmtPrice(p.price)}</div>
              <div>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding:'3px 8px', borderRadius: 999,
                  background: i === 1 ? '#FEF3C7' : '#DCFCE7',
                  color: i === 1 ? '#854D0E' : '#166534',
                  letterSpacing: -0.1,
                  display:'inline-flex', alignItems:'center', gap: 4,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius:'50%', background: i === 1 ? '#CA8A04' : '#16A34A' }}/>
                  {i === 1 ? 'Pausada' : 'Activa'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: t.ink, fontFamily:'"Geist Mono", monospace' }}>{p.views}</div>
              <div style={{ fontSize: 13, color: t.ink, fontFamily:'"Geist Mono", monospace' }}>{p.contacts}</div>
              {d.name === '2xl' && (
                <div>
                  {p.boost ? (
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding:'3px 8px', borderRadius: 999, background: t.ink, color: '#fff', display:'inline-flex', alignItems:'center', gap: 3 }}>
                      <Icon name="sparkles" size={9} stroke="#fff" sw={2.4}/> Activo
                    </span>
                  ) : (
                    <button style={{ fontSize: 11, fontWeight: 500, color: t.inkSoft, border:`1px solid ${t.line}`, borderRadius: 6, padding:'3px 9px', background: t.surface }}>Destacar</button>
                  )}
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <Icon name="more-v" size={16} stroke={t.inkSoft}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 09 — Estadísticas (dashboard wide)
// ─────────────────────────────────────────────────────────────
function D_Stats({ d }) {
  const t = T();
  const bars = [24, 42, 31, 58, 72, 55, 84, 67, 39, 51, 78, 92, 64, 45];
  const max = Math.max(...bars);
  return (
    <DPage d={d} hint={`grid grid-cols-2 ${d.tw}grid-cols-4 gap-4
chart: ${d.tw}col-span-2`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `28px ${d.padX}px 60px` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 500, letterSpacing: 1, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>Estadísticas</div>
            <div style={{ fontSize: d.fsTitle, fontWeight: 600, color: t.ink, letterSpacing: -1, marginTop: 4, lineHeight: 1.0 }}>Tu performance</div>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            {['7d', '30d', '90d', 'YTD'].map((p, i) => (
              <BChip key={p} active={i === 1}>{p}</BChip>
            ))}
          </div>
        </div>

        {/* KPI grid */}
        <div style={{
          marginTop: 22,
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: d.gap,
        }}>
          {[
            { v: '4.2K', l: 'Vistas totales', d: '+18%', up: true, ico:'eye' },
            { v: '283', l: 'Contactos', d: '+24%', up: true, ico:'message-circle' },
            { v: '6.7%', l: 'Tasa de contacto', d: '+0.4pp', up: true, ico:'trending-up' },
            { v: '12', l: 'Cierres confirmados', d: '+3', up: true, ico:'check-circle' },
          ].map((s, i) => (
            <div key={i} style={{
              background: t.surface, border: `1px solid ${t.lineSoft}`,
              borderRadius: 12, padding: 18,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: t.surface2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={s.ico} size={16} stroke={t.ink} sw={1.7}/>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', fontFamily:'"Geist Mono", monospace' }}>↑ {s.d}</span>
              </div>
              <div style={{ fontSize: d.name === '2xl' ? 32 : 26, fontWeight: 600, color: t.ink, letterSpacing: -0.8, marginTop: 14 }}>{s.v}</div>
              <div style={{ fontSize: 11.5, color: t.inkSoft, marginTop: 2, letterSpacing: -0.05 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div style={{
          marginTop: d.gap, padding: 22,
          background: t.surface, border: `1px solid ${t.lineSoft}`,
          borderRadius: 14,
        }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: t.ink, letterSpacing: -0.4 }}>Vistas en el tiempo</div>
              <div style={{ fontSize: 12, color: t.inkSoft, marginTop: 2, letterSpacing: -0.1 }}>Últimos 14 días · acumulado: 4.247 vistas</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap: 14, fontSize: 11.5, color: t.inkSoft, letterSpacing: -0.05 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius:'50%', background: t.ink }}/> Vistas</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius:'50%', background: t.line }}/> Periodo anterior</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap: 6, height: d.name === '2xl' ? 220 : 160 }}>
            {bars.map((v, i) => (
              <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
                <div style={{ width: '100%', display:'flex', alignItems:'flex-end', gap: 2, height: '100%' }}>
                  <div style={{ flex: 1, height: `${v/max*100}%`, background: t.ink, borderRadius: 3 }}/>
                  <div style={{ flex: 1, height: `${(v*0.7)/max*100}%`, background: t.line, borderRadius: 3 }}/>
                </div>
                <div style={{ fontSize: 10, color: t.inkFaint, fontFamily:'"Geist Mono", monospace' }}>{i+1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: top productos + tráfico */}
        <div style={{ marginTop: d.gap, display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: d.gap }}>
          <div style={{
            background: t.surface, border: `1px solid ${t.lineSoft}`,
            borderRadius: 14, padding: 22,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.ink, letterSpacing: -0.4, marginBottom: 14 }}>Top publicaciones</div>
            {[PRODUCTS[0], PRODUCTS[2], PRODUCTS[6], PRODUCTS[4]].map((p, i) => (
              <div key={p.id} style={{
                display:'flex', alignItems:'center', gap: 14,
                padding: '10px 0',
                borderBottom: i === 3 ? 'none' : `1px solid ${t.lineSoft}`,
              }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: t.inkFaint, letterSpacing: -0.4, fontFamily:'"Geist Mono", monospace', width: 24 }}>{i+1}</div>
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow:'hidden' }}>
                  <ProductImage src={p.img} aspect={1} rounded={0}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.ink, letterSpacing: -0.15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 2 }}>{fmtPrice(p.price)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.ink, fontFamily:'"Geist Mono", monospace' }}>{p.views}</div>
                  <div style={{ fontSize: 10.5, color: t.inkSoft, marginTop: 1 }}>{p.contacts} contactos</div>
                </div>
                {/* Sparkline */}
                <div style={{ width: 60, height: 24, display:'flex', alignItems:'flex-end', gap: 1 }}>
                  {[3,5,4,7,6,9,8].map((v, j) => (
                    <div key={j} style={{ flex: 1, height: `${v/9*100}%`, background: t.ink, opacity: 0.6, borderRadius: 1 }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: t.surface, border: `1px solid ${t.lineSoft}`,
            borderRadius: 14, padding: 22,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.ink, letterSpacing: -0.4, marginBottom: 14 }}>De dónde vienen</div>
            {[
              { name:'Búsqueda directa', pct: 42, c: t.ink },
              { name:'Categorías', pct: 28, c: '#52525B' },
              { name:'Recomendados', pct: 18, c: '#A1A1AA' },
              { name:'Perfil vendedor', pct: 8, c: '#D4D4D8' },
              { name:'Externos', pct: 4, c: t.line },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12, fontWeight: 500, color: t.ink, letterSpacing: -0.1, marginBottom: 5 }}>
                  <span>{s.name}</span>
                  <span style={{ fontFamily:'"Geist Mono", monospace', color: t.inkSoft }}>{s.pct}%</span>
                </div>
                <div style={{ height: 6, background: t.surface2, borderRadius: 999, overflow:'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: s.c, borderRadius: 999 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 10 — Chat (3 panel: list, conversation, info)
// ─────────────────────────────────────────────────────────────
function D_Chat({ d }) {
  const t = T();
  const seller = MOCK_SELLERS[0];
  const conv = MOCK_SELLERS;
  return (
    <DPage d={d} hint={`grid grid-cols-[280px_1fr] ${d.tw}grid-cols-[320px_1fr_320px]
each panel: h-[calc(100vh-56px)]`}>
      <div style={{
        maxWidth: d.contentMax, margin: '0 auto',
        height: `calc(100% - 0px)`,
        display:'grid',
        gridTemplateColumns: d.name === '2xl' ? '320px 1fr 320px' : '280px 1fr',
        background: t.surface, border: `1px solid ${t.line}`, borderRadius: 0,
      }}>
        {/* Conversations list */}
        <div style={{ borderRight: `1px solid ${t.line}`, display:'flex', flexDirection:'column' }}>
          <div style={{ padding: '18px 16px 12px' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: t.ink, letterSpacing: -0.5 }}>Mensajes</div>
            <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 2 }}>3 sin leer</div>
          </div>
          <div style={{ padding:'0 12px 8px' }}>
            <div style={{
              background: t.surface2, border: `1px solid ${t.lineSoft}`,
              borderRadius: 8, padding:'7px 10px',
              display:'flex', alignItems:'center', gap: 7,
              fontSize: 12.5, color: t.inkSoft, letterSpacing: -0.1,
            }}>
              <Icon name="search" size={13} stroke={t.inkSoft}/> Buscar conversación
            </div>
          </div>
          <div style={{ flex: 1, overflowY:'auto' }}>
            {conv.map((s, i) => (
              <div key={s.id} style={{
                padding: '12px 16px',
                background: i === 0 ? t.surface2 : 'transparent',
                borderLeft: i === 0 ? `2px solid ${t.ink}` : '2px solid transparent',
                display:'flex', alignItems:'center', gap: 10,
              }}>
                <Avatar name={s.name} size={36}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize: 13, fontWeight: i < 3 ? 600 : 500, color: t.ink, letterSpacing: -0.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: t.inkFaint, fontFamily:'"Geist Mono", monospace' }}>{['12:42','11:08','ayer','lun','3 sep'][i]}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: i < 3 ? t.ink : t.inkSoft, marginTop: 2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing: -0.1, fontWeight: i < 3 ? 500 : 400 }}>
                    {['¿Sigue disponible la silla?','Perfecto, paso mañana 18:00','Te paso mi WhatsApp','Gracias!','Ok, hablamos'][i]}
                  </div>
                </div>
                {i < 2 && <div style={{ width: 8, height: 8, borderRadius:'50%', background: t.accent, flex:'none' }}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 18px', borderBottom: `1px solid ${t.line}`, display:'flex', alignItems:'center', gap: 12 }}>
            <Avatar name={seller.name} size={36}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2, display:'flex', alignItems:'center', gap: 5 }}>
                {seller.name}
                {seller.verified && <Icon name="badge" size={12} stroke={t.accent} sw={2.2}/>}
              </div>
              <div style={{ fontSize: 11, color: '#16A34A', marginTop: 1, display:'inline-flex', alignItems:'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius:'50%', background:'#16A34A' }}/> En línea ahora
              </div>
            </div>
            <Icon name="phone" size={17} stroke={t.ink} sw={1.8}/>
            <Icon name="more" size={17} stroke={t.ink}/>
          </div>

          {/* Product context */}
          <div style={{ padding:'10px 18px', borderBottom: `1px solid ${t.lineSoft}`, background: t.surface2, display:'flex', alignItems:'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 7, overflow:'hidden' }}>
              <ProductImage src={PRODUCTS[0].img} aspect={1} rounded={0}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.ink, letterSpacing: -0.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{PRODUCTS[0].title}</div>
              <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 1, fontFamily:'"Geist Mono", monospace' }}>{fmtPrice(PRODUCTS[0].price)}</div>
            </div>
            <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 500, letterSpacing: -0.05 }}>Ver publicación →</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow:'auto', padding: '18px 22px', display:'flex', flexDirection:'column', gap: 10 }}>
            {[
              { you: false, t:'Hola! Vi tu publicación de la silla, ¿sigue disponible?' },
              { you: true,  t:'Hola Lucía! Sí, todavía está. ¿Te interesa pasar a verla?' },
              { you: false, t:'Buenísimo. ¿Mañana a las 18hs te queda bien?' },
              { you: true,  t:'Perfecto. Mando ubicación 📍' },
              { you: false, t:'Genial, gracias!' },
            ].map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.you ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '9px 12px', borderRadius: 12,
                  background: m.you ? t.ink : t.surface2,
                  color: m.you ? '#fff' : t.ink,
                  fontSize: 13, letterSpacing: -0.1, lineHeight: 1.4,
                  borderTopRightRadius: m.you ? 4 : 12,
                  borderTopLeftRadius: m.you ? 12 : 4,
                }}>
                  {m.t}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div style={{ padding:'12px 18px', borderTop: `1px solid ${t.line}`, display:'flex', alignItems:'center', gap: 8 }}>
            <Icon name="image" size={20} stroke={t.inkSoft}/>
            <div style={{
              flex: 1, background: t.surface2, border: `1px solid ${t.lineSoft}`,
              borderRadius: 999, padding:'8px 14px',
              fontSize: 13, color: t.inkSoft, letterSpacing: -0.1,
            }}>Escribir mensaje…</div>
            <button style={{
              width: 36, height: 36, borderRadius: 9,
              background: t.btnGrad, color:'#fff', border:'1px solid rgba(0,0,0,.1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: '0 1px 0 rgba(255,255,255,.08) inset',
            }}>
              <Icon name="send" size={15} stroke="#fff" sw={2}/>
            </button>
          </div>
        </div>

        {/* Right info panel @2xl */}
        {d.name === '2xl' && (
          <div style={{ borderLeft: `1px solid ${t.line}`, padding: 18, overflow:'auto' }}>
            <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 600, letterSpacing: 0.6, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>Vendedora</div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 8, marginTop: 14, paddingBottom: 16, borderBottom: `1px solid ${t.lineSoft}` }}>
              <Avatar name={seller.name} size={64}/>
              <div style={{ fontSize: 16, fontWeight: 600, color: t.ink, letterSpacing: -0.3 }}>{seller.name}</div>
              <div style={{ fontSize: 11.5, color: t.inkSoft, display:'flex', alignItems:'center', gap: 4 }}>
                <Icon name="map-pin" size={11} stroke={t.inkSoft}/> {seller.hood}
              </div>
              <div style={{ display:'flex', gap: 8, marginTop: 4 }}>
                <button style={{ background: t.surface, color: t.ink, border:`1px solid ${t.line}`, borderRadius: 8, padding:'6px 12px', fontSize: 11.5, fontWeight: 500 }}>Ver perfil</button>
                <button style={{ background: '#16A34A', color:'#fff', border:'1px solid rgba(0,0,0,.1)', borderRadius: 8, padding:'6px 12px', fontSize: 11.5, fontWeight: 600 }}>WhatsApp</button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 600, letterSpacing: 0.6, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace', marginBottom: 10 }}>Conversación sobre</div>
              <div style={{ display:'flex', alignItems:'center', gap: 10, padding: 10, background: t.surface2, borderRadius: 9 }}>
                <div style={{ width: 50, height: 50, borderRadius: 8, overflow:'hidden' }}>
                  <ProductImage src={PRODUCTS[0].img} aspect={1} rounded={0}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: t.ink, letterSpacing: -0.15 }}>{PRODUCTS[0].title}</div>
                  <div style={{ fontSize: 11, color: t.ink, marginTop: 2, fontWeight: 600, fontFamily:'"Geist Mono", monospace' }}>{fmtPrice(PRODUCTS[0].price)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 600, letterSpacing: 0.6, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace', marginBottom: 10 }}>Acciones</div>
              {['Marcar como vendida', 'Reportar usuario', 'Bloquear'].map((a, i) => (
                <div key={a} style={{ padding: '9px 0', fontSize: 12.5, color: i === 2 ? '#DC2626' : t.ink, letterSpacing: -0.1, borderBottom: i === 2 ? 'none' : `1px solid ${t.lineSoft}` }}>{a}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 11 — Notificaciones
// ─────────────────────────────────────────────────────────────
function D_Notifs({ d }) {
  const t = T();
  const items = [
    { icon:'message-circle', title:'Lucía te envió un mensaje', body:'"¿Sigue disponible?" · Silla de mimbre vintage', time:'5 min', fresh: true },
    { icon:'heart', title:'Tomás guardó tu publicación', body:'Pan de masa madre · ahora en sus favoritos', time:'42 min', fresh: true },
    { icon:'eye', title:'Tu publicación está en racha', body:'Silla de mimbre · 47 vistas en las últimas 24h', time:'2 h', fresh: true },
    { icon:'sparkles', title:'Promo de destacado', body:'15% off en Boost Pro hasta el domingo · ahorrás $90', time:'4 h', fresh: false },
    { icon:'phone', title:'Marco te llamó', body:'No pudo conectarse · te dejó un audio', time:'ayer', fresh: false },
    { icon:'check-circle', title:'Tu publicación fue aprobada', body:'MacBook Air M1 · ya está visible en el feed', time:'ayer', fresh: false },
    { icon:'badge', title:'Cuenta verificada', body:'Te habilitamos el badge de vendedor verificado', time:'2 d', fresh: false },
    { icon:'star', title:'Carla & Ana te dejó una reseña', body:'5 estrellas · "Excelente vendedor, super atento"', time:'3 d', fresh: false },
  ];
  return (
    <DPage d={d} hint={`max-w-3xl mx-auto
list: divide-y border rounded-xl`}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: `28px ${d.padX}px 60px` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: d.fsTitle, fontWeight: 600, color: t.ink, letterSpacing: -1, lineHeight: 1.0 }}>Notificaciones</div>
            <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 6, letterSpacing: -0.1 }}>3 sin leer · Marcá las importantes y archivá las viejas.</div>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <button style={{ background: t.surface, color: t.ink, border:`1px solid ${t.line}`, borderRadius: 8, padding:'7px 12px', fontSize: 12.5, fontWeight: 500, letterSpacing: -0.1 }}>Marcar todo como leído</button>
            <button style={{ background: t.surface, color: t.ink, border:`1px solid ${t.line}`, borderRadius: 8, padding:'7px 10px', fontSize: 12.5, fontWeight: 500, letterSpacing: -0.1, display:'inline-flex', alignItems:'center', gap: 6 }}>
              <Icon name="settings" size={13} stroke={t.ink}/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 20 }}>
          <DSecTabs d={d} active={0} items={[
            { name:'Todas', count: items.length },
            { name:'Mensajes', count: 1 },
            { name:'Actividad' },
            { name:'Sistema' },
          ]}/>
        </div>

        {/* List */}
        <div style={{
          marginTop: 18, background: t.surface,
          border: `1px solid ${t.line}`, borderRadius: 12, overflow:'hidden',
        }}>
          {items.map((n, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'flex-start', gap: 14,
              padding: '14px 18px',
              background: n.fresh ? t.surface : t.surface,
              borderBottom: i === items.length - 1 ? 'none' : `1px solid ${t.lineSoft}`,
              borderLeft: n.fresh ? `2px solid ${t.ink}` : '2px solid transparent',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: n.fresh ? t.surface2 : t.surface2,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
              }}>
                <Icon name={n.icon} size={16} stroke={t.ink} sw={1.7}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: n.fresh ? 600 : 500, color: t.ink, letterSpacing: -0.15 }}>{n.title}</div>
                <div style={{ fontSize: 12.5, color: t.inkSoft, marginTop: 3, letterSpacing: -0.1 }}>{n.body}</div>
              </div>
              <div style={{ fontSize: 11, color: t.inkFaint, fontFamily:'"Geist Mono", monospace', whiteSpace:'nowrap' }}>{n.time}</div>
              {n.fresh && <div style={{ width: 7, height: 7, borderRadius:'50%', background: t.accent, marginTop: 12 }}/>}
            </div>
          ))}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// 12 — Favoritos (with collections)
// ─────────────────────────────────────────────────────────────
function D_Favs({ d }) {
  const t = T();
  return (
    <DPage d={d} hint={`grid grid-cols-3 ${d.tw}grid-cols-${d.cols}
collections strip: scroll-snap-x`}>
      <div style={{ maxWidth: d.contentMax, margin: '0 auto', padding: `28px ${d.padX}px 60px` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: d.fsTitle, fontWeight: 600, color: t.ink, letterSpacing: -1, lineHeight: 1.0 }}>Favoritos</div>
            <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 6, letterSpacing: -0.1 }}>14 productos guardados · organizalos en colecciones.</div>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <BChip icon="plus">Nueva colección</BChip>
            <BChip icon="bookmark">Notificarme bajadas de precio</BChip>
          </div>
        </div>

        {/* Collections strip */}
        <div style={{ marginTop: 22, display:'grid', gridTemplateColumns: `repeat(${d.name === '2xl' ? 5 : 4}, 1fr)`, gap: d.gap }}>
          {[
            { name:'Todos', count: 14, ico:'heart', active: true },
            { name:'Sala nueva', count: 5, ico:'sofa' },
            { name:'Vintage', count: 4, ico:'clock' },
            { name:'Para Lula', count: 3, ico:'gift' },
            { name:'Bici / outdoor', count: 2, ico:'compass' },
          ].slice(0, d.name === '2xl' ? 5 : 4).map((col, i) => (
            <div key={i} style={{
              padding: 16,
              background: col.active ? t.btnGrad : t.surface,
              color: col.active ? '#fff' : t.ink,
              border: col.active ? '1px solid rgba(0,0,0,.1)' : `1px solid ${t.lineSoft}`,
              borderRadius: 12,
              boxShadow: col.active ? '0 1px 0 rgba(255,255,255,.08) inset, 0 4px 16px -8px rgba(0,0,0,.3)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: col.active ? 'rgba(255,255,255,.12)' : t.surface2,
                border: col.active ? '1px solid rgba(255,255,255,.15)' : `1px solid ${t.lineSoft}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon name={col.ico} size={15} stroke={col.active ? '#fff' : t.ink} sw={1.7}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, letterSpacing: -0.2 }}>{col.name}</div>
              <div style={{ fontSize: 11, opacity: col.active ? 0.6 : 0.5, fontFamily:'"Geist Mono", monospace', marginTop: 2 }}>{col.count} guardados</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{
          marginTop: 28,
          display:'grid', gridTemplateColumns: `repeat(${d.cols}, 1fr)`,
          gap: d.gap, rowGap: d.gap + 8,
        }}>
          {[1, 4, 7, 9, 11, 2, 0, 5, 8, 10, 6, 3].map((idx, i) => {
            const p = PRODUCTS[idx];
            return (
              <div key={i} style={{ position:'relative' }}>
                <DCard p={p} d={d}/>
                {/* Heart filled */}
                <div style={{
                  position:'absolute', top: 8, right: 8,
                  width: 30, height: 30, borderRadius: '50%',
                  background:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 1px 2px rgba(0,0,0,.1)',
                }}>
                  <Icon name="heart" size={13} stroke={t.ink} fill={t.ink} sw={2}/>
                </div>
              </div>
            );
          }).slice(0, d.cols * 2)}
        </div>
      </div>
    </DPage>
  );
}

// ─────────────────────────────────────────────────────────────
// Lo Busco — modo inverso (DIFERENCIADOR)
// ─────────────────────────────────────────────────────────────
function D_LoBusco({ d }) {
  const t = T();
  const requests = [
    { who:'Lucía M.',     hood:'Palermo',     dist:'8 cuadras',  title:'Busco silla escritorio ergonómica',  detail:'Segunda mano · hasta $40.000 · con apoyo lumbar',                  time:'hace 2 h', responses: 4,  fresh:true },
    { who:'Tomás R.',     hood:'Chacarita',   dist:'15 cuadras', title:'Necesito mudanza para sábado',         detail:'2 ambientes Chacarita → Belgrano · $20-30k · flete chico',          time:'hace 5 h', responses: 7,  fresh:false },
    { who:'Carla & Ana',  hood:'V. Crespo',   dist:'22 cuadras', title:'Cambio plantas por libros',            detail:'Tengo 2 monsteras grandes, busco novelas o ensayo · trueque',       time:'ayer',     responses: 2,  fresh:false, trueque:true },
    { who:'Marco P.',     hood:'Belgrano',    dist:'45 cuadras', title:'Busco bici fija para departamento',    detail:'Que entre por puerta · sin ruido · hasta $80.000',                  time:'hace 3 d', responses: 11, fresh:false },
    { who:'Sol del Barrio', hood:'Almagro',   dist:'30 cuadras', title:'Necesito niñera flexible 3 tardes',    detail:'Niño 4 años · referencias · zona Almagro',                          time:'hace 1 d', responses: 6,  fresh:false },
    { who:'Pablo K.',     hood:'Caballito',   dist:'52 cuadras', title:'Busco repuesto microondas Atma',       detail:'Plato giratorio modelo MEA-9 · pago contado',                       time:'hace 4 h', responses: 1,  fresh:true },
  ];
  return (
    <DPage d={d} hint={`grid-cols-${d.name === '2xl' ? 3 : 2} ${d.tw}gap-${d.gap === 16 ? 4 : 5}`}>
      <div style={{ maxWidth: d.contentMax, margin:'0 auto', padding:`0 ${d.padX}px` }}>

        {/* Hero diferenciador */}
        <div style={{ marginTop: 24, display:'grid', gridTemplateColumns: d.name === '2xl' ? '1fr 360px' : '1fr 320px', gap: d.gap }}>
          <div style={{
            background:'#fff', border:`1.5px solid ${t.accent}`, borderRadius: 16,
            padding: d.name === '2xl' ? '28px 32px' : '22px 26px',
            position:'relative', overflow:'hidden',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: t.accentDark, textTransform:'uppercase', fontFamily:'"Geist Mono", monospace' }}>
              Diferenciador AY · No existe en ML / FB
            </div>
            <div style={{ fontSize: d.name === '2xl' ? 36 : 28, fontWeight: 700, letterSpacing: -1, marginTop: 8, color: t.ink, lineHeight: 1.1 }}>
              Lo busco. Vecinos <span style={{ color: t.accent }}>te encuentran</span>.
            </div>
            <div style={{ fontSize: 13.5, color: t.inkSoft, marginTop: 8, maxWidth: 520, lineHeight: 1.5 }}>
              Publicá lo que necesitás — desde una silla hasta una niñera — y vecinos verificados te responden en minutos. El mercado al revés.
            </div>
            <div style={{ display:'flex', gap: 10, marginTop: 18 }}>
              <button style={{
                background: t.btnGrad, color:'#fff', border:'none',
                padding:'10px 18px', borderRadius: 10,
                fontFamily:'"Geist", system-ui', fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2,
                display:'inline-flex', alignItems:'center', gap: 6,
                boxShadow:'0 1px 0 rgba(255,255,255,.15) inset, 0 4px 12px rgba(16,185,129,0.35)',
                cursor:'default',
              }}>
                <Icon name="plus" size={15} stroke="#fff" sw={2.4}/> Publicar mi pedido
              </button>
              <button style={{
                background:'#fff', color: t.ink, border:`1px solid ${t.line}`,
                padding:'10px 16px', borderRadius: 10,
                fontFamily:'"Geist", system-ui', fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2,
                cursor:'default',
              }}>
                Cómo funciona
              </button>
            </div>
          </div>

          {/* Stats banda */}
          <div style={{ display:'grid', gridTemplateRows:'repeat(3, 1fr)', gap: 10 }}>
            {[
              { v:'127', l:'pedidos activos cerca tuyo' },
              { v:'4 min', l:'respuesta promedio del barrio' },
              { v:'89%', l:'encuentran lo que buscan' },
            ].map((s,i) => (
              <div key={i} style={{
                background:'#fff', border:`1px solid ${t.line}`, borderRadius: 12,
                padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <div>
                  <div style={{ fontFamily:'"Geist", system-ui', fontSize: 11, color: t.inkSoft, letterSpacing: -0.05, lineHeight: 1.3 }}>{s.l}</div>
                </div>
                <div style={{ fontFamily:'"Geist", system-ui', fontSize: 22, fontWeight: 700, color: t.accentDark, letterSpacing: -0.6 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ marginTop: 24, display:'flex', alignItems:'center', gap: 10, flexWrap:'wrap' }}>
          <div style={{ fontFamily:'"Geist", system-ui', fontSize: d.name === '2xl' ? 22 : 18, fontWeight: 700, color: t.ink, letterSpacing: -0.4, marginRight: 8 }}>
            Pedidos en tu barrio
          </div>
          {['Todos','Productos','Servicios','Trueque','Urgente'].map((f,i) => (
            <div key={f} style={{
              padding:'6px 12px', borderRadius: 999,
              background: i===0 ? t.ink : '#fff',
              color: i===0 ? '#fff' : t.ink,
              border: i===0 ? 'none' : `1px solid ${t.line}`,
              fontFamily:'"Geist", system-ui', fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1,
            }}>{f}</div>
          ))}
        </div>

        {/* Grid pedidos */}
        <div style={{
          marginTop: 16, marginBottom: 32,
          display:'grid',
          gridTemplateColumns: d.name === '2xl' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: d.gap,
        }}>
          {requests.map((r, i) => (
            <div key={i} style={{
              background:'#fff', border:`1px solid ${t.line}`, borderRadius: 12,
              padding: 18, position:'relative',
            }}>
              {r.fresh && (
                <div style={{ position:'absolute', top: 16, right: 16,
                  background: t.accent, color:'#fff',
                  fontSize: 9.5, fontWeight: 700, padding:'3px 7px', borderRadius: 4,
                  fontFamily:'"Geist", system-ui', letterSpacing: 0.3,
                }}>NUEVO</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                <Avatar name={r.who} size={34}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily:'"Geist", system-ui', fontSize: 13, fontWeight: 600, color: t.ink, letterSpacing: -0.1 }}>{r.who}</div>
                  <div style={{ fontFamily:'"Geist", system-ui', fontSize: 11, color: t.inkFaint, letterSpacing: -0.05, display:'flex', alignItems:'center', gap: 4, marginTop: 1 }}>
                    <Icon name="map-pin" size={10} stroke={t.inkFaint} sw={2}/>
                    {r.dist} · {r.hood} · {r.time}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily:'"Geist", system-ui', fontSize: 15.5, fontWeight: 700, color: t.ink, marginTop: 12, letterSpacing: -0.3, lineHeight: 1.25 }}>
                {r.title}
              </div>
              <div style={{ fontFamily:'"Geist", system-ui', fontSize: 12.5, color: t.inkSoft, marginTop: 4, letterSpacing: -0.05, lineHeight: 1.45 }}>
                {r.detail}
              </div>
              <div style={{ marginTop: 14, display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop: 12, borderTop:`1px solid ${t.lineSoft}` }}>
                <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                  <Icon name="message-circle" size={13} stroke={t.inkSoft} sw={2}/>
                  <span style={{ fontFamily:'"Geist", system-ui', fontSize: 11.5, color: t.inkSoft, letterSpacing: -0.05 }}>
                    {r.responses} respuestas
                  </span>
                  {r.trueque && <span style={{
                    fontFamily:'"Geist", system-ui', fontSize: 9.5, fontWeight: 700,
                    color:'#1E40AF', background:'#DBEAFE',
                    padding:'2px 6px', borderRadius: 4, marginLeft: 4, letterSpacing: 0.2,
                  }}>TRUEQUE</span>}
                </div>
                <div style={{
                  background: t.btnGrad, color:'#fff',
                  padding:'7px 14px', borderRadius: 8,
                  display:'inline-flex', alignItems:'center', gap: 4,
                  fontFamily:'"Geist", system-ui', fontSize: 12, fontWeight: 700, letterSpacing: -0.15,
                  boxShadow:'0 1px 0 rgba(255,255,255,.15) inset',
                }}>
                  Tengo eso →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DPage>
  );
}

Object.assign(window, {
  D, DesktopFrame, TWHint, DHeader, DCard, DPage,
  D_Onboarding, D_Home, D_Categories, D_Search, D_Detail, D_Seller, D_Post,
  D_MyListings, D_Stats, D_Chat, D_Notifs, D_Favs,
  D_LoBusco,
});
