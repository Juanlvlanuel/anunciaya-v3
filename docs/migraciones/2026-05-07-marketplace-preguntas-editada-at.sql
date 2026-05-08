-- Migración: agregar columna editada_at a marketplace_preguntas
-- ===================================================================
-- Cuando un comprador edita su pregunta pendiente, registramos el
-- timestamp para mostrar la marca "(editada)" en la UI por transparencia
-- (los futuros lectores del Q&A público sabrán que el texto cambió).
--
-- NULL = pregunta nunca editada.
-- timestamp = última edición.
--
-- Decisión Juan (07-may-2026): se permite editar solo preguntas pendientes
-- (respondida_at IS NULL). Después de respondida queda inmutable.
-- ===================================================================

ALTER TABLE marketplace_preguntas
ADD COLUMN IF NOT EXISTS editada_at TIMESTAMPTZ;

COMMENT ON COLUMN marketplace_preguntas.editada_at IS
    'Timestamp de última edición del comprador. NULL si nunca se editó.';
