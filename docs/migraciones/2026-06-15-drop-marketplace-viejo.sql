-- =============================================================================
-- 2026-06-15: eliminar marketplace y categorias_marketplace (diseño viejo)
-- =============================================================================
--
-- Elimina el par de tablas del PRIMER diseño del MarketPlace:
--
--   marketplace             → publicaciones compra-venta (diseño viejo, con
--                             categoria_id NOT NULL hacia categorias_marketplace)
--   categorias_marketplace  → catálogo de categorías de ese diseño viejo
--
-- POR QUÉ: el MarketPlace se rehízo sobre la tabla `articulos_marketplace`
-- (17 filas, activa, la que usa marketplace.service.ts). Ahí la categoría es un
-- STRING (constante CATEGORIAS_CLASIFICADO), no una tabla con FK. La pareja
-- marketplace + categorias_marketplace quedó huérfana: 0 filas en ambas, cero
-- uso funcional en código (solo relaciones declaradas de Drizzle, ya removidas).
--
-- SEGURO: 0 filas en ambas. `marketplace` es hoja (ninguna tabla la referencia;
-- marketplace_preguntas y marketplace_busquedas_log son del MarketPlace NUEVO y
-- NO la referencian). `marketplace` tiene FK a categorias_marketplace, así que se
-- dropea primero. El código que las definía (schema.ts, relations.ts) ya se
-- limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS. Orden por dependencia.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS marketplace;
DROP TABLE IF EXISTS categorias_marketplace;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ambas tablas ya no deben existir (0 filas); articulos_marketplace SÍ debe seguir:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('marketplace','categorias_marketplace','articulos_marketplace');
-- =============================================================================
