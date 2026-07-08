-- =============================================================================
-- 2026-07-08: Web Push — tabla push_suscripciones
-- =============================================================================
--
-- Guarda las suscripciones de notificaciones push (una por dispositivo/navegador
-- que el usuario autoriza). La usa el backend para enviar push a la PWA cuando
-- llega un mensaje de ChatYA y el usuario NO está conectado por socket
-- (app minimizada o cerrada).
--
-- Espejo exacto de `pushSuscripciones` en schema.ts.
--
-- - endpoint UNIQUE: lo emite el navegador; upsert por endpoint al re-suscribir.
-- - ON DELETE CASCADE: si se borra el usuario, se borran sus suscripciones.
-- - Autolimpieza en runtime: push.service borra filas cuyo push service
--   responde 404/410 (suscripción expirada/revocada).
--
-- Idempotente: se puede correr más de una vez sin error.
-- Correr en las 2 Supabase (dev y prod).
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_suscripciones (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint          TEXT NOT NULL,
    p256dh            TEXT NOT NULL,
    auth              TEXT NOT NULL,
    user_agent        VARCHAR(300),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultima_actividad  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT push_suscripciones_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_suscripciones_usuario
    ON push_suscripciones USING btree (usuario_id);
