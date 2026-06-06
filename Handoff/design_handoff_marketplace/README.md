# Handoff: Marketplace AY (AnunciaYA)

## Overview

Diseño completo de la sección **Marketplace** dentro de la app **AnunciaYA (AY)** — una app de servicios locales/barriales. El Marketplace es una **vitrina vecinal**, no un e-commerce: los usuarios **promueven** sus artículos (productos de segunda mano, hechos a mano, productos nuevos de pequeños emprendedores, alquiler/venta de inmuebles, autos). **La app NO procesa pagos ni transacciones**: el contacto entre comprador y vendedor sucede por **chat AY**, **WhatsApp** o **llamada telefónica**.

Modelo de monetización: publicaciones **destacadas/promocionadas** (no comisión por venta).

El Marketplace **se inserta dentro de la cáscara visual de AY** (header negro, BottomNav de 5 tabs, FAB rojo de chat). No tiene onboarding propio — la sesión se hereda de la app.

---

## About the Design Files

Los archivos `.html` y `.jsx` incluidos son **referencias de diseño** creadas como prototipo HTML/React inline. **No son código de producción para copiar y pegar.** La tarea es **recrear estos diseños en el codebase real** (React Native / Next.js / Vue / SwiftUI / lo que use el proyecto), respetando los patrones, libs y convenciones existentes de la app AY.

Si todavía no hay codebase y hay que elegir, la recomendación —dado que es móvil-first con presencia desktop— es **Next.js + React + Tailwind v4** para web, o **React Native + NativeWind** para mobile nativo.

---

## Fidelity

**High-fidelity (hifi).** Los mockups tienen:
- Colores finales con valores hex exactos
- Tipografía, tamaños, pesos y line-heights definidos
- Espaciados, paddings y radios precisos
- Imágenes reales (Unsplash) que se reemplazarán por contenido real
- 3 breakpoints diseñados: **móvil 360×740**, **laptop lg 1280×720** y **Full HD 2xl 1600×900**

Recrear pixel-perfecto usando las libs/sistema del codebase.

---

## Stack & Libraries usados en el prototipo

| Recurso | Versión / fuente | Uso |
|---|---|---|
| **React** | 18.3.1 (UMD) | Componentes inline |
| **Lucide icons** | última | Iconografía consistente — recrear con `lucide-react` o `lucide-react-native` |
| **Geist** | Google Fonts | Display + body (sans) |
| **Geist Mono** | Google Fonts | Etiquetas técnicas, prices precision |
| **Instrument Serif** | Google Fonts | Acento editorial puntual |
| **Tailwind v4 mental model** | CSS-first (`@theme`) | Diseño pensado en tokens v4 |

Imágenes mock: Unsplash. Reemplazar con CDN propio.

---

## Diseño visual base (cáscara de AY)

Estos componentes **ya existen en la app AY** y el Marketplace los reutiliza tal cual. El archivo `ay-tokens.jsx` los reproduce.

### `AY_Header` — header de pantalla
- Fondo: **negro `#0A0A0A`** con grid sutil de 14×14 px (`rgba(255,255,255,0.04)`)
- Top row (alto ~46 px): back arrow blanco · logo cuadrado verde 30×30 con icon `tag` · título · acción derecha (menu/search/filter)
- Título: `Geist 700 / 20px / -0.4 letter-spacing`, blanco, con palabra final opcional en **verde `#10B981`** (estilo "Mis **Cupones**")
- Subtítulo decorativo: 11.5px / 500 / blanco 78%, **flanqueado por dos líneas verdes 1px al 50% opacity** que ocupan el resto del ancho
- Tabs (opcional, debajo): full-width segmented, label activo en verde con underline verde 2px

### `AY_BottomNav` — barra inferior global
- 5 tabs en orden: **Negocios · Market · [FAB chat] · Ofertas · Dinámicas**
- Fondo blanco, border-top `#E2E8F0`, paddingTop 8 / paddingBottom 28 (safe-area iOS)
- **FAB central** sobresale -22px hacia arriba: círculo 52×52, gradient rojo `#EF4444 → #DC2626`, border blanco 3px, sombra `0 6px 16px rgba(239,68,68,0.4)`, icon `message-circle` blanco, dot indicador blanco con borde rojo arriba-derecha
- Tab activo: icon + label en **verde `#10B981`**, font-weight 700; inactivos en `#0F172A` icon / `#475569` label, weight 500
- Cuando se navega DENTRO de Marketplace, el tab "Market" queda activo

### `AY_Pill` — chip tinted
Variantes: `green` (default, fondo `#D1FAE5` / texto `#059669`), `neutral`, `dark`, `amber`, `blue`. Border-radius 999. Tamaños xs/sm/md.

### `AY_Karma` — score circular del vendedor
SVG de 36×36 (configurable). Anillo gris `#F1F5F9` 3px + arc verde `#10B981` 3px proporcional al score 0–100. Número centrado `Geist 700`. Diferenciador clave del marketplace.

---

## Design Tokens (resumen)

```css
@theme {
  /* Identidad AY */
  --color-ay-green:        #10B981;  /* logo, acentos, CTAs, precios, tabs activos, verificado */
  --color-ay-green-dark:   #059669;  /* hover/pressed */
  --color-ay-green-soft:   #D1FAE5;  /* badges tinted */
  --color-ay-green-glow:   rgba(16,185,129,0.15);
  --color-ay-red:          #EF4444;  /* FAB chat */
  --color-ay-red-dark:     #DC2626;

  /* Headers oscuros */
  --color-ay-ink-header:       #0A0A0A;
  --color-ay-ink-header-grid:  rgba(255,255,255,0.04);

  /* Background app — gradiente azul lavanda suave */
  --color-ay-bg-grad:  linear-gradient(180deg, #F5F7FB 0%, #EAF1FB 50%, #F0F4FA 100%);
  --color-ay-bg-flat:  #F5F7FB;

  /* Superficies */
  --color-ay-surface:   #FFFFFF;
  --color-ay-surface-2: #F8FAFC;

  /* Texto */
  --color-ay-ink:       #0F172A;  /* slate-900 */
  --color-ay-ink-soft:  #475569;  /* slate-600 */
  --color-ay-ink-faint: #94A3B8;  /* slate-400 */
  --color-ay-ink-on-dark:      #FAFAFA;
  --color-ay-ink-on-dark-soft: #A1A1AA;

  /* Bordes */
  --color-ay-line:      #E2E8F0;  /* slate-200 */
  --color-ay-line-soft: #F1F5F9;  /* slate-100 */

  /* Tipografía */
  --font-display: "Geist", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-body:    "Geist", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono:    "Geist Mono", ui-monospace, "SFMono-Regular", monospace;
}
```

**REGLA DE COLOR (importante):** El verde `#10B981` se usa **solo como acento**: precios, CTAs primarios, badges activos, ícono de verificación, tab activo. **Nunca como background dominante.** Resto en neutros slate sobre el gradiente azul lavanda.

### Spacing scale
4 / 8 / 12 / 16 / 18 / 20 / 24 / 32 / 48 px. En móvil el padding lateral estándar de pantalla es **16 px** (a veces 18 px en pantallas con cards más densas).

### Radius
- Buttons / cards pequeñas: **10–12 px**
- Cards de producto: **14 px** la imagen, contenido sin radius
- Bottom sheets / contenedores grandes: **16–20 px**
- Pills / chips / avatars: **999 px**
- Logo cuadrado AY: **8 px**

### Sombras
```css
--shadow-card:    0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05);
--shadow-nav:     0 -1px 0 rgba(15,23,42,0.04), 0 -8px 24px rgba(15,23,42,0.06);
--shadow-fab:     0 6px 16px rgba(239,68,68,0.4), 0 1px 0 rgba(255,255,255,0.2) inset;
--shadow-cta:     0 2px 8px rgba(16,185,129,0.25);
```

---

## Responsive system (Tailwind v4 mental model)

| Token | base (móvil) | lg (≥1024) | 2xl (≥1536) |
|---|---|---|---|
| **Viewport diseñado** | 360 × 740 | 1280 × 720 | 1600 × 900 |
| **Container** | `w-full` | `max-w-[1200px] mx-auto` | `max-w-[1640px] mx-auto` |
| **Padding X** | `px-4` | `lg:px-6` | `2xl:px-10` |
| **Grid productos** | `grid-cols-2` | `lg:grid-cols-4` | `2xl:grid-cols-6` |
| **Gap** | `gap-3` | `lg:gap-4` | `2xl:gap-5` |
| **Header** | AY shell negro | `lg:h-14` horizontal | `2xl:h-16` |
| **BottomNav** | AY 5 tabs | oculto | oculto |
| **Title H1** | `text-2xl` | `lg:text-3xl` | `2xl:text-4xl` |
| **Detail hero** | `aspect-square` | `aspect-square` | hero fijo `w-[700px]` |

**Importante en desktop:** la app AY ya tiene 2 sidebars fijos a nivel app. El Marketplace en desktop usa **solo header horizontal** (logo · ubicación · search bar · nav categorías · CTA "Publicar" verde · iconos chat/notif/avatar). No agregar otro sidebar.

---

## Pantallas (12 vistas × 3 breakpoints = 36 vistas totales)

Todas las pantallas siguen el mismo orden y semántica en mobile / lg / 2xl. Las descripciones de abajo aplican a la versión **móvil base**; en desktop crecen siguiendo la tabla responsive.

### 01 · Home Marketplace (`B_Home` / `D_Home`)
**Propósito:** Landing del Marketplace. El usuario explora qué hay en su barrio.

**Layout móvil (top→bottom):**
1. **Header AY** — título "Marketplace", titleAccent "del barrio", subtitle "Compra y vende en tu barrio", **tabs row**: `Vendiendo` (activo) · `Lo busco`. Acción derecha: search.
2. **Buscador** — input de 44px con icon search a la izquierda · placeholder "¿Qué estás buscando?" · icon filter a la derecha. Sobre fondo blanco con borde slate-200.
3. **Categorías horizontal scroll** — chips de 8 categorías: Hogar, Tecnología, Ropa, Bebés, Vehículos, Inmuebles, Hecho a mano, Servicios. Iconos lucide.
4. **Banner destacado** (opcional, dismiss-able) — promoción de boost con CTA "Destacar mi anuncio".
5. **Sección "Cerca tuyo"** — h2 + subtitle "A 8 cuadras o menos" — grid 2 columnas de **BCard**.
6. **Sección "Recién publicados"** — grid 2 columnas más BCards.
7. **BottomNav AY** sticky.

**Componente clave: `BCard` (card de producto)**
- Aspect-ratio 1:1 imagen, border-radius 14px arriba
- Badge "NUEVO" / "Destacado" arriba-izquierda (pill verde tinted)
- Botón fav (heart) arriba-derecha sobre la imagen, fondo blanco semi
- Debajo de la imagen: título 13.5px / 600 / 2 líneas máx con `text-wrap: pretty`
- Línea de modalidad: chip pequeño "Precio fijo" / "Acepta oferta" / "Trueque OK"
- Precio: **`Geist 700 / 15px / verde #059669`**
- Footer: `📍 Palermo · 8 cuadras` en 11px slate-600 + badge verificado verde si aplica

### 02 · Lo busco (modo inverso) — DIFERENCIADOR (`B_LoBusco`)
**Propósito:** El **comprador publica qué necesita**, los vecinos responden con su artículo. Cierra la asimetría del catálogo.

**Layout:**
1. Header AY tabs: `Vendiendo` · `Lo busco` (activo)
2. CTA hero "Publicar mi pedido" — botón gradient verde grande con icon plus
3. Lista de pedidos vecinos (6 mock) — cada item:
   - Avatar circular del solicitante + nombre + verificado
   - Título del pedido ("Busco bicicleta rodado 26 para nene")
   - Distancia en cuadras + barrio
   - Chips: presupuesto, "Trueque OK" si aplica
   - Counter "3 vecinos respondieron" + CTA secundario "Tengo eso →"
   - Badge "NUEVO" si <24h
4. BottomNav AY

### 03 · Categorías (`B_Categories`)
Grid 2 columnas de tarjetas cuadradas con icon grande lucide + nombre + count "324 publicaciones". Header AY title "Categorías" subtitle "Explorá por tipo de producto", back.

### 04 · Búsqueda + filtros (`B_Search`)
- Input search en focus + chips recientes ("Bicicleta", "Mesa") debajo
- Bottom-sheet de filtros: Precio (range slider), Distancia (en cuadras: 5/10/20/cualquiera), Modalidad (multi-select: Precio fijo / Acepta oferta / Trueque), Solo verificados (toggle), Categoría (chips).
- Grid 2 cols con resultados.

### 05 · Detalle producto (`B_Detail`)
**La pantalla más densa.** Layout móvil scroll vertical:
1. Header AY back, action: heart + share
2. **Carrusel de imágenes** full-width 1:1 con dots indicator
3. Título 22px / 700 / -0.5 letter-spacing
4. **Precio grande 28px / 700 / verde** + chip de modalidad al lado
5. Línea distancia: `📍 Palermo · 8 cuadras de vos`
6. **Card del vendedor** (clickable → 06 Perfil): avatar 48px + nombre + badge verificado + AY_Karma circular + "Ver perfil →"
7. Sección **"Descripción"** con texto + lista de specs si aplica
8. Sección **"Modalidad"** con chips: precio fijo, retiro en zona, acepta efectivo
9. Sección **"Cupón AY aliado"** (si aplica) — DIFERENCIADOR: card verde tinted "10% off en Café Martínez al contactar este vendedor" → cupon AY cruzado
10. Sección **"Productos similares del vendedor"** — scroll horizontal de mini-cards
11. **Footer sticky** sobre BottomNav: 3 botones — `Chat AY` (primario verde) / `WhatsApp` (verde WA #25D366 outline) / `Llamar` (outline neutral). NO hay botón "Comprar".

### 06 · Perfil vendedor (`B_Seller`)
1. Header AY back
2. Avatar 80px + nombre + badge verificado + AY_Karma 48px label="Vecino confiable"
3. Stats row: "12 ventas · 47 publicaciones · Miembro desde 2023"
4. CTA "Chatear" verde primario
5. Tabs: `Publicaciones (12)` · `Reseñas (47)`
6. Grid 2 cols de BCards del vendedor

### 07 · Publicar — wizard 3 pasos (`B_PostStep step={1|2|3}`)
**Header común:** AY back · title "Publicar" · stepper "1/3" arriba-derecha. Footer sticky con botón "Continuar →" verde.

**07a · Fotos:**
- Grid 3×3 de slots cuadrados con dashed border slate-300 + icon plus. Primer slot (cover) más grande arriba.
- Tip card: "Subí entre 3 y 8 fotos. La primera es la portada."

**07b · Detalles:**
- Categoría (select)
- Título (input, max 80 chars con counter)
- Descripción (textarea)
- **Modalidad de precio** (radio cards):
  - `Precio fijo` + input precio
  - `Acepta oferta` + input precio referencia
  - `Trueque OK` + textarea "qué buscás a cambio"
- Estado: nuevo / como nuevo / usado / para reparar
- Toggle "Negociable"

**07c · Contacto + ubicación:**
- Zona (select): "Palermo · CABA"
- Modalidad: Retiro en zona / Envío con cargo / Ambos
- **Canales de contacto** (toggles): Chat AY (siempre on, locked) · WhatsApp (input num) · Teléfono (input num)
- Toggle "Destacar mi anuncio (+$X por 7 días)" — link a monetización
- CTA final: "Publicar"

### 08 · Estadísticas de publicación (`B_Stats`)
Header back, title "Estadísticas", sub "Últimos 7 días".
1. KPIs row: Vistas / Mensajes / Favs (3 cards iguales con número grande verde + delta)
2. Bar chart 7 días (barras verde gradient)
3. Sección "Origen de visitas": Home / Categorías / Búsqueda con %
4. CTA verde "Destacar publicación" (monetización)

### 09 · Chat (`B_Chat`)
- Header negro AY: avatar vendedor + nombre + estado online (dot verde)
- Banner contextual arriba: card pequeña con la **publicación referenciada** (foto + título + precio) — mantiene el contexto del chat
- Burbujas de mensaje: outgoing verde claro `#D1FAE5` con texto `#065F46`, alineadas a la derecha; incoming blanco con border slate-200, alineadas a la izquierda. Border-radius 16/16/16/4 (cola).
- Quick replies sugeridos arriba del input: "¿Está disponible?" / "¿Aceptás oferta?" / "¿Dónde podemos vernos?"
- Input footer: textarea + icon attach + icon send (verde)

### 10 · Notificaciones (`B_Notifs`)
Lista de items: avatar/icon · texto principal (negrita en lo nuevo) · timestamp `2 h`. Tipos: nuevo mensaje, alguien guardó tu publicación, respuesta a "Lo busco", publicación expiró, oferta recibida.
Action header: "Marcar leídas".

### 11 · Favoritos (`B_Favs`)
Header AY title "Favoritos" sub "8 productos guardados". Filtro chips: Todos / Disponibles / Ya no disponibles. Grid 2 cols de BCards (los no disponibles aparecen con overlay gris al 60% y badge "Ya no disponible").

---

## Pantalla EXTERNA (no parte de Marketplace)

### `/mis-publicaciones` (HUB GLOBAL)
**Decisión de producto:** "Mis publicaciones" **NO vive dentro del Marketplace**. Es un hub a nivel app que centraliza los anuncios del usuario en TODOS los módulos (Marketplace + Cupones + Dinámicas). Se accede desde el menú/perfil global de AY, no desde el bottomnav del Market.

Desde el flow del Marketplace, el botón "Publicar" lleva al wizard 07a→b→c, y al confirmar la publicación, redirige a `/mis-publicaciones` (fuera del marketplace). Las "Estadísticas" (08) son una sub-vista de un item dentro de `/mis-publicaciones`.

Para la implementación: respetar este split arquitectónico — **no construir "mis publicaciones" como ruta hija de `/marketplace`**. Si todavía no existe el hub global, este handoff es la oportunidad para crearlo separado.

---

## Interactions & Behavior

### Navegación
- **Stack-based** dentro del Marketplace. Toda subpantalla muestra back arrow en el AY_Header.
- El BottomNav siempre visible en mobile salvo en pantallas de chat activo (opcional ocultarlo) y en wizards de publicación (donde reemplaza el footer por CTA "Continuar").
- En desktop el BottomNav no existe — la nav vive en el header horizontal.

### Acciones que SALEN de la app
- **Chat AY** → modal/screen interno (#09)
- **WhatsApp** → `wa.me/<número>?text=<plantilla con título de publicación>` — usar deep link nativo
- **Llamar** → `tel:<número>` nativo

### Estados
- **Loading** de feed: skeleton cards (rectángulos slate-100 con shimmer)
- **Empty state** favoritos: ilustración + "Aún no guardaste ningún producto" + CTA "Explorar marketplace"
- **Empty state búsqueda**: "No encontramos resultados en tu zona — ¿querés publicarlo en 'Lo busco'?" + CTA secundario
- **Error de carga**: card con icono + retry button
- **Publicación expirada/pausada**: overlay en card + badge

### Animaciones
- Transiciones de pantalla: slide horizontal estándar iOS/Android nativo (no custom)
- Card press: scale `0.98` durante 100ms con `ease-out`
- BottomNav active: el icon hace pequeño bounce + cambio de color (200ms)
- FAB chat: pulse sutil cuando hay mensajes nuevos (sombra crece y vuelve)
- Carrusel de fotos en detalle: snap horizontal con dots

### Validaciones (publicar)
- Mín. 3 fotos para continuar al paso 2
- Título 5–80 chars
- Descripción mín. 30 chars
- Precio numérico positivo si modalidad ≠ trueque
- Al menos un canal de contacto activo (Chat AY siempre forzado on)

---

## State Management

Estado mínimo necesario:

| Slice | Datos |
|---|---|
| `marketplace.feed` | Listado paginado de productos cercanos al usuario |
| `marketplace.filters` | `{ category, distance, priceRange, modes[], verifiedOnly, query }` |
| `marketplace.favorites` | `Set<productId>` |
| `marketplace.lobusco` | Listado de pedidos `{ id, user, title, distance, budget, modes, responses, createdAt }` |
| `marketplace.draft` | Borrador del wizard publicar (persiste local hasta confirmar) |
| `chat.threads` | Hilos por publicación (vinculados al producto referenciado) |
| `notifications.unread` | Contador para badge en BottomNav |
| `session.user` | Heredado de AY — incluye `karma`, `verified`, `whatsapp`, `phone` |

Data fetching: paginación por scroll en feed; query con debounce 300ms en search; geo basado en `user.zona` (no GPS — barrio declarado en AY).

---

## Assets

- **Imágenes mock:** Unsplash (`images.unsplash.com`). Reemplazar por CDN propio.
- **Iconografía:** Lucide. Usados: `home, tag, search, sliders, list, chev-left, chev-right, message-circle, heart, share, map-pin, badge, gift, plus, camera, x, more, star, shield-check`.
- **Logo AY:** placeholder en cuadrado verde con icon `tag`. Reemplazar por logo real de AnunciaYA.
- **Fonts:** cargar Geist + Geist Mono desde Google Fonts (o self-host).

---

## Files included

| Archivo | Descripción |
|---|---|
| `Marketplace.html` | Entry point — abrir en navegador para ver todo el design canvas |
| `app.jsx` | App principal — orquesta secciones, tweaks, brief, density legend, flow map |
| `ay-tokens.jsx` | **Sistema visual AY**: tokens + `AY_Header`, `AY_BottomNav`, `AY_Pill`, `AY_Karma` |
| `option-b-plaza.jsx` | **12 pantallas mobile** (B_Home, B_LoBusco, B_Detail, B_PostStep, B_Chat, etc.) + `BCard`, `BHeader`, helpers |
| `desktop-views.jsx` | **12 pantallas × 2 breakpoints desktop** (lg 1280 + 2xl 1600) con header horizontal |
| `shared.jsx` | Tokens compartidos, `Icon` wrapper de Lucide, `Img` component, mock data (PRODUCTS, MOCK_SELLERS) |
| `design-canvas.jsx` | Starter component del canvas pan/zoom (no se reimplementa, solo es la presentación) |
| `ios-frame.jsx` | Bezel iPhone 14 (no se reimplementa) |
| `tweaks-panel.jsx` | Panel de tweaks (no se reimplementa) |

---

## Cómo abrir el diseño

1. Abrir `Marketplace.html` en un navegador moderno.
2. El canvas tiene 5 secciones:
   - **Intro** — brief con los 5 diferenciadores y leyenda de densidades
   - **📱 Mobile** — 13 artboards (12 pantallas + brief)
   - **💻 Laptop lg** — 12 artboards desktop 1280×720
   - **🖥️ Full HD 2xl** — 12 artboards desktop 1600×900
   - **Flujo de navegación** — mapa visual de cómo se conectan las pantallas
3. Pan con drag, zoom con scroll/trackpad, click en label de artboard para abrir fullscreen.
4. Toolbar tiene un toggle **Tweaks** que abre dos opciones: mostrar hints de Tailwind v4 sobre cada vista, y togglear la cáscara AY.

---

## Diferenciadores vs Mercado Libre / Facebook Marketplace

Estos son **decisiones de producto**, no cosméticas. Hay que mantenerlas en la implementación:

1. **"Lo busco" (modo inverso)** — pantalla 02. El comprador publica qué necesita, los vendedores responden. Cierra la asimetría del catálogo.
2. **Distancia en cuadras**, no km. Hiperlocal real ("a 8 cuadras" pega más que "1.2 km" cuando es barrio).
3. **Chips de modalidad de precio** en cada card y detalle: Precio fijo / Acepta oferta / Trueque OK. Acaba con el "¿lo último?" en chat.
4. **Karma de vecino + verificación visible** — `AY_Karma` circular + badge verde de cédula verificada junto al nombre.
5. **Cupones AY cruzados** — si el vendedor tiene comercio aliado AY, aparece un cupón en la ficha del producto. Algo que ML jamás puede dar.

---

## Notas finales

- **No mostrar precios en USD ni conversión.** Pesos argentinos (asumido por contexto AY).
- **No agregar checkout, carrito, métodos de pago.** Si alguien pregunta por eso, es un error de scope.
- **El chat AY existe a nivel app** — el chat del Marketplace no es un módulo nuevo, reutiliza el sistema de mensajería de AY. La pantalla 09 muestra cómo se ve cuando el contexto es una publicación del Marketplace (banner del producto arriba).
- **Verde solo en acentos.** Si en algún momento pasa a fondos grandes, el diseño deja de combinar con la paleta azul lavanda de la cáscara AY.
