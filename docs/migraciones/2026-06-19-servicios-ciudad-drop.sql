-- =============================================================================
-- 2026-06-19 · Fase CONTRACT — DROP de la columna texto `servicios_publicaciones.ciudad`
-- =============================================================================
--
-- Cierre de la migración ciudad↔catálogo en la sección **Servicios**. La columna de TEXTO
-- `servicios_publicaciones.ciudad` (NOT NULL, sin default) queda RETIRADA. Todo el código ya
-- lee el nombre desde el catálogo `ciudades` vía la FK `ciudad_id`
-- (LEFT JOIN ciudades c → `c.nombre AS ciudad`) y las escrituras SOLO persisten `ciudad_id`
-- (vacante-empresa → ciudad de su sucursal; servicio-persona/solicito → resolverCiudadId por
-- slug). El ORM (`schema.ts`) ya no define la columna texto.
--
-- ⚠️ ORDEN OBLIGATORIO (la columna es NOT NULL):
--   PASO 0 — correr ANTES de desplegar el contract de código (puede ser ya mismo). Relaja el
--            NOT NULL para que, en la ventana entre el deploy y el DROP, ningún INSERT que ya
--            NO manda `ciudad` falle por NOT NULL. Es inofensivo con el código actual.
--   (Deploy del commit de contract — Render levanta el código que ya no usa la columna texto.)
--   PASO 1 — correr DESPUÉS del deploy. Guard de no-pérdida, recrea el índice del feed sobre
--            ciudad_id y suelta la columna.
--   Correr PRIMERO EN DEV, validar, y SOLO DESPUÉS en PROD (prod: 0 publicaciones).
--
-- IDEMPOTENTE. El DROP usa IF EXISTS; borra en cascada los índices que dependen de la columna
-- (idx_servicios_pub_ciudad, idx_servicios_pub_feed) — por eso PASO 1 recrea el feed sobre ciudad_id.
-- =============================================================================

-- ── PASO 0 — ANTES del deploy del contract ───────────────────────────────────────────────
BEGIN;
ALTER TABLE servicios_publicaciones ALTER COLUMN ciudad DROP NOT NULL;
COMMIT;

-- ── PASO 1 — DESPUÉS del deploy del contract ──────────────────────────────────────────────
BEGIN;

-- Guard de seguridad: nadie debe perder su ciudad. Si hay publicaciones (no borradas) con
-- `ciudad` de texto real pero sin `ciudad_id`, ABORTA: backfillear primero (slug y/o cercanía).
DO $$
DECLARE
    v_huerfanas integer;
BEGIN
    SELECT count(*) INTO v_huerfanas
    FROM servicios_publicaciones
    WHERE ciudad_id IS NULL
      AND ciudad IS NOT NULL
      AND ciudad <> 'Por configurar'
      AND ciudad <> ''
      AND deleted_at IS NULL;

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'No se puede soltar la columna: % publicacion(es) tienen ciudad de texto sin ciudad_id. Backfillear primero (slug y/o cercanía).', v_huerfanas;
    END IF;

    RAISE NOTICE 'Guard OK: 0 publicaciones perderían su ciudad. Procede el DROP.';
END $$;

-- Recrear el índice del feed sobre `ciudad_id` (el DROP COLUMN borra idx_servicios_pub_feed,
-- que estaba sobre (ciudad, created_at)). Mantiene el plan del feed: activas por ciudad + fecha.
CREATE INDEX IF NOT EXISTS idx_servicios_pub_feed_ciudad_id
    ON servicios_publicaciones (ciudad_id, created_at DESC)
    WHERE estado = 'activa' AND deleted_at IS NULL;

-- DROP de la columna texto (borra también idx_servicios_pub_ciudad e idx_servicios_pub_feed).
ALTER TABLE servicios_publicaciones DROP COLUMN IF EXISTS ciudad;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después; la columna ya NO debe existir, ciudad_id sigue)
-- =============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'servicios_publicaciones' AND column_name IN ('ciudad','ciudad_id');
--   -- debe devolver SOLO 'ciudad_id'
-- =============================================================================
