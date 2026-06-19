-- =============================================================================
-- 2026-06-19 · Home (Pregúntale a…) — EXPAND + BACKFILL de `preguntas_comunidad.ciudad_id`
-- =============================================================================
--
-- Primer paso (expand-migrate-contract) para que la sección **Home / Pregúntale a [ciudad]**
-- (preguntas_comunidad / "Coyo") referencie el catálogo `ciudades` por FK en vez del texto
-- libre `preguntas_comunidad.ciudad`. Mismo patrón ya cerrado en negocio_sucursales,
-- servicios_publicaciones y articulos_marketplace.
--
--   - EXPAND: agrega `ciudad_id` (FK → ciudades, nullable) + índice (ciudad_id, created_at).
--   - BACKFILL por SLUG: las preguntas las hacen PERSONAS (sin sucursal); su ciudad sale del
--     selector/useGpsStore. Se resuelve el texto `ciudad` por slug normalizado contra
--     `ciudades.slug` (minúsculas, sin acentos vía unaccent, sin signos, espacios→'-').
--
-- ⚠️ SIN backfill por cercanía: la tabla NO tiene coordenadas (solo el texto ciudad). Las
--    filas cuyo texto no case con el catálogo (p. ej. por un rename de la ciudad en dev)
--    quedarán con ciudad_id NULL → revisar/backfillear manualmente antes del DROP.
--
-- NO toca el texto `ciudad` (se conserva hasta el contract/DROP) ni la columna `estado`
-- (estado geográfico, otra cosa). IDEMPOTENTE: ADD COLUMN/INDEX IF NOT EXISTS; UPDATE solo
-- toca filas con ciudad_id NULL. AMBIENTE: DEV primero, validar, luego PROD.
-- Requiere la extensión `unaccent`.
-- =============================================================================

BEGIN;

-- ── EXPAND ───────────────────────────────────────────────────────────────────
ALTER TABLE preguntas_comunidad
    ADD COLUMN IF NOT EXISTS ciudad_id uuid REFERENCES ciudades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_ciudad_id_fecha
    ON preguntas_comunidad (ciudad_id, created_at DESC) WHERE ciudad_id IS NOT NULL;

-- ── BACKFILL: resolver el texto `ciudad` por slug ────────────────────────────
UPDATE preguntas_comunidad pc
SET ciudad_id = c.id
FROM ciudades c
WHERE pc.ciudad_id IS NULL
  AND pc.ciudad IS NOT NULL
  AND pc.ciudad <> ''
  AND c.slug = regexp_replace(
                 regexp_replace(trim(lower(unaccent(pc.ciudad))), '[^a-z0-9[:space:]]+', '', 'g'),
                 '[[:space:]]+', '-', 'g'
               );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- SELECT
--   count(*) FILTER (WHERE ciudad_id IS NOT NULL) AS con_id,
--   count(*) FILTER (WHERE ciudad_id IS NULL)     AS sin_id,
--   count(*) AS total
-- FROM preguntas_comunidad;
--
-- Las que NO mapearon (su texto no existe en el catálogo — sin coords no hay cercanía;
-- reasignar a mano si hace falta):
-- SELECT DISTINCT ciudad FROM preguntas_comunidad WHERE ciudad_id IS NULL AND ciudad <> '';
-- =============================================================================
