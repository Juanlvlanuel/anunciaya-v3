-- Migración: permitir múltiples preguntas por usuario por artículo
-- ===================================================================
-- Antes: cada comprador podía hacer SOLO UNA pregunta por artículo
-- (constraint UNIQUE (articulo_id, comprador_id)).
-- Después: el usuario puede preguntar las veces que quiera.
--
-- Decisión Juan (07-may-2026): el feed v1.2 muestra todas las preguntas
-- inline (respondidas + pendientes), respondidas primero. Sin límite.
-- ===================================================================

ALTER TABLE marketplace_preguntas
DROP CONSTRAINT IF EXISTS preguntas_unique_comprador;

-- Index nuevo: para listar todas las preguntas de un artículo ordenadas
-- por estado (respondidas primero) + fecha. Reemplaza al de filtro
-- "respondidas only" cuando se necesita la lista completa.
CREATE INDEX IF NOT EXISTS idx_preguntas_articulo_ordenadas
    ON marketplace_preguntas(
        articulo_id,
        (CASE WHEN respondida_at IS NULL THEN 1 ELSE 0 END),
        respondida_at DESC NULLS LAST,
        created_at DESC
    )
    WHERE deleted_at IS NULL;
