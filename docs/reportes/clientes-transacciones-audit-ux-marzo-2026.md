# Reporte: Auditoría Tokens + UX — Módulos Clientes y Transacciones (Business Studio)

> **Fecha:** 13 Marzo 2026
> **Scope:** Módulos Clientes y Transacciones completos (páginas + modales) + header móvil + layout global + stores
> **Referencia:** `docs/estandares/SISTEMA_TOKENS_DISENO.md`
> **Sesiones:** 3 (con 1 compactación de contexto)

---

## Resumen Ejecutivo

Sesión extensa de trabajo en múltiples fases sobre Business Studio. Comenzó con una auditoría de tokens de diseño en el módulo Clientes, continuó con correcciones de bugs de navegación y UX, y culminó con un rediseño completo de los modales de detalle (cliente y transacción) incluyendo unificación visual y documentación como **Regla 15** del Sistema de Tokens.

**Archivos modificados:** 11 archivos | **Ediciones totales:** ~200+

---

## Fase 1 — Header Móvil de Business Studio

**Archivo:** `MobileHeader.tsx`

- Ocultado nombre del negocio en vista móvil
- Aplicados tokens de diseño: `border-gray-200` → `border-slate-300`, `hover:bg-gray-100` → `hover:bg-slate-200`, `text-gray-*` → `text-slate-*`
- Nombre del módulo activo aumentado de `text-sm` a `text-base`

---

## Fase 2 — Auditoría de Tokens: Módulo Clientes (Primera Pasada)

**Archivos:** `PaginaClientes.tsx` (64 ediciones), `ModalDetalleCliente.tsx` (74 ediciones)

### PaginaClientes.tsx — 24 correcciones

| Regla | Violación | Corrección |
|-------|-----------|------------|
| R2 | `bg-*-50` en chips, badges, avatares | → `bg-*-100` |
| R2 | `text-slate-400/500` en subtítulos, iconos | → `text-slate-600` |
| R2 | `hover:bg-blue-50`, `hover:bg-slate-50` | → `hover:bg-blue-100`, `hover:bg-slate-200` |
| R2 | `border-slate-200` | → `border-slate-300` |
| R1 | `text-[10px]`, `text-[9px]`, `text-[12px]` | → Mínimos según token |
| R3 | Textos sin peso explícito | → `font-medium` añadido |

---

## Fase 3 — Auditoría de Tokens (Segunda Pasada)

**Archivos:** `PaginaClientes.tsx`, `ModalDetalleCliente.tsx`

Violaciones escapadas en primera pasada:

| Regla | Violación | Corrección |
|-------|-----------|------------|
| R6 | Badges de nivel con `border-2` | Eliminado (solo `bg-*-100 text-*-700`) |
| R6 | `text-yellow-600` en badges | → `text-yellow-700` |
| R9 | Chips sin altura fija (`py-2 lg:py-1.5`) | → `h-10 lg:h-9 2xl:h-10` |
| R10 | Padding filtros `p-4` | → `p-2.5` en móvil |
| R1 | `2xl:text-[13px]` en headers tabla | → `2xl:text-sm` |
| R2 | `bg-slate-100` en badge plata | → `bg-slate-200` |

---

## Fase 4 — Ajustes de Layout en Tablas y Filtros

**Archivos:** `PaginaClientes.tsx`, `PaginaTransacciones.tsx`

- Chips de nivel en móvil: implementado `grid grid-cols-2` para que los 4 botones ocupen el mismo ancho que el buscador
- Igualado espaciado entre header y KPIs entre Transacciones y Dashboard
- Igualados tamaños de letra y espaciado del subtítulo
- Probados y revertidos cambios en líneas divisorias de filas en tablas PC

---

## Fase 5 — Bugs de Navegación Móvil

**Archivos:** `PaginaClientes.tsx`, `PaginaTransacciones.tsx`, `RootLayout.tsx`

### Bug 1: Flash del header negro de tablas en móvil

**Causa:** `useIsMobile` usaba `useState(false)`, mostrando tabla desktop momentáneamente en primer render.

**Solución:** `useState(() => window.innerWidth < 1024)` como lazy initializer.

### Bug 2: Scroll no se restaura al cambiar de página

**Causa:** El scroll vive en `<main>` con `overflow-y-auto`, no en `window`.

**Solución:** `useLayoutEffect` en `RootLayout` ejecutando `document.querySelectorAll('main').forEach(el => el.scrollTo(0, 0))` al cambiar `pathname`. Se usó `useLayoutEffect` (no `useEffect`) para evitar flash visual.

Ambas lecciones documentadas en `CLAUDE.md` > "Lecciones Técnicas Importantes".

---

## Fase 6 — Auto-scroll en Modal de Transacciones

**Archivo:** `ModalDetalleTransaccionBS.tsx`

- Al expandir la sección "Revocar transacción", se implementó auto-scroll hacia el textarea/botones
- Ajustada velocidad del scroll (más rápido, `setTimeout` de 100ms)
- Cambiado color del botón "Cancelar"

---

## Fase 7 — Fix de ChatYA desde Modales (Back Button)

**Archivos:** `ModalDetalleTransaccionBS.tsx`, `ModalDetalleCanjeBS.tsx`, `ModalDetalleCliente.tsx`

**Problema:** Al abrir ChatYA desde un modal, `ModalBottom` dejaba una entrada huérfana `{ _modalBottom: id }` en `history.state`. ChatOverlay detectaba esa entrada y se negaba a cerrarse con el botón de retroceso.

**Solución:** Antes de abrir ChatYA desde cualquier modal, limpiar la bandera `_modalBottom` del `history.state` usando `replaceState` (sincrónico):

```tsx
if (history.state?._modalBottom) {
  const estado = { ...history.state };
  delete estado._modalBottom;
  history.replaceState(estado, '');
}
```

---

## Fase 8 — Optimización de Carga del Modal Detalle Cliente

**Archivos:** `useClientesStore.ts` (7 ediciones), `ModalDetalleCliente.tsx`

**Problema:** Cada apertura del modal mostraba spinner mientras se hacía API fetch, incluso para el mismo cliente.

**Solución en 2 partes:**
1. **Mismo cliente:** Datos instantáneos, refresco silencioso en background (sin spinner)
2. **Cliente diferente:** Pre-popular `clienteDetalle` con datos de la tabla (nombre, teléfono, avatar, puntos, nivel) para apertura instantánea; enriquecer cuando responda el API

---

## Fase 9 — Rediseño de Stats y Puntos en Modal Cliente

**Archivo:** `ModalDetalleCliente.tsx`

### Estadísticas
| Antes | Después |
|-------|---------|
| `CardEstadistica` con `shadow-md`, `rounded-xl`, `p-3` | `CeldaEstadistica` compacta: icono `w-7 h-7` + texto al lado |
| 4 cards apiladas verticalmente | Grid `grid-cols-2` con `gap-y-3 gap-x-4` |
| Iconos grandes `w-10 h-10` | Iconos `w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7` |

### Puntos
| Antes | Después |
|-------|---------|
| 3 cards con bordes gruesos | `grid grid-cols-3 text-center` con `border-x` |
| Empalme de texto en móvil | Layout estable en todas las resoluciones |

### Barra de progreso
- Reducida de `h-2` a `h-1.5`, luego aumentada a `h-2.5` (más visible)
- Porcentaje con `toFixed(0)` (sin decimales)

---

## Fase 10 — Header sin bordes blancos (móvil)

**Archivo:** `ModalDetalleCliente.tsx`

**Problema:** En móvil, el header gradiente tenía bordes blancos a los lados y arriba. El drag handle del `ModalBottom` quedaba con fondo blanco.

**Investigación:** Se leyó `ModalBottom.tsx`:
- Modal tiene `bg-slate-50 rounded-t-3xl`
- Drag handle tiene `py-3` con barra gris
- `sinScrollInterno` elimina `p-4` del contenido pero no afecta el handle

**Solución:** CSS gradient en el className del `ModalAdaptativo` con `max-lg:`:
```
max-lg:[background:linear-gradient(180deg,#1e40af_2.5rem,rgb(248,250,252)_2.5rem)]
```

**Aislamiento desktop:**
- `sinScrollInterno` solo pasa a `ModalBottom`, no a `Modal`
- `max-lg:` asegura que el gradiente solo aplica bajo 1024px
- `lg:rounded-t-2xl` en el header para bordes redondeados en desktop

---

## Fase 11 — Reorganización de elementos del header

**Archivo:** `ModalDetalleCliente.tsx`

| Elemento | Antes | Después |
|----------|-------|---------|
| BadgeNivel | Header línea 1 (derecha) | Barra de progreso (badge izquierdo + badge siguiente derecho) |
| Logo ChatYA | Header línea 2 (derecha) | Header línea 1 (derecha) |
| Avatar | `w-11 h-11` en header | Eliminado (redundante con icono User) |
| "Desde" | Una línea: `Desde 12 mar 2025` | Dos líneas: `Miembro Desde` / `12 mar 2025` |

---

## Fase 12 — Unificación de estilos del header

**Archivos:** `ModalDetalleCliente.tsx`, `ModalDetalleTransaccionBS.tsx`

### Reglas aplicadas a ambos modales

| Propiedad | Antes | Después |
|-----------|-------|---------|
| Tamaños texto | 3 distintos (`text-xl`, `text-base`, `text-sm`) | 2: título `text-xl`, resto `text-sm` |
| Iconos | `w-4 h-4 text-white/70` | `w-5 h-5 text-white` (sin opacidad) |
| Texto secundario | `text-white/80` | `text-white` al 100% |
| Peso correo | Sin `font-medium` | `font-medium` (uniforme) |
| Logo ChatYA | `h-8 lg:h-7 2xl:h-8` | `h-10 lg:h-8 2xl:h-10` |
| Asset ChatYA | `/IconoRojoChatYA.webp` (en cliente) | `/ChatYA.webp` (unificado) |
| Espaciado líneas | `space-y-1.5` | `-space-y-0.5` a `space-y-1` según modal |

### Modal Transacciones — Reordenamiento del header

| Línea | Antes | Después |
|-------|-------|---------|
| 1 | Monto + Badge estado | Nombre cliente + ChatYA |
| 2 | Nombre cliente | Monto |
| 3 | Fecha + ChatYA | Fecha |

### Badge de estado movido al contenido

Badge (Confirmada/Pendiente/Revocada) movido del header a la fila de puntos otorgados, con estilo unificado a badges de método de pago: `px-2.5 py-1 rounded-lg font-semibold`.

---

## Fase 13 — Documentación: Regla 15

**Archivo:** `docs/estandares/SISTEMA_TOKENS_DISENO.md`

Se creó la **Regla 15: Modales de Detalle (Bottom Sheet + Desktop)** cubriendo:

- Estructura general (`sinScrollInterno`, truco del gradiente `max-lg:`)
- Header de 3 líneas con 2 tamaños de texto
- Logo ChatYA (`h-10`, siempre `/ChatYA.webp`)
- Badges en contenido, no en header
- Barra de progreso con badges laterales
- Badges informativos con colores semánticos
- Anatomía del contenido scrolleable
- Texto en dos líneas alineado a la derecha

Checklist renumerada a sección 16; "Modales" marcado como completado.

---

## Todos los archivos modificados

| Ediciones | Archivo |
|-----------|---------|
| ~74 | `apps/web/src/pages/private/business-studio/clientes/ModalDetalleCliente.tsx` |
| ~64 | `apps/web/src/pages/private/business-studio/clientes/PaginaClientes.tsx` |
| ~23 | `apps/web/src/pages/private/business-studio/transacciones/ModalDetalleTransaccionBS.tsx` |
| ~14 | `apps/web/src/pages/private/business-studio/transacciones/PaginaTransacciones.tsx` |
| ~10 | `apps/web/src/router/RootLayout.tsx` |
| ~7 | `apps/web/src/stores/useClientesStore.ts` |
| ~5 | `apps/web/src/components/layout/MobileHeader.tsx` |
| 2 | `CLAUDE.md` |
| 2 | `docs/estandares/SISTEMA_TOKENS_DISENO.md` |
| 1 | `apps/web/src/pages/private/business-studio/transacciones/ModalDetalleCanjeBS.tsx` |
| 1 | `docs/reportes/modales-detalle-ux-unificacion-marzo-2026.md` |

---

## Lecciones aprendidas

1. **`useState(() => window.innerWidth < 1024)` como lazy initializer** — evita flash de vista desktop en primer render móvil
2. **`useLayoutEffect` para scroll reset** — `useEffect` causa flash visual; el scroll vive en `<main>`, no en `window`
3. **`max-lg:` es clave para cambios solo-móvil** — permite CSS arbitrario sin afectar desktop
4. **El drag handle de ModalBottom no es personalizable por props** — el truco del gradiente CSS en el contenedor padre es la solución más limpia
5. **`sinScrollInterno` solo afecta ModalBottom** — por diseño de `ModalAdaptativo`, no toca `Modal` desktop
6. **`history.replaceState` para limpiar entradas huérfanas** — `ModalBottom` deja `_modalBottom` en `history.state` que bloquea ChatOverlay
7. **Pre-popular datos desde la tabla** — apertura instantánea del modal sin spinner
8. **Spacing negativo (`-space-y-0.5`) compensa alturas desiguales** — cuando un logo agrega altura visual extra
9. **2 tamaños de texto máximo en headers** — más de 2 crea ruido visual
10. **Badges informativos van en contenido, no en header** — el header se reserva para identificación y acciones
