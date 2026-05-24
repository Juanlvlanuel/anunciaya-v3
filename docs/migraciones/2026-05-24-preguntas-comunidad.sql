-- =============================================================================
-- 2026-05-24: preguntas_comunidad — tabla base del feed "Pregúntale a [ciudad]"
-- =============================================================================
--
-- Crea la tabla mínima que alimenta el feed conversacional del Home
-- ("Pregúntale a Peñasco" en el beta). Cada fila es una pregunta del vecino
-- para su ciudad.
--
-- Decisiones de modelo (siguen patrones ya establecidos en el schema):
--
--   - `ciudad` y `estado` como varchar (NO FK a `regiones`). El frontend
--     resuelve la ubicación con `useGpsStore` contra un catálogo local de
--     ciudades; el UUID de `regiones` nunca viaja al frontend (ver informe).
--     Mismo formato que `negocio_sucursales` (onboarding de negocios).
--
--   - `estado` (geográfico, "Sonora") vs `estado_pregunta` (ciclo de vida):
--     nombres distintos para no confundir, y para que `WHERE estado = ...`
--     filtre por geografía sin colisionar con el estado de la publicación.
--
--   - `estado_pregunta` arranca en 'activa'. 'cerrada' = el autor la cierra
--     manualmente. 'oculta' = moderación (no se muestra pero queda en BD
--     para auditoría). Sin "eliminada" — si el usuario borra, la fila se
--     elimina (a futuro se puede soft-delete agregando `deleted_at`).
--
-- MVP intencionalmente mínimo: nada de keywords, categoría ni respuesta de
-- IA — esas columnas llegan en sprints posteriores.
--
-- Reflejar también en `apps/api/src/db/schemas/schema.ts` (al final).
--
-- IDEMPOTENTE: usa IF NOT EXISTS.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS preguntas_comunidad (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    texto           varchar(500) NOT NULL,

    -- Ubicación (texto plano, sin FK a regiones)
    ciudad          varchar(120) NOT NULL,
    estado          varchar(100) NOT NULL,

    -- Ciclo de vida de la pregunta (distinto del `estado` geográfico)
    estado_pregunta varchar(20) NOT NULL DEFAULT 'activa',

    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),

    CONSTRAINT preguntas_comunidad_estado_pregunta_check
        CHECK (estado_pregunta::text = ANY (
            ARRAY['activa', 'cerrada', 'oculta']::text[]
        ))
);

-- Índice principal: feed de la ciudad por más reciente
CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_ciudad_fecha
    ON preguntas_comunidad (ciudad, created_at DESC);

-- Índice auxiliar: "mis preguntas" / borrado en cascada por usuario
CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_usuario
    ON preguntas_comunidad (usuario_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'preguntas_comunidad'
-- ORDER BY ordinal_position;
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'preguntas_comunidad';
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'preguntas_comunidad'::regclass;
