-- ============================================================================
-- 2026-06-01 — Sprint 1 del Home / Coyo:
--   (a) Respuestas de comunidad a las preguntas del Home.
--   (b) "Yo también quiero saber" — sumarse a una pregunta existente.
--   (c) Columna `resuelta_at` para que el autor marque su pregunta como resuelta.
--
-- Idempotente: se puede aplicar varias veces sin romper nada (`CREATE TABLE IF
-- NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.).
--
-- Aplicar en: local + producción (Supabase).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Tabla `respuestas_preguntas_comunidad`
--    Cada fila es una respuesta de un vecino a una pregunta del Home.
--    No hay threads (respuestas a respuestas) — diseño deliberado para
--    mantener el feed ordenado y NO convertirlo en chat grupal.
-- ============================================================================

CREATE TABLE IF NOT EXISTS respuestas_preguntas_comunidad (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta_id  UUID NOT NULL REFERENCES preguntas_comunidad(id) ON DELETE CASCADE,
    usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    texto        VARCHAR(1000) NOT NULL,
    -- Soft-delete por el autor de la respuesta. `borrada` se conserva en BD
    -- para mantener orden cronológico estable de las respuestas activas,
    -- pero no se devuelve en el feed. Hard-delete físico podría hacerse en
    -- un cron posterior si fuera necesario.
    estado       VARCHAR(20) NOT NULL DEFAULT 'activa',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT respuestas_preguntas_comunidad_estado_check
        CHECK (estado IN ('activa', 'borrada')),
    CONSTRAINT respuestas_preguntas_comunidad_texto_len
        CHECK (length(trim(texto)) > 0 AND length(texto) <= 1000)
);

-- Índice principal del feed por pregunta (más reciente primero, solo activas).
CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta_fecha
    ON respuestas_preguntas_comunidad(pregunta_id, created_at DESC)
    WHERE estado = 'activa';

-- Para "mis respuestas" — listar las respuestas de un usuario.
CREATE INDEX IF NOT EXISTS idx_respuestas_usuario
    ON respuestas_preguntas_comunidad(usuario_id);

-- ============================================================================
-- 2. Tabla `preguntas_interesados`
--    Cada fila es un "Yo también quiero saber" — un vecino se suma a una
--    pregunta existente sin republicarla. La PRIMARY KEY compuesta garantiza
--    que cada usuario solo se puede sumar una vez por pregunta (idempotente).
-- ============================================================================

CREATE TABLE IF NOT EXISTS preguntas_interesados (
    pregunta_id  UUID NOT NULL REFERENCES preguntas_comunidad(id) ON DELETE CASCADE,
    usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pregunta_id, usuario_id)
);

-- Para "qué preguntas me interesan" desde el perfil del usuario.
CREATE INDEX IF NOT EXISTS idx_interesados_usuario
    ON preguntas_interesados(usuario_id);

-- ============================================================================
-- 3. Columna `resuelta_at` en `preguntas_comunidad`
--    Cuando el autor marca su pregunta como resuelta, se setea con NOW().
--    La pregunta sigue siendo `estado_pregunta='activa'` (puede recibir más
--    respuestas), pero el frontend la trata distinto (ícono ✓, ordenada al
--    final, etc.).
-- ============================================================================

ALTER TABLE preguntas_comunidad
    ADD COLUMN IF NOT EXISTS resuelta_at TIMESTAMPTZ;

COMMIT;
