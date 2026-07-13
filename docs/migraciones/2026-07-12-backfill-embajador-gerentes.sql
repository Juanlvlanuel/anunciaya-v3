-- 2026-07-12 · Backfill: figura de VENDEDOR (embajador) para gerentes existentes
-- ============================================================================
-- A partir de ahora un gerente es "gerente y vendedor" a la vez: puede traer negocios en su propia
-- cartera (con comisiones), atribuidos vía `negocios.embajador_id`. `altaGerente`/`reasignarRegion` ya
-- lo crean/sincronizan para los NUEVOS; este script lo hace para los gerentes que YA existen.
--
-- Idempotente (NOT EXISTS + ON CONFLICT DO NOTHING). Correr en DEV y PROD. Si no hay gerentes, no hace nada.

BEGIN;

-- 1) Crear el embajador (código autogenerado único: 6 letras del nombre + 5 hex del uuid) para cada
--    gerente que aún no tenga uno.
INSERT INTO embajadores (usuario_id, codigo_referido, estado)
SELECT u.id,
       UPPER(REGEXP_REPLACE(SUBSTRING(COALESCE(u.nombre, 'GERENTE') FROM 1 FOR 6), '[^A-Za-z0-9]', '', 'g'))
         || UPPER(SUBSTRING(REPLACE(u.id::text, '-', '') FROM 1 FOR 5)),
       'activo'
FROM usuarios u
WHERE u.rol_equipo = 'gerente'
  AND NOT EXISTS (SELECT 1 FROM embajadores e WHERE e.usuario_id = u.id);

-- 2) Marcar es_embajador = true en esos gerentes.
UPDATE usuarios
SET es_embajador = true
WHERE rol_equipo = 'gerente' AND es_embajador IS DISTINCT FROM true;

-- 3) Cobertura = todas las ciudades ACTIVAS de la región del gerente.
INSERT INTO embajador_ciudades (embajador_id, ciudad_id)
SELECT e.id, c.id
FROM embajadores e
JOIN usuarios u ON u.id = e.usuario_id AND u.rol_equipo = 'gerente'
JOIN ciudades c ON c.region_id = u.region_id AND c.activa = true
ON CONFLICT DO NOTHING;

COMMIT;
