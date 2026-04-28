// ay-tokens.jsx — Sistema visual de AnunciaYA (AY)
// Extraído de la app real: header negro con grid, verde esmeralda como acento,
// BottomNav blanco con 5 tabs y FAB rojo central de chat.
// Estos componentes son la cáscara que envuelve TODA la app, incluyendo Marketplace.

// ─────────────────────────────────────────────────────────────
// Tokens AY — lo que ya existe en la app
// ─────────────────────────────────────────────────────────────
const AY = {
  // Identidad
  green:        '#10B981',     // verde principal AY (logo, acentos, tabs activos, precios)
  greenDark:    '#059669',     // hover / pressed
  greenSoft:    '#D1FAE5',     // tinted bg, badges
  greenGlow:    'rgba(16,185,129,0.15)',
  red:          '#EF4444',     // FAB chat
  redDark:      '#DC2626',

  // Headers / superficies oscuras
  inkHeader:    '#0A0A0A',     // header negro
  inkHeaderGrid:'rgba(255,255,255,0.04)', // grid sutil del header
  inkHeader2:   '#171717',

  // Background app — gradiente azul suave (como en la captura)
  bgGrad:       'linear-gradient(180deg, #F5F7FB 0%, #EAF1FB 50%, #F0F4FA 100%)',
  bgFlat:       '#F5F7FB',

  // Superficies
  surface:      '#FFFFFF',
  surface2:     '#F8FAFC',

  // Texto
  ink:          '#0F172A',     // slate-900 — más cálido que negro puro, combina con bg azulado
  inkSoft:      '#475569',     // slate-600
  inkFaint:     '#94A3B8',     // slate-400
  inkOnDark:    '#FAFAFA',
  inkOnDarkSoft:'#A1A1AA',

  // Bordes
  line:         '#E2E8F0',     // slate-200
  lineSoft:     '#F1F5F9',     // slate-100

  // Tipografía — la app usa system + a veces un sans más rounded
  display:      '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  body:         '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono:         '"Geist Mono", ui-monospace, "SFMono-Regular", monospace',
};

// expose globally
window.AY = AY;

// ─────────────────────────────────────────────────────────────
// AY_Header — patrón "título de sección" estilo iOS nativo
// Usado dentro del Marketplace: back arrow + título + subtítulo decorativo + acción
// Fondo NEGRO con grid sutil (DNA de AY), nunca verde sólido.
// ─────────────────────────────────────────────────────────────
function AY_Header({
  title = 'Marketplace',
  titleAccent = null,        // palabra final del título en verde (estilo "Mis Cupones")
  subtitle = 'Compra y vende en tu barrio',
  onBack = true,
  rightAction = 'menu',      // 'menu' | 'search' | 'filter' | null
  tabs = null,               // [{id, label}] — opcional, debajo del título
  activeTab = null,
}) {
  return (
    <div style={{
      position: 'relative',
      background: AY.inkHeader,
      backgroundImage: `
        linear-gradient(${AY.inkHeaderGrid} 1px, transparent 1px),
        linear-gradient(90deg, ${AY.inkHeaderGrid} 1px, transparent 1px)
      `,
      backgroundSize: '14px 14px',
      paddingTop: 8, paddingBottom: tabs ? 0 : 14,
      borderBottom: tabs ? 'none' : `1px solid rgba(255,255,255,0.06)`,
    }}>
      {/* Top row: back · logo+title · action */}
      <div style={{
        display:'flex', alignItems:'center', gap: 10,
        padding:'8px 12px 4px',
      }}>
        {onBack && (
          <div style={{
            width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center',
            color: AY.inkOnDark,
          }}>
            <Icon name="chev-left" size={24} sw={2} stroke={AY.inkOnDark}/>
          </div>
        )}

        {/* Logo cuadrado verde redondeado */}
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: AY.green,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px ${AY.greenGlow}`,
          flexShrink: 0,
        }}>
          <Icon name="tag" size={16} sw={2.2} stroke="#fff"/>
        </div>

        {/* Título */}
        <div style={{
          fontFamily: AY.display, fontSize: 20, fontWeight: 700,
          color: AY.inkOnDark, letterSpacing: -0.4,
          flex: 1,
        }}>
          {title}{' '}
          {titleAccent && <span style={{ color: AY.green }}>{titleAccent}</span>}
        </div>

        {/* Right action */}
        {rightAction === 'menu' && (
          <div style={{ width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center', color: AY.inkOnDark }}>
            <Icon name="list" size={20} sw={2} stroke={AY.inkOnDark}/>
          </div>
        )}
        {rightAction === 'search' && (
          <div style={{ width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center', color: AY.inkOnDark }}>
            <Icon name="search" size={20} sw={2} stroke={AY.inkOnDark}/>
          </div>
        )}
        {rightAction === 'filter' && (
          <div style={{ width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center', color: AY.inkOnDark }}>
            <Icon name="sliders" size={20} sw={2} stroke={AY.inkOnDark}/>
          </div>
        )}
      </div>

      {/* Subtitle con líneas decorativas a los lados (como "Tus descuentos exclusivos") */}
      {subtitle && (
        <div style={{
          display:'flex', alignItems:'center', gap: 10,
          padding:'2px 16px 12px',
        }}>
          <div style={{ flex: 1, height: 1, background: AY.green, opacity: 0.5 }}/>
          <div style={{
            fontFamily: AY.display, fontSize: 11.5, fontWeight: 500,
            color: 'rgba(255,255,255,0.78)', letterSpacing: 0.1,
          }}>
            {subtitle}
          </div>
          <div style={{ flex: 1, height: 1, background: AY.green, opacity: 0.5 }}/>
        </div>
      )}

      {/* Tabs (opcional) — línea verde activa */}
      {tabs && (
        <div style={{
          display:'flex', alignItems:'center', gap: 0,
          padding:'0 4px',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
        }}>
          {tabs.map(t => {
            const active = t.id === activeTab;
            return (
              <div key={t.id} style={{
                flex: 1,
                padding:'10px 8px 11px',
                display:'flex', alignItems:'center', justifyContent:'center', gap: 6,
                fontFamily: AY.display, fontSize: 13, fontWeight: 600,
                color: active ? AY.green : 'rgba(255,255,255,0.55)',
                letterSpacing: -0.1,
                position:'relative',
              }}>
                {t.icon && <Icon name={t.icon} size={14} sw={2} stroke={active ? AY.green : 'rgba(255,255,255,0.55)'}/>}
                {t.label}
                {active && <div style={{
                  position:'absolute', left: 12, right: 12, bottom: -1, height: 2, background: AY.green, borderRadius: 2,
                }}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AY_BottomNav — 5 tabs con FAB rojo central de chat
// Negocios · Market · [Chat FAB] · Ofertas · Dinámicas
// ─────────────────────────────────────────────────────────────
function AY_BottomNav({ active = 'market' }) {
  const items = [
    { id:'negocios',   label:'Negocios',  icon:'home'    },
    { id:'market',     label:'Market',    icon:'tag'     },
    { id:'chat',       label:'Chat',      fab: true      },
    { id:'ofertas',    label:'Ofertas',   icon:'badge'   },
    { id:'dinamicas',  label:'Dinámicas', icon:'gift'    },
  ];

  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0,
      background:'#FFFFFF',
      borderTop:`1px solid ${AY.line}`,
      paddingTop: 8, paddingBottom: 28,
      display:'flex', alignItems:'flex-end', justifyContent:'space-around',
      zIndex: 40,
      boxShadow:'0 -1px 0 rgba(15,23,42,0.04), 0 -8px 24px rgba(15,23,42,0.06)',
    }}>
      {items.map(it => {
        if (it.fab) {
          return (
            <div key={it.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 2, marginTop: -22 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: `linear-gradient(180deg, ${AY.red} 0%, ${AY.redDark} 100%)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 6px 16px rgba(239,68,68,0.4), 0 1px 0 rgba(255,255,255,0.2) inset`,
                border:`3px solid #fff`,
                position:'relative',
              }}>
                <Icon name="message-circle" size={22} sw={2.2} stroke="#fff"/>
                {/* dot indicador */}
                <div style={{
                  position:'absolute', top: 2, right: 2,
                  width: 10, height: 10, borderRadius:'50%',
                  background:'#fff', border:`2px solid ${AY.red}`,
                }}/>
              </div>
            </div>
          );
        }
        const isActive = it.id === active;
        return (
          <div key={it.id} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
            padding:'2px 4px',
            minWidth: 52,
          }}>
            <Icon
              name={it.icon}
              size={22}
              sw={isActive ? 2.2 : 1.8}
              stroke={isActive ? AY.green : '#0F172A'}
            />
            <div style={{
              fontFamily: AY.display, fontSize: 10.5,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? AY.green : AY.inkSoft,
              letterSpacing: -0.1,
            }}>
              {it.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AY_Pill — chip verde tinted (badges "verificado", "destacado", etc.)
// ─────────────────────────────────────────────────────────────
function AY_Pill({ children, icon = null, tone = 'green', size = 'sm' }) {
  const tones = {
    green: { bg: AY.greenSoft, fg: AY.greenDark, ic: AY.greenDark },
    neutral: { bg: '#F1F5F9', fg: AY.ink, ic: AY.inkSoft },
    dark:  { bg: AY.ink, fg: '#fff', ic: AY.green },
    amber: { bg: '#FEF3C7', fg: '#92400E', ic: '#B45309' },
    blue:  { bg: '#DBEAFE', fg: '#1E40AF', ic: '#2563EB' },
  }[tone] || {};
  const padY = size === 'xs' ? 2 : size === 'md' ? 5 : 3;
  const padX = size === 'xs' ? 6 : size === 'md' ? 10 : 8;
  const fs = size === 'xs' ? 10 : size === 'md' ? 12 : 11;

  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 4,
      background: tones.bg, color: tones.fg,
      padding: `${padY}px ${padX}px`,
      borderRadius: 999,
      fontFamily: AY.display, fontSize: fs, fontWeight: 600, letterSpacing: -0.1,
      whiteSpace: 'nowrap',
    }}>
      {icon && <Icon name={icon} size={fs + 1} sw={2.2} stroke={tones.ic}/>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Trust score — círculo con karma del vendedor (diferenciador clave)
// ─────────────────────────────────────────────────────────────
function AY_Karma({ score = 87, size = 36, label = false }) {
  const r = (size - 6) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap: 8 }}>
      <div style={{ position:'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={c} cy={c} r={r} stroke={AY.lineSoft} strokeWidth={3} fill="none"/>
          <circle cx={c} cy={c} r={r} stroke={AY.green} strokeWidth={3} fill="none"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <div style={{
          position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily: AY.display, fontSize: size * 0.34, fontWeight: 700, color: AY.ink, letterSpacing: -0.4,
        }}>
          {score}
        </div>
      </div>
      {label && (
        <div>
          <div style={{ fontFamily: AY.display, fontSize: 10.5, color: AY.inkSoft, letterSpacing: 0.4, textTransform:'uppercase', fontWeight: 600 }}>Karma</div>
          <div style={{ fontFamily: AY.display, fontSize: 12, color: AY.ink, fontWeight: 600, letterSpacing: -0.1 }}>Vecino confiable</div>
        </div>
      )}
    </div>
  );
}

// expose
Object.assign(window, { AY_Header, AY_BottomNav, AY_Pill, AY_Karma });
