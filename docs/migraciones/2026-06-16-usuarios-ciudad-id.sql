-- =============================================================================
-- 2026-06-16 · `usuarios.ciudad_id` (FK → ciudades) — medición/filtrado por ciudad
-- =============================================================================
--
-- La ciudad del USUARIO pasa a anclarse al catálogo normalizado `ciudades` (hoy
-- solo existe el texto libre `usuarios.ciudad`, sin FK y casi siempre NULL para
-- clientes). Esta columna es el ancla nueva:
--   usuarios.ciudad_id → ciudades(id) → ciudades.region_id → regiones.
--
-- ¿Para qué? Para el Panel Admin: filtrar la lista de Usuarios por ciudad y medir
-- "usuarios por ciudad". Es el GEMELO de `negocio_sucursales.ciudad_id` (Paso 4).
--
-- NULLABLE al inicio: se llena de dos formas (código, en pasos posteriores):
--   1. En vivo: cuando el usuario reporta su ubicación (GPS / selector del header),
--      el backend resuelve el texto → ciudad_id por slug (helper resolverCiudadId).
--   2. Backfill: script que mapea el TEXTO actual `usuarios.ciudad` → `ciudad_id`
--      (calco de mapear-sucursal-ciudad-id.ts). Los usuarios sin texto quedan NULL
--      ("Sin ciudad") hasta que abran la app.
--
-- Se CONSERVA la columna de texto `usuarios.ciudad` (no se borra).
--
-- ON DELETE SET NULL: si algún día se borra una ciudad, el usuario no se cae; queda
-- sin ciudad asignada.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- REVERSIBLE: ver bloque ROLLBACK al final. AMBIENTE: DEV primero, luego PROD con tu OK.
-- =============================================================================

BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ciudad_id uuid REFERENCES ciudades(id) ON DELETE SET NULL;

-- Índice COMPLETO (no parcial): sirve al filtro por ciudad y al GROUP BY de la métrica
-- (cuenta también los NULL como "Sin ciudad").
CREATE INDEX IF NOT EXISTS idx_usuarios_ciudad_id
    ON usuarios (ciudad_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- Columna nueva (uuid, nullable):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'usuarios' AND column_name = 'ciudad_id';
-- FK a ciudades (nombre auto: usuarios_ciudad_id_fkey):
-- SELECT conname, confrelid::regclass AS referencia FROM pg_constraint
--   WHERE conrelid = 'usuarios'::regclass AND contype = 'f' AND conname LIKE '%ciudad_id%';
-- Índice:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'usuarios'
--   AND indexname = 'idx_usuarios_ciudad_id';
-- Cuántos usuarios ya tienen ciudad_id (al inicio: 0, se llena en pasos siguientes):
-- SELECT count(*) AS total, count(ciudad_id) AS con_ciudad_id FROM usuarios;

-- =============================================================================
-- ROLLBACK (deshacer este paso — seguro, columna nueva sin uso aún):
-- DROP INDEX IF EXISTS idx_usuarios_ciudad_id;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS ciudad_id;
-- =============================================================================
