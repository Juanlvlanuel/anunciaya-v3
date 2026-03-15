# Reporte de Sprint — Business Studio
**Período:** 12–15 Marzo 2026
**Módulo:** Business Studio (BS)
**Estado general:** 8/15 módulos completados ✅

---

## Resumen Ejecutivo

Sprint de estandarización y mejoras UX a través de 8 módulos de Business Studio. Se establecieron y validaron los principales sistemas de tokens de diseño de la app (15+ reglas), se rediseñaron módulos completos, y se resolvieron bugs de UX críticos en móvil. Punto de partida del sprint: solo Dashboard con diseño base. Punto final: 8 módulos con sistema de tokens unificado y 17 reglas de componentes documentadas.

---

## Módulos Trabajados

### 1. Dashboard
**Archivos:** `PaginaDashboard.tsx`, `HeaderDashboard.tsx`, `GraficaColapsable.tsx`, `PanelInteracciones.tsx`

**Cambios:**
- Auditoría completa de las primeras 7 reglas de tokens en 12+ archivos
- Header estandarizado: H1 `text-2xl lg:text-2xl 2xl:text-3xl font-extrabold`, subtítulo `text-base lg:text-sm`
- KPI cards: icono + label + valor con escala responsive `text-xl lg:text-lg 2xl:text-xl font-bold`
- Selector de período activo: dark gradient `linear-gradient(135deg, #1e293b, #334155)` (validado como patrón global)
- GraficaColapsable: auto-scroll al expandir en móvil (delay 400ms, cálculo de viewport - nav)
- Corrección bug móvil: flash de vista desktop en primer render → `useState(() => window.innerWidth < 1024)` como lazy initializer
- Corrección bug scroll reset: `useLayoutEffect` en RootLayout → `document.querySelectorAll('main').forEach(el => el.scrollTo(0, 0))`
- Corrección bug mobile: 3 bugs de layout en resolución pequeña

**Reglas validadas:** R1–R7 (todas las reglas base)

---

### 2. Transacciones
**Archivos:** `PaginaTransacciones.tsx`, `ModalDetalleTransaccionBS.tsx`, `ModalDetalleCanjeBS.tsx`

**Cambios:**
- Rediseño completo de tabla desktop con header dark gradient
- Cards horizontales en móvil (`FilaMovil` pattern)
- Filtros: chips de estado + dropdown de período + dropdown de operador
- Modal de detalle con header gradiente azul (`#1e40af`) — primer modal de detalle validado
- Logo ChatYA unificado a `/ChatYA.webp` (eliminado `/IconoRojoChatYA.webp`)
- Dropdown alineación responsiva: `left-0 lg:left-auto lg:right-0`
- Nuevo: `flex-1 min-w-0 lg:flex-none lg:shrink-0` para dropdowns de contenido variable en fila flex

**Reglas validadas:** R8–R14, TC-2, TC-3, TC-4, TC-5, TC-6, TC-7, TC-8

---

### 3. Clientes
**Archivos:** `PaginaClientes.tsx`, `ModalDetalleCliente.tsx`

**Cambios:**
- Tabla desktop + cards móvil con el mismo patrón unificado de Transacciones
- Modal de detalle: barra de progreso de puntos (`h-2.5` con badges laterales)
- Estadísticas del modal: refactorizado de 4 cards apiladas a grid compacto `grid-cols-2`
- Descarga de reporte CSV (`PaginaClientes`)
- ModalDetalleCliente: eliminado hack `max-lg:[background:...]` (no funcionaba) → reemplazado por `headerOscuro` prop

**Reglas validadas:** TC-8, TC-12, TC-13

---

### 4. Opiniones
**Archivos:** `PaginaOpiniones.tsx`, `ModalResponder.tsx`

**Cambios:**
- Auditoría completa contra 15 reglas de tokens
- Filtros de estado alineados al patrón de chips (dark gradient activo, slate inactivo)
- Modal de respuesta estandarizado

**Reglas validadas:** R1–R10, TC-2–TC-8

---

### 5. Catálogo
**Archivos:** `PaginaCatalogo.tsx`, `ModalArticulo.tsx`, `ModalDuplicar.tsx`

**Cambios:**
- Rediseño completo de tabla desktop con grid dinámico `grid-cols-[minmax(0,1fr)_90px_...]`
- Chips de orden en móvil con dark gradient activo
- ModalArticulo: formulario completo con inputs estandarizados (TC-14)
- Soporte para imagen de artículo con Cloudinary

**Reglas validadas:** TC-9 (dark gradient), TC-10 (tabla), TC-11 (inline actions), TC-12, TC-13

---

### 6. Ofertas
**Archivos:** `PaginaOfertas.tsx`

**Cambios:**
- Mismo patrón tabla/cards que Catálogo
- Dropdown de tipo con 6+ opciones (porcentaje, monto, 2x1, etc.)
- Dropdown de estado con 6 opciones

**Reglas validadas:** mismos que Catálogo

---

### 7. Mi Perfil — Tab Imágenes
**Archivos:** `TabImagenes.tsx`

**Cambios:**
- Menú de cámara en móvil: reemplazado bottom sheet inline (sin animaciones) → `ModalBottom` componente
- Opciones: "Galería de fotos" (selector de archivos) y "Tomar foto" (`capture="environment"`)
- Fondo del modal: `linear-gradient(135deg, #000000, #0f172a)` con `headerOscuro`
- Botones de acción en laptop: icon-only (`lg:w-8 lg:px-0`) con texto oculto (`lg:hidden 2xl:inline`)
- Tooltips: solo visibles en laptop (`className="2xl:hidden"`)
- Labels en desktop simplificados: "Cambiar" / "Subir" (antes texto descriptivo largo)
- Iconos delete de galería calibrados: `p-1.5 lg:p-1.5 2xl:p-2` con icono `w-3.5 lg:w-3.5 2xl:w-4`
- Título "Foto de Perfil" con `whitespace-nowrap` (evita wrap en laptop)
- Eliminado subtítulo "(ChatYA / Avatar)" innecesario
- Layout PC reorganizado en 2 columnas

**Reglas validadas:** TC-15, TC-16, TC-17

---

### 8. Componentes UI — ModalBottom
**Archivos:** `ModalBottom.tsx`, `ModalAdaptativo.tsx`, `Tooltip.tsx`

**Cambios estructurales:**

**ModalBottom:**
- Drag handle movido a `position: absolute` — permite que el header coloreado del contenido se extienda visualmente a través de la zona del drag handle sin ningún hack CSS
- Props nuevas: `fondo` (CSS background del modal completo), `headerOscuro` (adapta pill/borde/botón X para fondos oscuros), `colorHandle` (color directo para la pill)
- `overflow-hidden` en el container para clip correcto con handle absoluto
- Compensación de padding en built-in header: `pt-11 lg:pt-8 2xl:pt-11`

**ModalAdaptativo:**
- Forwarding de props `fondo`, `headerOscuro`, `colorHandle` a ModalBottom (no a Modal desktop)

**Tooltip:**
- Nueva prop `className` que se aplica al div del portal — permite `className="2xl:hidden"` para visibilidad solo en laptop

---

## Reglas de Tokens Establecidas en Este Sprint

### TOKENS_GLOBALES.md (10 reglas)

| # | Regla | Estado |
|---|-------|--------|
| R1 | Tamaños mínimos de texto (móvil/laptop/desktop) | ✅ |
| R2 | Tonos — nada pálido (bordes, fondos, texto) | ✅ |
| R3 | Pesos tipográficos — mínimo `font-medium` | ✅ |
| R4 | Breakpoints — solo `base`, `lg:`, `2xl:` | ✅ |
| R5 | Tamaños mínimos de iconos | ✅ |
| R6 | Grosor de contornos — `border-2` en interactivos | ✅ |
| R7 | Sombras — `shadow-md` en cards, sin hover-shadow | ✅ |
| R8 | Colores semánticos (emerald/red/amber/indigo/slate/blue) | ✅ |
| R9 | Tipografía de encabezado y KPIs | ✅ |
| R10 | Transiciones — hovers instantáneos, excepto sombra | ✅ |

### TOKENS_COMPONENTES.md (17 patrones)

| # | Componente | Estado |
|---|-----------|--------|
| TC-1 | Botones icon-only (header) | ✅ |
| TC-2 | Altura de elementos interactivos `h-11 lg:h-10 2xl:h-11` | ✅ |
| TC-3 | Padding de contenedores de filtros | ✅ |
| TC-4 | Tipografía de botones interactivos | ✅ |
| TC-5 | Anatomía de dropdowns (indigo, chevron, cierre, auto-scroll) | ✅ |
| TC-6 | Input de búsqueda | ✅ |
| TC-7 | Padding horizontal de botones | ✅ |
| TC-8 | Modales de detalle (actualizado: `headerOscuro` reemplaza hack CSS) | ✅ |
| TC-9 | Dark gradient de marca | ✅ |
| TC-10 | Patrón tabla desktop | ✅ |
| TC-11 | Botones de acción inline en filas de tabla | ✅ |
| TC-12 | Cards horizontales en móvil (FilaMovil) | ✅ |
| TC-13 | Chips de orden en móvil | ✅ |
| TC-14 | Inputs de formulario | ✅ |
| TC-15 | ModalBottom fondo personalizable y drag handle automático | ✅ |
| TC-16 | Botones responsivos icon-only en laptop + Tooltip | ✅ |
| TC-17 | `whitespace-nowrap` en títulos de celdas comprimidas | ✅ |

---

## Decisiones de Arquitectura / Patrones Técnicos

| Decisión | Contexto |
|----------|----------|
| `useState(() => window.innerWidth < 1024)` como lazy initializer | Evita flash de vista desktop en primer render al detectar dispositivo |
| `useLayoutEffect` para scroll reset en navegación | Evita flash visual vs `useEffect` |
| `history.pushState` + `popstate` en ModalBottom | Soporte para botón "atrás" de Android |
| `capture="environment"` en `<input type="file">` | Abre cámara directamente en móvil (sin galería) |
| Drag handle `position: absolute` | Header coloreado se extiende bajo el drag handle sin hack CSS |
| `createPortal` en Tooltip | Evita recortes por `overflow:hidden` en contenedores padre |
| Pre-popular modal desde datos de tabla | Apertura instantánea, enriquecer silenciosamente con API |
| Interceptor Axios agrega `?sucursalId=` automáticamente | Frontend no pasa sucursalId manualmente |

---

## Bugs Corregidos

| Bug | Solución |
|-----|----------|
| Flash de vista desktop en móvil al montar | Lazy initializer en useState |
| Scroll no se resetea al navegar entre páginas | `useLayoutEffect` con `querySelectorAll('main')` |
| ModalBottom no cierra con botón atrás Android | `history.pushState` + listener `popstate` |
| Modal de detalle con drag handle encima del header coloreado | Drag handle `position: absolute`, content desde y=0 |
| `max-lg:[background:...]` en ModalAdaptativo no funcionaba | `ModalAdaptativo` no pasa `className` a `ModalBottom`; usar `fondo`/`headerOscuro` props |
| Texto de título "Foto de Perfil" se partía en 2 líneas | `whitespace-nowrap` |
| Botones de imagen solapados en laptop | Layout 2 columnas + icon-only en `lg:` |

---

## Archivos Modificados (Total)

**Componentes UI compartidos:**
- `apps/web/src/components/ui/ModalBottom.tsx`
- `apps/web/src/components/ui/ModalAdaptativo.tsx`
- `apps/web/src/components/ui/Tooltip.tsx`

**Business Studio — Módulos:**
- `apps/web/src/pages/private/business-studio/dashboard/PaginaDashboard.tsx`
- `apps/web/src/pages/private/business-studio/dashboard/componentes/HeaderDashboard.tsx`
- `apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaColapsable.tsx`
- `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelInteracciones.tsx`
- `apps/web/src/pages/private/business-studio/transacciones/PaginaTransacciones.tsx`
- `apps/web/src/pages/private/business-studio/clientes/PaginaClientes.tsx`
- `apps/web/src/pages/private/business-studio/clientes/ModalDetalleCliente.tsx`
- `apps/web/src/pages/private/business-studio/opiniones/PaginaOpiniones.tsx`
- `apps/web/src/pages/private/business-studio/catalogo/PaginaCatalogo.tsx`
- `apps/web/src/pages/private/business-studio/catalogo/ModalArticulo.tsx`
- `apps/web/src/pages/private/business-studio/ofertas/PaginaOfertas.tsx`
- `apps/web/src/pages/private/business-studio/perfil/components/TabImagenes.tsx`

**Layout:**
- `apps/web/src/components/layout/DrawerBusinessStudio.tsx`
- `apps/web/src/components/layout/MenuBusinessStudio.tsx`

**Documentación:**
- `docs/estandares/TOKENS_GLOBALES.md` (10 reglas documentadas)
- `docs/estandares/TOKENS_COMPONENTES.md` (17 patrones documentados)

---

## Estado al Cierre del Sprint

**BS Módulos Completados (8/15):**
Dashboard ✅, Mi Perfil ✅, Catálogo ✅, Ofertas ✅, Puntos ✅, Transacciones ✅, Clientes ✅, Opiniones ✅

**BS Módulos Pendientes (7/15):**
Alertas, Cupones, Empleados, Reportes, Sucursales, Rifas (bloqueado), Vacantes (bloqueado)

**Siguiente Sprint:**
BS Alertas + Cupones

---

*Generado: 2026-03-15*
