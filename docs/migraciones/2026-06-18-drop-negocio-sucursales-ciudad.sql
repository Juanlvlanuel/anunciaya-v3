-- =============================================================================
-- 2026-06-18 · Fase CONTRACT — DROP de la columna texto `negocio_sucursales.ciudad`
-- =============================================================================
--
-- Cierre de la migración ciudad↔región: la columna de TEXTO `negocio_sucursales.ciudad`
-- queda RETIRADA. Todo el código ya lee el nombre de la ciudad desde el catálogo
-- `ciudades` vía la FK `ciudad_id` (LEFT JOIN ciudades → `ciudades.nombre AS ciudad`),
-- y ya NADIE escribe el texto (solo `ciudad_id`). El ORM (`schema.ts`) tampoco define ya
-- esta columna.
--
-- ⚠️ CORRER PRIMERO EN DEV, validar, y SOLO DESPUÉS en PROD. Antes del DROP en prod,
--    confirma que el código nuevo (este deploy) ya está arriba en Render.
--
-- IDEMPOTENTE: el DROP usa IF EXISTS. La verificación previa aborta si quedara alguna
-- sucursal con ciudad de texto significativa pero SIN `ciudad_id` (perdería su ciudad).
-- =============================================================================

BEGIN;

-- ── Guard de seguridad: nadie debe perder su ciudad ─────────────────────────────
-- Si hay sucursales con `ciudad` (texto real, no placeholder) pero sin `ciudad_id`,
-- ABORTA: primero hay que backfillear esas filas (resolver su ciudad_id) — si no, al
-- soltar la columna perderían su ciudad. En dev/prod el backfill ya se hizo (debe dar 0).
DO $$
DECLARE
    v_huerfanas integer;
BEGIN
    SELECT count(*) INTO v_huerfanas
    FROM negocio_sucursales
    WHERE ciudad_id IS NULL
      AND ciudad IS NOT NULL
      AND ciudad <> 'Por configurar'
      AND ciudad <> '';

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'No se puede soltar la columna: % sucursal(es) tienen ciudad de texto sin ciudad_id. Backfillear primero (resolverCiudadId por slug).', v_huerfanas;
    END IF;

    RAISE NOTICE 'Guard OK: 0 sucursales perderían su ciudad. Procede el DROP.';
END $$;

-- ── DROP de la columna texto ────────────────────────────────────────────────────
ALTER TABLE negocio_sucursales DROP COLUMN IF EXISTS ciudad;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después; la columna ya NO debe existir, ciudad_id sigue)
-- =============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'negocio_sucursales' AND column_name IN ('ciudad','ciudad_id');
--   -- debe devolver SOLO 'ciudad_id'
--
-- NOTA: la columna `usuarios.ciudad` (texto) es OTRA migración pendiente (mismo patrón).
-- Esta migración NO la toca.
-- =============================================================================
