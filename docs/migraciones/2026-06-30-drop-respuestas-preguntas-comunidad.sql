-- =============================================================================
-- 2026-06-30: DROP respuestas_preguntas_comunidad (fase CONTRACT)
-- =============================================================================
--
-- Elimina la tabla vieja de respuestas del Home/Coyo, ya reemplazada por
-- `comunidad_comentarios` (ver 2026-06-30-comunidad-comentarios.sql).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  CORRER SOLO DESPUÉS de validar en runtime que los comentarios del    │
-- │     Home funcionan y de confirmar que la migración de datos quedó bien.   │
-- │     Es el ÚNICO respaldo del Q&A viejo — el DROP es irreversible.         │
-- │     Va en DEV y en PROD.                                                   │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS respuestas_preguntas_comunidad;

COMMIT;

-- Verificación (debe devolver NULL):
--   SELECT to_regclass('public.respuestas_preguntas_comunidad');
-- =============================================================================
