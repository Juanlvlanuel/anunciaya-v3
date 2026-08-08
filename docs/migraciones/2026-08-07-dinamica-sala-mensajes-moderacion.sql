-- 2026-08-07: dinamica_sala_mensajes + dinamica_sala_moderacion (Fase 4.1)
-- =============================================================================
--
-- Chat en vivo de la sala del sorteo (broadcast N:N, sin destinatario — por
-- eso es tabla propia y NO reusa chat_conversaciones/chat_mensajes, cuyo
-- modelo es 1:1/negocio con estado de lectura por destinatario) y moderación
-- efímera POR EVENTO (silenciar/expulsar solo aplica a esa Dinámica, se borra
-- sola con ella). El bloqueo PERMANENTE no tiene tabla aquí: reusa
-- chat_bloqueados tal cual, vía bloquearUsuario()/desbloquearUsuario() de
-- chatya.service.ts.
--
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend de la sala. │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dinamica_sala_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dinamica_id UUID NOT NULL REFERENCES dinamicas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'sistema')),
    contenido TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 500),
    eliminado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dinamica_sala_mensajes_dinamica
    ON dinamica_sala_mensajes (dinamica_id, created_at);

CREATE TABLE IF NOT EXISTS dinamica_sala_moderacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dinamica_id UUID NOT NULL REFERENCES dinamicas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('silenciado', 'expulsado')),
    aplicado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    motivo VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dinamica_id, usuario_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_dinamica_sala_moderacion_dinamica
    ON dinamica_sala_moderacion (dinamica_id, usuario_id);

COMMIT;

-- VERIFICACIÓN:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('dinamica_sala_mensajes', 'dinamica_sala_moderacion');
-- =============================================================================
