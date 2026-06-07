-- =============================================================================
-- 2026-06-06 · Paso 4 — `negocio_sucursales.ciudad_id` (FK → ciudades)
-- =============================================================================
--
-- La ciudad pasa a vivir a nivel SUCURSAL (un negocio puede tener sucursales en
-- ciudades/regiones distintas). Esta columna es el ancla nueva:
--   negocio_sucursales.ciudad_id → ciudades(id) → ciudades.region_id → regiones.
--
-- NULLABLE al inicio: se llena en el Paso 6 (script que mapea el TEXTO actual
-- `negocio_sucursales.ciudad` → `ciudad_id` por slug normalizado). Las 2 sucursales
-- sin ciudad ('Por configurar' / NULL) quedarán con ciudad_id NULL.
--
-- Se CONSERVA la columna de texto `negocio_sucursales.ciudad` (no se borra); solo se
-- deja de leer para el alcance del Panel (eso es el Paso 8, código).
--
-- ON DELETE SET NULL: si algún día se borra una ciudad, la sucursal no se cae; queda
-- sin ciudad asignada.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- REVERSIBLE: ver bloque ROLLBACK al final. AMBIENTE: DEV primero.
-- =============================================================================

BEGIN;

ALTER TABLE negocio_sucursales
    ADD COLUMN IF NOT EXISTS ciudad_id uuid REFERENCES ciudades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_negocio_sucursales_ciudad_id
    ON negocio_sucursales (ciudad_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- Columna nueva (uuid, nullable):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'negocio_sucursales' AND column_name = 'ciudad_id';
-- FK a ciudades (nombre auto: negocio_sucursales_ciudad_id_fkey):
-- SELECT conname, confrelid::regclass AS referencia FROM pg_constraint
--   WHERE conrelid = 'negocio_sucursales'::regclass AND contype = 'f' AND conname LIKE '%ciudad_id%';
-- Índice:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'negocio_sucursales'
--   AND indexname = 'idx_negocio_sucursales_ciudad_id';
-- Todas las sucursales aún sin ciudad_id (se llenan en el Paso 6):
-- SELECT count(*) AS total, count(ciudad_id) AS con_ciudad_id FROM negocio_sucursales;  -- total=43, con_ciudad_id=0

-- =============================================================================
-- ROLLBACK (deshacer este paso — seguro, columna nueva sin uso aún):
-- DROP INDEX IF EXISTS idx_negocio_sucursales_ciudad_id;
-- ALTER TABLE negocio_sucursales DROP COLUMN IF EXISTS ciudad_id;
-- =============================================================================
