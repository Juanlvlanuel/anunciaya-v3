# Handoff: Panel de Notificaciones — AnunciaYA

## Overview

Popover de notificaciones que se despliega al hacer click en el ícono de campana del Navbar. Reemplaza el panel actual con un diseño consistente con `MenuDrawer v3.0` — comparte paleta, tokens, tipografía, peso, motion y patrón de pestañas.

**Importante:** Este handoff está alineado con `MenuDrawer.md` (la documentación de la implementación real del menu drawer). Todas las decisiones de tipografía, color, peso, motion y tabs que tomó el equipo durante la implementación del drawer **deben aplicarse igual aquí**.

---

## About the Design Files

Los archivos en `reference/` son **prototipos en HTML/JSX** que demuestran el look y comportamiento. **No son código de producción.**

La tarea es **recrear este diseño en el codebase real (TypeScript + React)** usando los mismos patrones, helpers, tokens y solución de estilado que ya usa `DrawerDesktop.tsx` / `MenuDrawer.tsx`.

Probablemente:
- `apps/web/src/components/layout/PanelNotificaciones.tsx`
- Reusar `apps/web/src/config/menuDrawerTokens.ts` (mismo `PALETAS_DRAWER.personal`).
- Inyectar CSS al cargar el módulo (`inyectarEstilosPanelNotificaciones()`), no en `useEffect`.

---

## Fidelity

**High-fidelity.** Colores, tipografía, pesos, spacing, radii, sombras y motion son finales. Recrear pixel-perfecto.

---

## Layout

- **Anchor:** popover ancla al ícono de campana del Navbar (top-right).
- **Width:** `392px` fijo en desktop.
- **Altura:** `max-height: 620px`, `min-height: 460px`. La lista interna scrollea.
- **Estructura (top → bottom):**
  1. **Tabs row** afuera del card — 2 tabs estilo "pestañas físicas".
  2. **Card** con `border-radius: 18px` y sombra suave.
     - **Sliding indicator** (3px) flush al borde superior.
     - **Header bar** dentro del card: bubble de campana + título + count chip + botón filtro.
     - **Scroll area** con notificaciones agrupadas por antigüedad.
     - **Footer sticky** con la CTA principal.

---

## Componentes

### Tab (filtro Todas / No leídas)

Replica del estilo final de `MenuDrawer v3.0` — fondo claro slate-200.

| Propiedad | Valor |
|---|---|
| Padding | `10px 12px 16px`, `margin-bottom: -10px` |
| Radius | `14px 14px 0 0` |
| Font | Inter **600** / 13px / -0.005em |
| Inactive `background` | `#E2E8F0` slate-200 |
| Inactive `color` | `#475569` slate-600 |
| Inactive `border` | `1px solid #CBD5E1` slate-300, sin border-bottom |
| Inactive `:hover bg` | `#CBD5E1` slate-300 |
| Active `background` | `#F5F7FE` (paper) |
| Active `color` | `#0E1F5C` (ink) |
| Active `border` | transparent |
| Cambio de estado | **Instantáneo** — sin transición |
| Icono | 13px stroke 1.9 — `bell` (Todas) / `sparkle` (No leídas) |

Cada tab incluye un **count chip** al final:

| Estado | Background | Color |
|---|---|---|
| Inactivo | `rgba(14, 31, 92, 0.10)` | `#0E1F5C` |
| Activo | `#2244C8` (accent) | `#FFFFFF` |

Tamaño: `min-width: 20px`, `height: 18px`, `padding: 0 6px`, radius pill, Inter **700** / 11px.

### Sliding indicator

| Propiedad | Valor |
|---|---|
| Position | `absolute`, `top: 0`, `left: 0`, dentro del card |
| Size | `width: 50%`, `height: 3px` |
| Background | `#2244C8` (accent) |
| Transform | `translateX(0)` ↔ `translateX(100%)` |
| Transition | `transform 340ms cubic-bezier(0.4, 0, 0.2, 1)` |
| z-index | `5` |

### Header bar

Dentro del card, `padding: 16px 18px 8px`. Flex row, `gap: 10px`.

| Elemento | Estilo |
|---|---|
| **Bell bubble** | `30 × 30px` circle / bg `rgba(34, 68, 200, 0.10)` / color `#2244C8` / icon `bell` 15px stroke 1.9 |
| **Título "Notificaciones"** | Inter **700** / 16px / -0.015em / `#0E1F5C` |
| **Count chip** (header) | pill, `min-width: 26px`, `height: 26px`, `padding: 0 9px`, bg `#2244C8`, color `#FFFFFF`, Inter **700** / 13px / -0.005em, `box-shadow: 0 2px 6px rgba(34,68,200,0.30)`. **Solo se renderiza si `unreadCount > 0`** |
| **Botón filtro (icon-only)** | `margin-left: auto`, `30 × 30px`, radius 9px, color `muted` → `ink` on hover, bg transparent → `rgba(14, 31, 92, 0.06)` on hover. Icon `filter` 15px stroke 1.85 |

### Group label (eyebrow)

Inter, **sin serif italic** (Instrument Serif eliminado del proyecto).

| Propiedad | Valor |
|---|---|
| Container padding | `12px 22px 6px` |
| Container | flex row, `gap: 10px`, align center |
| Texto | Inter **700** / 11px / `letter-spacing: 0.10em` / UPPERCASE / color `rgba(14, 31, 92, 0.78)` |
| Línea | flex-grow, `height: 1px`, bg `rgba(14, 31, 92, 0.14)` |
| Count pill | Inter **700** / 11px / `padding: 2px 8px` / `border-radius: 999px` / bg `rgba(14, 31, 92, 0.08)` / color `rgba(14, 31, 92, 0.78)` |

Etiquetas: `today` → "HOY", `week` → "ESTA SEMANA", `month` → "ESTE MES", `old` → "ANTERIORES".

### Fila de notificación

Container:

| Propiedad | Valor |
|---|---|
| Padding | `11px 14px 11px 18px` |
| Margin | `2px 0` |
| Border radius | `12px` |
| Display | flex, `gap: 12px` |
| Hover bg | `rgba(34, 68, 200, 0.08)` |
| Transition | `background-color 0.18s ease` — sin animación de padding-left |
| Unread indicator | `::before`: `left: 4px`, `top: 22%`, `bottom: 22%`, `width: 3px`, `border-radius: 0 2px 2px 0`, bg `#2244C8`. Solo cuando `!read` |

#### Wrapper del avatar

**Importante:** el wrapper del avatar debe tener `width: 46px; height: 46px` explícitos. Sin esto, el flex layout estira el wrapper a la altura completa de la fila y el badge `position: absolute` queda flotando lejos del avatar.

```jsx
<div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
  <Avatar />
  <Badge />
</div>
```

#### Avatar (`.np-av`)

`46 × 46px`, `box-shadow: 0 1px 2px rgba(0,0,0,0.08)`.

**Para personas** (notificaciones con `person`):

- `border-radius: 50%` (fully round).
- Background: el color asignado al usuario (`person.color`).
- Inicial: Inter **700** / 16px / `letter-spacing: -0.02em` / color `#FFFFFF`.

**Para sistema** (notificaciones sin `person`):

- `border-radius: 14px` (rounded square, no totalmente redondo).
- Background: **linear-gradient** según tipo.
- Glifo: blanco, 22px stroke 1.85.

Gradientes por tipo:

| Tipo | Gradient | Glifo |
|---|---|---|
| `sales-drop` | `linear-gradient(135deg, #1e3a8a, #2563eb)` | `chart-up` |
| `reward-pending` | `linear-gradient(135deg, #1d4ed8, #3b82f6)` | `gift` |
| `reward-delivered` | `linear-gradient(135deg, #10b981, #059669)` | `check-circle` |
| `low-stock` | `linear-gradient(135deg, #f43f5e, #e11d48)` | `warning` |

> Si en el codebase ya existen gradients de marca usados por las páginas a las que cada notificación lleva, usar esos — mismo principio que en MenuDrawer.

#### Status badge (estilo Facebook, encimado en el avatar)

Pequeño círculo que **se monta sobre la esquina inferior-derecha del avatar**, sobresaliendo ligeramente.

| Propiedad | Valor |
|---|---|
| Position | `absolute`, `right: -3px`, `bottom: -3px` |
| Size | `19 × 19px`, `border-radius: 50%` |
| Glyph | 11px stroke 2.4 blanco |
| Box-shadow | `0 0 0 2.5px #F5F7FE, 0 1px 3px rgba(0,0,0,0.18)` — el anillo paper separa del avatar; el drop shadow le da elevación |
| Display | flex centered |

Por tipo de notificación:

| Tipo | bg | Glyph |
|---|---|---|
| Compra | `#F58220` | `coin` |
| Reseña | `#1F2937` | `star` (filled) |
| Reward pending | `#F58220` | `clock` |
| Reward delivered | `#2D9C5F` | `check` |
| Stock bajo | `#DC3545` | `warning` |

#### Texto

| Línea | Tipo | Estilo |
|---|---|---|
| **Persona + sucursal** (opcional) | "Ana Narvaez · Matriz" | Inter **600** / 13px / -0.005em / color `#2244C8`. El " · sucursal" en `font-weight: 500`, `opacity: 0.85` |
| **Título** | "Compró $250.00" / "Caída de ventas: 100%" | Inter **600** / 14px / -0.005em / color `#0E1F5C`. Soporta inline children: estrellas (reseña), dot azul (no leído al final) |
| **Body** | descripción | Inter **500** / 13.5px / -0.005em / line-height 1.4 / color `rgba(14, 31, 92, 0.74)` |
| **Age** | "4 días" | Inter **500** / 12.5px / -0.005em / color `rgba(14, 31, 92, 0.62)`. Sin cursiva |
| **Unread dot** | inline al final del título | `7 × 7px` circle / bg `#2244C8` |

Estrellas (notificaciones tipo reseña):
- Inline-flex después del título.
- 5 estrellas SVG filled `#F5B53A`, 11px cada una, `gap: 1.5px`, `margin-left: 4px`.

#### Trash on hover

Botón a la derecha de la fila, visible al hover.

| Propiedad | Valor |
|---|---|
| Size | `36 × 36px`, `border-radius: 10px` |
| Icon | `trash` **18px** stroke 1.8 |
| `align-self` | center (centrado verticalmente en la fila) |
| Default | `opacity: 0`, `transform: translateX(4px)`, color `rgba(14, 31, 92, 0.55)` |
| Row hover | `opacity: 1`, `transform: translateX(0)` |
| Self-hover | bg `rgba(220, 53, 69, 0.12)`, color `#C53D3D` |
| Transition | 0.18s ease |

### Empty state

Cuando el filtro activo no tiene resultados.

| Elemento | Estilo |
|---|---|
| Container | flex column, centered, `padding: 60px 24px`, `text-align: center`, color `rgba(14, 31, 92, 0.70)` |
| Icon bubble | `54 × 54px` circle, bg `rgba(34, 68, 200, 0.10)`, color `#2244C8`, glyph `check-circle` 26px stroke 1.5, `margin-bottom: 14px` |
| Title | Inter **700** / 17px / -0.015em / color `#0E1F5C`. Texto: "Sin notificaciones" |
| Subtitle | Inter **500** / 13.5px / -0.005em. Texto: "Te avisamos cuando algo nuevo pase." |

### Footer / CTA

| Propiedad | Valor |
|---|---|
| Container | `padding: 10px 14px 14px`, top border `1px solid rgba(14, 31, 92, 0.08)`, bg paper |
| Botón | full-width, `padding: 12px 16px`, centered, `gap: 8px`, radius 12px |
| Background | `linear-gradient(180deg, #19295C, #0E1F4A)` |
| Color | `#FFFFFF` |
| Font | Inter **700** / 14px / `-0.005em` |
| Icon | `sparkle` 14px (decorativo) |
| Box-shadow | `0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(14, 31, 92, 0.22)` |
| Hover shadow | `0 1px 0 rgba(255,255,255,0.08) inset, 0 6px 16px rgba(14, 31, 92, 0.30)` |
| Active | `transform: scale(0.985)` |
| Disabled | `opacity: 0.45`, sin hover/active. **Se deshabilita cuando `unreadCount === 0`** |
| Texto | "Marcar todas como leídas" |

---

## State Management

```ts
type FiltroNotificaciones = "todas" | "no-leidas";

type TipoNotificacion =
  | "sales-drop"
  | "purchase"
  | "review"
  | "reward-pending"
  | "reward-delivered"
  | "low-stock";

type BucketAntiguedad = "today" | "week" | "month" | "old";

interface Persona {
  initial: string;
  name: string;
  color: string;       // hex asignado al usuario
}

interface Notificacion {
  id: string;
  type: TipoNotificacion;
  title: string;
  body: string;
  age: string;         // "4 días", "27 días"
  read: boolean;
  person?: Persona;
  branch?: string;
  rating?: number;     // solo para `review`
}

interface PanelState {
  filtro: FiltroNotificaciones;
}
```

### Helper para agrupar

```ts
function bucketOf(age: string): BucketAntiguedad {
  const m = age.match(/(\d+)\s*d/);
  if (!m) return "old";
  const d = parseInt(m[1], 10);
  if (d <= 1) return "today";
  if (d <= 7) return "week";
  if (d <= 30) return "month";
  return "old";
}
```

> Si el modelo real maneja `createdAt: Date`, computar el bucket desde la fecha pero seguir renderizando un string corto en `np-age`.

### Acciones

| Acción | Trigger | Efecto |
|---|---|---|
| Cambiar filtro | Click en tab | Set `filtro`. Re-keyear el contenedor scroll para reproducir el `np-fade` |
| Click en fila | Click excepto el trash | Marca como leída + navega a la entidad |
| Borrar notificación | Click en `np-trash` | Quita del store. `stopPropagation` para no navegar |
| Marcar todas como leídas | Click en CTA | Marca todas las visibles como leídas, no las elimina |
| Cerrar panel | Click fuera / Esc / route change | Igual a `DrawerDesktop` |

---

## Tokens (compartidos con MenuDrawer)

**Usar `PALETAS_DRAWER.personal` de `menuDrawerTokens.ts`** — mismos valores:

```ts
{
  paper:      '#F5F7FE',
  ink:        '#0E1F5C',
  muted:      'rgba(14,31,92,0.55)',
  accent:     '#2244C8',
  accentBg:   '#2244C8',
  accentSoft: 'rgba(34,68,200,0.10)',
  rule:       'rgba(14,31,92,0.08)',
}
```

### Tokens específicos del panel

| Token | Valor | Uso |
|---|---|---|
| `slate200` | `#E2E8F0` | Tab inactivo bg |
| `slate300` | `#CBD5E1` | Tab inactivo border + hover |
| `slate600` | `#475569` | Tab inactivo text |
| `unreadDot` | `#2244C8` (= accent) | Dot al final del título |
| `bodyText` | `rgba(14, 31, 92, 0.74)` | Body de la notificación |
| `ageText` | `rgba(14, 31, 92, 0.62)` | Timestamp |
| `groupText` | `rgba(14, 31, 92, 0.78)` | Eyebrow del grupo + count |
| `groupLine` | `rgba(14, 31, 92, 0.14)` | Línea horizontal del grupo |
| `trashHoverBg` | `rgba(220, 53, 69, 0.12)` | Hover del botón borrar |
| `trashHoverFg` | `#C53D3D` | Hover del botón borrar |

### Colores semánticos (badges + status)

| Uso | Hex |
|---|---|
| Compra (coin) | `#F58220` |
| Reseña (star pill) | `#1F2937` |
| Pendiente (clock pill) | `#F58220` |
| Entregado (check pill) | `#2D9C5F` |
| Alerta (warning pill) | `#DC3545` |
| Estrellas de reseña | `#F5B53A` |

---

## Tipografía

**Solo Inter.** Sin Instrument Serif (eliminado del proyecto, no se carga).

| Rol | Peso | Tamaño | Letter-spacing |
|---|---|---|---|
| Tab label | 600 | 13px | -0.005em |
| Tab count | 700 | 11px | 0 |
| Header título | 700 | 16px | -0.015em |
| Header count chip | 700 | 13px | -0.005em |
| Group label (eyebrow) | 700 | 11px | 0.10em, UPPERCASE |
| Group count pill | 700 | 11px | 0 |
| Avatar inicial | 700 | 16px | -0.02em |
| Persona + sucursal | 600 | 13px | -0.005em |
| Título de fila | 600 | 14px | -0.005em |
| Body de fila | 500 | 13.5px | -0.005em |
| Age | 500 | 12.5px | -0.005em |
| Empty title | 700 | 17px | -0.015em |
| Empty subtitle | 500 | 13.5px | -0.005em |
| CTA | 700 | 14px | -0.005em |

---

## Motion

Alineado con `MenuDrawer v3`: **sin opacity en las animaciones de translate** (eliminadas porque producían flash translúcido sobre fondos claros).

| Animación | Trigger | Duración | Easing | Propiedades |
|---|---|---|---|---|
| `np-pop` | Mount del panel | 320ms | `cubic-bezier(0.2, 0.7, 0.35, 1)` | `transform: translate(6px,-10px) scale(0.96) → translate(0,0) scale(1)` |
| `np-fade` | Re-key del scroll al cambiar filtro | 220ms | `ease` | `transform: translateY(4px) → translateY(0)` |
| `np-row-in` | Mount de cada fila | 320ms | `cubic-bezier(0.4, 0, 0.2, 1)` | `transform: translateX(-6px) → translateX(0)` |
| Stagger | Entre filas | 40ms step, 80ms offset entre grupos, 80ms offset inicial | — | `animation-delay: ${group * 80 + i * 40 + 80}ms` |
| Indicator slide | Cambio de tab | 340ms | `cubic-bezier(0.4, 0, 0.2, 1)` | `transform: translateX` |
| Row hover bg | Hover de fila | 180ms | `ease` | `background-color` |
| Tab change | Click en tab | **0ms** (instantáneo) | — | sin transition de color/bg/border |
| Trash reveal | Row hover | 180ms | `ease` | `opacity`, `transform: translateX(4px → 0)` |

`@media (prefers-reduced-motion: reduce)` cortar todas con `animation: none`, `transition: none`.

---

## Comportamiento

### Apertura / cierre

| Trigger | Acción |
|---|---|
| Click en campana del Navbar | Toggle del panel |
| Click fuera del panel | Cerrar (igual a `DrawerDesktop`) |
| `Esc` | Cerrar |
| Click en una fila | Marca como leída + navega + cierra |
| Route change | Cierra automáticamente |

### Inyección de CSS

Seguir el patrón de `MenuDrawer v3`: inyectar el CSS al cargar el módulo, no en `useEffect`. Función `inyectarEstilosPanelNotificaciones()` a nivel de módulo. Si HMR re-evalúa, refrescar `textContent` del `<style>`.

### Scroll

- El `np-scroll` interno es el único elemento scrolleable.
- Scrollbar custom (6px, thumb `rgba(14, 31, 92, 0.18)` redondeado).
- Posición de scroll se resetea al cambiar filtro.

### Tipo `low-stock` con imagen de producto

En las screenshots originales, las notificaciones de stock bajo muestran un thumb del producto. Cuando exista `productImg`, reemplazar el tile gradient por la imagen:

| Propiedad | Valor |
|---|---|
| Size | `46 × 46px`, `border-radius: 50%`, `object-fit: cover` |
| Fallback | Si la imagen no carga, mostrar el tile gradient + glyph `warning` |
| Badge | Sigue siendo el warning rojo abajo-derecha |

---

## Accessibility

- Panel container: `role="menu"`, `aria-label="Notificaciones"`.
- Tabs: `role="tablist"` / `role="tab"` + `aria-selected`. Arrow keys mueven foco entre tabs.
- Filas: `<button role="menuitem">`. Anuncia estado leído/no leído via `aria-label` (e.g., `aria-label="Sin leer. Ana Narvaez compró $250.00 hace 17 días"`).
- Botón trash: `aria-label="Eliminar notificación"`.
- Botón filtro: `aria-label="Filtrar notificaciones"`.
- Unread dot: `aria-hidden` (la info ya está en `aria-label` de la fila).
- CTA: si `disabled`, agregar `aria-disabled="true"` + `title="No hay notificaciones sin leer"`.
- Focus rings: `outline: 2px solid #2244C8`, `outline-offset: 2px` (negativo en filas).
- Toast de éxito al marcar como leídas: usar `notificar()` del sistema global (`notificaciones.tsx`), no inline.

---

## Testing

`data-testid` convención `panel-notif-*`:

| `data-testid` | Elemento |
|---|---|
| `panel-notif` | Container raíz |
| `panel-notif-tab-todas` | Tab Todas |
| `panel-notif-tab-no-leidas` | Tab No leídas |
| `panel-notif-tab-todas-count` | Count chip de Todas |
| `panel-notif-tab-no-leidas-count` | Count chip de No leídas |
| `panel-notif-header-count` | Count chip del header |
| `panel-notif-filter-btn` | Botón filtro icon-only |
| `panel-notif-group-{bucket}` | Group container (today / week / month / old) |
| `panel-notif-row-{id}` | Fila individual |
| `panel-notif-row-{id}-trash` | Trash de cada fila |
| `panel-notif-empty` | Empty state |
| `panel-notif-cta` | CTA Marcar todas como leídas |

---

## Iconografía

Todos los íconos son inline SVG stroke (`currentColor`, `stroke-linecap: round`). Si el codebase tiene un sistema de íconos, usar esos — los glyphs en `reference/Icons.jsx` son placeholders.

Glyphs necesarios:

| Nombre | Uso |
|---|---|
| `bell` | Tab Todas, bell bubble del header |
| `sparkle` | Tab No leídas, CTA |
| `filter` | Botón filtro |
| `chart-up` | Tile sales-drop |
| `gift` | Tile reward-pending |
| `check-circle` | Tile reward-delivered, empty state |
| `warning` | Tile low-stock |
| `coin` | Badge de compra |
| `star` (filled) | Badge de reseña + estrellas |
| `clock` | Badge de pendiente |
| `check` | Badge de entregado |
| `trash` | Botón borrar en hover |

---

## Decisiones pendientes / abiertas

1. **Filtros por tipo** (botón `filter` del header) — qué tipos se exponen y si el panel se queda abierto o abre un submenu.
2. **Click en una notificación** — ¿navega siempre? Definir las rutas para sistema (sales-drop, low-stock).
3. **Versión mobile** — no diseñada. Probable patrón: full-screen sheet desde la derecha como `MenuDrawer`. Confirmar.
4. **Paginación / infinite scroll** — definir threshold si el volumen crece.
5. **Agrupación inteligente** — "3 nuevas compras de Ana" en vez de 3 filas separadas. Definir el criterio con producto.
6. **Notificaciones en tiempo real** — al recibir una nueva mientras el panel está abierto, ¿se prepende con animación?
7. **"Ver notificaciones anteriores"** del diseño actual — eliminado en favor del agrupamiento automático. Si producto lo quiere de vuelta, confirmar.

---

## Files

En `reference/`:

| File | What it is |
|---|---|
| `preview.html` | Prototipo completo — abrir en browser para ver el panel final |
| `NotificationsPanel.jsx` | Componente de referencia (look + motion finales) |
| `Icons.jsx` | Glyphs inline SVG |
| `notif-data.js` | Dataset de prueba |

En `preview.html`, la sección "Panel de Notificaciones · Brand" muestra la implementación final.
