-- =============================================================================
-- 2026-07-25: comunidad_comentarios — columna `modo`
-- =============================================================================
--
-- Mismo patrón que 2026-07-19-negocio-publicaciones-comentarios-modo.sql, ahora
-- para los comentarios de Coyo (Home). Antes, comentar en el hilo de una
-- pregunta SIEMPRE mostraba la identidad PERSONAL del usuario (nombre + avatar),
-- sin importar si estaba en Modo Comercial. Con esta columna se guarda el modo
-- activo AL MOMENTO de comentar; si es 'comercial' y el autor tiene negocio
-- propio (dueño) o pertenece a uno (gerente/empleado), se muestra el
-- nombre + logo del NEGOCIO en vez de su identidad personal.
--
-- Sin backfill: Coyo nunca tuvo esta distinción, así que todo el historial
-- existente se queda 'personal' (comportamiento idéntico al de antes).
--
-- IDEMPOTENTE.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que exige   │
-- │     la columna `modo` en el INSERT de comunidad_comentarios.             │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE comunidad_comentarios
    ADD COLUMN IF NOT EXISTS modo varchar(15) NOT NULL DEFAULT 'personal';

ALTER TABLE comunidad_comentarios DROP CONSTRAINT IF EXISTS comunidad_comentarios_modo_check;

ALTER TABLE comunidad_comentarios ADD CONSTRAINT comunidad_comentarios_modo_check CHECK (
    (modo)::text = ANY ((ARRAY['personal', 'comercial']::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT modo, count(*) FROM comunidad_comentarios GROUP BY modo;
-- =============================================================================
