-- =============================================================================
-- 2026-06-19 · Servicios — BACKFILL 3 (por cercanía) de `servicios_publicaciones.ciudad_id`
-- =============================================================================
--
-- Complemento del backfill por slug: asigna a cada publicación que quedó SIN `ciudad_id`
-- la ciudad ACTIVA del catálogo más CERCANA por coordenadas (PostGIS). Robusto cuando el
-- texto guardado no casa con el catálogo (p. ej. porque la ciudad se renombró en el Panel).
--
-- Usa `ubicacion` (geography real de la publicación) y las coords lat/lng de `ciudades`.
-- IDEMPOTENTE: solo toca filas con ciudad_id NULL y ubicación no nula.
-- AMBIENTE: DEV primero. En PROD solo aplica si hay publicaciones sin mapear.
-- =============================================================================

BEGIN;

UPDATE servicios_publicaciones sp
SET ciudad_id = (
    SELECT c.id
    FROM ciudades c
    WHERE c.activa = true AND c.lat IS NOT NULL AND c.lng IS NOT NULL
    ORDER BY ST_Distance(
        sp.ubicacion::geography,
        ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography
    ) ASC
    LIMIT 1
)
WHERE sp.ciudad_id IS NULL
  AND sp.ubicacion IS NOT NULL
  AND sp.deleted_at IS NULL;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (debería quedar 0 sin_id, o solo las sin ubicación):
-- SELECT count(*) FILTER (WHERE ciudad_id IS NOT NULL) AS con_id,
--        count(*) FILTER (WHERE ciudad_id IS NULL)     AS sin_id
-- FROM servicios_publicaciones WHERE deleted_at IS NULL;
-- =============================================================================
