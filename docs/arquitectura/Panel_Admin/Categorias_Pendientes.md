# Categorías — Pendientes (checklist vivo)

> Hermano de [`Categorias.md`](Categorias.md) (qué ES). Aquí lo que **FALTA**.
> Última actualización: 23 Julio 2026.

## Estado: ✅ desplegado y operativo en PROD
- [x] Backend + Panel + web · `tsc`/build verdes en api/admin/web.
- [x] Migraciones corridas en **dev y prod**: `2026-06-29-categoria-bienes-raices.sql` +
      `2026-06-29-catalogo-categorias-por-ciudad.sql` (las 2 tablas N:M).
- [x] Harness `apps/api/scripts/probar-categorias-acciones.ts` — **TODO VERDE** con datos reales.
- [x] Desplegado: commit `65e388f` en main (Render Live, 30 jun).
- [x] Emojis del catálogo eliminados (UI + contract: ORM, endpoint público, negocios/ofertas,
      tipos) y columna `icono` DROPeada en dev+prod (`2026-06-29-drop-catalogo-icono.sql`).
- [x] **Hard delete (excepción controlada)** — 23 jul. Botón "Eliminar" aparte de
      activar/desactivar, para borrar de raíz una categoría/subcategoría creada por error
      mientras se define el catálogo de la beta. Guardias en backend (fuente de verdad): categoría
      bloqueada si tiene ≥1 subcategoría (activa o inactiva); subcategoría bloqueada si existe
      ≥1 fila cruda en `asignacion_subcategorias` (sin filtrar por negocio real/demo/borrador).
      409 con mensaje si la guardia bloquea; frontend deshabilita el botón preventivamente.
      `tsc -b`/`--noEmit` verdes en api y admin. Falta QA E2E a mano.
- [x] **Reordenar por arrastre (drag&drop)** — 23 jul, solo ámbito **Negocios**
      (`SeccionCategoriasNegocios`; MarketPlace queda pendiente como tarea aparte). `@dnd-kit/core`
      + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Handle `GripVertical` por fila (categoría y
      subcategoría); orden local optimista + `useReordenarCategorias`/`useReordenarSubcategorias`
      con el array COMPLETO (no solo lo visible). **Deshabilitado** si hay búsqueda o filtro de
      estado activo (`hayFiltros`), porque la lista filtrada no representa el orden real completo.
      `tsc -b` verde en admin.

## Lo único que queda
- [ ] **Verificación visual E2E** en el Panel (que Juan lo pruebe en vivo): crear/editar categoría
      y subcategoría, gestionar disponibilidad por ciudad, activar/desactivar; y el filtro de
      Negocios en la app con una categoría acotada.
- [ ] Reflejar el módulo en `Panel_Admin.md` (índice + matriz) y `ROADMAP.md` (el tablero ya está).

## Decisiones cerradas (producto)
- [x] **Onboarding/Business Studio NO filtran por ciudad — auto-poblado por demanda** (29 jun).
      Muestran el catálogo completo; si un comercio se clasifica en una cat/sub acotada cuya ciudad
      no estaba incluida, se permite y su ciudad **se habilita automáticamente**
      (`autohabilitarCatalogoPorCiudad`). Nota: un negocio puede re-habilitar una ciudad que el
      super había excluido; si a futuro se quiere bloquear, haría falta marcar exclusiones "duras".

## Mejoras futuras (no bloquean)
- [ ] Replicar el drag&drop en el ámbito **MarketPlace** (`SeccionCategoriasMarketplace.tsx`) si
      el patrón funciona bien en Negocios.
- [ ] Confirmación explícita al **desactivar** un giro con muchos negocios (hoy es directo;
      es reversible y no destruye datos, pero un aviso ayudaría).
- [ ] Catálogo de propiedades en Business Studio para Inmobiliarias/Agentes Inmobiliarios
      (campos específicos: recámaras, m², tipo de operación) — ver
      `../Segmentacion_Giros_Negocios.md`.
- [ ] Módulo de citas — ver [[project_modulo_citas_futuro]] (memoria) y
      `../Segmentacion_Giros_Negocios.md` para el checklist mínimo y los 27 giros que
      quedarían reactivables al construirlo.

## Limpieza de catálogo — Fase 1 de venta (23 jul)
- [x] Turismo y Bienes Raíces eliminados por completo (comprador no encaja con la app).
- [x] Oficios freelance sin establecimiento sacados de Servicios/Movilidad/Educación/Mascotas
      (van a la sección pública Servicios en su lugar).
- [x] 27 subcategorías desactivadas (no aplican puntos/ScanYA hoy, pendientes de módulo de
      citas) — ver `../Segmentacion_Giros_Negocios.md` para la lista completa y el criterio.
- [x] DEV y PROD verificados idénticos: 10 categorías, 103 subcategorías (76 activas / 27
      inactivas).
