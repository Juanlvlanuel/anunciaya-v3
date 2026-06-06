// option-b-plaza.jsx — "Plaza Clean" modernizada
// Paleta: blanco / negro / slate + micro-acentos azul. Botones gradiente negro→slate.
// Imágenes reales de Unsplash. Iconos Lucide. Cero emojis.

// B_TOKENS — alineados con AnunciaYA (AY).
// Verde solo en CTAs / precios / badges activos. Resto neutro.
const B_TOKENS = {
  bg:        '#F5F7FB',          // bg azulado muy suave (AY)
  bgGrad:    'linear-gradient(180deg, #F5F7FB 0%, #EAF1FB 50%, #F0F4FA 100%)',
  surface:   '#FFFFFF',
  surface2:  '#F8FAFC',
  ink:       '#0F172A',
  inkSoft:   '#475569',
  inkFaint:  '#94A3B8',
  line:      '#E2E8F0',
  lineSoft:  '#F1F5F9',
  // Acento principal — VERDE AY, usado solo en: precios, CTAs, badges activos, verificado.
  accent:    '#10B981',
  accentDark:'#059669',
  accentSoft:'#D1FAE5',
  // Functional
  success:   '#10B981',
  warn:      '#B45309',
  danger:    '#EF4444',
  // Botón primario CTA — gradient verde AY (no negro)
  btnGrad:      'linear-gradient(180deg, #10B981 0%, #059669 100%)',
  btnGradHover: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
  // Botón secundario — gradient negro (acción neutra como "Compartir")
  btnGradInk:   'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
  display:   '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  body:      '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  mono:      '"Geist Mono", ui-monospace, "SFMono-Regular", monospace',
};

// ───── Primary CTA button — gradient black→slate
function BBtn({ children, icon, variant = 'primary', size = 'md', block = false, leading = null }) {
  const padY = size === 'sm' ? 9 : size === 'lg' ? 15 : 13;
  const padX = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const fontSize = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 14;

  const styles = {
    primary: {
      background: B_TOKENS.btnGrad, color:'#fff',
      border:'1px solid rgba(0,0,0,.1)',
      boxShadow:'0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.25)',
    },
    secondary: {
      background: B_TOKENS.surface, color: B_TOKENS.ink,
      border:`1px solid ${B_TOKENS.line}`,
      boxShadow:'0 1px 2px rgba(0,0,0,.03)',
    },
    ghost: {
      background: 'transparent', color: B_TOKENS.ink,
      border:'1px solid transparent',
    },
    tonal: {
      background: B_TOKENS.surface2, color: B_TOKENS.ink,
      border:`1px solid transparent`,
    },
  }[variant] || {};

  return (
    <div style={{
      display: block ? 'flex' : 'inline-flex', alignItems:'center', justifyContent:'center', gap: 7,
      padding: `${padY}px ${padX}px`, borderRadius: 10,
      fontFamily: B_TOKENS.body, fontSize, fontWeight: 600, letterSpacing: -0.15,
      width: block ? '100%' : undefined,
      cursor:'default',
      ...styles,
    }}>
      {leading}
      {icon && <Icon name={icon} size={fontSize + 2} sw={2}/>}
      {children}
    </div>
  );
}

// ───── Tab bar — DELEGATED a AY_BottomNav (la app ya tiene su navegación)
// Marketplace está en la tab "market". No se reemplaza.
function BTabBar({ active = 'market' }) {
  return <AY_BottomNav active={active}/>;
}

// ───── Chip
function BChip({ children, active = false, icon, trailing }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 6,
      padding: '7px 12px', borderRadius: 999,
      background: active ? B_TOKENS.ink : B_TOKENS.surface,
      color: active ? '#fff' : B_TOKENS.ink,
      fontFamily: B_TOKENS.body, fontSize: 12.5, fontWeight: 500, letterSpacing: -0.1,
      whiteSpace:'nowrap',
      border: `1px solid ${active ? B_TOKENS.ink : B_TOKENS.line}`,
    }}>
      {icon && <Icon name={icon} size={13} sw={2} />}
      {children}
      {trailing && <span style={{ marginLeft: 2 }}>{trailing}</span>}
    </div>
  );
}

// ───── Header — DELEGATED a AY_Header (DNA negro+grid+verde de AY)
// Reemplaza el header blanco genérico anterior.
function BHeader({ title, sub, back = false, action, titleAccent, tabs, activeTab }) {
  // back puede ser bool o ignorado — AY_Header siempre muestra back arrow para subpáginas
  // "action" legacy → mapear a rightAction
  let rightAction = 'menu';
  if (action === 'search')  rightAction = 'search';
  if (action === 'filter')  rightAction = 'filter';
  if (action === null)      rightAction = null;

  return (
    <AY_Header
      title={title || 'Marketplace'}
      titleAccent={titleAccent}
      subtitle={sub}
      onBack={back}
      rightAction={rightAction}
      tabs={tabs}
      activeTab={activeTab}
    />
  );
}

// ───── Product card (feed)
function BCard({ p, compact = false }) {
    // Diferenciador: modalidad de precio (rota por id para variedad)
    const modes = ['Precio fijo','Acepta oferta','Trueque OK'];
    const mode = modes[parseInt(p.id.replace('p',''),10) % 3];
    const seller = MOCK_SELLERS.find(s => s.id === p.seller) || {};
    // Distancia en cuadras (parse "X.Y km" → cuadras)
    const cuadras = (() => {
      const m = (p.dist || '').match(/([\d.]+)\s*km/);
      if (m) return `${Math.round(parseFloat(m[1]) * 10)} cuadras`;
      return p.dist;
    })();

    return (
      <div style={{ position:'relative' }}>
        <div style={{ position:'relative' }}>
          <ProductImage src={p.img} aspect={compact ? 1 : 1.15} rounded={12} />
          {p.boost && (
            <div style={{
              position:'absolute', top: 8, left: 8,
              background: B_TOKENS.accent, color:'#fff',
              fontFamily: B_TOKENS.body, fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 6, letterSpacing: -0.1,
              display:'inline-flex', alignItems:'center', gap: 4,
              boxShadow:'0 1px 2px rgba(16,185,129,.4)',
            }}>
              <Icon name="sparkles" size={10} stroke="#fff" sw={2.4}/> Destacado
            </div>
          )}
          <div style={{
            position:'absolute', top: 8, right: 8,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}>
            <Icon name="heart" size={14} stroke={B_TOKENS.ink} sw={2}/>
          </div>
          {/* Distancia overlay (diferenciador hiperlocal) */}
          <div style={{
            position:'absolute', bottom: 8, left: 8,
            background:'rgba(15,23,42,0.85)', color:'#fff',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            fontFamily: B_TOKENS.body, fontSize: 10, fontWeight: 600,
            padding:'3px 7px', borderRadius: 6, letterSpacing: -0.1,
            display:'inline-flex', alignItems:'center', gap: 4,
          }}>
            <Icon name="map-pin" size={9} stroke="#fff" sw={2.4}/> {cuadras}
          </div>
        </div>

        {/* Precio + chip modalidad */}
        <div style={{ marginTop: 8, display:'flex', alignItems:'baseline', gap: 6, flexWrap:'wrap' }}>
          <div style={{ fontFamily: B_TOKENS.display, fontSize: 15, fontWeight: 700, color: B_TOKENS.accentDark, letterSpacing: -0.3 }}>
            {fmtPrice(p.price)}
          </div>
          <div style={{
            fontFamily: B_TOKENS.body, fontSize: 9.5, fontWeight: 600,
            color: mode === 'Acepta oferta' ? '#B45309' : (mode === 'Trueque OK' ? '#1E40AF' : B_TOKENS.inkSoft),
            background: mode === 'Acepta oferta' ? '#FEF3C7' : (mode === 'Trueque OK' ? '#DBEAFE' : B_TOKENS.lineSoft),
            padding:'1px 6px', borderRadius: 4, letterSpacing: -0.05,
          }}>
            {mode}
          </div>
        </div>
        <div style={{
          fontFamily: B_TOKENS.body, fontSize: 12.5, color: B_TOKENS.ink, marginTop: 1,
          fontWeight: 500,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient:'vertical',
          lineHeight: 1.3, letterSpacing: -0.1,
        }}>{p.title}</div>
        {/* Vendedor + verificado */}
        <div style={{
          fontFamily: B_TOKENS.body, fontSize: 11, color: B_TOKENS.inkSoft,
          marginTop: 4, display:'flex', alignItems:'center', gap: 4,
        }}>
          <span style={{ fontWeight: 500 }}>{seller.name}</span>
          {seller.verified && (
            <Icon name="badge" size={11} stroke={B_TOKENS.accent} sw={2.2}/>
          )}
          <span style={{ color: B_TOKENS.inkFaint }}>· {p.hood}</span>
        </div>
      </div>
    );
  }

// ───── Toggle (slate)
function BToggle({ on }) {
  return (
    <div style={{
      width: 40, height: 22, borderRadius: 999,
      background: on ? B_TOKENS.ink : '#D4D4D8',
      position:'relative', transition:'background .2s',
    }}>
      <div style={{
        position:'absolute', top: 2, left: on ? 20 : 2,
        width: 18, height: 18, borderRadius:'50%', background:'#fff',
        boxShadow:'0 1px 2px rgba(0,0,0,.25)', transition:'left .2s',
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B01 — Onboarding
// ─────────────────────────────────────────────────────────────
function B_Onboarding() {
  return (
    <div style={{ height:'100%', background: B_TOKENS.surface, position:'relative', overflow:'hidden' }}>
      <div style={{ padding: '76px 24px 0', height: '100%', display:'flex', flexDirection:'column' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: B_TOKENS.btnGrad,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 1px 2px rgba(0,0,0,.2)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background:'#fff' }}/>
          </div>
          <div style={{ fontFamily: B_TOKENS.display, fontWeight: 600, fontSize: 17, color: B_TOKENS.ink, letterSpacing: -0.6 }}>
            Marketplace
          </div>
        </div>

        {/* Collage — 4 product images, asymmetric */}
        <div style={{ marginTop: 32, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
          <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
            <ProductImage src={PRODUCTS[0].img} aspect={1.2} rounded={14} />
            <ProductImage src={PRODUCTS[4].img} aspect={1} rounded={14} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 10, paddingTop: 30 }}>
            <ProductImage src={PRODUCTS[7].img} aspect={1} rounded={14} />
            <ProductImage src={PRODUCTS[1].img} aspect={1.2} rounded={14} />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 20 }} />

        <div style={{
          fontFamily: B_TOKENS.display, fontSize: 34, fontWeight: 600,
          color: B_TOKENS.ink, letterSpacing: -1.4, lineHeight: 1.0,
        }}>
          Publicá.<br/>Conectá.<br/>Arreglá en persona.
        </div>
        <div style={{
          fontFamily: B_TOKENS.body, fontSize: 14, color: B_TOKENS.inkSoft,
          marginTop: 14, lineHeight: 1.5, marginBottom: 22, letterSpacing: -0.1,
          maxWidth: 300,
        }}>
          Vitrina local sin comisiones. La app te conecta, el trato lo cerrás vos.
        </div>

        <div style={{ display:'flex', gap: 6, marginBottom: 18 }}>
          <div style={{ width: 22, height: 3, borderRadius: 2, background: B_TOKENS.ink }} />
          <div style={{ width: 6, height: 3, borderRadius: 2, background: B_TOKENS.line }} />
          <div style={{ width: 6, height: 3, borderRadius: 2, background: B_TOKENS.line }} />
        </div>

        <BBtn block size="lg">Continuar</BBtn>

        <div style={{
          textAlign:'center', fontFamily: B_TOKENS.body, fontSize: 13,
          color: B_TOKENS.inkSoft, marginTop: 14, marginBottom: 40,
          letterSpacing: -0.1,
        }}>
          Ya tengo cuenta · <span style={{ color: B_TOKENS.ink, fontWeight: 600, textDecoration:'underline', textDecorationColor: B_TOKENS.line, textUnderlineOffset: 3 }}>Iniciar sesión</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B02 — Home
// ─────────────────────────────────────────────────────────────
function B_Home() {
  return (
    <div style={{ height:'100%', background: B_TOKENS.bgGrad, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        {/* Header AY (negro+grid+verde) con tabs */}
        <BHeader
          title="Marketplace"
          titleAccent="del barrio"
          sub="Vitrina vecinal · vos cerrás el trato"
          onBack={false}
          action="search"
          tabs={[
            { id:'feed',   label:'Vendiendo', icon:'tag' },
            { id:'busco',  label:'Lo busco',  icon:'search' },
          ]}
          activeTab="feed"
        />

        {/* Search bar (compacta, debajo del header) */}
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{
            background: B_TOKENS.surface, borderRadius: 12, padding: '11px 14px',
            display:'flex', alignItems:'center', gap: 10,
            border:`1px solid ${B_TOKENS.line}`,
            boxShadow:'0 1px 2px rgba(15,23,42,0.04)',
          }}>
            <Icon name="search" size={16} stroke={B_TOKENS.inkSoft} />
            <div style={{ flex:1, fontFamily: B_TOKENS.body, fontSize: 13.5, color: B_TOKENS.inkFaint, letterSpacing: -0.1 }}>
              ¿Qué buscás cerca tuyo?
            </div>
            <div style={{ width: 1, height: 18, background: B_TOKENS.line }}/>
            <div style={{ display:'flex', alignItems:'center', gap: 4, color: B_TOKENS.ink, fontSize: 12, fontWeight: 600 }}>
              <Icon name="map-pin" size={13} stroke={B_TOKENS.accent} sw={2.2}/>
              Palermo
            </div>
          </div>
        </div>

        {/* Diferenciador: Vecinos cerca tuyo (chip ribbon) */}
        <div style={{ padding: '4px 16px 4px', display:'flex', alignItems:'center', gap: 8 }}>
          <div style={{ display:'flex' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius:'50%', marginLeft: i ? -8 : 0,
                background: ['#FCA5A5','#A7F3D0','#FCD34D','#93C5FD'][i],
                border:'2px solid #fff', boxShadow:'0 1px 2px rgba(0,0,0,.08)',
              }}/>
            ))}
          </div>
          <div style={{ flex: 1, fontFamily: B_TOKENS.body, fontSize: 12, color: B_TOKENS.inkSoft, letterSpacing: -0.1 }}>
            <b style={{ color: B_TOKENS.ink, fontWeight: 600 }}>23 vecinos</b> publicaron hoy en Palermo
          </div>
          <div style={{ fontFamily: B_TOKENS.body, fontSize: 12, fontWeight: 600, color: B_TOKENS.accentDark, letterSpacing: -0.1 }}>
            Ver mapa →
          </div>
        </div>

        {/* Category chips */}
        <div style={{ display:'flex', gap: 6, padding:'10px 16px 4px', overflowX:'auto' }}>
          <BChip active>Todo</BChip>
          {CATS.slice(0,6).map(c => (
            <BChip key={c.id} icon={c.icon}>{c.name}</BChip>
          ))}
        </div>

        {/* Quick filters */}
        <div style={{ padding: '8px 16px 10px', display:'flex', gap: 8, overflowX:'auto' }}>
          {[
            { name:'A 10 cuadras', icon:'map-pin' },
            { name:'Recién publicado', icon:'clock' },
            { name:'Verificados', icon:'shield' },
            { name:'Acepta oferta', icon:'tag' },
          ].map((q, i) => (
            <div key={i} style={{
              background: B_TOKENS.surface, border:`1px solid ${B_TOKENS.line}`,
              borderRadius: 999, padding:'7px 12px',
              display:'inline-flex', alignItems:'center', gap: 6,
              fontFamily: B_TOKENS.body, fontSize: 12, fontWeight: 500, color: B_TOKENS.ink,
              whiteSpace:'nowrap', letterSpacing: -0.1,
            }}>
              <Icon name={q.icon} size={12} stroke={B_TOKENS.inkSoft} />
              {q.name}
            </div>
          ))}
        </div>

        {/* Destacar banner — gradient verde AY */}
        <div style={{ padding: '6px 16px 12px' }}>
          <div style={{
            background: B_TOKENS.btnGrad, color:'#fff',
            borderRadius: 14, padding: 16,
            display:'flex', alignItems:'center', gap: 14,
            boxShadow:'0 1px 0 rgba(255,255,255,.15) inset, 0 8px 24px -12px rgba(16,185,129,0.5)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background:'rgba(255,255,255,0.18)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Icon name="sparkles" size={18} stroke="#fff" sw={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: B_TOKENS.display, fontWeight: 700, fontSize: 14.5, letterSpacing: -0.3 }}>Destacá y vendé más rápido</div>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color:'rgba(255,255,255,0.85)', marginTop: 2, letterSpacing: -0.1 }}>Desde $600 · hasta 5× más vistas</div>
            </div>
            <Icon name="arrow-right" size={16} stroke="#fff" sw={2.2}/>
          </div>
        </div>

        {/* Grid */}
        <div style={{ padding: '4px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, rowGap: 20 }}>
          {PRODUCTS.map(p => <BCard key={p.id} p={p} />)}
        </div>
      </div>
      <BTabBar active="market" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B03 — Categorías
// ─────────────────────────────────────────────────────────────
function B_Categories() {
  return (
    <div style={{ height:'100%', background: B_TOKENS.surface, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        <BHeader title="Categorías" sub="Explorá por tipo de producto" />

        <div style={{ padding: '10px 18px 0' }}>
          {CATS.map((c, i) => (
            <div key={c.id} style={{
              padding: '14px 0',
              display:'flex', alignItems:'center', gap: 14,
              borderBottom: i === CATS.length-1 ? 'none' : `1px solid ${B_TOKENS.lineSoft}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: B_TOKENS.surface2,
                border:`1px solid ${B_TOKENS.lineSoft}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon name={c.icon} size={19} stroke={B_TOKENS.ink} sw={1.6}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: B_TOKENS.display, fontWeight: 600, fontSize: 15, color: B_TOKENS.ink, letterSpacing: -0.2 }}>{c.name}</div>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 12, color: B_TOKENS.inkSoft, marginTop: 1, letterSpacing: -0.1 }}>
                  {[412, 186, 94, 251, 128, 337, 219, 77][i]} publicaciones en tu zona
                </div>
              </div>
              <Icon name="chev-right" size={16} stroke={B_TOKENS.inkFaint} />
            </div>
          ))}
        </div>
      </div>
      <BTabBar active="home" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B04 — Búsqueda + filtros
// ─────────────────────────────────────────────────────────────
function B_Search() {
  return (
    <div style={{ height:'100%', background: B_TOKENS.bg, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 0 }}>
        {/* Header */}
        <div style={{ padding:'58px 16px 14px', background: B_TOKENS.surface, borderBottom:`1px solid ${B_TOKENS.lineSoft}` }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <Icon name="arrow-left" size={22} stroke={B_TOKENS.ink} />
            <div style={{ flex: 1, background: B_TOKENS.surface2, borderRadius: 10, padding: '10px 14px', display:'flex', alignItems:'center', gap: 8, border:`1px solid ${B_TOKENS.lineSoft}` }}>
              <Icon name="search" size={14} stroke={B_TOKENS.inkSoft} />
              <div style={{ flex:1, fontFamily: B_TOKENS.body, fontSize: 13.5, color: B_TOKENS.ink, fontWeight: 500, letterSpacing:-0.1 }}>silla vintage</div>
              <Icon name="x" size={14} stroke={B_TOKENS.inkSoft} />
            </div>
          </div>

          <div style={{ display:'flex', gap: 6, marginTop: 14, overflowX:'auto' }}>
            <BChip active icon="x">Palermo + 3km</BChip>
            <BChip active icon="x">$0 – $30k</BChip>
            <BChip icon="plus">Categoría</BChip>
            <BChip icon="plus">Estado</BChip>
          </div>
        </div>

        {/* Results header */}
        <div style={{ padding: '16px 16px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily: B_TOKENS.body, fontSize: 13, color: B_TOKENS.inkSoft, letterSpacing: -0.1 }}>
            <b style={{ color: B_TOKENS.ink, fontFamily: B_TOKENS.display, fontSize: 15, letterSpacing: -0.3 }}>24 productos</b> encontrados
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap: 6,
            background: B_TOKENS.surface, border:`1px solid ${B_TOKENS.line}`,
            borderRadius: 8, padding:'6px 10px',
            fontFamily: B_TOKENS.body, fontSize: 12, fontWeight: 500, color: B_TOKENS.ink,
          }}>
            <Icon name="sliders" size={12} stroke={B_TOKENS.ink} />
            Cerca
            <Icon name="chev-down" size={12} stroke={B_TOKENS.inkSoft} />
          </div>
        </div>

        {/* Price panel */}
        <div style={{ background: B_TOKENS.surface, margin: '4px 16px 12px', borderRadius: 14, padding: 14, border:`1px solid ${B_TOKENS.lineSoft}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
            <div style={{ fontFamily: B_TOKENS.display, fontSize: 13, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.2 }}>Rango de precio</div>
            <div style={{ fontFamily: B_TOKENS.mono, fontSize: 11, color: B_TOKENS.inkSoft }}>$0 — $30k</div>
          </div>
          <div style={{ position:'relative', height: 4, background: B_TOKENS.surface2, borderRadius: 999 }}>
            <div style={{ position:'absolute', left:'10%', right:'30%', height:4, background: B_TOKENS.ink, borderRadius: 999 }}/>
            <div style={{ position:'absolute', top:-6, left:'10%', width: 16, height: 16, borderRadius:'50%', background: B_TOKENS.surface, border:`2px solid ${B_TOKENS.ink}`, transform:'translateX(-50%)', boxShadow:'0 1px 2px rgba(0,0,0,.1)' }}/>
            <div style={{ position:'absolute', top:-6, left:'70%', width: 16, height: 16, borderRadius:'50%', background: B_TOKENS.surface, border:`2px solid ${B_TOKENS.ink}`, transform:'translateX(-50%)', boxShadow:'0 1px 2px rgba(0,0,0,.1)' }}/>
          </div>
          {/* Histogram */}
          <div style={{ display:'flex', alignItems:'flex-end', gap: 2, marginTop: 14, height: 24 }}>
            {[4,6,12,18,22,16,10,7,14,9,5,3,2,1].map((v,i) => (
              <div key={i} style={{
                flex:1, height: `${v/22*100}%`,
                background: i >= 1 && i <= 9 ? B_TOKENS.ink : B_TOKENS.line,
                borderRadius: 1,
              }}/>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: '0 16px 30px', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, rowGap: 20 }}>
          {PRODUCTS.slice(0, 6).map(p => <BCard key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B05 — Detalle
// ─────────────────────────────────────────────────────────────
function B_Detail() {
  const p = PRODUCTS[0];
  const seller = MOCK_SELLERS.find(s => s.id === p.seller);
  return (
    <div style={{ height:'100%', background: B_TOKENS.surface, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 110 }}>
        {/* Hero */}
        <div style={{ position:'relative' }}>
          <ProductImage src={p.img} aspect={1} rounded={0} />
          <div style={{ position:'absolute', top: 58, left: 14, right: 14, display:'flex', justifyContent:'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>
              <Icon name="arrow-left" size={18} stroke={B_TOKENS.ink}/>
            </div>
            <div style={{ display:'flex', gap: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>
                <Icon name="share" size={16} stroke={B_TOKENS.ink}/>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>
                <Icon name="heart" size={16} stroke={B_TOKENS.ink}/>
              </div>
            </div>
          </div>
          <div style={{ position:'absolute', bottom: 12, right: 14, background:'rgba(10,10,10,0.7)', color:'#fff', padding: '3px 10px', borderRadius: 999, fontFamily: B_TOKENS.mono, fontSize: 10, fontWeight: 500 }}>
            1 / 4
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Title + price */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 15, color: B_TOKENS.inkSoft, lineHeight: 1.3, letterSpacing: -0.1 }}>
                {p.title}
              </div>
              <div style={{ fontFamily: B_TOKENS.display, fontSize: 30, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -1.2, marginTop: 4 }}>
                {fmtPrice(p.price)}
              </div>
            </div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap: 4,
              background: B_TOKENS.surface2, color: B_TOKENS.ink,
              padding:'5px 10px', borderRadius: 999,
              fontFamily: B_TOKENS.body, fontSize: 10.5, fontWeight: 600, letterSpacing: -0.1,
              border:`1px solid ${B_TOKENS.line}`, marginTop: 2,
            }}>
              <Icon name="sparkles" size={11} stroke={B_TOKENS.ink} sw={2.2}/> Destacado
            </div>
          </div>

          <div style={{ display:'flex', gap: 14, marginTop: 14, fontFamily: B_TOKENS.body, fontSize: 12, color: B_TOKENS.inkSoft, letterSpacing: -0.1 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="map-pin" size={12} stroke={B_TOKENS.inkSoft} sw={2}/> {p.dist}</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="eye" size={12} stroke={B_TOKENS.inkSoft} sw={2}/> {p.views}</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="clock" size={12} stroke={B_TOKENS.inkSoft} sw={2}/> hace 3 días</span>
          </div>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop:`1px solid ${B_TOKENS.lineSoft}`, fontFamily: B_TOKENS.body, fontSize: 14, color: B_TOKENS.ink, lineHeight: 1.6, letterSpacing: -0.1 }}>
            Silla vintage de mimbre restaurada a mano. Estructura de madera noble, tejido original en excelente estado. Ideal para rincón de lectura o entrada.
          </div>

          {/* Specs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop: 18 }}>
            {[
              ['Estado', 'Como nuevo'],
              ['Categoría', 'Muebles'],
              ['Entrega', 'Retiro / acuerdan'],
              ['Publicado', 'Hace 3 días'],
            ].map(([k,v], i) => (
              <div key={i} style={{ background: B_TOKENS.surface2, borderRadius: 10, padding: '10px 12px', border:`1px solid ${B_TOKENS.lineSoft}` }}>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 10.5, color: B_TOKENS.inkSoft, fontWeight: 500, letterSpacing: 0.1 }}>{k}</div>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 13, color: B_TOKENS.ink, fontWeight: 500, marginTop: 2, letterSpacing: -0.1 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Seller */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop:`1px solid ${B_TOKENS.lineSoft}`, display:'flex', alignItems:'center', gap: 12 }}>
            <Avatar name={seller.name} size={44} tone="dark" />
            <div style={{ flex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <div style={{ fontFamily: B_TOKENS.display, fontWeight: 600, fontSize: 15, color: B_TOKENS.ink, letterSpacing: -0.3 }}>{seller.name}</div>
                {seller.verified && (
                  <div style={{ width: 15, height: 15, borderRadius:'50%', background: B_TOKENS.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="check" size={9} stroke="#fff" sw={3.5} />
                  </div>
                )}
              </div>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color: B_TOKENS.inkSoft, marginTop: 1, display:'flex', alignItems:'center', gap: 4, letterSpacing: -0.1 }}>
                <Icon name="star" size={11} stroke={B_TOKENS.ink} fill={B_TOKENS.ink}/> {seller.rating} · {seller.items} publicados · {seller.joined}
              </div>
            </div>
            <Icon name="chev-right" size={16} stroke={B_TOKENS.inkFaint}/>
          </div>

          {/* Safety */}
          <div style={{ marginTop: 16, background: B_TOKENS.surface2, borderRadius: 12, padding: 14, display:'flex', gap: 10, border:`1px solid ${B_TOKENS.lineSoft}` }}>
            <Icon name="shield" size={16} stroke={B_TOKENS.ink} sw={1.8} />
            <div style={{ flex: 1, fontFamily: B_TOKENS.body, fontSize: 12.5, color: B_TOKENS.inkSoft, lineHeight: 1.5, letterSpacing: -0.1 }}>
              <b style={{ color: B_TOKENS.ink, fontWeight: 600 }}>Arreglá directo con el vendedor.</b> Marketplace no procesa pagos ni envíos.
            </div>
          </div>
        </div>
      </div>

      {/* Contact dock */}
      <div style={{
        position:'absolute', left:0, right:0, bottom: 0,
        background: 'rgba(255,255,255,0.92)', padding: '12px 16px 34px',
        display:'flex', gap: 8,
        borderTop: `1px solid ${B_TOKENS.line}`,
        WebkitBackdropFilter:'blur(20px)', backdropFilter:'blur(20px)',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: B_TOKENS.surface, border:`1px solid ${B_TOKENS.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="at-sign" size={20} stroke={B_TOKENS.ink}/>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: B_TOKENS.surface, border:`1px solid ${B_TOKENS.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="phone" size={18} stroke={B_TOKENS.ink}/>
        </div>
        <div style={{ flex: 1 }}>
          <BBtn block icon="message-circle" size="md">Mensaje al vendedor</BBtn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B06 — Seller
// ─────────────────────────────────────────────────────────────
function B_Seller() {
  const seller = MOCK_SELLERS[2];
  const items = PRODUCTS.filter(p => p.seller === 's3');
  return (
    <div style={{ height:'100%', background: B_TOKENS.surface, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        <BHeader back action={
          <div style={{ width: 36, height: 36, borderRadius: 10, background: B_TOKENS.surface2, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="more" size={18} stroke={B_TOKENS.ink}/>
          </div>
        } />

        <div style={{ padding: '0 20px 6px' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <Avatar name={seller.name} size={64} tone="dark" />
            <div style={{ flex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <div style={{ fontFamily: B_TOKENS.display, fontSize: 20, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.5 }}>
                  {seller.name}
                </div>
                {seller.verified && (
                  <div style={{ width: 16, height: 16, borderRadius:'50%', background: B_TOKENS.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="check" size={10} stroke="#fff" sw={3.5}/>
                  </div>
                )}
              </div>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 12.5, color: B_TOKENS.inkSoft, marginTop: 2, letterSpacing: -0.1 }}>
                {seller.hood} · {seller.joined}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap: 8, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <BBtn block icon="message-circle" size="md">Mensaje</BBtn>
            </div>
            <BBtn variant="secondary" icon="user" size="md">Seguir</BBtn>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', padding: '18px 0', margin:'18px 20px 0', borderTop:`1px solid ${B_TOKENS.lineSoft}`, borderBottom:`1px solid ${B_TOKENS.lineSoft}` }}>
          {[
            ['Reputación', seller.rating.toFixed(1), 'star'],
            ['Publicados', seller.items, null],
            ['Respuesta', '<1h', null],
            ['Seguidores', '214', null],
          ].map(([k, v, icon], i, arr) => (
            <div key={i} style={{
              flex: 1, textAlign:'center',
              borderRight: i === arr.length-1 ? 'none' : `1px solid ${B_TOKENS.lineSoft}`,
            }}>
              <div style={{ fontFamily: B_TOKENS.display, fontSize: 17, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.4, display:'inline-flex', alignItems:'center', gap: 3 }}>
                {icon && <Icon name={icon} size={13} stroke={B_TOKENS.ink} fill={B_TOKENS.ink}/>}
                {v}
              </div>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 10.5, color: B_TOKENS.inkSoft, marginTop: 2, letterSpacing: 0.05, fontWeight: 500 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ padding: '16px 20px 0', display:'flex', gap: 20 }}>
          <div style={{ paddingBottom: 10, borderBottom: `2px solid ${B_TOKENS.ink}`, fontFamily: B_TOKENS.body, fontWeight: 600, fontSize: 13.5, color: B_TOKENS.ink, letterSpacing: -0.1 }}>
            En venta · {seller.items}
          </div>
          <div style={{ paddingBottom: 10, fontFamily: B_TOKENS.body, fontWeight: 500, fontSize: 13.5, color: B_TOKENS.inkSoft, letterSpacing: -0.1 }}>
            Reseñas · 18
          </div>
        </div>

        <div style={{ padding: '16px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, rowGap: 20 }}>
          {items.map(p => <BCard key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B07 — Publicar (3 steps)
// ─────────────────────────────────────────────────────────────
function B_PostStep({ step = 1 }) {
  return (
    <div style={{ height:'100%', background: B_TOKENS.surface, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 110 }}>
        {/* Header */}
        <div style={{ padding: '58px 18px 16px', borderBottom:`1px solid ${B_TOKENS.lineSoft}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: B_TOKENS.surface2, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="x" size={18} stroke={B_TOKENS.ink}/>
            </div>
            <div style={{ fontFamily: B_TOKENS.mono, fontSize: 11, color: B_TOKENS.inkSoft, fontWeight: 500 }}>
              PASO {step} / 3
            </div>
            <div style={{ fontFamily: B_TOKENS.body, fontSize: 13, color: B_TOKENS.ink, fontWeight: 500, letterSpacing: -0.1 }}>Guardar</div>
          </div>
          <div style={{ marginTop: 14, display:'flex', gap: 4 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ flex: 1, height: 3, background: i <= step ? B_TOKENS.ink : B_TOKENS.line, borderRadius: 999, transition:'background .2s' }}/>
            ))}
          </div>
          <div style={{ fontFamily: B_TOKENS.display, fontSize: 24, fontWeight: 600, color: B_TOKENS.ink, marginTop: 18, letterSpacing: -0.8 }}>
            {step === 1 && 'Fotos del producto'}
            {step === 2 && 'Detalles'}
            {step === 3 && 'Contacto y destacar'}
          </div>
          <div style={{ fontFamily: B_TOKENS.body, fontSize: 13, color: B_TOKENS.inkSoft, marginTop: 4, letterSpacing: -0.1 }}>
            {step === 1 && 'Subí hasta 8 fotos. La primera es la portada.'}
            {step === 2 && 'Cuanto más claro, más rápido vendés.'}
            {step === 3 && 'Elegí cómo querés que te contacten.'}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {step === 1 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10 }}>
              <div style={{
                aspectRatio: 1, background: B_TOKENS.surface2, borderRadius: 10,
                border: `1.5px dashed ${B_TOKENS.inkFaint}`,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 5,
              }}>
                <Icon name="camera" size={22} stroke={B_TOKENS.ink} sw={1.6}/>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 10.5, fontWeight: 500, color: B_TOKENS.ink, letterSpacing: -0.1 }}>Agregar</div>
              </div>
              {[PRODUCTS[0].img, PRODUCTS[3].img, PRODUCTS[7].img, PRODUCTS[10].img, PRODUCTS[5].img].map((src, i) => (
                <div key={i} style={{ aspectRatio: 1, borderRadius: 10, overflow:'hidden', position:'relative' }}>
                  <ProductImage src={src} aspect={1} rounded={10} />
                  {i === 0 && (
                    <div style={{ position:'absolute', bottom: 5, left: 5, background: B_TOKENS.ink, color:'#fff', fontSize: 9.5, padding:'2px 7px', borderRadius: 5, fontFamily: B_TOKENS.body, fontWeight: 600, letterSpacing: -0.1 }}>Portada</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <BField label="Título" value="Silla de mimbre vintage" />
              <BField label="Categoría" value="Muebles · Segunda mano" chev />
              <BField label="Estado" value="Como nuevo" chev />
              <BField label="Precio" value="$ 18.000" bigAccent />
              <BField label="Descripción" value="Restaurada a mano, estructura de madera noble, tejido original en excelente estado…" multi />
            </>
          )}

          {step === 3 && (
            <>
              <BField label="Zona" value="Palermo · CABA" chev iconLeft="map-pin" />
              <BField label="Modalidad" value="Retiro en zona" chev />

              <div style={{ fontFamily: B_TOKENS.display, fontSize: 13.5, fontWeight: 600, color: B_TOKENS.ink, marginTop: 22, marginBottom: 10, letterSpacing: -0.2 }}>Canales de contacto</div>
              {[
                { icon:'message-circle', name:'Chat en la app',   sub:'Todos los usuarios', on:true },
                { icon:'at-sign',        name:'WhatsApp',         sub:'+54 9 11 ····',      on:true },
                { icon:'phone',          name:'Llamada',          sub:'+54 9 11 ····',      on:false },
              ].map((c, i) => (
                <div key={i} style={{
                  border:`1px solid ${B_TOKENS.line}`, borderRadius: 10,
                  padding: '12px 14px', marginBottom: 8,
                  display:'flex', alignItems:'center', gap: 12,
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: B_TOKENS.surface2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={c.icon} size={16} stroke={B_TOKENS.ink} sw={1.7}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: B_TOKENS.body, fontSize: 13.5, fontWeight: 500, color: B_TOKENS.ink, letterSpacing: -0.1 }}>{c.name}</div>
                    <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color: B_TOKENS.inkSoft, letterSpacing: -0.1 }}>{c.sub}</div>
                  </div>
                  <BToggle on={c.on} />
                </div>
              ))}

              <div style={{
                marginTop: 18, background: B_TOKENS.btnGrad, color:'#fff', borderRadius: 14, padding: 16,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="sparkles" size={16} stroke="#fff" sw={1.8}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: B_TOKENS.display, fontSize: 14, fontWeight: 600, letterSpacing: -0.3 }}>Destacar esta publicación</div>
                    <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color:'rgba(255,255,255,0.6)', marginTop: 1, letterSpacing: -0.1 }}>7 días · $1.200 · 5× más vistas</div>
                  </div>
                  <div style={{
                    width: 40, height: 22, borderRadius: 999, background:'rgba(255,255,255,0.15)', position:'relative',
                  }}>
                    <div style={{ position:'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius:'50%', background:'#fff' }}/>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position:'absolute', left:0, right:0, bottom: 0,
        padding: '12px 18px 34px', background: 'rgba(255,255,255,0.92)',
        borderTop:`1px solid ${B_TOKENS.line}`,
        WebkitBackdropFilter:'blur(20px)', backdropFilter:'blur(20px)',
      }}>
        <BBtn block size="lg">{step < 3 ? 'Continuar' : 'Publicar producto'}</BBtn>
      </div>
    </div>
  );
}

function BField({ label, value, multi, chev, bigAccent, iconLeft }) {
  return (
    <div style={{
      border: `1px solid ${B_TOKENS.line}`, borderRadius: 10, padding: '10px 14px',
      marginBottom: 10, display:'flex', alignItems:'center', gap: 10,
      background: B_TOKENS.surface,
    }}>
      {iconLeft && <Icon name={iconLeft} size={16} stroke={B_TOKENS.inkSoft}/>}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: B_TOKENS.body, fontSize: 10.5, color: B_TOKENS.inkSoft, fontWeight: 500, letterSpacing: 0.1 }}>{label}</div>
        <div style={{
          fontFamily: B_TOKENS.body,
          fontSize: bigAccent ? 20 : 14,
          fontWeight: bigAccent ? 600 : 500,
          color: B_TOKENS.ink,
          marginTop: 2,
          lineHeight: multi ? 1.4 : 1.2,
          minHeight: multi ? 42 : undefined,
          letterSpacing: bigAccent ? -0.5 : -0.1,
        }}>{value}</div>
      </div>
      {chev && <Icon name="chev-right" size={14} stroke={B_TOKENS.inkFaint}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B08 — Mis publicaciones
// ─────────────────────────────────────────────────────────────
function B_MyListings() {
  const mine = [PRODUCTS[0], PRODUCTS[6], PRODUCTS[10]];
  return (
    <div style={{ height:'100%', background: B_TOKENS.bg, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        <BHeader title="Mis publicaciones" sub="3 activas · 1 pausada · 12 vendidas"
          action={
            <div style={{ width: 36, height: 36, borderRadius: 10, background: B_TOKENS.btnGrad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,.15)' }}>
              <Icon name="plus" size={18} stroke="#fff" sw={2.4}/>
            </div>
          } />

        <div style={{ padding: '12px 18px 6px', display:'flex', gap: 6 }}>
          <BChip active>Activas · 3</BChip>
          <BChip>Pausadas · 1</BChip>
          <BChip>Vendidas · 12</BChip>
        </div>

        <div style={{ padding: '8px 18px', display:'flex', flexDirection:'column', gap: 12 }}>
          {mine.map(p => (
            <div key={p.id} style={{ background: B_TOKENS.surface, borderRadius: 14, padding: 14, border:`1px solid ${B_TOKENS.lineSoft}`, boxShadow:'0 1px 2px rgba(0,0,0,.02)' }}>
              <div style={{ display:'flex', gap: 12 }}>
                <div style={{ width: 78, flexShrink: 0 }}>
                  <ProductImage src={p.img} aspect={1} rounded={8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ background: B_TOKENS.success + '18', color: B_TOKENS.success, fontSize: 10, padding: '2px 8px', borderRadius: 5, fontFamily: B_TOKENS.body, fontWeight: 600, letterSpacing: -0.1, display:'inline-flex', alignItems:'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: B_TOKENS.success, display:'inline-block' }}/> Activa
                    </div>
                    {p.boost && (
                      <div style={{ background: B_TOKENS.ink, color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 5, fontFamily: B_TOKENS.body, fontWeight: 600, letterSpacing: -0.1, display:'inline-flex', alignItems:'center', gap: 4 }}>
                        <Icon name="sparkles" size={9} stroke="#fff" sw={2.4}/> Destacado
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: B_TOKENS.body, fontWeight: 500, fontSize: 14, color: B_TOKENS.ink, lineHeight: 1.3, letterSpacing: -0.1 }}>{p.title}</div>
                  <div style={{ fontFamily: B_TOKENS.display, fontSize: 16, fontWeight: 600, color: B_TOKENS.ink, marginTop: 3, letterSpacing: -0.4 }}>{fmtPrice(p.price)}</div>
                </div>
                <Icon name="more-v" size={18} stroke={B_TOKENS.inkFaint}/>
              </div>

              <div style={{ display:'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop:`1px solid ${B_TOKENS.lineSoft}`, fontFamily: B_TOKENS.body, fontSize: 11.5 }}>
                <div style={{ color: B_TOKENS.inkSoft, display:'inline-flex', alignItems:'center', gap: 5 }}>
                  <Icon name="eye" size={12} stroke={B_TOKENS.inkSoft} sw={1.8}/> <b style={{ color: B_TOKENS.ink, fontWeight: 600 }}>{p.views}</b> vistas
                </div>
                <div style={{ color: B_TOKENS.inkSoft, display:'inline-flex', alignItems:'center', gap: 5 }}>
                  <Icon name="message-circle" size={12} stroke={B_TOKENS.inkSoft} sw={1.8}/> <b style={{ color: B_TOKENS.ink, fontWeight: 600 }}>{p.contacts}</b> contactos
                </div>
                <div style={{ color: B_TOKENS.inkSoft, display:'inline-flex', alignItems:'center', gap: 5 }}>
                  <Icon name="heart" size={12} stroke={B_TOKENS.inkSoft} sw={1.8}/> <b style={{ color: B_TOKENS.ink, fontWeight: 600 }}>{Math.floor(p.views/10)}</b>
                </div>
              </div>

              <div style={{ display:'flex', gap: 8, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <BBtn variant="secondary" icon="edit" size="sm" block>Editar</BBtn>
                </div>
                <div style={{ flex: 1 }}>
                  <BBtn icon="sparkles" size="sm" block>{p.boost ? 'Extender' : 'Destacar'}</BBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BTabBar active="me" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B09 — Estadísticas
// ─────────────────────────────────────────────────────────────
function B_Stats() {
  const bars = [24, 42, 31, 58, 72, 55, 84];
  const max = Math.max(...bars);
  return (
    <div style={{ height:'100%', background: B_TOKENS.bg, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 30 }}>
        <BHeader title="Estadísticas" sub="Últimos 7 días" back />

        <div style={{ padding: '16px 18px' }}>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
            {[
              { k:'Vistas',         v:'366',  d:'+24%', up:true },
              { k:'Contactos',      v:'29',   d:'+12%', up:true },
              { k:'Guardados',      v:'47',   d:'+8%',  up:true },
              { k:'Tasa contacto',  v:'7.9%', d:'→',    up:null },
            ].map((s, i) => (
              <div key={i} style={{ background: B_TOKENS.surface, borderRadius: 12, padding: 14, border:`1px solid ${B_TOKENS.lineSoft}` }}>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 11, color: B_TOKENS.inkSoft, fontWeight: 500, letterSpacing: 0 }}>{s.k}</div>
                <div style={{ fontFamily: B_TOKENS.display, fontSize: 26, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -1, marginTop: 4 }}>{s.v}</div>
                <div style={{
                  fontFamily: B_TOKENS.mono, fontSize: 10.5,
                  color: s.up === true ? B_TOKENS.success : s.up === false ? '#DC2626' : B_TOKENS.inkSoft,
                  fontWeight: 500, marginTop: 2,
                }}>{s.d}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ marginTop: 14, background: B_TOKENS.surface, borderRadius: 12, padding: 16, border:`1px solid ${B_TOKENS.lineSoft}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: B_TOKENS.display, fontSize: 13.5, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.2 }}>Vistas por día</div>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 10.5, color: B_TOKENS.inkSoft, marginTop: 1 }}>Semana del 4-10 nov</div>
              </div>
              <div style={{
                fontFamily: B_TOKENS.mono, fontSize: 11, color: B_TOKENS.inkSoft,
                background: B_TOKENS.surface2, padding:'3px 8px', borderRadius: 6,
                border:`1px solid ${B_TOKENS.lineSoft}`,
              }}>7d</div>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap: 8, height: 120 }}>
              {bars.map((v, i) => (
                <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
                  <div style={{
                    width:'100%', height: `${v/max*100}%`,
                    background: i === bars.length-1 ? B_TOKENS.btnGrad : B_TOKENS.surface2,
                    border: i === bars.length-1 ? 'none' : `1px solid ${B_TOKENS.lineSoft}`,
                    borderRadius: 5,
                  }} />
                  <div style={{ fontFamily: B_TOKENS.mono, fontSize: 10, color: B_TOKENS.inkSoft }}>{['L','M','X','J','V','S','D'][i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top posts */}
          <div style={{ marginTop: 18, fontFamily: B_TOKENS.display, fontSize: 14, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.2 }}>Top publicaciones</div>
          {[PRODUCTS[0], PRODUCTS[6]].map(p => (
            <div key={p.id} style={{ marginTop: 8, background: B_TOKENS.surface, borderRadius: 12, padding: 12, border:`1px solid ${B_TOKENS.lineSoft}`, display:'flex', gap: 12, alignItems:'center' }}>
              <div style={{ width: 48, flexShrink: 0 }}><ProductImage src={p.img} aspect={1} rounded={8}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 13, fontWeight: 500, color: B_TOKENS.ink, letterSpacing: -0.1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 11, color: B_TOKENS.inkSoft, marginTop: 2, letterSpacing: -0.1 }}>{p.views} vistas · {p.contacts} contactos</div>
              </div>
              <div style={{ fontFamily: B_TOKENS.display, fontSize: 15, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.3 }}>{((p.contacts/p.views)*100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B10 — Chat
// ─────────────────────────────────────────────────────────────
function B_Chat() {
  const seller = MOCK_SELLERS[0];
  return (
    <div style={{ height:'100%', background: B_TOKENS.bg, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background: B_TOKENS.surface, borderBottom:`1px solid ${B_TOKENS.lineSoft}`, padding:'58px 14px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'0 0 10px' }}>
          <Icon name="arrow-left" size={20} stroke={B_TOKENS.ink}/>
          <Avatar name={seller.name} size={36} tone="dark"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: B_TOKENS.display, fontWeight: 600, fontSize: 14, color: B_TOKENS.ink, letterSpacing: -0.2 }}>{seller.name}</div>
            <div style={{ fontFamily: B_TOKENS.body, fontSize: 11, color: B_TOKENS.success, fontWeight: 500, display:'inline-flex', alignItems:'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: B_TOKENS.success, display:'inline-block' }}/>
              En línea
            </div>
          </div>
          <Icon name="phone" size={20} stroke={B_TOKENS.ink}/>
          <Icon name="more-v" size={20} stroke={B_TOKENS.ink}/>
        </div>

        {/* Product bar */}
        <div style={{
          margin: '0 0 10px', background: B_TOKENS.surface2, borderRadius: 10, padding: 8,
          display:'flex', alignItems:'center', gap: 10,
          border:`1px solid ${B_TOKENS.lineSoft}`,
        }}>
          <div style={{ width: 34 }}><ProductImage src={PRODUCTS[0].img} aspect={1} rounded={6}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: B_TOKENS.body, fontSize: 12, fontWeight: 500, color: B_TOKENS.ink, lineHeight: 1.2, letterSpacing: -0.1 }}>Silla de mimbre vintage</div>
            <div style={{ fontFamily: B_TOKENS.display, fontSize: 13, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.3 }}>$ 18.000</div>
          </div>
          <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color: B_TOKENS.ink, fontWeight: 500, letterSpacing: -0.1 }}>Ver</div>
        </div>
      </div>

      {/* Messages */}
      <div className="phone-scroll" style={{ flex: 1, overflowY:'auto', padding:'14px 14px', display:'flex', flexDirection:'column', gap: 10 }}>
        <div style={{
          alignSelf:'center', background: B_TOKENS.surface, color: B_TOKENS.inkSoft,
          borderRadius: 8, padding: '6px 12px',
          fontFamily: B_TOKENS.body, fontSize: 11, fontWeight: 500,
          display:'flex', alignItems:'center', gap: 6,
          maxWidth: '90%', textAlign:'center',
          border:`1px solid ${B_TOKENS.lineSoft}`,
          letterSpacing: -0.1,
        }}>
          <Icon name="shield" size={12} stroke={B_TOKENS.inkSoft} sw={1.8}/> Pagos y envíos se acuerdan fuera de la app
        </div>

        {[
          { me:false, t:'¡Hola! Vi tu silla, ¿sigue disponible?', time:'10:32' },
          { me:true,  t:'Hola! Sí, sigue disponible. ¿Querés verla?', time:'10:34' },
          { me:false, t:'Perfecto, ¿puedo pasar mañana entre las 18 y 20?', time:'10:35' },
          { me:true,  t:'Dale, te paso dirección por privado.', time:'10:36' },
        ].map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth:'78%' }}>
            <div style={{
              background: m.me ? B_TOKENS.btnGrad : B_TOKENS.surface,
              color: m.me ? '#fff' : B_TOKENS.ink,
              borderRadius: 16,
              borderBottomRightRadius: m.me ? 4 : 16,
              borderBottomLeftRadius: m.me ? 16 : 4,
              padding: '10px 14px',
              fontFamily: B_TOKENS.body, fontSize: 13.5, lineHeight: 1.4, letterSpacing: -0.1,
              border: m.me ? 'none' : `1px solid ${B_TOKENS.lineSoft}`,
              boxShadow: m.me ? '0 1px 2px rgba(0,0,0,.15)' : 'none',
            }}>{m.t}</div>
            <div style={{ fontFamily: B_TOKENS.mono, fontSize: 9.5, color: B_TOKENS.inkFaint, marginTop: 3, textAlign: m.me ? 'right' : 'left' }}>{m.time}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:'10px 14px 30px', background: B_TOKENS.surface, borderTop:`1px solid ${B_TOKENS.lineSoft}`, display:'flex', gap: 8, alignItems:'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: B_TOKENS.surface2, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="plus" size={18} stroke={B_TOKENS.ink}/>
        </div>
        <div style={{ flex: 1, background: B_TOKENS.surface2, borderRadius: 999, padding:'10px 16px', fontFamily: B_TOKENS.body, fontSize: 13, color: B_TOKENS.inkFaint, letterSpacing: -0.1 }}>
          Escribí un mensaje…
        </div>
        <div style={{ width: 38, height: 38, borderRadius:'50%', background: B_TOKENS.btnGrad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,.2)' }}>
          <Icon name="send" size={16} stroke="#fff" sw={2}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B11 — Notifs
// ─────────────────────────────────────────────────────────────
function B_Notifs() {
  const notifs = [
    { title:'Martín te envió un mensaje', body:'"¿Sigue disponible?" · Silla de mimbre', time:'5 min', fresh: true,  icon:'message-circle' },
    { title:'Tu destacado está activo',    body:'Quedan 2 días · MacBook Air M1',        time:'1 h',   fresh: true,  icon:'sparkles' },
    { title:'24 vistas nuevas hoy',        body:'Silla de mimbre vintage',               time:'3 h',   fresh: false, icon:'eye' },
    { title:'3 usuarios guardaron tu producto', body:'Jarrones de cerámica',             time:'Ayer',  fresh: false, icon:'heart' },
    { title:'Lucía subió un producto',     body:'Seguidor · Plantas',                    time:'2 d',   fresh: false, icon:'user' },
  ];
  return (
    <div style={{ height:'100%', background: B_TOKENS.surface, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        <BHeader title="Notificaciones"
          action={
            <div style={{ fontFamily: B_TOKENS.body, fontSize: 13, color: B_TOKENS.ink, fontWeight: 500, letterSpacing: -0.1 }}>Marcar leídas</div>
          }
        />

        <div style={{ padding: '4px 0' }}>
          {notifs.map((n, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'flex-start', gap: 14,
              padding: '14px 20px',
              background: n.fresh ? B_TOKENS.surface2 : 'transparent',
              borderBottom: `1px solid ${B_TOKENS.lineSoft}`,
              position:'relative',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: n.fresh ? B_TOKENS.btnGrad : B_TOKENS.surface,
                border: n.fresh ? 'none' : `1px solid ${B_TOKENS.line}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink: 0,
              }}>
                <Icon name={n.icon} size={17} stroke={n.fresh ? '#fff' : B_TOKENS.ink} sw={1.7} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 13.5, fontWeight: 500, color: B_TOKENS.ink, lineHeight: 1.3, letterSpacing: -0.1 }}>{n.title}</div>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 12, color: B_TOKENS.inkSoft, marginTop: 2, letterSpacing: -0.1 }}>{n.body}</div>
                <div style={{ fontFamily: B_TOKENS.mono, fontSize: 10.5, color: B_TOKENS.inkFaint, marginTop: 5 }}>Hace {n.time}</div>
              </div>
              {n.fresh && <div style={{ width: 7, height: 7, borderRadius:'50%', background: B_TOKENS.ink, marginTop: 6, flexShrink: 0 }}/>}
            </div>
          ))}
        </div>
      </div>
      <BTabBar active="chats" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B12 — Favoritos
// ─────────────────────────────────────────────────────────────
function B_Favs() {
  const favs = [PRODUCTS[1], PRODUCTS[4], PRODUCTS[7], PRODUCTS[9], PRODUCTS[11], PRODUCTS[2]];
  return (
    <div style={{ height:'100%', background: B_TOKENS.bg, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        <BHeader title="Favoritos" sub={`${favs.length} productos guardados`} />

        <div style={{ padding: '12px 18px 6px', display:'flex', gap: 6 }}>
          <BChip active>Todo</BChip>
          <BChip>Activos</BChip>
          <BChip>Bajaron precio · 2</BChip>
        </div>

        <div style={{ padding: '10px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, rowGap: 20 }}>
          {favs.map(p => <BCard key={p.id} p={p} />)}
        </div>
      </div>
      <BTabBar active="me" />
    </div>
  );
}

Object.assign(window, {
  B_TOKENS, BBtn, BTabBar, BChip, BCard, BHeader, BToggle,
  B_Onboarding, B_Home, B_Categories, B_Search, B_Detail, B_Seller,
  B_PostStep, B_MyListings, B_Stats, B_Chat, B_Notifs, B_Favs,
  B_LoBusco,
});

// ─────────────────────────────────────────────────────────────
// B · "Lo busco" (modo inverso) — DIFERENCIADOR clave vs ML/FB
// El comprador publica qué necesita; los vendedores responden.
// ─────────────────────────────────────────────────────────────
function B_LoBusco() {
  const requests = [
    {
      who:'Lucía M.',  hood:'Palermo',  dist:'8 cuadras',
      title:'Busco silla escritorio ergonómica',
      detail:'De segunda mano · presupuesto hasta $40.000 · que tenga apoyo lumbar',
      time:'hace 2 h',  responses: 4, fresh: true,
    },
    {
      who:'Tomás R.',  hood:'Chacarita', dist:'15 cuadras',
      title:'Necesito mudanza para sábado',
      detail:'2 ambientes Chacarita → Belgrano · $20-30k · con flete chico',
      time:'hace 5 h',  responses: 7,  fresh: false,
    },
    {
      who:'Carla & Ana', hood:'V. Crespo', dist:'22 cuadras',
      title:'Cambio plantas por libros',
      detail:'Tengo 2 monsteras grandes, busco novelas o ensayo · trueque',
      time:'ayer',    responses: 2,  fresh: false, trueque: true,
    },
    {
      who:'Marco P.',   hood:'Belgrano',  dist:'45 cuadras',
      title:'Busco bici fija para depto',
      detail:'Que entre por puerta · sin ruido · hasta $80.000',
      time:'hace 3 d', responses: 11, fresh: false,
    },
  ];
  return (
    <div style={{ height:'100%', background: B_TOKENS.bgGrad, overflow:'hidden', position:'relative' }}>
      <div className="phone-scroll" style={{ height:'100%', overflowY:'auto', paddingBottom: 100 }}>
        <BHeader
          title="Lo busco"
          titleAccent="vecinal"
          sub="Pedí lo que necesitás · vecinos responden"
          onBack={false}
          action="filter"
          tabs={[
            { id:'feed',   label:'Vendiendo', icon:'tag' },
            { id:'busco',  label:'Lo busco',  icon:'search' },
          ]}
          activeTab="busco"
        />

        {/* Hero diferenciador */}
        <div style={{ padding: '14px 16px 8px' }}>
          <div style={{
            background:'#fff', border:`1.5px solid ${B_TOKENS.accent}`,
            borderRadius: 14, padding: 14,
            boxShadow:'0 1px 0 rgba(255,255,255,.5) inset, 0 4px 12px -8px rgba(16,185,129,0.4)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: B_TOKENS.accentSoft,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon name="search" size={18} stroke={B_TOKENS.accentDark} sw={2.4}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: B_TOKENS.display, fontSize: 14, fontWeight: 700, color: B_TOKENS.ink, letterSpacing: -0.2 }}>
                  ¿Buscás algo específico?
                </div>
                <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color: B_TOKENS.inkSoft, marginTop: 1, letterSpacing: -0.05 }}>
                  Publicalo · vecinos verificados te contactan
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 12,
              background: B_TOKENS.btnGrad, color:'#fff',
              padding:'11px 14px', borderRadius: 10,
              display:'flex', alignItems:'center', justifyContent:'center', gap: 6,
              fontFamily: B_TOKENS.display, fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2,
              boxShadow:'0 1px 0 rgba(255,255,255,.15) inset, 0 2px 8px rgba(16,185,129,0.4)',
            }}>
              <Icon name="plus" size={15} stroke="#fff" sw={2.4}/> Publicar mi pedido
            </div>
          </div>
        </div>

        {/* Stats banda */}
        <div style={{ padding:'8px 16px 4px', display:'flex', gap: 8 }}>
          {[
            { v:'127', l:'pedidos activos cerca' },
            { v:'4 min', l:'respuesta promedio' },
            { v:'89%', l:'encuentran lo que buscan' },
          ].map((s,i) => (
            <div key={i} style={{
              flex: 1, background:'#fff', border:`1px solid ${B_TOKENS.line}`,
              borderRadius: 10, padding:'10px 8px', textAlign:'center',
            }}>
              <div style={{ fontFamily: B_TOKENS.display, fontSize: 16, fontWeight: 700, color: B_TOKENS.accentDark, letterSpacing: -0.4 }}>{s.v}</div>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 9.5, color: B_TOKENS.inkSoft, lineHeight: 1.2, marginTop: 2, letterSpacing: -0.05 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Lista de pedidos */}
        <div style={{ padding:'14px 16px 4px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily: B_TOKENS.display, fontSize: 14, fontWeight: 700, color: B_TOKENS.ink, letterSpacing: -0.3 }}>Pedidos cerca tuyo</div>
          <div style={{ fontFamily: B_TOKENS.body, fontSize: 11.5, color: B_TOKENS.accentDark, fontWeight: 600 }}>Ver todos</div>
        </div>

        <div style={{ padding:'4px 16px', display:'flex', flexDirection:'column', gap: 10 }}>
          {requests.map((r, i) => (
            <div key={i} style={{
              background:'#fff', border:`1px solid ${B_TOKENS.line}`,
              borderRadius: 12, padding: 14,
              position:'relative',
            }}>
              {r.fresh && (
                <div style={{ position:'absolute', top: 14, right: 14,
                  background: B_TOKENS.accent, color:'#fff',
                  fontSize: 9.5, fontWeight: 700, padding:'2px 6px', borderRadius: 4,
                  fontFamily: B_TOKENS.body, letterSpacing: 0.2,
                }}>NUEVO</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <Avatar name={r.who} size={28}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: B_TOKENS.body, fontSize: 12, fontWeight: 600, color: B_TOKENS.ink, letterSpacing: -0.1 }}>
                    {r.who}
                  </div>
                  <div style={{ fontFamily: B_TOKENS.body, fontSize: 10.5, color: B_TOKENS.inkFaint, letterSpacing: -0.05, display:'flex', alignItems:'center', gap: 4 }}>
                    <Icon name="map-pin" size={9} stroke={B_TOKENS.inkFaint} sw={2}/>
                    {r.dist} · {r.hood} · {r.time}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: B_TOKENS.display, fontSize: 14, fontWeight: 700, color: B_TOKENS.ink, marginTop: 10, letterSpacing: -0.2, lineHeight: 1.25 }}>
                {r.title}
              </div>
              <div style={{ fontFamily: B_TOKENS.body, fontSize: 12, color: B_TOKENS.inkSoft, marginTop: 4, letterSpacing: -0.05, lineHeight: 1.4 }}>
                {r.detail}
              </div>
              <div style={{ marginTop: 12, display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop: 10, borderTop:`1px solid ${B_TOKENS.lineSoft}` }}>
                <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                  <Icon name="message-circle" size={12} stroke={B_TOKENS.inkSoft} sw={2}/>
                  <span style={{ fontFamily: B_TOKENS.body, fontSize: 11, color: B_TOKENS.inkSoft, letterSpacing: -0.05 }}>
                    {r.responses} respuestas
                  </span>
                </div>
                <div style={{
                  background: B_TOKENS.btnGrad, color:'#fff',
                  padding:'7px 14px', borderRadius: 8,
                  display:'inline-flex', alignItems:'center', gap: 5,
                  fontFamily: B_TOKENS.display, fontSize: 12, fontWeight: 700, letterSpacing: -0.15,
                  boxShadow:'0 1px 0 rgba(255,255,255,.15) inset',
                }}>
                  Tengo eso →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BTabBar active="market" />
    </div>
  );
}
