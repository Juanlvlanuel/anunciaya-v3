-- =============================================================================
-- 2026-06-15: catálogo — eliminar tablas fantasma de variantes e inventario
-- =============================================================================
--
-- Elimina tres tablas que se diseñaron para un sistema de variantes/modificadores
-- + inventario por artículo, pero que NUNCA se implementaron:
--
--   articulo_inventario          → stock por artículo (stock, stock_minimo, ...)
--   articulo_variantes           → grupos de variantes (Tamaño, Extras, ...)
--   articulo_variante_opciones   → opciones de cada grupo (precio_ajuste, ...)
--
-- POR QUÉ: cero uso en código. Solo aparecían en el schema de Drizzle y en sus
-- relaciones declaradas; ningún service, controller, ruta, validación ni frontend
-- las toca. Verificado en BD: 0 filas en las tres, aunque el catálogo tiene 44
-- artículos reales. El catálogo (tabla articulos) maneja sus productos sin
-- variantes ni esta tabla de inventario.
--
-- SEGURO: son tablas HOJA — solo se referencian entre ellas (opciones -> variantes)
-- y a articulos; nada externo apunta a ellas. 0 filas = sin pérdida de datos. El
-- código que las definía (schema.ts + relations.ts) ya se limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS. Orden por dependencia (opciones primero, que
-- tiene FK a variantes). articulo_inventario es independiente.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS articulo_variante_opciones;
DROP TABLE IF EXISTS articulo_variantes;
DROP TABLE IF EXISTS articulo_inventario;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Las tres tablas ya no deben existir (0 filas):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('articulo_inventario','articulo_variantes','articulo_variante_opciones');
-- =============================================================================
