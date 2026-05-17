# Handoff — Sección "Servicios" · AnunciaYA

Paquete de entrega para desarrollo. Contiene **componentes React/TypeScript** listos para
importar, **tokens de diseño**, los **prototipos HTML** originales como referencia visual,
y este README con la especificación completa.

> Los archivos `.html` / `.jsx` en `reference/` son **prototipos** creados como mockups
> de alta fidelidad — no se montan directamente en producción. El trabajo es **recrear
> esos diseños** dentro de tu codebase usando los patrones existentes (Next.js / Vite,
> React Router, tu state manager, etc.) y los componentes `.tsx` de `components/` como
> base traducible.

## Fidelidad

**Alta fidelidad.** Colores, tipografía, sombras, paddings, copies y radios son finales.
La estética es **B2B profesional tipo Linear / Stripe / Notion** — no caricaturesca.

## Stack asumido (ajusta a tu setup)

- **React 18+** con **TypeScript**
- **TailwindCSS 3+** (los componentes usan utility classes)
- **lucide-react** para iconos (`pnpm add lucide-react`)
- Routing: agnóstico — añade tus `Link`, `useRouter`, etc. donde aplique

Si no usas Tailwind, los tokens equivalentes están en `tokens.ts` para CSS-in-JS / vanilla.

---

## Estructura del paquete

```
design_handoff_servicios/
├── README.md                        ← este archivo
├── tokens.ts                        ← paleta, escala, sombras, breakpoints
├── tailwind.config.snippet.ts       ← merge contra tu tailwind.config
├── types.ts                         ← tipos del dominio (Servicio, Vacante, Persona…)
├── components/
│   ├── icons.tsx                    ← mapeo a lucide-react
│   ├── ServiciosHeader.tsx          ← header dark sticky con grid + glow sky
│   ├── OfreceToggle.tsx             ← segmented control Ofrezco/Solicito
│   ├── Chip.tsx                     ← pill chip filtros
│   ├── FAB.tsx                      ← FAB Publicar
│   ├── BottomBar.tsx                ← barra fija contacto ChatYA + WhatsApp
│   ├── Stars.tsx                    ← rating
│   ├── QA.tsx                       ← preguntas y respuestas
│   ├── MapPlaceholder.tsx           ← mapa con radio aproximado
│   └── cards/
│       ├── CardServicio.tsx         ← Card servicio-persona
│       ├── CardVacante.tsx          ← Card vacante-empresa
│       ├── CardSolicito.tsx         ← Card "Solicito"
│       └── CardHorizontal.tsx       ← Card horizontal carrusel
├── screens/
│   ├── FeedScreen.tsx               ← /servicios
│   ├── DetalleScreen.tsx            ← /servicios/:id
│   ├── PublicarScreen.tsx           ← /servicios/publicar (wizard 4 pasos)
│   ├── PerfilScreen.tsx             ← /servicios/usuario/:id
│   └── BuscarScreen.tsx             ← /servicios/buscar + overlay
└── reference/                       ← prototipos HTML originales (read-only)
    ├── index.html
    ├── shared.jsx · feed.jsx · detalle.jsx · wizard.jsx · perfil.jsx · buscador.jsx · cards.jsx
    └── …
```

---

## Sistema de diseño

### Paleta (token única: **sky** sobre slate)

| Token              | Hex       | Uso                                                          |
| ------------------ | --------- | ------------------------------------------------------------ |
| `sky-500`          | `#0ea5e9` | Acento puro / CTA gradient stop 1                            |
| `sky-600`          | `#0284c7` | CTA gradient stop 2 · iconos activos · borde activo de chips |
| `sky-700`          | `#0369a1` | CTA gradient stop 3 · texto sobre fondo claro                |
| `sky-100`          | `#e0f2fe` | Background de chips activos / badges                         |
| `sky-50`           | `#f0f9ff` | Banda superior de cards de vacante                           |
| `sky-400`          | `#38bdf8` | Texto "cios" del título · highlights sobre dark              |
| `slate-100`        | `#f1f5f9` | Fondo de app                                                 |
| `slate-200`        | `#e2e8f0` | Borde card servicio-persona · divisores                      |
| `slate-300`        | `#cbd5e1` | Borde de botones / inputs (border-2)                         |
| `slate-500/600/700`|           | Jerarquía de texto                                           |
| `slate-900`        | `#0f172a` | Texto principal                                              |
| `amber-50`         | `#fffbeb` | Fondo card "Solicito" (única excepción al sky-only)          |
| `amber-200`        | `#fde68a` | Borde card "Solicito"                                        |
| `emerald-500`      | `#22c55e` | WhatsApp · "Disponible hoy"                                  |

**Glow header dark:**

```css
background: radial-gradient(
  900px 220px at 95% -20%,
  rgba(2, 132, 199, 0.22) 0%,
  rgba(2, 132, 199, 0.07) 35%,
  transparent 70%
);
```

**Grid pattern header dark:** lines 1px `rgba(255,255,255,0.08)`, step 32px.

### Tipografía

- `Inter` (Google Fonts) — pesos 400, 500, 600, 700, 800, 900
- Títulos: `font-extrabold tracking-tight`
- Body: `font-medium` o `font-semibold`
- **Móvil:** base 16px. Headers 22–24px.
- **Desktop:** base 14–15px en densidad. Headers 28–32px.
- **Nunca uses `text-5xl`+** en headers — la jerarquía la lleva el **peso**, no el tamaño.

### Bordes y radios

- Cards: `rounded-2xl` (16px)
- Botones pill: `rounded-full`
- Inputs / chips internos: `rounded-lg` (8px)
- Iconos en cuadritos del header: `rounded-xl` (12px)
- **Botones siempre `border-2 border-slate-300`** — no usar 1px

### Sombras

- Cards: `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / 0.1)`)
- CTA sky: `shadow-md shadow-sky-500/30` (sombra **teñida** del acento)
- FAB: `shadow-md shadow-sky-500/40`

### Breakpoints

Solo dos:

- `lg:` 1024px (laptop)
- `2xl:` 1536px (desktop grande)

Mobile base = 0–1023px.

### Densidad

- **Paddings de card:** `p-3` (móvil) / `p-4` (desktop). Nunca `p-8`.
- **Gap entre cards:** `gap-3` (móvil 2 cols) / `gap-4` (desktop 3-4 cols)
- **Bottom bar de contacto:** `py-3 px-4`, botones `py-3`

---

## Pantallas

### 1. Feed `/servicios`

**Layout vertical**

1. `<ServiciosHeader>` sticky (dark con grid + glow). En desktop el toggle vive **dentro**; en móvil flota sobre el header.
2. `<OfreceToggle>` — segmented control 50/50.
3. Fila de `<Chip>` scrollable horizontal (Modalidad · Tipo · Distancia · Precio).
4. Carrusel **"Recién publicado"** — fila de `<CardHorizontal>` scrollable.
5. Grid **"Cerca de ti"** — `<CardServicio>` / `<CardVacante>` / `<CardSolicito>` mezclados, 2 cols móvil / 3 laptop / 4 desktop.
6. `<FAB label="Publicar" />` flotante.

**Estado vacío:** ilustración SVG line-art (incluida en `screens/FeedScreen.tsx`) + copy **"Aún nadie en tu zona ofrece esto. Sé el primero en publicar."** + CTA.

**Scroll infinito** en el grid; el carrusel es snap.

---

### 2. Detalle `/servicios/:id`

**Una sola pantalla** con módulos condicionales. Detecta el tipo (`'servicio' | 'vacante'`) y renderiza diferente:

| Módulo                     | Servicio-persona             | Vacante-empresa                                     |
| -------------------------- | ---------------------------- | --------------------------------------------------- |
| Galería                    | Hasta 6 fotos aspect 4:3     | 1 imagen (logo + brand) aspect 16:9                 |
| Chip de tipo               | "Servicio personal"          | "Vacante — Empresa verificada" (con badge escudo)   |
| Bloque oferente            | Avatar + nombre + ★ rating   | Logo + nombre + badge escudo                        |
| **Requisitos**             | —                            | Lista de bullets densa (`<I.check>` + texto)        |
| Bottom bar                 | ChatYA (ancho) + WhatsApp    | Igual                                               |

**Estado pausado:** banner amber arriba **"Esta publicación está pausada, no puedes contactar"**, foto degradada, botón deshabilitado.

**Sección Q&A** estilo Mercado Libre: agrupada por comprador con conector "L", badge "Pendiente" en preguntas sin respuesta, botón inline "Preguntar". Las preguntas pendientes de **otros** no se ven (privacidad).

**Mapa:** placeholder con radio sky de ~500m alrededor del punto. **Nunca marker exacto.**

**Importante:** botón es **"Contactar por ChatYA"**. NUNCA "Postular" / "Aplicar" / "Aceptar".

---

### 3. Wizard `/servicios/publicar` (4 pasos)

Auto-save a `sessionStorage` en cada cambio (key sugerida: `aya:servicios:wizard:draft`).

**Paso 1 — Tipo**

- Pregunta: **"¿Qué quieres hacer?"**
- 2 cards grandes lado a lado: **Ofrezco** vs **Solicito**.
- Sub-elección condicional (chip group):
  - Si **Ofrezco** → Servicio personal · Busco empleo
  - Si **Solicito** → Servicio puntual · Vacante de empresa

**Paso 2 — Información**

- Título (max 60 chars, contador en label)
- Descripción (min 30 chars, max 500)
- Especialidades / skills (hasta 8 chips, autocomplete)
- Fotos (drag&drop, hasta 6 para servicios / 1 para vacantes)
- Modalidad: Presencial / Remoto / Híbrido (chip único)

**Paso 3 — Precio + Ubicación**

- Selector tipo de precio: Monto fijo · Por hora · Rango · Mensual · A convenir
- Input numérico según opción
- Zonas (chip multiselect): Centro · Las Conchas · Cholla · …
- Si vacante: campos extra **Horario** + **Días de la semana**

**Paso 4 — Confirmación**

- Vista previa de la card final
- Tabla resumen de campos
- 3 checkboxes obligatorios:
  - ☐ No estoy ofreciendo nada ilegal
  - ☐ La info es verdadera
  - ☐ Sé que la coordinación es por mi cuenta (ChatYA, WhatsApp, presencial)
- Botón **"Publicar"** sky grande

**Desktop:** panel lateral derecho 440px con **vista previa en vivo** — la card real renderizada con los valores del wizard en tiempo real, más indicador de auto-guardado.

---

### 4. Perfil `/servicios/usuario/:id`

Sin portada decorativa. Identidad densa, métricas inline.

- **Header** simple: back · share · "+ Seguir"
- **Bloque identidad:** avatar 80px (móvil) / 96px (desktop) + nombre + rating + reseñas + chip **Disponible hoy** (verde) + tiempo respuesta + badge identidad verificada
- **Bio** corta (max 200 chars)
- **Especialidades** como pills slate-100
- **Métricas inline** (texto, NO cards):  
  `5 servicios activos · 27 reseñas · Miembro desde Mar 2026`
- **Tabs:** Servicios activos · Reseñas · Q&A (desktop)
- **Botón Contactar** flotante en móvil / sticky lateral en desktop

**Estado vacío reseñas:** ícono ★ en círculo sky-50 + copy **"Aún sin reseñas. Sé el primero en contratar a [Nombre] y deja tu reseña para ayudar a otros vecinos."**

---

### 5. Buscar `/servicios/buscar`

> El input vive en el **Navbar global** (ya existe en producción y cambia su placeholder
> según la sección activa). Este screen es el **overlay de sugerencias** + la **página
> de resultados** a la que se navega.

**Overlay sugerencias (al focus en input):**

- **Query vacío:**
  - Sección "Búsquedas recientes" (chips con X individual)
  - Sección "Populares en Peñasco" (chips top 10)
  - Categorías rápidas (grid 2 cols)
- **Query con texto** (debounce 300ms):
  - Sugerencias agrupadas: **Servicios** · **Empleos** · **Personas**
  - Highlight del término coincidente (componente `<SearchHighlight>`)
  - Footer del dropdown con atajos `↵` / `↑↓`
- **Móvil:** fullscreen
- **Desktop:** dropdown 600px bajo el input global, con dim overlay slate-900/55

**Página de resultados:**

- Tabs de tipo: Todos · Servicios · Empleos · Personas
- **Sidebar de filtros** (desktop): Modalidad · Tipo · Distancia (slider 1-toda) · Rango precio · Disponibilidad
- **Móvil:** sheet inferior (no incluido en este paquete — usa tu pattern de sheet)
- **URL state:** filtros + query reflejados en query params (`?q=plomero&modalidad=presencial&dist=5`)
- **Vacío:** ícono lupa sky + copy **"Sin resultados para '[término]'. Prueba con menos filtros o publica tú esa solicitud."**

---

## Variantes de Card (críticas — leer)

| Card                     | Borde     | Fondo                | Cuándo                                                                         |
| ------------------------ | --------- | -------------------- | ------------------------------------------------------------------------------ |
| **Servicio-persona**     | slate-200 | blanco               | Persona física que ofrece un servicio. Foto del trabajo arriba. Avatar visible. |
| **Vacante-empresa**      | sky-200   | blanco + banda sky-50 superior | Negocio con vacante. Banda con logo. Badge escudo "Verificado".         |
| **Solicito**             | amber-200 | amber-50             | Alguien que busca contratar. Icono de categoría, **sin foto**. Muestra presupuesto. |

---

## Microinteracciones (lo que decidí explorar)

- **Toggle Ofrezco/Solicito:** transición de `bg-position` 200ms `ease-out` + leve `scale(0.98)` en el botón inactivo al hover.
- **FAB:** al hacer scroll hacia abajo se aleja del BottomNav (móvil `bottom-4` → `bottom-20`); en desktop **siempre fijo** alineado a la columna izquierda del MainLayout.
- **Header dark:** el glow tiene `mix-blend-mode: screen` opcional para que respire si pones imagen detrás.
- **Cards hover (desktop):** `translate-y-[-2px]` + `shadow-lg` 150ms.
- **Q&A:** la pregunta se expande con `max-height` transition 200ms `ease-out`.

## Anti-patrones (NO)

- ❌ Botón "Postular" / "Aplicar" — siempre **"Contactar"**
- ❌ Formulario CV / subir PDF
- ❌ Panel "Postulantes recibidos"
- ❌ Estrellas oro/plata/bronce, emojis como datos, gamificación visible
- ❌ Botón "Reportar" (moderación es 100% automática + TTL 30 días)
- ❌ Más de 1 acento (solo sky; amber es decorador suave de un único tipo de card)
- ❌ `text-5xl` en headers, `p-8` en cards, `shadow-2xl` en cualquier lado
- ❌ Iconos grandes en círculos pastel saturados

---

## Datos del dominio

Ver `types.ts` para los tipos exactos. Resumen:

```ts
type Servicio = {
  id: string;
  tipo: 'servicio-persona' | 'vacante-empresa' | 'solicito';
  modo: 'ofrezco' | 'solicito';
  titulo: string;            // max 60
  descripcion: string;        // 30..500
  fotos: string[];            // 0..6 (servicios) | 0..1 (vacantes)
  precio: Precio;             // discriminated union
  modalidad: 'presencial' | 'remoto' | 'hibrido';
  zonas: string[];
  oferenteId: string;
  estado: 'activa' | 'pausada';
  expiresAt: ISODate;         // TTL 30 días
  createdAt: ISODate;
  // condicional según tipo
  requisitos?: string[];      // solo vacante
  skills?: string[];          // solo servicio-persona, max 8
  horario?: string;           // solo vacante
  dias?: DiaSemana[];         // solo vacante
};
```

---

## Mensajes de copy (revisar antes de mandar a traducción)

- Header: **"Servicios"** con `cios` en `text-sky-400` · Subtítulo: **"Encuentra personas que ayudan"**
- Toggle: **"Ofrezco"** / **"Solicito"** (primera persona, conversacional)
- CTA contacto: **"Contactar por ChatYA"**
- FAB: **"Publicar"**
- Empty feed: **"Aún nadie en tu zona ofrece esto. Sé el primero en publicar."**
- Empty búsqueda: **"Sin resultados para '[término]'. Prueba con menos filtros o publica tú esa solicitud."**
- Empty reseñas: **"Aún sin reseñas. Sé el primero en contratar."**
- Pausada banner: **"Esta publicación está pausada, no puedes contactar"**
- Disclaimer pago: **"La coordinación es entre ustedes. AnunciaYA no procesa pagos."**

---

## Cómo integrar

1. `pnpm add lucide-react` (o el equivalente)
2. Copia `tokens.ts` y los componentes a tu carpeta (`src/features/servicios/...`)
3. Mergea `tailwind.config.snippet.ts` con tu `tailwind.config.ts` (las extensiones de `theme.extend` son aditivas)
4. Adapta `screens/*` a tus rutas (Next App Router / Vite Router / lo que uses)
5. Conecta los `<Link>` y `useRouter` reales
6. Conecta el state (cards, filtros, wizard) a tu fuente de datos
7. Implementa el auto-save del wizard contra `sessionStorage` (key sugerida arriba)

## Notas finales

- Los **prototipos en `reference/`** son la fuente visual canónica. Si algo no cuadra al
  reimplementar, abre el `index.html` localmente y compara.
- Si tu codebase ya tiene `<Button>` / `<Chip>` / `<Avatar>` propios, **úsalos** y aplica
  los tokens — no introduzcas duplicados.
- El navbar global (con location pill + search + tabs de sección) **ya existe** en
  producción. No lo reimplementes; solo asegura que el placeholder del search cambie a
  **"Buscar servicios…"** cuando la ruta sea `/servicios*`.
