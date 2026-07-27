-- =============================================================================
-- 2026-07-26: preguntas_interesados — columna `modo`
-- =============================================================================
--
-- "Yo también quiero saber" no tenía noción de Personal/Comercial: la marca
-- de interés es la misma para la cuenta sin importar el modo (correcto —
-- no expone identidad pública como un comentario, así que no tiene sentido
-- duplicarla por modo), pero la notificación de "respondieron una pregunta
-- que sigues" (`pregunta_comunidad_seguida_respondida`) SIEMPRE llegaba en
-- modo Personal, sin importar el modo con el que el interesado marcó su
-- interés. Se agrega `modo` para grabar ese dato al marcar y usarlo
-- dinámicamente en la notificación — mismo patrón que
-- `comunidad_comentarios.modo` / `preguntas_comunidad.modo`.
--
-- El toggle "activo"/"marcado" sigue siendo por `(pregunta_id, usuario_id)`
-- — sin cambios ahí, solo se agrega el dato de en qué modo se marcó.
--
-- Sin backfill: la columna nunca existió, así que todo el historial
-- existente se queda 'personal' (comportamiento idéntico al de antes).
--
-- IDEMPOTENTE.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que exige   │
-- │     la columna `modo` en el INSERT de preguntas_interesados.             │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE preguntas_interesados
    ADD COLUMN IF NOT EXISTS modo varchar(15) NOT NULL DEFAULT 'personal';

ALTER TABLE preguntas_interesados DROP CONSTRAINT IF EXISTS preguntas_interesados_modo_check;

ALTER TABLE preguntas_interesados ADD CONSTRAINT preguntas_interesados_modo_check CHECK (
    (modo)::text = ANY ((ARRAY['personal', 'comercial']::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT modo, count(*) FROM preguntas_interesados GROUP BY modo;
-- =============================================================================
