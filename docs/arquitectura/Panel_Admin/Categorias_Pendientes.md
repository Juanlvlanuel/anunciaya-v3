# Categorías — Pendientes (checklist vivo)

> Hermano de [`Categorias.md`](Categorias.md) (qué ES). Aquí lo que **FALTA**.
> Última actualización: 29 Junio 2026.

## Para dejarlo cerrado
- [ ] **Correr la migración** `docs/migraciones/2026-06-29-catalogo-categorias-por-ciudad.sql`
      en **dev y prod** (las 2 tablas). Hasta entonces `GET /admin/categorias` y el filtro por
      ciudad fallan en runtime (las tablas no existen).
- [ ] Correr el harness `apps/api/scripts/probar-categorias-acciones.ts` (tras la migración).
- [ ] **Verificación visual E2E** a mano en el Panel: crear/editar categoría y subcategoría,
      asignar ciudades, activar/desactivar; comprobar el filtro de Negocios en `apps/web` con
      una ciudad acotada.
- [ ] Actualizar índices: `Tablero_Modulos.md`, `Panel_Admin.md` (índice + matriz), `ROADMAP.md`.

## Decisiones cerradas (producto)
- [x] **Onboarding/Business Studio NO filtran por ciudad — auto-poblado por demanda** (decidido 29 jun).
      Muestran el catálogo completo; si un comercio se clasifica en una cat/sub acotada cuya ciudad
      no estaba incluida, se permite y su ciudad **se habilita automáticamente**
      (`autohabilitarCatalogoPorCiudad`). Evita reordenar el wizard y deja que la demanda real expanda
      el catálogo. **Nota:** un negocio puede re-habilitar una ciudad que el super había excluido; si
      a futuro se quiere bloquear eso, habría que marcar exclusiones "duras" (otra columna/flag).

## Mejoras futuras (no bloquean)
- [ ] **Reordenar por arrastre** (drag&drop) en la UI. El backend ya expone
      `POST /admin/categorias/reordenar` y `…/subcategorias/reordenar`; falta cablear el gesto.
- [ ] Confirmación explícita al **desactivar** un giro con muchos negocios (hoy es directo;
      es reversible y no destruye datos, pero un aviso ayudaría).
- [ ] Migrar el catálogo de **emoji → Iconify** (afecta a las 12 categorías existentes; cambio aparte).
- [ ] Selector de emoji más rico (picker) en vez del input + sugerencias.
