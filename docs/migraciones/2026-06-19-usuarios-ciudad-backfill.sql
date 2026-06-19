-- =============================================================================
-- 2026-06-19 · Usuarios — RE-BACKFILL de `usuarios.ciudad_id` (antes del contract)
-- =============================================================================
--
-- La columna `usuarios.ciudad_id` (FK → ciudades) ya existe desde 2026-06-16 y se pobló
-- entonces. Pero dos flujos escribían el TEXTO `usuarios.ciudad` SIN resolver ciudad_id
-- (bugs en onboarding.service.ts y negocioManagement.service.ts, ya corregidos en el contract),
-- dejando usuarios con texto pero ciudad_id NULL. Este re-backfill resuelve esos por slug
-- ANTES de soltar la columna texto.
--
-- SIN backfill por cercanía garantizado (depende de si usuarios tiene coords del GPS); este
-- script usa SLUG. Los que no casen (p. ej. por el rename de la ciudad en dev) quedarán NULL
-- → reasignar a mano antes del DROP (el guard del contract avisa). usuarios tiene pocos
-- registros, así que es manejable.
--
-- IDEMPOTENTE: solo toca filas con ciudad_id NULL. AMBIENTE: DEV primero, luego PROD.
-- =============================================================================

BEGIN;

UPDATE usuarios u
SET ciudad_id = c.id
FROM ciudades c
WHERE u.ciudad_id IS NULL
  AND u.ciudad IS NOT NULL
  AND u.ciudad <> ''
  AND u.ciudad <> 'Por configurar'
  AND c.slug = regexp_replace(
                 regexp_replace(trim(lower(unaccent(u.ciudad))), '[^a-z0-9[:space:]]+', '', 'g'),
                 '[[:space:]]+', '-', 'g'
               );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT
--   count(*) FILTER (WHERE ciudad_id IS NOT NULL) AS con_id,
--   count(*) FILTER (WHERE ciudad_id IS NULL AND ciudad IS NOT NULL AND ciudad <> '' AND ciudad <> 'Por configurar') AS sin_id_con_texto,
--   count(*) AS total
-- FROM usuarios;
--
-- Los que NO mapearon (revisar/reasignar a mano):
-- SELECT id, ciudad FROM usuarios
--   WHERE ciudad_id IS NULL AND ciudad IS NOT NULL AND ciudad <> '' AND ciudad <> 'Por configurar';
-- =============================================================================
