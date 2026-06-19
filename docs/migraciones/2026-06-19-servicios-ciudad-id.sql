-- =============================================================================
-- 2026-06-19 · Servicios — EXPAND + BACKFILL de `servicios_publicaciones.ciudad_id`
-- =============================================================================
--
-- Primer paso (expand-migrate-contract) para que la sección **Servicios** referencie
-- el catálogo `ciudades` por FK en vez del texto libre `servicios_publicaciones.ciudad`.
--
--   - EXPAND: agrega `ciudad_id` (FK → ciudades, nullable) + índice.
--   - BACKFILL en dos modos según el tipo de publicación:
--       · vacante-empresa  → hereda el `ciudad_id` de SU SUCURSAL (negocio_sucursales).
--       · servicio-persona / solicito → resuelve el texto `ciudad` por SLUG normalizado
--         contra `ciudades.slug` (misma normalización que `slugCiudad`/seed: minúsculas,
--         sin acentos via unaccent, sin signos, espacios→'-').
--
-- NO toca el texto `ciudad` (se conserva como fallback hasta el contract/DROP posterior).
-- IDEMPOTENTE: ADD COLUMN/INDEX IF NOT EXISTS; los UPDATE solo tocan filas con ciudad_id NULL.
-- AMBIENTE: correr en DEV primero, validar, y luego en PROD.
-- Requiere la extensión `unaccent` (ya usada por las búsquedas del proyecto).
-- =============================================================================

BEGIN;

-- ── EXPAND ───────────────────────────────────────────────────────────────────
ALTER TABLE servicios_publicaciones
    ADD COLUMN IF NOT EXISTS ciudad_id uuid REFERENCES ciudades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_servicios_pub_ciudad_id
    ON servicios_publicaciones (ciudad_id) WHERE ciudad_id IS NOT NULL;

-- ── BACKFILL 1: vacantes heredan la ciudad de su sucursal ────────────────────
UPDATE servicios_publicaciones sp
SET ciudad_id = s.ciudad_id
FROM negocio_sucursales s
WHERE sp.sucursal_id = s.id
  AND sp.tipo = 'vacante-empresa'
  AND sp.ciudad_id IS NULL
  AND s.ciudad_id IS NOT NULL;

-- ── BACKFILL 2: servicios personales resuelven su texto por slug ─────────────
UPDATE servicios_publicaciones sp
SET ciudad_id = c.id
FROM ciudades c
WHERE sp.ciudad_id IS NULL
  AND sp.ciudad IS NOT NULL
  AND sp.ciudad <> ''
  AND c.slug = regexp_replace(
                 regexp_replace(trim(lower(unaccent(sp.ciudad))), '[^a-z0-9[:space:]]+', '', 'g'),
                 '[[:space:]]+', '-', 'g'
               );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- Cobertura del backfill (idealmente casi todas con ciudad_id; las que queden NULL
-- son textos que no casan con ninguna ciudad del catálogo — revisar/crearlas):
-- SELECT
--   count(*) FILTER (WHERE ciudad_id IS NOT NULL) AS con_id,
--   count(*) FILTER (WHERE ciudad_id IS NULL)     AS sin_id,
--   count(*) AS total
-- FROM servicios_publicaciones WHERE deleted_at IS NULL;
--
-- Las que NO mapearon (su texto no existe en el catálogo):
-- SELECT DISTINCT ciudad FROM servicios_publicaciones
--   WHERE ciudad_id IS NULL AND deleted_at IS NULL AND ciudad <> '';
-- =============================================================================
