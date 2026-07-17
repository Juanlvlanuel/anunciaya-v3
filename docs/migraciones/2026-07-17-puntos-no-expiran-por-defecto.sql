-- 2026-07-17 · Los puntos NO expiran por defecto
-- ==============================================================================
-- Decisión de producto: un negocio nace SIN expiración de puntos. Los puntos no
-- vencen hasta que el dueño active la expiración explícitamente en Business Studio
-- (Sistema de Puntos → Expiración de Puntos). Evita que el sistema "desaparezca"
-- puntos por defecto, que dañaba la credibilidad de CardYA.
--
-- `dias_expiracion_puntos` ya era nullable y NULL siempre significó "no expira"
-- (ver expirarPuntosPorInactividad en puntos.service.ts, que sale temprano si es
-- NULL). Esta migración solo quita el DEFAULT 90 de la columna para que las filas
-- futuras nazcan en NULL.
--
-- NO toca datos existentes: un negocio que ya configuró expiración (ej. 55 días)
-- la conserva. Solo cambia el default de filas nuevas.
--
-- Aditivo e idempotente. Correr en DEV y PROD.

BEGIN;

ALTER TABLE puntos_configuracion
  ALTER COLUMN dias_expiracion_puntos DROP DEFAULT;

COMMIT;

-- Verificación (correr aparte): el default debe salir NULL / vacío:
--   SELECT column_default
--   FROM information_schema.columns
--   WHERE table_name = 'puntos_configuracion'
--     AND column_name = 'dias_expiracion_puntos';
