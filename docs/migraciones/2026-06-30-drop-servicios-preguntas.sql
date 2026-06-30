-- =============================================================================
-- 2026-06-30: DROP servicios_preguntas (fase CONTRACT)
-- =============================================================================
--
-- Elimina la tabla vieja del Q&A de Servicios, ya reemplazada por
-- `servicios_comentarios` (ver 2026-06-30-servicios-comentarios.sql).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  CORRER SOLO DESPUÉS de validar en runtime que los comentarios        │
-- │     de Servicios funcionan y de confirmar que la migración de datos       │
-- │     quedó correcta. Esta tabla es el ÚNICO respaldo del Q&A viejo —        │
-- │     el DROP es irreversible. Va en DEV y en PROD.                          │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS servicios_preguntas;

COMMIT;

-- Verificación (debe devolver NULL):
--   SELECT to_regclass('public.servicios_preguntas');
-- =============================================================================
