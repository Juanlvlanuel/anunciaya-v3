-- =============================================================================
-- 2026-06-30: DROP marketplace_preguntas (fase CONTRACT)
-- =============================================================================
--
-- Elimina la tabla vieja del Q&A de MarketPlace, ya reemplazada por
-- `marketplace_comentarios` (ver 2026-06-29-marketplace-comentarios.sql).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  CORRER SOLO DESPUÉS de validar en runtime que los comentarios        │
-- │     funcionan (crear / responder / editar / eliminar) y de confirmar      │
-- │     que la migración de datos quedó correcta. Esta tabla es el ÚNICO      │
-- │     respaldo de los datos del Q&A viejo — el DROP es irreversible.        │
-- │     Va en DEV y en PROD.                                                   │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS marketplace_preguntas;

COMMIT;

-- Verificación (debe devolver 0 filas):
--   SELECT to_regclass('public.marketplace_preguntas');  -- => NULL si se eliminó
-- =============================================================================
