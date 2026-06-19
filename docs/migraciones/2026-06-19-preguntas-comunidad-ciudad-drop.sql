-- =============================================================================
-- 2026-06-19 · Fase CONTRACT — DROP de la columna texto `preguntas_comunidad.ciudad`
-- =============================================================================
--
-- Cierre de la migración ciudad↔catálogo en la sección **Home / Pregúntale a [ciudad]**
-- (preguntas_comunidad / "Coyo"). La columna de TEXTO `preguntas_comunidad.ciudad`
-- (NOT NULL, sin default) queda RETIRADA. Todo el código ya lee el nombre desde el catálogo
-- `ciudades` vía la FK `ciudad_id` (LEFT JOIN ciudades → `ciudades.nombre AS ciudad`) y las
-- escrituras SOLO persisten `ciudad_id` (resuelto del texto con resolverCiudadId). El feed y
-- el cron pasivo filtran por `ciudad_id`. El ORM ya no define la columna.
--
-- ⚠️ ORDEN OBLIGATORIO (la columna es NOT NULL):
--   PASO 0 — correr ANTES de desplegar el contract de código (puede ser ya mismo). Relaja el
--            NOT NULL para que, en la ventana entre el deploy y el DROP, ningún INSERT que ya
--            NO manda `ciudad` falle por NOT NULL. Inofensivo con el código actual.
--   (Deploy del commit de contract — Render levanta el código que ya no usa la columna texto.)
--   PASO 1 — correr DESPUÉS del deploy. Guard de no-pérdida + DROP de la columna.
--   Correr PRIMERO EN DEV, validar, y SOLO DESPUÉS en PROD.
--
-- ⚠️ SIN coordenadas: si el backfill por slug dejó filas con ciudad_id NULL (p. ej. por un
--    rename de la ciudad), el guard ABORTARÁ. Reasignar esas filas a mano (UPDATE ... SET
--    ciudad_id = <id>) antes de correr este DROP — no hay backfill por cercanía posible.
--
-- NOTA sobre índices: el índice del feed ya quedó cubierto por `idx_preguntas_comunidad_ciudad_id_fecha`
-- (ciudad_id, created_at), creado en el EXPAND. El DROP COLUMN borra en cascada el índice viejo
-- `idx_preguntas_comunidad_ciudad_fecha` (sobre la columna texto) — no hay que recrear nada.
--
-- IDEMPOTENTE: el DROP usa IF EXISTS. (preguntas_comunidad NO tiene `deleted_at`.)
-- =============================================================================

-- ── PASO 0 — ANTES del deploy del contract ───────────────────────────────────────────────
BEGIN;
ALTER TABLE preguntas_comunidad ALTER COLUMN ciudad DROP NOT NULL;
COMMIT;

-- ── PASO 1 — DESPUÉS del deploy del contract ──────────────────────────────────────────────
BEGIN;

-- Guard de seguridad: nadie debe perder su ciudad. Si hay preguntas con `ciudad` de texto real
-- pero sin `ciudad_id`, ABORTA: backfillear/reasignar primero (sin coords, a mano).
DO $$
DECLARE
    v_huerfanas integer;
BEGIN
    SELECT count(*) INTO v_huerfanas
    FROM preguntas_comunidad
    WHERE ciudad_id IS NULL
      AND ciudad IS NOT NULL
      AND ciudad <> '';

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'No se puede soltar la columna: % pregunta(s) tienen ciudad de texto sin ciudad_id. Reasignar primero (sin coords, manual).', v_huerfanas;
    END IF;

    RAISE NOTICE 'Guard OK: 0 preguntas perderían su ciudad. Procede el DROP.';
END $$;

-- DROP de la columna texto (borra en cascada el índice viejo idx_preguntas_comunidad_ciudad_fecha).
ALTER TABLE preguntas_comunidad DROP COLUMN IF EXISTS ciudad;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después; la columna ya NO debe existir, ciudad_id sigue)
-- =============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'preguntas_comunidad' AND column_name IN ('ciudad','ciudad_id');
--   -- debe devolver SOLO 'ciudad_id'
-- =============================================================================
