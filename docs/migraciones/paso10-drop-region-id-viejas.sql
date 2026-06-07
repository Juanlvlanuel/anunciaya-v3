-- ============================================================================
-- Paso 10 — DROP de las columnas region_id viejas (negocios + embajadores)
-- Migración ciudad↔región — limpieza final
-- Fecha: 2026-06-07
-- ============================================================================
--
-- CONTEXTO
-- --------
-- Tras separar ciudades de regiones, la región del negocio y del vendedor se
-- DEDUCE, ya no se guarda en columna:
--   * negocio  → sucursal → ciudad (negocio_sucursales.ciudad_id) → región
--   * vendedor → embajador_ciudades → ciudad → región
-- Las columnas directas `negocios.region_id` y `embajadores.region_id` quedaron
-- SIN USO en el código (verificado con `tsc --noEmit` + `eslint` el 2026-06-07,
-- ambos en verde tras quitarlas del schema/relations/middleware/servicios).
-- Esta migración las elimina de la base de datos.
--
-- NO toca `usuarios.region_id` — esa SÍ se conserva (zona de mando del Gerente
-- Regional). Solo se eliminan las de `negocios` y `embajadores`.
--
-- ⚠️  ANTES DE EJECUTAR
-- --------------------
--   1. TOMAR SNAPSHOT / BACKUP de la base (es un DROP COLUMN irreversible).
--      Supabase: Dashboard → Database → Backups → "Create backup" (o pg_dump).
--   2. Ejecutar PRIMERO en DEV (proyecto jjyezhdwzsyyjssonofn) y probar el Panel.
--   3. En PRODUCCIÓN (adaxddsvzuzbycjojwoo) solo DESPUÉS de pushear y verificar
--      el código del Paso 10. Si el código que aún lee la columna llegara a prod
--      antes que este DROP, no pasa nada (el código ya no la lee); el orden
--      seguro es: push del código → correr este SQL.
--
-- NOTA TÉCNICA
-- ------------
-- `DROP COLUMN` elimina AUTOMÁTICAMENTE, en cascada, el índice y la FK que
-- dependen únicamente de esa columna. No hace falta DROP INDEX / DROP CONSTRAINT
-- por separado:
--   negocios:     idx_negocios_region     + fk_negocios_region
--   embajadores:  idx_embajadores_region  + fk_embajadores_region
-- `IF EXISTS` hace la migración idempotente (re-correrla no truena).
-- ============================================================================

BEGIN;

ALTER TABLE negocios    DROP COLUMN IF EXISTS region_id;
ALTER TABLE embajadores DROP COLUMN IF EXISTS region_id;

COMMIT;

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN (correr aparte; debe devolver 0 filas):
--
--   SELECT table_name, column_name
--   FROM information_schema.columns
--   WHERE column_name = 'region_id'
--     AND table_name IN ('negocios', 'embajadores');
--
-- Y confirmar que usuarios.region_id SIGUE existiendo (debe devolver 1 fila):
--
--   SELECT table_name, column_name
--   FROM information_schema.columns
--   WHERE column_name = 'region_id' AND table_name = 'usuarios';
-- ----------------------------------------------------------------------------
