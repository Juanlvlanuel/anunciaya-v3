-- =============================================================================
-- 2026-07-25: preguntas_comunidad — columna `modo`
-- =============================================================================
--
-- Mismo patrón que 2026-07-25-comunidad-comentarios-modo.sql, ahora aplicado a
-- la PREGUNTA (el post raíz de Coyo), no solo a sus comentarios. Antes, una
-- pregunta SIEMPRE mostraba la identidad PERSONAL de quien la publicó, sin
-- importar si estaba en Modo Comercial. Con esta columna se guarda el modo
-- activo AL MOMENTO de publicar la pregunta; si es 'comercial' y el autor
-- tiene negocio propio (dueño) o pertenece a uno (gerente/empleado), se
-- muestra el nombre + logo del NEGOCIO en vez de su identidad personal.
--
-- Sin backfill: esta distinción nunca existió, así que todo el historial
-- existente se queda 'personal' (comportamiento idéntico al de antes).
--
-- IDEMPOTENTE.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que exige   │
-- │     la columna `modo` en el INSERT de preguntas_comunidad.               │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE preguntas_comunidad
    ADD COLUMN IF NOT EXISTS modo varchar(15) NOT NULL DEFAULT 'personal';

ALTER TABLE preguntas_comunidad DROP CONSTRAINT IF EXISTS preguntas_comunidad_modo_check;

ALTER TABLE preguntas_comunidad ADD CONSTRAINT preguntas_comunidad_modo_check CHECK (
    (modo)::text = ANY ((ARRAY['personal', 'comercial']::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT modo, count(*) FROM preguntas_comunidad GROUP BY modo;
-- =============================================================================
