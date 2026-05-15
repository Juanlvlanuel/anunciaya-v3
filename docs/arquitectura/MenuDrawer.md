# MenuDrawer — AnunciaYA v3.0

> Drawer de perfil del usuario en dos variantes responsive que comparten tokens y comportamiento:
>
> - **`DrawerDesktop.tsx`** — popover 332px anclado al avatar del Navbar (vistas laptop / desktop).
> - **`MenuDrawer.tsx`** — side sheet móvil anclado a la derecha con scrim azul-blur.
>
> **Origen del diseño:** `design_handoff_menu_drawer/README.md` (handoff de producto). Este documento describe la implementación final, en particular las **decisiones que se apartan del handoff** — los valores que están aquí son los autoritativos.
>
> **Última actualización:** 2026-05-15.

---

## Archivos

| Ruta | Propósito |
|------|-----------|
| `apps/web/src/components/layout/DrawerDesktop.tsx` | Popover desktop, 332 px |
| `apps/web/src/components/layout/MenuDrawer.tsx` | Side sheet móvil, `min(76vw, 312px)` |
| `apps/web/src/config/menuDrawerTokens.ts` | Paletas compartidas + helper `paletaACssVars` |
| `apps/web/src/components/layout/Navbar.tsx` | Renderiza `DrawerDesktop` cuando se abre el dropdown del avatar |
| `apps/web/src/components/layout/MobileHeader.tsx` | Dispara `abrirMenuDrawer` desde el botón hamburguesa |
| `apps/web/src/components/layout/MainLayout.tsx` | Renderiza `MenuDrawer` cuando `menuDrawerAbierto === true` |

---

## Cambios respecto al handoff

El handoff (`design_handoff_menu_drawer/README.md`) describe un diseño de referencia pensado para un prototipo HTML aislado, sobre fondo azul oscuro. Al portarlo al entorno real (popover sobre fondos claros heterogéneos, identidad cromática del proyecto, sistema de toasts ya existente) hubo varias adaptaciones.

### Paleta — modo Comercial

El handoff diferenciaba modos con paleta naranja/crema para Comercial. **Decisión de producto:** ambos modos comparten identidad azul.

| Token | Handoff | Implementado |
|-------|---------|--------------|
| `paper` | `#FEF6EC` crema | `#F5F7FE` (igual a Personal) |
| `ink` | `#4D2308` marrón | `#0E1F5C` (igual a Personal) |
| `muted` | `rgba(77,35,8,0.55)` | `rgba(14,31,92,0.55)` |
| `accent` | `#F58220` naranja | `#2244C8` |
| `accentBg` | (no existía) | `#2244C8` |
| `rule` | `rgba(77,35,8,0.09)` | `rgba(14,31,92,0.08)` |

> Resultado: ambos modos son visualmente idénticos. El cambio de modo se percibe por la posición del indicador deslizable, los ítems de la lista y el tab activo — no por una recoloreada completa de la card.

### Tabs inactivos

El handoff asume tabs sobre fondo azul oscuro (header del prototipo). En la app real el dropdown vive sobre fondos claros heterogéneos y el scrim del móvil deja pasar contenido detrás.

| Propiedad | Handoff | Implementado |
|-----------|---------|--------------|
| `background` | `rgba(255,255,255,0.08)` | `#E2E8F0` slate-200 sólido |
| `color` | `rgba(255,255,255,0.60)` | `#475569` slate-600 |
| `border` | `1px solid rgba(255,255,255,0.12)` | `1px solid #CBD5E1` slate-300 |
| `:hover bg` | `rgba(255,255,255,0.14)` | `#CBD5E1` slate-300 |

### Tiles de items

El handoff usa colores planos para los tiles 36×36. Se cambiaron a **`linear-gradient` reales extraídos del header de cada página de destino** — el tile es un mini-espejo cromático del header al que el item lleva.

| Item | Handoff (plano) | Implementado (gradient del header real) |
|------|-----------------|------------------------------------------|
| Ubicación | `#2244C8` | `linear-gradient(135deg, #1e3a8a, #2563eb)` |
| CardYA | `#F58220` | `linear-gradient(135deg, #f59e0b, #d97706)` amber |
| Mis Cupones | `#2D9C5F` | `linear-gradient(135deg, #10b981, #059669)` emerald |
| Mis Publicaciones | `#2244C8` | `linear-gradient(135deg, #22d3ee, #0891b2)` cyan |
| Mis Guardados | `#DC3545` | `linear-gradient(135deg, #f43f5e, #e11d48)` rose |
| Mi Perfil | `#475569` | `linear-gradient(135deg, #1d4ed8, #3b82f6)` blue |
| ScanYA | `#1F2937` | `linear-gradient(135deg, #001E70, #034AE3)` navy |
| Business Studio | `#0EA5E9` | `linear-gradient(135deg, #2563eb, #3b82f6)` blue |

Tiles desktop **agregados** — el handoff no incluía tiles en la variante desktop, los ítems iban con ícono coloreado sobre fondo transparente. Se unificó con el móvil.

### Toast (sistema global rediseñado)

El handoff proponía un toast inline dentro del drawer móvil ("Cambiaste a modo X"). La app ya tenía un sistema global de toasts en `apps/web/src/utils/notificaciones.tsx` que se dispara desde múltiples lugares.

**Decisión:** se eliminó el toast inline del drawer móvil y se rediseñó solo el ícono del toast global para coincidir con la estética del handoff. Resto del toast (X, barra de progreso, animación, auto-dismiss 2.5s) sin cambios.

| Propiedad del ícono | Antes | Ahora |
|---------------------|-------|-------|
| Background | `${color}1A` (10 % alpha, halo translúcido) | `${color}` (círculo sólido) |
| Glifo | Coloreado según tipo | **Blanco** |
| Tamaño SVG | 22×22 | 13×13 |

Colores semánticos del círculo:

| Tipo | Hex |
|------|-----|
| `exito` | `#2D9C5F` |
| `error` | `#dc2626` |
| `advertencia` | `#d97706` |
| `info` | `#2563eb` |

### Tipos de letra

| Uso | Handoff | Implementado |
|-----|---------|--------------|
| Body / UI | Inter (400, 500, 600) | Inter (sin cambio) |
| Inicial del avatar | **Instrument Serif 400** | **Inter 700** |

> Se eliminó la carga de `Instrument Serif` del `index.html` — un request menos al cargar.

### Pesos

| Elemento | Handoff | Implementado |
|----------|---------|--------------|
| Tabs Personal/Comercial | 600 | 600 |
| **Nombre** | 600 | **700** |
| **Correo** | 400 (default) | **500** + `letter-spacing: -0.005em` |
| **Label de filas** | 500 | **600** |
| Hint "Activa CardYA" | 400 | 500 |
| **Cerrar Sesión** | 600 | **700** + `letter-spacing: -0.005em` |
| Inicial del avatar | 400 (Instrument Serif) | **700** (Inter Bold) + `letter-spacing: -0.02em` |

### Tamaños — Desktop

| Elemento | Handoff | Implementado |
|----------|---------|--------------|
| Ancho del popover | 332 px | 332 px |
| **Tabs Personal / Comercial** | **13 px** | **14 px** (alineado con `.pn-tab` del PanelNotificaciones) |
| Avatar | 56×56, fuente 30 px | 56×56, fuente **26 px** |
| Nombre | 16 px | 16 px |
| **Correo** | **13 px** | **15 px** |
| Tiles | ❌ no existían | **36×36** agregados |
| Padding de fila | `13px 18px 13px 21px` + hover `pad-left 24` animado | `11px 14px 11px 18px`, margin 2px, radius 12px, **sin pad-left animado** |
| Label de fila | 14.5 px | 14.5 px |
| Cerrar Sesión | 14 px | 14 px |

### Tamaños — Móvil

| Elemento | Handoff | Implementado |
|----------|---------|--------------|
| **Ancho del drawer** | **`min(88vw, 380px)`** | **`min(76vw, 312px)`** |
| Avatar | 64×64, fuente 34 px | 64×64, fuente **30 px** |
| Nombre | 17 px | 17 px |
| **Correo** | **13.5 px** | **15.5 px** |
| Tile | 36×36, glifo 17 px | 36×36, glifo 17 px |
| Label de fila | 15 px | 15 px |
| Cerrar Sesión | 14.5 px | 14.5 px |

### Motion

Se eliminó el `opacity: 0 → 1` de varias animaciones porque producía un flash translúcido sobre fondos claros (no era visible en el prototipo del handoff sobre fondo oscuro). Las animaciones de tipo "fade" se convirtieron en solo `translate`.

| Animación | Handoff | Implementado |
|-----------|---------|--------------|
| `dd-pop` (entrada del shell desktop) | opacity 0→1 + translate + scale | **solo translate + scale** |
| `dd-fade` (cross-fade al cambiar modo) | opacity 0→1 + translateY | **solo translateY** |
| `dd-row-in` / `md4-row-in` (entrada de filas) | opacity 0→1 + translateX | **solo translateX** |
| `md4-fade` (cross-fade móvil) | opacity 0→1 + translateY | **solo translateY** |
| Transición de `.dd-tab` / `.md4-tab` | `background-color 280ms, color 280ms, border-color 280ms` | **eliminada** — el cambio de modo en los tabs es instantáneo |

Se mantienen sin cambios:

- `dd-pop` translate + scale (320 ms).
- `md4-slide` translateX 100% → 0 (380 ms).
- `md4-scrim` opacity 0 → 1 (320 ms) — el scrim sí debe fadear.
- `dd-indicator` / `md4-indicator` transform translateX (340 ms).

Todas las animaciones se cortan con `@media (prefers-reduced-motion: reduce)`.

### Otras adaptaciones

- **Inyección de CSS al cargar el módulo** (no en `useEffect`) — evita FOUC en el primer paint. Las funciones `inyectarEstilosMenuDrawer()` / `inyectarEstilosDrawerDesktop()` se llaman a nivel de módulo. Si HMR re-evalúa el módulo, el `textContent` del `<style>` se refresca con el nuevo CSS.
- **ScanYA bloqueado** (modo comercial sin `participaPuntos`): tile gris `#94A3B8`, imagen `/IconoScanYA.webp` en grayscale + opacity 0.7, glifo de candado superpuesto, hint "Activa CardYA" debajo del label. Comportamiento heredado del menú anterior, no del handoff.
- **Item "Ubicación"** se nombra dinámicamente con `ciudadData?.nombre || 'Tu Ubicación'` y abre `ModalUbicacion` (no navega). El handoff lo mostraba como "Puerto Peñasco" literal.
- **Cambio de modo** reutiliza la lógica del store (`useAuthStore.cambiarModo`): redirección a `/inicio` si la ruta actual es exclusiva del modo viejo, validación `tieneModoComercial`, notificación de éxito/error vía `notificar`. El componente `ToggleModoUsuario` ya no se importa dentro de los drawers — los tabs son el único mecanismo de switch.

---

## Tokens definitivos

### `apps/web/src/config/menuDrawerTokens.ts`

```ts
export const PALETAS_DRAWER: Record<ModoDrawer, PaletaDrawer> = {
  personal: {
    paper:      '#F5F7FE',
    ink:        '#0E1F5C',
    muted:      'rgba(14,31,92,0.55)',
    accent:     '#2244C8',
    accentBg:   '#2244C8',
    accentSoft: 'rgba(34,68,200,0.10)',
    rule:       'rgba(14,31,92,0.08)',
  },
  comercial: {
    // Idéntica a personal por decisión de producto.
    paper:      '#F5F7FE',
    ink:        '#0E1F5C',
    muted:      'rgba(14,31,92,0.55)',
    accent:     '#2244C8',
    accentBg:   '#2244C8',
    accentSoft: 'rgba(34,68,200,0.10)',
    rule:       'rgba(14,31,92,0.08)',
  },
};
```

> `accentBg` se introdujo para soportar un eventual gradient en el avatar / indicador. Hoy es igual al `accent` plano en ambos modos.

---

## Items por modo

### Móvil

| Modo | Items (en orden) |
|------|------------------|
| Personal | Ubicación · CardYA · Mis Cupones · Mis Publicaciones · Mis Guardados · Mi Perfil |
| Comercial | Ubicación · ScanYA (con candado si `!participaPuntos`) · Business Studio · Mis Guardados · Mi Perfil |

### Desktop

| Modo | Items (en orden) |
|------|------------------|
| Personal | Mis Publicaciones · Mis Guardados · Mi Perfil |
| Comercial | Mis Guardados · Mi Perfil |

> La asimetría (móvil lleva más items y la entrada de Ubicación) coincide con la decisión del handoff: el móvil concentra el acceso a sub-apps porque no hay otro menú; el desktop delega Ubicación al header y las sub-apps al Navbar.

---

## Comportamiento

### Cambio de modo

- Click en tab → `cambiarModo(nuevo)` del store.
- Si la ruta actual es exclusiva del modo viejo (`/business-studio`, `/scanya` para comercial; `/cardya`, `/cupones`, `/mis-publicaciones`, `/marketplace` para personal) → redirección a `/inicio` antes de cambiar.
- Si el usuario no tiene `tieneModoComercial`, el tab Comercial queda `disabled` + `aria-disabled` + tooltip "Aún no tienes cuenta comercial".

### Apertura / cierre

| Variante | Trigger | Cierre |
|----------|---------|--------|
| Desktop | Click en el avatar del Navbar | Click fuera (manejado por Navbar), Esc, click en un item (navega y cierra) |
| Móvil | Botón hamburguesa en `MobileHeader` o click en el avatar | Scrim tap, botón X, Esc, click en un item, route change |

### Scroll lock (móvil)

Mientras `MenuDrawer` está montado, se aplica `position: fixed` + `top: -${scrollY}` al `<body>` y se restaura al desmontar (se preserva la posición de scroll).

---

## Accesibilidad

- Drawer móvil: `role="dialog"`, `aria-modal="true"`, `aria-label="Menú de usuario"`, foco inicial al contenedor.
- Drawer desktop: `role="menu"`, `aria-label="Menú de usuario"`.
- Tabs: `role="tablist"` / `role="tab"` + `aria-selected`. Arrow keys mueven foco entre tabs (handler `onTabKeyDown`).
- Items: `<button role="menuitem">`.
- Online dot del avatar: `aria-label="Disponible"`.
- Botón X móvil: `aria-label="Cerrar menú"`.
- Focus rings: `outline: 2px solid var(--accent); outline-offset: 2px` (negativo en filas para que el ring no salga del row).
- Toggle de modo deshabilitado: `aria-disabled` + `title` con la razón.

---

## Testing

`data-testid` aplicados en cada elemento interactivo. Convención `<scope>-<elemento>` o `<scope>-item-<id>`.

### Drawer desktop

| `data-testid` | Elemento |
|---------------|----------|
| `drawer-desktop` | Contenedor raíz |
| `drawer-desktop-tab-personal` | Tab Personal |
| `drawer-desktop-tab-comercial` | Tab Comercial |
| `drawer-desktop-nombre` | Texto del nombre |
| `drawer-desktop-subtitulo` | Texto del correo / sucursal |
| `drawer-desktop-item-pub` | Item Mis Publicaciones |
| `drawer-desktop-item-sav` | Item Mis Guardados |
| `drawer-desktop-item-prf` | Item Mi Perfil |
| `drawer-desktop-logout` | Botón Cerrar Sesión |

### Drawer móvil

| `data-testid` | Elemento |
|---------------|----------|
| `menu-drawer` | Contenedor raíz |
| `menu-drawer-scrim` | Scrim para tap-to-close |
| `menu-drawer-close` | Botón X flotante |
| `menu-drawer-tab-personal` | Tab Personal |
| `menu-drawer-tab-comercial` | Tab Comercial |
| `menu-drawer-nombre` | Texto del nombre |
| `menu-drawer-subtitulo` | Texto del correo / sucursal |
| `menu-drawer-item-{id}` | Cada item de la lista (`loc`, `card`, `cup`, `pub`, `sav`, `prf`, `scn`, `biz`) |
| `menu-drawer-logout` | Botón Cerrar Sesión |

---

## Decisiones pendientes / abiertas

1. **Tab Comercial sin cuenta comercial** — hoy queda deshabilitado con tooltip. El handoff sugería un onboarding flow. Sin definir.
2. **Ítem "Ubicación"** — hoy abre `ModalUbicacion`. Si producto define que es solo un label o un selector inline, ajustar el handler.
3. **Asimetría desktop / móvil** — Mis Publicaciones aparece en desktop personal pero no en desktop comercial; en móvil cambian los ítems intermedios (sub-apps). Confirmar si es intencional vs bug.
