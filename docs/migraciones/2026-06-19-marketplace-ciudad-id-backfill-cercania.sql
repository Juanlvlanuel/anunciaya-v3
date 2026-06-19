-- =============================================================================
-- 2026-06-19 · MarketPlace — BACKFILL 2 (por cercanía) de `articulos_marketplace.ciudad_id`
-- =============================================================================
--
-- Complemento del backfill por slug: asigna a cada artículo que quedó SIN `ciudad_id`
-- la ciudad ACTIVA del catálogo más CERCANA por coordenadas (PostGIS). Robusto cuando el
-- texto guardado no casa con el catálogo (p. ej. porque la ciudad se renombró en el Panel,
-- o por artículos legacy con la ciudad escrita distinto).
--
-- Usa `ubicacion` (geography real del artículo) y las coords lat/lng de `ciudades`.
-- IDEMPOTENTE: solo toca filas con ciudad_id NULL y ubicación no nula.
-- AMBIENTE: DEV primero. En PROD solo aplica si hay artículos sin mapear.
-- =============================================================================

BEGIN;

UPDATE articulos_marketplace am
SET ciudad_id = (
    SELECT c.id
    FROM ciudades c
    WHERE c.activa = true AND c.lat IS NOT NULL AND c.lng IS NOT NULL
    ORDER BY ST_Distance(
        am.ubicacion::geography,
        ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography
    ) ASC
    LIMIT 1
)
WHERE am.ciudad_id IS NULL
  AND am.ubicacion IS NOT NULL
  AND am.deleted_at IS NULL;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (debería quedar 0 sin_id, o solo las sin ubicación):
-- SELECT count(*) FILTER (WHERE ciudad_id IS NOT NULL) AS con_id,
--        count(*) FILTER (WHERE ciudad_id IS NULL)     AS sin_id
-- FROM articulos_marketplace WHERE deleted_at IS NULL;
-- =============================================================================
