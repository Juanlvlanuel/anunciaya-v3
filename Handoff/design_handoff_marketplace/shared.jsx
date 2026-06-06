// shared.jsx — tokens, helpers, data mock, placeholders compartidos
// Modernizado: sin emojis, Lucide-style icons, imágenes reales de Unsplash

// ─────────────────────────────────────────────────────────────
// Mock data — vendedores
// ─────────────────────────────────────────────────────────────
const MOCK_SELLERS = [
  { id: 's1', name: 'Lucía M.',      hood: 'Palermo',      rating: 4.9, items: 23, joined: 'hace 2 años', verified: true  },
  { id: 's2', name: 'Tomás R.',      hood: 'Chacarita',    rating: 4.7, items: 8,  joined: 'hace 8 meses', verified: false },
  { id: 's3', name: 'Carla & Ana',   hood: 'Villa Crespo', rating: 5.0, items: 41, joined: 'hace 1 año',   verified: true  },
  { id: 's4', name: 'Marco P.',      hood: 'Belgrano',     rating: 4.6, items: 12, joined: 'hace 3 meses', verified: false },
  { id: 's5', name: 'Sol del Barrio',hood: 'Almagro',      rating: 4.8, items: 67, joined: 'hace 3 años',  verified: true  },
];

// Categorías — SIN emojis, con nombre de icono Lucide
const CATS = [
  { id: 'segunda', name: 'Segunda mano',  icon: 'recycle' },
  { id: 'hecho',   name: 'Hecho a mano',  icon: 'hand'    },
  { id: 'nuevo',   name: 'Electrónica',   icon: 'laptop'  },
  { id: 'autos',   name: 'Vehículos',     icon: 'car'     },
  { id: 'comida',  name: 'Comida fresca', icon: 'leaf'    },
  { id: 'hogar',   name: 'Hogar',         icon: 'sofa'    },
  { id: 'moda',    name: 'Moda',          icon: 'shirt'   },
  { id: 'otros',   name: 'Otros',         icon: 'package' },
];

// Productos — con URL de imagen real de Unsplash (pequeña, con parámetros para performance)
const UN = (id, w = 600, h = 600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

const PRODUCTS = [
  { id:'p1',  title:'Silla de mimbre vintage',        price:18000,   cur:'ARS', cat:'segunda', seller:'s1', hood:'Palermo',     dist:'1.2 km', views:142, contacts:11, img: UN('1519947486511-46149fa0a254'), boost:true,  new:false, trend:true,  tag:'Destacado', h: 1.35 },
  { id:'p2',  title:'Jarrones de cerámica (set x3)',  price:8500,    cur:'ARS', cat:'hecho',   seller:'s3', hood:'Villa Crespo',dist:'2.8 km', views:89,  contacts:6,  img: UN('1578749556568-bc2c40e68b61'), boost:false, new:true,  trend:false, tag:'Nuevo',     h: 1.1  },
  { id:'p3',  title:'Ford Fiesta 2014 · 89.000 km',   price:9800000, cur:'ARS', cat:'autos',   seller:'s4', hood:'Belgrano',    dist:'4.5 km', views:320, contacts:24, img: UN('1494976388531-d1058494cdd8'), boost:true,  new:false, trend:true,  tag:'Destacado', h: 0.85 },
  { id:'p4',  title:'Chaqueta de cuero talle M',      price:35000,   cur:'ARS', cat:'segunda', seller:'s2', hood:'Chacarita',   dist:'800 m',  views:45,  contacts:3,  img: UN('1551028719-00167b16eac5'), boost:false, new:false, trend:false, tag:null,        h: 1.25 },
  { id:'p5',  title:'Pan de masa madre (kilo)',       price:2800,    cur:'ARS', cat:'comida',  seller:'s5', hood:'Almagro',     dist:'1.8 km', views:212, contacts:31, img: UN('1509440159596-0249088772ff'), boost:false, new:true,  trend:true,  tag:'Trending',  h: 0.95 },
  { id:'p6',  title:'Aritos de plata hechos a mano',  price:4500,    cur:'ARS', cat:'hecho',   seller:'s3', hood:'Villa Crespo',dist:'2.8 km', views:67,  contacts:4,  img: UN('1630019852942-f89202989a59'), boost:false, new:false, trend:false, tag:null,        h: 1.15 },
  { id:'p7',  title:'MacBook Air M1 — como nuevo',    price:780000,  cur:'ARS', cat:'nuevo',   seller:'s1', hood:'Palermo',     dist:'1.2 km', views:198, contacts:14, img: UN('1517336714731-489689fd1ca8'), boost:true,  new:false, trend:false, tag:'Destacado', h: 1.0  },
  { id:'p8',  title:'Planta Monstera XL',             price:12000,   cur:'ARS', cat:'hogar',   seller:'s5', hood:'Almagro',     dist:'1.8 km', views:77,  contacts:8,  img: UN('1614594975525-e45190c55d0b'), boost:false, new:false, trend:false, tag:null,        h: 1.3  },
  { id:'p9',  title:'Bicicleta rodado 29',            price:220000,  cur:'ARS', cat:'segunda', seller:'s4', hood:'Belgrano',    dist:'4.5 km', views:88,  contacts:7,  img: UN('1485965120184-e220f721d03e'), boost:false, new:true,  trend:false, tag:'Nuevo',     h: 1.05 },
  { id:'p10', title:'Cuadros abstractos (serie)',     price:15000,   cur:'ARS', cat:'hecho',   seller:'s3', hood:'Villa Crespo',dist:'2.8 km', views:134, contacts:9,  img: UN('1558618666-fcd25c85cd64'), boost:true,  new:false, trend:true,  tag:'Destacado', h: 1.4  },
  { id:'p11', title:'Mesa de roble maciza',           price:95000,   cur:'ARS', cat:'segunda', seller:'s2', hood:'Chacarita',   dist:'800 m',  views:56,  contacts:5,  img: UN('1533090161767-e6ffed986c88'), boost:false, new:false, trend:false, tag:null,        h: 0.9  },
  { id:'p12', title:'Miel orgánica (frasco 500g)',    price:3500,    cur:'ARS', cat:'comida',  seller:'s5', hood:'Almagro',     dist:'1.8 km', views:44,  contacts:6,  img: UN('1587049352846-4a222e784d38'), boost:false, new:true,  trend:false, tag:'Nuevo',     h: 1.1  },
];

function fmtPrice(v, cur = 'ARS') {
  const str = v.toLocaleString('es-AR');
  return cur === 'ARS' ? `$ ${str}` : `${cur} ${str}`;
}

// ─────────────────────────────────────────────────────────────
// Real image — from Unsplash URL. With graceful fallback.
// ─────────────────────────────────────────────────────────────
function ProductImage({ src, aspect = 1, rounded = 12, overlay = null, children }) {
  return (
    <div style={{
      width: '100%', aspectRatio: aspect,
      borderRadius: rounded,
      background: '#F5F5F4',
      position: 'relative', overflow: 'hidden',
    }}>
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          display: 'block',
        }}
      />
      {overlay}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — monochrome, refined (no colorful hues)
// ─────────────────────────────────────────────────────────────
function Avatar({ name = '', size = 36, tone = 'light', ring = false }) {
  const initials = name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  const bg = tone === 'dark' ? '#1C1917' : '#E7E5E4';
  const fg = tone === 'dark' ? '#FAFAF9' : '#44403C';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Geist", "Geist Sans", system-ui, sans-serif',
      fontWeight: 500, fontSize: size * 0.36, letterSpacing: -0.2,
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 3px ${bg}` : undefined,
    }}>
      {initials || '·'}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon system — Lucide-complete. All strokes, no fills.
// Name list covers marketplace needs; pass `size`, `sw` (stroke-width), `stroke`.
// ─────────────────────────────────────────────────────────────
const LUCIDE = {
  // Nav
  home:      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a0 0 0 0 1 0 0v-7h-6v7a0 0 0 0 1 0 0H5a2 2 0 0 1-2-2z"/>',
  search:    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus:      '<path d="M12 5v14M5 12h14"/>',
  'plus-sq': '<rect width="18" height="18" x="3" y="3" rx="3"/><path d="M12 8v8M8 12h8"/>',
  bell:      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  user:      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  grid:      '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  list:      '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',

  // Actions
  heart:     '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>',
  bookmark:  '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  share:     '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  more:      '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'more-v':  '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
  edit:      '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  trash:     '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye:       '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="m15 18-.7-.7"/><path d="M2 2l20 20"/><path d="M6.7 6.7C3 9 2 12 2 12s3 7 10 7c2 0 3.6-.6 5-1.4"/><path d="M10 5c.7-.1 1.4-.1 2-.1 7 0 10 7 10 7s-1 2-3 4"/>',
  filter:    '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  sliders:   '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
  settings:  '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.3a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.4a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.3a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.2.1a2 2 0 0 1 1 1.7V20a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.3a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.4a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.3a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',

  // Arrows / nav
  'arrow-left':  '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  'chev-left':  '<path d="m15 18-6-6 6-6"/>',
  'chev-right': '<path d="m9 18 6-6-6-6"/>',
  'chev-down':  '<path d="m6 9 6 6 6-6"/>',
  'chev-up':    '<path d="m18 15-6-6-6 6"/>',
  x:            '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check:        '<path d="M20 6 9 17l-5-5"/>',

  // Marketplace
  'map-pin':   '<path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  star:        '<polygon points="12 2 15.1 8.6 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 8.9 8.6 12 2"/>',
  camera:      '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="4"/>',
  image:       '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  phone:       '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/>',
  clock:       '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  shield:      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  zap:         '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  tag:         '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1" fill="currentColor"/>',
  flame:       '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.7-2-1.5-3C8.2 7.6 8 6.5 8 5c0 0 4 3 4 7 0 1 1 2 2 2s2-1 2-2c0-1-.5-2-.5-3 0 0 2 2 2 5a7 7 0 1 1-14 0c0-2 1-3 2-4z"/>',
  sparkles:    '<path d="m12 3-2 5-5 2 5 2 2 5 2-5 5-2-5-2-2-5z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>',

  // Categories (used as simple ico — could diverge)
  recycle:  '<path d="M7 19h5"/><path d="M14 19h5"/><path d="m3 15 4-7 4 7"/><path d="m13 15 4-7 4 7"/>',
  hand:     '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v7"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8V8.5"/>',
  laptop:   '<rect width="20" height="12" x="2" y="4" rx="2" ry="2"/><line x1="2" x2="22" y1="20" y2="20"/>',
  car:      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3A2 2 0 0 0 12.3 7H6.3a2 2 0 0 0-1.7 1L3 10 1.5 11.1C.7 11.3 0 12.1 0 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  leaf:     '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-11 10z"/><path d="M2 21c0-3 1.9-5.6 4.5-7"/>',
  sofa:     '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v3H7v-3a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M4 18v2M20 18v2"/>',
  shirt:    '<path d="M20.4 7.5 16 5l-2.2 2-1.8 1-1.8-1L8 5 3.6 7.5a1 1 0 0 0-.4 1.3l1.6 3a1 1 0 0 0 1.5.4L8 11v10h8V11l1.7 1.3a1 1 0 0 0 1.5-.5l1.6-3a1 1 0 0 0-.4-1.3z"/>',
  package:  '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" x2="12" y1="22" y2="12"/>',

  // Extras
  dot:      '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  'at-sign':'<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  send:     '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  'check-circle': '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14.01 9 11.01"/>',
  badge:    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z"/><path d="m9 12 2 2 4-4"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  flag:     '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  'help':   '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  'pie':    '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  'bar':    '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  inbox:    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  globe:    '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
  scan:     '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
  book:     '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  'gift':   '<polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="6" x="2" y="6"/><line x1="12" x2="12" y1="22" y2="6"/><path d="M12 6H7.5a2.5 2.5 0 0 1 0-5C11 1 12 6 12 6zM12 6h4.5a2.5 2.5 0 0 0 0-5C13 1 12 6 12 6z"/>',
  'qr':     '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM14 19h3M19 14v3M17 19h4"/>',
  'log-out':'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  truck:    '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  compass:  '<circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 13.4 13.4 7.8 16.2 10.6 10.6 16.2 7.8"/>',
  'chevron-big-right':'<path d="m9 18 6-6-6-6"/>',
};

const Icon = ({ name, size = 20, stroke = 'currentColor', sw = 1.75, fill = 'none', className }) => {
  const body = LUCIDE[name];
  if (!body) {
    // Fallback: small dot, visually flags missing icon names during dev.
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={stroke} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
};

Object.assign(window, {
  MOCK_SELLERS, CATS, PRODUCTS, UN, fmtPrice,
  ProductImage, Avatar, Icon,
});
