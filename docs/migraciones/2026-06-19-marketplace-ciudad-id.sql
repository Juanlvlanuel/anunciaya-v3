-- =============================================================================
-- 2026-06-19 · MarketPlace — EXPAND + BACKFILL de `articulos_marketplace.ciudad_id`
-- =============================================================================
--
-- Primer paso (expand-migrate-contract) para que la sección **MarketPlace** referencie
-- el catálogo `ciudades` por FK en vez del texto libre `articulos_marketplace.ciudad`.
-- Mismo patrón ya cerrado en `negocio_sucursales` y `servicios_publicaciones`.
--
--   - EXPAND: agrega `ciudad_id` (FK → ciudades, nullable) + índice.
--   - BACKFILL por SLUG: los artículos son C2C (de personas, sin sucursal); su ciudad la
--     puso el usuario desde el selector del catálogo. Se resuelve el texto `ciudad` por slug
--     normalizado contra `ciudades.slug` (minúsculas, sin acentos vía unaccent, sin signos,
--     espacios→'-'; idéntico a `slugCiudad`/seed).
--
-- NO toca el texto `ciudad` (se conserva como fallback hasta el contract/DROP posterior).
-- IDEMPOTENTE: ADD COLUMN/INDEX IF NOT EXISTS; el UPDATE solo toca filas con ciudad_id NULL.
-- AMBIENTE: correr en DEV primero, validar, y luego en PROD.
-- Requiere la extensión `unaccent` (ya usada por las búsquedas del proyecto).
-- =============================================================================

BEGIN;

-- ── EXPAND ───────────────────────────────────────────────────────────────────
ALTER TABLE articulos_marketplace
    ADD COLUMN IF NOT EXISTS ciudad_id uuid REFERENCES ciudades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articulos_mp_ciudad_id
    ON articulos_marketplace (ciudad_id) WHERE ciudad_id IS NOT NULL;

-- ── BACKFILL: resolver el texto `ciudad` por slug ────────────────────────────
UPDATE articulos_marketplace am
SET ciudad_id = c.id
FROM ciudades c
WHERE am.ciudad_id IS NULL
  AND am.ciudad IS NOT NULL
  AND am.ciudad <> ''
  AND c.slug = regexp_replace(
                 regexp_replace(trim(lower(unaccent(am.ciudad))), '[^a-z0-9[:space:]]+', '', 'g'),
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
-- FROM articulos_marketplace WHERE deleted_at IS NULL;
--
-- Las que NO mapearon por slug (su texto no existe en el catálogo): correr luego el
-- backfill por cercanía `2026-06-19-marketplace-ciudad-id-backfill-cercania.sql`.
-- SELECT DISTINCT ciudad FROM articulos_marketplace
--   WHERE ciudad_id IS NULL AND deleted_at IS NULL AND ciudad <> '';
-- =============================================================================
