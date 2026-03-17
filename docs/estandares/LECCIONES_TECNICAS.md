# Lecciones Técnicas — AnunciaYA

> Descubrimientos, bugs resueltos y decisiones técnicas aprendidas durante el desarrollo. Consultar antes de trabajar en áreas que ya tuvieron problemas.

---

## Validación y Tipos

- **Zod runtime vs TypeScript compile-time** — Son independientes. Campos faltantes en schema Zod se eliminan silenciosamente sin error de TypeScript.

## Layout y CSS

- **Leaflet stacking context** — Leaflet crea su propio stacking context. Requiere `z-[1000]` para overlays sobre mapas.
- **`translate-y` vs `margin-top`** — `translate-y` mueve elementos visualmente sin afectar box model. `margin-top` infla el contenedor padre.
- **`box-shadow: inset` en scroll containers** — NO se fija al viewport del scroll container, se mueve con el contenido. Para overlays fijos en carousels usar un wrapper con divs posicionados absolute.
- **Stacking context en drawers** — Drawers con `position: fixed` dentro de un padre con `z-index` + `position` quedan atrapados en su stacking context. Solución: `createPortal(jsx, document.body)` — ver TC-18.

## React y Renderizado

- **Flash de vista desktop en móvil** — `useState(false)` para detección móvil causa flash de vista desktop en primer render. Usar `useState(() => window.innerWidth < 1024)` como lazy initializer.
- **Scroll reset al navegar** — `MainLayout` usa `<main>` con `overflow-y-auto` (no `window`). El scroll se resetea con `useLayoutEffect` en `RootLayout` usando `document.querySelectorAll('main').forEach(el => el.scrollTo(0, 0))`. Usar `useLayoutEffect` (no `useEffect`) para evitar flash visual.
- **`RefreshCw` spinner atascado** — El SVG de `RefreshCw` de lucide-react tiene gaps que causan "atasco" visual durante `animate-spin`. Usar `Loader2` para estados de carga con spin continuo.

## Modales y Componentes

- **`ModalAdaptativo` obligatorio** — Renderiza `ModalBottom` (bottom sheet) en móvil y `Modal` (centrado) en desktop. Siempre usar `ModalAdaptativo` para modales de detalle — nunca `Modal` o `ModalBottom` directamente.
- **Elementos fijos en parte inferior** — Usar `bottom-4` o `pb-safe` (safe area configurada globalmente para notch/barra de navegación móvil).

## Gestos y Touch

- **Swipe horizontal vs carousels** — Al detectar swipe para navegación, excluir elementos con `overflow-x: auto/scroll` recorriendo el DOM hacia arriba desde el `touchstart` target. Ver TC-22.

## Reglas de Negocio

- **Negocios solo físicos** — Eliminado tipo "Online". Todos requieren ubicación. `tiene_servicio_domicilio` y `tiene_envio_domicilio` en sucursales.
- **Login obligatorio** — Sin login solo accesible: landing, registro, login, OAuth.

## React

- **No definir componentes dentro de otros** — Causa pérdida de focus en inputs y remount en cada render. Descubierto en `TabContacto.tsx` (InputTelefono). Ver regla completa en `REGLAS_ESTILO_CODIGO.md` sección 12.
- **Soft delete vs Hard delete** — Si el frontend confirma "Esta acción no se puede deshacer", el backend debe hacer hard delete real. Soft delete (`activa: false`) sin filtro en la carga trae de vuelta los registros "eliminados". Descubierto en `eliminarRecompensa` de Puntos.

## Escalabilidad

- **Cursor-based pagination para feeds** — Para ChatYA y futuros feeds sociales: cursor-based pagination > offset-based. Endpoint "jump to message" es prioridad alta.
- **Transacciones inmutables** — Las transacciones (ventas/canjes) no se eliminan. Son registros financieros. Si hubo un error, se crea una transacción de cancelación/reverso.
