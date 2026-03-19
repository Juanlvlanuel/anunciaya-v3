# Landing Page Original (v9) — Contenido Completo

> Respaldo del contenido que tenía la landing page antes del rediseño v11.
> Fecha del respaldo: 18 Marzo 2026.
> Archivo original: `apps/web/src/pages/public/PaginaLanding.tsx` (872 líneas, archivo único)

---

## Estructura Original

La landing v9 tenía **4 secciones** en desktop (solo el Hero en móvil):

1. **Navbar** (solo desktop)
2. **Hero** con carousel de 4 secciones (desktop) / pantalla completa (móvil)
3. **Beneficios** — 3 cards (solo desktop)
4. **CTA / Planes** — 2 cards de pricing (solo desktop)
5. **Footer** (solo desktop)

> **Problema:** En móvil solo se mostraba el Hero. Las secciones 3-5 no eran visibles.

---

## 1. Navbar

### Botones de autenticación
- **Google:** Botón con ícono SVG de Google
- **Iniciar Sesión:** Botón con ícono de Mail
- **Regístrate:** Botón con ícono de Users
- **Selector de Idioma** (componente `SelectorIdioma`)

### Comportamiento
- Solo visible en `lg:` (desktop)
- Botón "scroll to top" aparece al bajar >300px

---

## 2. Hero Section

### Versión Móvil (pantalla completa, sin scroll)
- Fondo: `bg-linear-to-b from-blue-800 via-blue-900 to-slate-900`
- Logo de AnunciaYA centrado
- Badge: "Una tarjeta, Múltiples Recompensas." con ícono Sparkles
- Carousel animado (framer-motion) de 4 secciones con auto-rotate cada 5 segundos
- Cada slide muestra: imagen + ícono + título + subtítulo
- Dots de navegación interactivos
- CTAs fijos abajo: [Google] [Iniciar Sesión] + [Regístrate] (botón grande)

### Versión Desktop
- Fondo blanco con decoración de blobs
- Badge: "Una tarjeta, Múltiples Recompensas." con ícono CreditCard sobre fondo azul
- **Título H1:**
  - Línea 1: "Tus compras ahora valen" (text-5xl, slate-900)
  - Línea 2: "más" (text-7xl, blue-600)
- **Subtítulo:** "Acumula puntos comprando en tus **comercios favoritos** y **canjéalos** por **recompensas.**"
  - Partes en bold: "Acumula puntos comprando", "comercios favoritos", "canjéalos", "recompensas"
  - Colores: slate-800, blue-600, slate-800, red-500
- **3 Chips de beneficios:**
  - Gana puntos (azul, ícono Gift)
  - Publica gratis (emerald, ícono Sparkles)
  - Crea tus sorteos (rojo, ícono Ticket)
- **CTA:** "Comenzar Ahora" → `/registro`
- **Carousel lateral:** Card con imagen + badges flotantes + info + tabs de sección

### Datos del Carousel (4 secciones)
Cada sección tenía: id, título, subtítulo, descripción, ícono, color de fondo, stats, highlight, imagen.

---

## 3. Las 4 Secciones del Carousel

### Negocios Locales
- **Ícono:** Store (bg-blue-600)
- **Subtítulo:** "Encuentra negocios y servicios cerca de ti"
- **Descripción:** "Gana puntos en cada compra. Acumula y Canjea por recompensas."
- **Stats:** "+100 Negocios"
- **Highlight:** "Cerca de ti"
- **Imagen:** `/images/secciones/negocios-locales.webp`

### Marketplace
- **Ícono:** ShoppingCart (bg-emerald-600)
- **Subtítulo:** "Genera Ingresos"
- **Descripción:** "0 Comisiones. Compra y Venta P2P. Apoya a Micro Emprendedores."
- **Stats:** "+1,000 productos"
- **Highlight:** "Publica GRATIS"
- **Imagen:** `/images/secciones/marketplace.webp`

### Ofertas
- **Ícono:** Gift (bg-red-500)
- **Subtítulo:** "Promociones y Cupones"
- **Descripción:** "Cupones Digitales. Ofertas por tiempo limitado."
- **Stats:** "+200 Ofertas"
- **Highlight:** "Exclusivas"
- **Imagen:** `/images/secciones/ofertas.webp`

### Dinámicas
- **Ícono:** Ticket (bg-blue-700)
- **Subtítulo:** "Rifas y Sorteos"
- **Descripción:** "Utiliza tus puntos para participar. Crea tus propias Rifas. 0 Comisiones."
- **Stats:** "+100 Sorteos"
- **Highlight:** "En vivo"
- **Imagen:** `/images/secciones/dinamicas.webp`

---

## 4. Sección Beneficios

### Título
"¿Por qué elegir **Anuncia**YA?"

### 3 Cards (grid 3 columnas, solo desktop)

| Beneficio | Ícono | Color | Descripción |
|-----------|-------|-------|-------------|
| CardYA | CreditCard | Azul (bg-blue-100, text-blue-600) | "Una sola tarjeta de Lealtad para todas tus compras." |
| ChatYA | MessageCircle | Emerald (bg-emerald-100, text-emerald-600) | "Comunicación directa entre compradores y vendedores." |
| 100% Comercio Local | MapPin | Rojo (bg-red-100, text-red-600) | "Tu dinero se queda donde más importa: cerca de ti." |

### Estilo
- Fondo sección: `bg-slate-50`
- Cards: `bg-white rounded-2xl border-2 border-slate-200 shadow-sm text-center`

---

## 5. Sección CTA / Planes

### Título
"Empieza hoy..."

### Fondo
`bg-blue-900` con decoración de blobs azules

### Card Personal (borde emerald)
- **Título:** "Cuenta Personal"
- **Precio:** "Gratis" (text-emerald-600, text-xl)
- **Ícono:** UserCircle en bg-emerald-100
- **Features (6):**
  1. Publica en Marketplace
  2. Crea tu propia Dinámica
  3. Cupones y Descuentos Exclusivos
  4. Participa en Sorteos
  5. Tarjeta de Lealtad Digital (CardYA)
  6. Chat integrado (ChatYA)
- **CTA:** "Crear cuenta gratis" (bg-emerald-500) → `/registro`

### Card Comercial (borde blue, badge "POPULAR")
- **Badge:** "POPULAR" con ícono Star (bg-blue-600, esquina superior)
- **Título:** "Cuenta Comercial"
- **Precio:** "7 días gratis" (text-blue-600, text-xl)
- **Ícono:** Building en bg-blue-100
- **Features (7):**
  1. Publica en Negocios Locales
  2. Publica en Ofertas
  3. Crea tu propia Dinámica
  4. Crea Cupones y Promociones
  5. Otorga Puntos por tus Ventas (ScanYA)
  6. Chat integrado (ChatYA)
  7. **Business Studio (Herramienta de Gestión)** ← resaltado en font-semibold text-blue-700
- **CTA:** "Probar 7 días gratis" (bg-blue-600) → `/registro?plan=comercial`

### Info Trial
- "7 días de prueba gratis" (ícono Clock)
- "Cancela antes y no pagas nada" (ícono CreditCard)
- "Al registrar cuenta Comercial, ingresas tu tarjeta para activar el trial. Se cobra automáticamente después de 7 días si no cancelas."

---

## 6. Footer

- **Fondo:** `bg-slate-950`
- **Logo:** AnunciaYA (h-12)
- **Slogan:** "Tus compras ahora valen más."
- **Título redes:** "¡Contáctanos!"
- **Redes sociales:**
  - Facebook (bg-blue-600, ícono SVG)
  - WhatsApp (bg-emerald-500, ícono SVG)
  - Links: `https://facebook.com/anunciaya`, `https://wa.me/526381234567`
- **Copyright:** "© 2026 AnunciaYA. Todos los derechos reservados."

---

## 7. Sección Onboarding (solo en traducciones, usada en otro contexto)

Estos textos existían en el JSON pero se usaban en la página de onboarding, no en la landing:

| Slide | Título | Subtítulo |
|-------|--------|-----------|
| Negocios | "Compra en Negocios Locales" | "Acumula y Canjea tus Puntos." |
| CardYA | "CardYA-Digital" | "Utiliza tu Tarjeta-Digital para Acumular o Canjear tus puntos." |
| Marketplace | "Marketplace" | "Genera ingresos vendiendo tus productos." |
| Sorteos | "Participa en Sorteos" | "También puedes usar tus puntos para participar en sorteos." |
| Comunidad | "Apoya a tu comunidad" | "Tus compras impulsan la economía local." |

---

## 8. Traducciones Completas Originales

### Español (es/landing.json)

```json
{
  "navbar": {
    "google": "Google",
    "o": "o",
    "iniciarSesion": "Iniciar Sesión",
    "registrate": "Regístrate"
  },
  "hero": {
    "badgeParte1": "Una tarjeta, Múltiples Recompensas.",
    "titulo1": "Tus compras",
    "titulo2": "ahora valen",
    "titulo4": "más",
    "subtitulo1": "Acumula puntos comprando",
    "subtitulo2": "en tus",
    "subtitulo3": "comercios favoritos",
    "subtitulo4": "y",
    "subtitulo5": "canjéalos",
    "subtitulo6": "por",
    "subtitulo7": "recompensas.",
    "botonPrimario": "Comenzar Ahora",
    "beneficio1": "Gana puntos",
    "beneficio2": "Publica gratis",
    "beneficio3": "Crea tus sorteos",
    "scrollIndicador": "Descubre más"
  },
  "secciones": {
    "negocios": {
      "titulo": "Negocios Locales",
      "subtitulo": "Encuentra negocios y servicios cerca de ti",
      "descripcion": "*Gana puntos en cada compra.<br />*Acumula y Canjea por recompensas.",
      "stats": "+100 Negocios",
      "highlight": "Cerca de ti"
    },
    "marketplace": {
      "titulo": "Marketplace",
      "subtitulo": "Genera Ingresos",
      "descripcion": "*0 Comisiones.<br />*Compra y Venta P2P.<br />*Apoya a Micro Emprendedores.",
      "stats": "+1,000 productos",
      "highlight": "Publica GRATIS"
    },
    "ofertas": {
      "titulo": "Ofertas",
      "subtitulo": "Promociones y Cupones",
      "descripcion": "*Cupones Digitales.<br />*Ofertas por tiempo limitado.",
      "stats": "+200 Ofertas",
      "highlight": "Exclusivas"
    },
    "dinamicas": {
      "titulo": "Dinámicas",
      "subtitulo": "Rifas y Sorteos",
      "descripcion": "*Utiliza tus puntos para participar.<br />*Crea tus propias Rifas.<br />*0 Comisiones.",
      "stats": "+100 Sorteos",
      "highlight": "En vivo"
    }
  },
  "beneficios": {
    "titulo1": "¿Por qué elegir",
    "titulo2": "AnunciaYA",
    "titulo3": "?",
    "items": {
      "chat": {
        "titulo": "CardYA",
        "descripcion": "Una sola tarjeta de Lealtad para todas tus compras."
      },
      "descuentos": {
        "titulo": "ChatYA",
        "descripcion": "Comunicación directa entre compradores y vendedores."
      },
      "todoEnUno": {
        "titulo": "100% Comercio Local",
        "descripcion": "Tu dinero se queda donde más importa: cerca de ti."
      }
    }
  },
  "cta": {
    "titulo": "Empieza hoy...",
    "personal": {
      "titulo": "Cuenta Personal",
      "precio": "Gratis",
      "siempre": "siempre",
      "features": {
        "f1": "Publica en Marketplace",
        "f2": "Crea tu propia Dinámica",
        "f3": "Cupones y Descuentos Exclusivos",
        "f4": "Participa en Sorteos",
        "f5": "Tarjeta de Lealtad Digital (CardYA)",
        "f6": "Chat integrado (ChatYA)"
      },
      "boton": "Crear cuenta gratis"
    },
    "comercial": {
      "titulo": "Cuenta Comercial",
      "badge": "POPULAR",
      "precio": "7 días gratis",
      "features": {
        "f1": "Publica en Negocios Locales",
        "f2": "Publica en Ofertas",
        "f3": "Crea tu propia Dinámica",
        "f4": "Crea Cupones y Promociones",
        "f5": "Otorga Puntos por tus Ventas (ScanYA)",
        "f6": "Chat integrado (ChatYA)",
        "f7": "Business Studio (Herramienta de Gestión)"
      },
      "boton": "Probar 7 días gratis"
    },
    "trial": {
      "dias": "7 días de prueba gratis",
      "cancela": "Cancela antes y no pagas nada",
      "nota": "Al registrar cuenta Comercial, ingresas tu tarjeta para activar el trial. Se cobra automáticamente después de 7 días si no cancelas."
    }
  },
  "footer": {
    "slogan": "\"Tus compras ahora valen más.\"",
    "contactanos": "¡Contáctanos!",
    "derechos": "AnunciaYA. Todos los derechos reservados."
  }
}
```

### Inglés (en/landing.json)

```json
{
  "navbar": {
    "google": "Google",
    "o": "or",
    "iniciarSesion": "Sign In",
    "registrate": "Sign Up"
  },
  "hero": {
    "badgeParte1": "One card, Multiple Rewards.",
    "titulo1": "Your purchases",
    "titulo2": "are now worth",
    "titulo4": "more",
    "subtitulo1": "Earn points shopping",
    "subtitulo2": "at your",
    "subtitulo3": "favorite stores",
    "subtitulo4": "and",
    "subtitulo5": "redeem them",
    "subtitulo6": "for",
    "subtitulo7": "rewards.",
    "botonPrimario": "Get Started",
    "beneficio1": "Earn points",
    "beneficio2": "Post for free",
    "beneficio3": "Create raffles",
    "scrollIndicador": "Discover more"
  },
  "secciones": {
    "negocios": {
      "titulo": "Local Businesses",
      "subtitulo": "Find businesses and services near you",
      "descripcion": "*Earn points on every purchase.<br />*Collect and Redeem for rewards.",
      "stats": "+100 Businesses",
      "highlight": "Near you"
    },
    "marketplace": {
      "titulo": "Marketplace",
      "subtitulo": "Generate Income",
      "descripcion": "*0 Commissions.<br />*P2P Buy and Sell.<br />*Support Micro Entrepreneurs.",
      "stats": "+1,000 products",
      "highlight": "Post FREE"
    },
    "ofertas": {
      "titulo": "Deals",
      "subtitulo": "Promotions and Coupons",
      "descripcion": "*Digital Coupons.<br />*Limited time offers.",
      "stats": "+200 Deals",
      "highlight": "Exclusive"
    },
    "dinamicas": {
      "titulo": "Dynamics",
      "subtitulo": "Raffles and Giveaways",
      "descripcion": "*Use your points to participate.<br />*Create your own Raffles.<br />*0 Commissions.",
      "stats": "+100 Raffles",
      "highlight": "Live"
    }
  },
  "beneficios": {
    "titulo1": "Why choose",
    "titulo2": "AnunciaYA",
    "titulo3": "?",
    "items": {
      "chat": {
        "titulo": "CardYA",
        "descripcion": "One loyalty card for all your purchases."
      },
      "descuentos": {
        "titulo": "ChatYA",
        "descripcion": "Direct communication between buyers and sellers."
      },
      "todoEnUno": {
        "titulo": "100% Local Commerce",
        "descripcion": "Your money stays where it matters most: close to you."
      }
    }
  },
  "cta": {
    "titulo": "Start today...",
    "personal": {
      "titulo": "Personal Account",
      "precio": "Free",
      "siempre": "forever",
      "features": {
        "f1": "Post in Marketplace",
        "f2": "Create your own Dynamic",
        "f3": "Exclusive Coupons and Discounts",
        "f4": "Join Raffles",
        "f5": "Digital Loyalty Card (CardYA)",
        "f6": "Integrated chat (ChatYA)"
      },
      "boton": "Create free account"
    },
    "comercial": {
      "titulo": "Business Account",
      "badge": "POPULAR",
      "precio": "7 days free",
      "features": {
        "f1": "Post in Local Businesses",
        "f2": "Post in Deals",
        "f3": "Create your own Dynamic",
        "f4": "Create Coupons and Promotions",
        "f5": "Award Points for your Sales (ScanYA)",
        "f6": "Integrated chat (ChatYA)",
        "f7": "Business Studio (Management Tool)"
      },
      "boton": "Try 7 days free"
    },
    "trial": {
      "dias": "7-day free trial",
      "cancela": "Cancel before and pay nothing",
      "nota": "When registering a Business account, enter your card to activate the trial. It charges automatically after 7 days if you don't cancel."
    }
  },
  "footer": {
    "slogan": "\"Your purchases are now worth more.\"",
    "contactanos": "Contact us!",
    "derechos": "AnunciaYA. All rights reserved."
  }
}
```

---

## 9. Imágenes Utilizadas

| Ruta | Uso |
|------|-----|
| `/logo-anunciaya.webp` | Logo en navbar y footer |
| `/images/secciones/negocios-locales.webp` | Slide "Negocios Locales" |
| `/images/secciones/marketplace.webp` | Slide "Marketplace" |
| `/images/secciones/ofertas.webp` | Slide "Ofertas" |
| `/images/secciones/dinamicas.webp` | Slide "Dinámicas" |

---

## 10. Dependencias Técnicas

- **framer-motion:** `AnimatePresence`, `motion` — usado para carousel con transiciones
- **react-i18next:** `useTranslation('landing')` — internacionalización
- **lucide-react:** 20+ íconos importados
- **Stores:** `useUiStore` (abrirModalLogin, cerrarModalLogin, abrirModal2FA), `useAuthStore` (loginExitoso, setDatosGooglePendiente)
- **Google OAuth:** Lógica completa de `iniciarLoginGoogle` con manejo de usuario nuevo, 2FA, y login exitoso

---

## 11. Notas del Diseño Original

- La versión decía "Versión 8" en el comentario del archivo (git), pero se refería a sí misma como v9
- El carousel usaba `framer-motion` con `AnimatePresence mode="wait"` y auto-rotate cada 5 segundos
- En desktop, el carousel mostraba badges flotantes sobre la imagen (nombre de sección + highlight)
- Los tabs debajo del carousel permitían cambiar sección manualmente
- El subtítulo del hero estaba fragmentado en 7 partes para poder aplicar diferentes colores/pesos a cada palabra
- El precio comercial decía "7 días gratis" (no mostraba $449/mes)
- En móvil, la landing era una sola pantalla fija sin scroll — solo el hero
