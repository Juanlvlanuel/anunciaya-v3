-- =============================================================================
-- 2026-06-19 · Fase CONTRACT — DROP de la columna texto `articulos_marketplace.ciudad`
-- =============================================================================
--
-- Cierre de la migración ciudad↔catálogo en la sección **MarketPlace**. La columna de TEXTO
-- `articulos_marketplace.ciudad` (NOT NULL, sin default) queda RETIRADA. Todo el código ya
-- lee el nombre desde el catálogo `ciudades` vía la FK `ciudad_id`
-- (LEFT JOIN ciudades c → `c.nombre AS ciudad`) y las escrituras SOLO persisten `ciudad_id`
-- (C2C sin sucursal → resolverCiudadId del texto del payload). El ORM ya no define la columna.
--
-- ⚠️ ORDEN OBLIGATORIO (la columna es NOT NULL):
--   PASO 0 — correr ANTES de desplegar el contract de código (puede ser ya mismo). Relaja el
--            NOT NULL para que, en la ventana entre el deploy y el DROP, ningún INSERT que ya
--            NO manda `ciudad` falle por NOT NULL. Inofensivo con el código actual.
--   (Deploy del commit de contract — Render levanta el código que ya no usa la columna texto.)
--   PASO 1 — correr DESPUÉS del deploy. Guard de no-pérdida + DROP de la columna.
--   Correr PRIMERO EN DEV, validar, y SOLO DESPUÉS en PROD.
--
-- NOTA sobre índices: el filtro por ciudad del feed ya quedó cubierto por
-- `idx_articulos_mp_ciudad_id` (creado en el EXPAND, sobre ciudad_id). El DROP COLUMN borra
-- en cascada el índice simple `idx_marketplace_ciudad` (sobre la columna texto) — no hay que
-- recrear nada más (MarketPlace no tenía índice compuesto (ciudad, created_at)).
--
-- IDEMPOTENTE: el DROP usa IF EXISTS. El guard aborta si quedara algún artículo con ciudad de
-- texto significativa pero SIN `ciudad_id` (perdería su ciudad al soltar la columna).
-- =============================================================================

-- ── PASO 0 — ANTES del deploy del contract ───────────────────────────────────────────────
BEGIN;
ALTER TABLE articulos_marketplace ALTER COLUMN ciudad DROP NOT NULL;
COMMIT;

-- ── PASO 1 — DESPUÉS del deploy del contract ──────────────────────────────────────────────
BEGIN;

-- Guard de seguridad: nadie debe perder su ciudad. Si hay artículos (no borrados) con
-- `ciudad` de texto real pero sin `ciudad_id`, ABORTA: backfillear primero (slug y/o cercanía).
DO $$
DECLARE
    v_huerfanas integer;
BEGIN
    SELECT count(*) INTO v_huerfanas
    FROM articulos_marketplace
    WHERE ciudad_id IS NULL
      AND ciudad IS NOT NULL
      AND ciudad <> 'Por configurar'
      AND ciudad <> ''
      AND deleted_at IS NULL;

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'No se puede soltar la columna: % articulo(s) tienen ciudad de texto sin ciudad_id. Backfillear primero (slug y/o cercanía).', v_huerfanas;
    END IF;

    RAISE NOTICE 'Guard OK: 0 artículos perderían su ciudad. Procede el DROP.';
END $$;

-- DROP de la columna texto (borra en cascada el índice simple idx_marketplace_ciudad).
ALTER TABLE articulos_marketplace DROP COLUMN IF EXISTS ciudad;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después; la columna ya NO debe existir, ciudad_id sigue)
-- =============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'articulos_marketplace' AND column_name IN ('ciudad','ciudad_id');
--   -- debe devolver SOLO 'ciudad_id'
-- =============================================================================
