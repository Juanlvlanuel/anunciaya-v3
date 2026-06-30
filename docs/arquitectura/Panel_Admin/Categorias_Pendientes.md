# Categorías — Pendientes (checklist vivo)

> Hermano de [`Categorias.md`](Categorias.md) (qué ES). Aquí lo que **FALTA**.
> Última actualización: 30 Junio 2026.

## Estado: ✅ desplegado y operativo en PROD
- [x] Backend + Panel + web · `tsc`/build verdes en api/admin/web.
- [x] Migraciones corridas en **dev y prod**: `2026-06-29-categoria-bienes-raices.sql` +
      `2026-06-29-catalogo-categorias-por-ciudad.sql` (las 2 tablas N:M).
- [x] Harness `apps/api/scripts/probar-categorias-acciones.ts` — **TODO VERDE** con datos reales.
- [x] Desplegado: commit `65e388f` en main (Render Live, 30 jun).
- [x] Emojis del catálogo eliminados (UI + contract: ORM, endpoint público, negocios/ofertas,
      tipos) y columna `icono` DROPeada en dev+prod (`2026-06-29-drop-catalogo-icono.sql`).

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
- [ ] **Reordenar por arrastre** (drag&drop) en la UI. El backend ya expone
      `POST /admin/categorias/reordenar` y `…/subcategorias/reordenar`; falta cablear el gesto.
- [ ] Confirmación explícita al **desactivar** un giro con muchos negocios (hoy es directo;
      es reversible y no destruye datos, pero un aviso ayudaría).
