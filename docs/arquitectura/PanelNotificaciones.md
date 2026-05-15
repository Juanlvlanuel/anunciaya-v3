# Panel de Notificaciones (UI) — AnunciaYA v3.0

> Componente popover/side sheet que muestra las notificaciones del usuario. Sigue el patrón visual de `MenuDrawer v3.0` (mismos tokens, motion, tipografía y pesos).
>
> - **Desktop**: popover **400 px** anclado dinámicamente al botón de campana del Navbar (rect calculado desde `data-notificaciones-boton`). Altura **fija** calculada en JS para llegar hasta cerca del fondo de la ventana.
> - **Móvil**: side sheet **full-width** (`100vw`) desde la derecha con scrim azul-blur. La altura siempre ocupa el 100 % del viewport.
>
> **Origen del diseño:** `design_handoff_notifications/README.md` (handoff de producto). Este documento describe la implementación final.
>
> **Documento hermano (backend):** `docs/arquitectura/Notificaciones.md` — modelo de datos, filtrado por sucursal, Socket.io en tiempo real.
>
> **Última actualización:** 2026-05-15.

---

## Archivos

| Ruta | Propósito |
|------|-----------|
| `apps/web/src/components/layout/PanelNotificaciones.tsx` | Componente UI unificado (desktop + móvil) |
| `apps/web/src/stores/useNotificacionesStore.ts` | Store Zustand (sin cambios; lo consume el panel) |
| `apps/web/src/types/notificaciones.ts` | Tipos de `Notificacion`, `TipoNotificacion`, etc. |
| `apps/web/src/config/menuDrawerTokens.ts` | Paleta compartida (reusada del MenuDrawer) |
| `apps/web/src/components/layout/Navbar.tsx` | Dispara el panel con click en la campana |
| `apps/web/src/components/layout/MobileHeader.tsx` | Mismo trigger en móvil |

---

## Cambios respecto a la versión anterior (v5)

| Aspecto | v5 (anterior) | v6 (handoff aplicado) |
|---------|---------------|------------------------|
| Estructura | Header dark con gradient + lista plana cronológica | Tabs (Todas / No leídas) sobre card paper + bucketing por antigüedad |
| Móvil | `ModalBottom` slide-up con drag handle | Side sheet desde la derecha con scrim azul-blur |
| Mapeo de tipos | 15 configs individuales (`getConfigPorTipo`) | 6 familias visuales (compra, entregado, pendiente, reseña, alerta, sistema) |
| Avatar de tile | `border-radius: full` con gradient genérico | `border-radius: 16px` (rounded square) con gradient por familia, **52×52 px** |
| Badge superpuesto | Mini círculo con ícono del tipo | Círculo **22×22 px** del color de familia + glifo blanco 13 px, halo de 2.5 px paper |
| Indicador "no leído" | Punto azul al inicio del título | Barra lateral 3 px a la izquierda (al estilo MenuDrawer) + punto azul inline al final |
| Footer | Gradient slate con CTA `slate-900` | CTA gradient `#19295C → #0E1F4A` (azul oscuro), disabled si `unreadCount === 0` |
| Tipografía | Inter mezclada con pesos variables | Inter consistente, pesos del handoff (700 para títulos, 600 labels, 500 body) |
| Apertura | `animate-in fade-in slide-in-from-top-2` | `pn-pop` con `translate + scale` (sin opacity, igual a `dd-pop`) |
| Paginación | Botón "Ver notificaciones anteriores" tipo banner | Botón discreto al final del scroll (`pn-loadmore`) |

---

## Layout

### Desktop popover

```
┌─────────────────────────────────┐
│  ╔═════════╗ ╔═════════╗        │  ← Tabs row (font 14 px)
│  ║ Todas N ║ ║ NoLei. N║        │     (slate inactivo, paper activo)
│  ╚═════════╝ ╚═════════╝        │
├─────────────────────────────────┤
│  ▓▓▓▓▓                          │  ← Sliding indicator 3 px
│  🔔 Notificaciones [N]          │  ← Header bar in-card
│                                 │
│  ─── HOY ─────────────  [3]    │  ← Group eyebrow
│   [Av]  Cliente · Matriz       │
│  [52×]  Compró $250.00         │  ← Avatar 52×52 + badge 22×22
│        Las ventas cayeron…  🗑 │  ← Trash circular 32 arriba-derecha
│        hace 17 días             │
│   …                             │
│  ─── ESTA SEMANA ─── [2]       │
│   …                             │
│                                 │
│  [ Ver notificaciones anteri. ] │  ← Paginación (si hayMas)
├─────────────────────────────────┤
│  ✨ Marcar todas como leídas    │  ← Footer CTA sticky
└─────────────────────────────────┘
   400 px de ancho · alto dinámico (ver "Altura desktop")
```

### Altura desktop

La card desktop tiene **altura fija** calculada en JS al montar el panel (y en cada `resize`):

```ts
const top = rect.bottom + 8;           // rect del botón de campana
const maxHeight = Math.max(460, window.innerHeight - top - 116);
```

- El cálculo deja **116 px de margen** entre el fondo del panel y el borde inferior de la ventana.
- Piso de **460 px** para no chocar con el footer en pantallas chicas.
- Se aplica como CSS variable `--pn-max-height` al wrapper `fixed` y se consume en `.pn-card` (`height: var(--pn-max-height, 620px)`).
- El **`height` es fijo (no `max-height`)** — el panel mantiene el mismo tamaño tenga 0, 1 o 50 notificaciones. El `.pn-scroll` interno absorbe el sobrante.

### Móvil side sheet

- **Ancho `100vw`** (full-width): el panel cubre toda la pantalla.
- **Alto 100 % del viewport**: la cadena flex completa (`.pn-drawer-mobile` → `.pn-shell` → `.pn-card`) usa `flex: 1` + `min-height: 0` para que la card se estire.
- Botón X flotante (top-right, 34×34 px, círculo con backdrop-blur). El scrim azul-blur queda detrás del panel pero no se ve por estar cubierto al 100 %.
- El override CSS `.pn-drawer-mobile .pn-shell { display: flex; flex-direction: column; flex: 1; min-height: 0 }` es **clave**: sin él, `.pn-card flex:1` no hereda altura y `.pn-scroll` no genera overflow → no se podría deslizar.

---

## Tokens

Reusa `PALETAS_DRAWER.personal` de `menuDrawerTokens.ts` (mismos valores que el MenuDrawer):

```ts
paper:      '#F5F7FE'
ink:        '#0E1F5C'
muted:      'rgba(14,31,92,0.55)'
accent:     '#2244C8'
accentSoft: 'rgba(34,68,200,0.10)'
rule:       'rgba(14,31,92,0.08)'
```

### Tokens específicos del panel

| Token | Valor | Uso |
|-------|-------|-----|
| `slate200` | `#E2E8F0` | Tab inactivo bg |
| `slate300` | `#CBD5E1` | Tab inactivo border + hover |
| `slate600` | `#475569` | Tab inactivo text |
| `bodyText` | `rgba(14,31,92,0.74)` | Mensaje de la notificación |
| `ageText` | `rgba(14,31,92,0.62)` | Timestamp |
| `groupText` | `rgba(14,31,92,0.78)` | Eyebrow + count del grupo |
| `groupLine` | `rgba(14,31,92,0.14)` | Línea horizontal del grupo |
| `trashHoverBg` | `rgba(220,53,69,0.12)` | Hover del botón borrar |
| `trashHoverFg` | `#C53D3D` | Hover del botón borrar |
| `ctaGradient` | `linear-gradient(180deg, #19295C, #0E1F4A)` | Footer CTA |

---

## Mapeo de tipos → familias visuales

Decisión de producto: los 15 tipos de notificación se agrupan en 6 familias visuales. Cada familia define el gradient del tile y el badge superpuesto.

```ts
type FamiliaNotificacion = 'compra' | 'entregado' | 'pendiente' | 'resena' | 'alerta' | 'sistema';

const TIPO_A_FAMILIA: Record<TipoNotificacion, FamiliaNotificacion> = {
  puntos_ganados:           'compra',
  voucher_cobrado:          'compra',
  voucher_generado:         'entregado',
  cupon_asignado:           'entregado',
  recompensa_desbloqueada:  'entregado',
  voucher_pendiente:        'pendiente',
  nueva_recompensa:         'pendiente',
  nueva_resena:             'resena',
  stock_bajo:               'alerta',
  cupon_revocado:           'alerta',
  nueva_oferta:             'sistema',
  nuevo_cliente:            'sistema',
  nuevo_marketplace:        'sistema',
  nuevo_servicio:           'sistema',
  sistema:                  'sistema',
};
```

| Familia | Gradient del tile | Badge bg | Badge glifo |
|---------|-------------------|----------|-------------|
| `compra` | `linear-gradient(135deg, #f59e0b, #d97706)` amber | `#F58220` | coin |
| `entregado` | `linear-gradient(135deg, #10b981, #059669)` emerald | `#2D9C5F` | check |
| `pendiente` | `linear-gradient(135deg, #1d4ed8, #3b82f6)` blue | `#F58220` | clock |
| `resena` | `linear-gradient(135deg, #1e3a8a, #2563eb)` navy | `#1F2937` | star |
| `alerta` | `linear-gradient(135deg, #f43f5e, #e11d48)` rose | `#DC3545` | warning |
| `sistema` | `linear-gradient(135deg, #64748b, #475569)` slate | (sin badge) | chart-up |

> El tile solo se ve cuando la notificación **no tiene `actorImagenUrl` ni `actorNombre`**. Si hay foto, se muestra circular; si hay nombre sin foto, iniciales en círculo con color por hash. El badge superpuesto aplica en los 3 casos.

> **Resiliencia ante tipos legacy:** la función `resolverFamilia(tipo)` aplica fallback a `'sistema'` si llega un tipo no contemplado en `TIPO_A_FAMILIA` (notificaciones antiguas o tipos nuevos del backend no sincronizados). Sin este guard, `FAMILIA_CONFIG[undefined]` rompía el componente.

---

## Fila de notificación

### Avatar (`.pn-av-wrap` + `.pn-av`)

- Wrapper `46×46` → **`52×52`** con `position: relative; flex-shrink: 0` (necesario para que el badge `position: absolute` quede correctamente anclado).
- Avatar circular en los tres casos:
  - **Foto** (`actorImagenUrl`): `<img>` con `object-fit: cover`.
  - **Iniciales** (sin foto, con `actorNombre`): círculo con color por hash de los 8 gradients de `COLORES_INICIALES`, glifo Inter 700 / 19 px en blanco.
  - **Tile gradient** (sin foto ni nombre): cuadrado redondeado `border-radius: 16px` con el gradient de la familia + glifo blanco 24 px stroke 1.85.

### Badge superpuesto

- **`22×22 px`** circular, posicionado `right: -2px; bottom: -2px` (sobresale del avatar).
- Glifo interior **13 px stroke 2.4** blanco.
- Doble box-shadow: `0 0 0 2.5px #F5F7FE` (halo paper que separa del avatar) + `0 1px 3px rgba(0,0,0,0.18)` (drop shadow).
- Las familias `sistema` no renderizan badge (su `FAMILIA_CONFIG.badge` es `null`).

### Centrado vertical y altura uniforme

- `.pn-row` tiene `align-items: center` + **`min-height: 92px`**.
- Esto garantiza que **todas las filas se vean del mismo alto** independientemente del contenido. El avatar, bloque de texto y trash quedan centrados verticalmente.
- El **título** se trunca a 1 línea con ellipsis (el `<span>` interior tiene `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0`).
- El **body** mantiene `-webkit-line-clamp: 2` (máximo 2 líneas, ellipsis después).

### Barra lateral azul (`::before` / `::after`)

| Estado | Pseudo | Comportamiento |
|--------|--------|----------------|
| **No leída** | `.pn-row.unread::before` | Visible siempre (indicador persistente) |
| **Leída** | `.pn-row:not(.unread)::after` | Invisible en reposo (`scaleY(0)`), aparece animada al hover (`scaleY(1)`, 240 ms cubic-bezier(.4,0,.2,1)) — mismo efecto que `.dd-rowbar` del MenuDrawer |

Dimensiones idénticas en ambos casos: `left: 4px`, `top/bottom 22%`, `width: 3px`, `background: #2244C8`, `border-radius: 0 2px 2px 0`.

### Botón de eliminar (`.pn-trash`)

| Aspecto | Desktop | Móvil |
|---------|---------|-------|
| Forma | **Círculo perfecto** (`border-radius: 50%`) | Mismo círculo |
| Tamaño | `32×32 px` | `32×32 px` |
| Posición | `align-self: flex-start` — esquina **arriba a la derecha** del row | Misma posición |
| Visibilidad | `opacity: 0` en reposo, `opacity: 1` en `:hover` del row | `opacity: 1` **siempre visible** (override `.pn-drawer-mobile .pn-trash`) — touch no tiene hover real |
| Hover | bg `rgba(220,53,69,0.12)` + color `#C53D3D` | Mismo |
| Ícono | `lucide:trash-2` 18 px | Mismo |

El trash usa `role="button"` (no anidado dentro del `<button>` del row) + handler de `Enter`/`Space` para a11y.

---

## Tipografía y pesos

Solo **Inter**. Sin Instrument Serif. Todos los textos subieron **+1 punto** respecto a la primera implementación (decisión de producto para mejor lectura).

| Rol | Peso | Tamaño | Letter-spacing |
|-----|------|--------|----------------|
| Tab label | 600 | **14 px** | -0.005em |
| Tab count | 700 | **12 px** | 0 |
| Header título | 700 | **17 px** | -0.015em |
| Header count chip | 700 | **14 px** | -0.005em |
| Group label (eyebrow) | 700 | **12 px** | 0.10em, UPPERCASE |
| Group count pill | 700 | **12 px** | 0 |
| Avatar inicial | 700 | **19 px** | -0.02em |
| Persona + sucursal | 600 | **14 px** | -0.005em |
| Título de fila | 600 | **15 px** | -0.005em (truncado a 1 línea con ellipsis) |
| Body de fila | 500 | **14.5 px** | -0.005em (clamp a 2 líneas) |
| Age | 500 | **13.5 px** | -0.005em |
| Empty title | 700 | **18 px** | -0.015em |
| Empty subtitle | 500 | **14.5 px** | -0.005em |
| Loadmore | 600 | **13.5 px** | -0.005em |
| CTA | 700 | **15 px** | -0.005em |

> El tab del panel **iguala el `font-size: 14 px`** del MenuDrawer (Personal / Comercial). Los tres componentes (DrawerDesktop, MenuDrawer móvil y PanelNotificaciones) comparten tamaño y peso de tabs.

---

## Bucketing por antigüedad

```ts
function bucketDeNotificacion(createdAt: string): BucketAntiguedad {
  const ahora = Date.now();
  const fecha = new Date(createdAt).getTime();
  const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);
  if (diffDias <= 1) return 'today';
  if (diffDias <= 7) return 'week';
  if (diffDias <= 30) return 'month';
  return 'old';
}
```

| Bucket | Label | Rango |
|--------|-------|-------|
| `today` | HOY | ≤ 24 h |
| `week` | ESTA SEMANA | 1–7 días |
| `month` | ESTE MES | 8–30 días |
| `old` | ANTERIORES | > 30 días |

Los grupos solo se renderizan si contienen al menos una notificación visible (después de aplicar el filtro `todas` / `no-leidas`).

---

## Motion

Alineado con `MenuDrawer v3`: **sin `opacity: 0 → 1`** en las animaciones de translate.

| Animación | Trigger | Duración | Easing | Propiedades |
|-----------|---------|----------|--------|-------------|
| `pn-pop` | Mount del panel desktop | 320 ms | `cubic-bezier(.2,.7,.35,1)` | `translate(6px,-10px) scale(.96) → translate(0,0) scale(1)` |
| `pn-slide` | Mount del side sheet móvil | 380 ms | `cubic-bezier(.2,.7,.35,1)` | `translateX(100%) → translateX(0)` |
| `pn-scrim` | Mount del scrim móvil | 320 ms | `ease` | `opacity 0 → 1` |
| `pn-fade` | Re-key del scroll al cambiar filtro | 220 ms | `ease` | `translateY(4px → 0)` |
| `pn-row-in` | Mount de cada fila | 320 ms | `cubic-bezier(.4,0,.2,1)` | `translateX(-6px → 0)` |
| Stagger | Entre filas | 40 ms step, 80 ms offset por grupo, 80 ms offset inicial | — | `animation-delay: ${gi * 80 + i * 40 + 80}ms` |
| Indicator slide | Cambio de tab | 340 ms | `cubic-bezier(.4,0,.2,1)` | `transform: translateX` |
| Row hover | Hover de fila | 180 ms | `ease` | `background-color` |
| **Tab change** | Click en tab | **0 ms** (instantáneo) | — | sin transition de color/bg/border |
| Trash reveal (desktop) | Row hover | 180 ms | `ease` | `opacity`, `transform: translateX(4px → 0)` |
| Hover bar `::after` (filas leídas) | Row hover | 240 ms | `cubic-bezier(.4,0,.2,1)` | `transform: scaleY(0 → 1)` |

Todas las animaciones se cortan con `@media (prefers-reduced-motion: reduce)`.

---

## Comportamiento

### Apertura / cierre

| Trigger | Acción |
|---------|--------|
| Click en campana del Navbar / MobileHeader | `togglePanel()` |
| Click fuera del panel (desktop) | Cerrar (ignora el propio botón de campana) |
| Tap en scrim (móvil) | Cerrar |
| Botón X (móvil) | Cerrar |
| `Esc` | Cerrar (ambas variantes) |
| Click en una fila con `referenciaTipo` mapeada | Marca como leída + navega + cierra |
| Click en una fila sin ruta | Solo marca como leída (no expande, no cierra) |

### Marcar todas como leídas

Click en el CTA → `marcarTodasLeidas()` del store + toast global `notificar.exito('Notificaciones marcadas como leídas')`. El botón queda deshabilitado mientras `unreadCount === 0`.

### Paginación

Cuando `hayMas === true`, al final del scroll aparece un botón discreto "Ver notificaciones anteriores" que llama a `cargarMas()`. Las notificaciones nuevas caen automáticamente en sus buckets correspondientes.

### Filtros

| Filtro | Resultado |
|--------|-----------|
| `todas` | Todas las notificaciones cargadas |
| `no-leidas` | Solo `!leida === true` |

El cambio de filtro **re-keya** el contenedor scroll → `pn-fade` reproduce + `pn-row-in` stagger se ejecuta. La posición del scroll se reinicia al top.

### Inyección de CSS

El CSS del panel se inyecta **al cargar el módulo** (no en `useEffect`), igual que `DrawerDesktop`/`MenuDrawer`. Si HMR re-evalúa el módulo, se refresca el `textContent` del `<style>` con el nuevo CSS.

---

## Estado y consumo del store

El panel **no introduce estado de servidor propio** — todo viene de `useNotificacionesStore`. El único estado UI local es `filtro` (Todas / No leídas).

```ts
// Lecturas del store
notificaciones        // Notificacion[]
totalNoLeidas         // number
hayMas                // boolean
cargandoMas           // boolean

// Acciones
marcarLeidaPorId(id)
marcarTodasLeidas()
eliminarPorId(id)
cargarMas()
cerrarPanel()
```

> El listener de Socket.io (`agregarNotificacion`, `eliminarVariasPorIds`) vive en el store y no requiere acción del componente. Las nuevas notificaciones aparecen automáticamente al tope de su bucket sin recargar.

---

## Accesibilidad

- **Desktop**: `role="menu"`, `aria-label="Notificaciones"`.
- **Móvil**: `role="dialog"`, `aria-modal="true"`, `aria-label="Panel de notificaciones"`. Foco inicial al drawer.
- **Tabs**: `role="tablist"` / `role="tab"` + `aria-selected`. Arrow keys mueven foco entre tabs (`onTabKeyDown`).
- **Filas**: `<button role="menuitem">` con `aria-label` que anuncia estado leído / sin leer + persona + título + tiempo. Ejemplo: `"Sin leer. Ana Narvaez. Compró $250.00. hace 17 días."`.
- **Trash**: `role="button"` (no anidado dentro del `<button>` de la fila — el row es un button, y el trash es un span con role) + `aria-label="Eliminar notificación"` + handler de `Enter`/`Space`.
- **Online dot / dot de no leído**: `aria-hidden="true"` (la info está en el `aria-label` de la fila).
- **CTA disabled**: `aria-disabled="true"` + `title="No hay notificaciones sin leer"`.
- **Botón X móvil**: `aria-label="Cerrar panel"`.
- **Header count chip**: `aria-label="${cantidad} sin leer"`.
- Focus rings: `outline: 2px solid #2244C8`, offset `2px` (negativo en filas para que el ring quede dentro).

---

## Testing

`data-testid` con prefijo `panel-notif-`:

| `data-testid` | Elemento |
|---------------|----------|
| `panel-notif` | Contenedor raíz (`pn-shell`) |
| `panel-notif-tab-todas` | Tab Todas |
| `panel-notif-tab-no-leidas` | Tab No leídas |
| `panel-notif-tab-todas-count` | Count chip del tab Todas |
| `panel-notif-tab-no-leidas-count` | Count chip del tab No leídas |
| `panel-notif-header-count` | Count chip del header (solo si > 0) |
| `panel-notif-close` | Botón cerrar en header (si se renderiza) |
| `panel-notif-close-mobile` | Botón X flotante (móvil) |
| `panel-notif-scrim` | Scrim para tap-to-close (móvil) |
| `panel-notif-empty` | Empty state |
| `panel-notif-group-today` | Grupo HOY |
| `panel-notif-group-week` | Grupo ESTA SEMANA |
| `panel-notif-group-month` | Grupo ESTE MES |
| `panel-notif-group-old` | Grupo ANTERIORES |
| `panel-notif-row-{id}` | Fila individual |
| `panel-notif-row-{id}-trash` | Botón trash de la fila |
| `panel-notif-load-more` | Botón "Ver notificaciones anteriores" |
| `panel-notif-cta` | Botón "Marcar todas como leídas" |

---

## Decisiones pendientes / abiertas

1. **Botón filtro icon-only del header** — escondido en esta versión. Pendiente con producto: qué tipos exponer y si abre dropdown o submenu.
2. **Click en notificación sin ruta** — hoy solo marca como leída (no expande inline). La versión anterior expandía el mensaje al hacer click. Confirmar con producto si se quiere mantener el comportamiento.
3. **Notificaciones en tiempo real** — al recibir una nueva con el panel abierto, se prepende al top del bucket correspondiente sin animación específica. Considerar `pn-row-in` con offset 0 para resaltar la entrada.
4. **Agrupación inteligente** — "3 nuevas compras de Ana en el último día" en vez de 3 filas separadas. Sin definir.
5. **Versión móvil del filtro** — el dropdown del header (cuando se implemente) puede no caber en 360 px. Considerar bottom sheet específico para filtros en móvil.
