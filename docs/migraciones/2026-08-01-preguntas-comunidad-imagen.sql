-- ============================================================================
-- 2026-08-01 — Foto opcional en preguntas del Home / Coyo.
--
-- Agrega `imagen_url` a `preguntas_comunidad`: el vecino puede adjuntar UNA
-- foto a su pregunta (sube a R2, carpeta `preguntas/`). Coyo la manda a
-- Gemini junto al texto (multimodal) para afinar los términos de búsqueda
-- cuando la imagen aporta contexto que el texto no da.
--
-- Idempotente: `ADD COLUMN IF NOT EXISTS`.
--
-- Aplicar en: local + producción (Supabase).
-- ============================================================================

BEGIN;

ALTER TABLE preguntas_comunidad
    ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);

COMMIT;
