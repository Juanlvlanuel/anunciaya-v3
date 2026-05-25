-- =============================================================================
-- 2026-05-24: preguntas_comunidad — columnas de respuesta de Coyo
-- =============================================================================
--
-- Agrega 4 columnas a `preguntas_comunidad` para soportar el procesamiento
-- asíncrono de Coyo (el "director de orquesta"):
--
--   1. `respuesta_coyo`     text NULL — texto cálido que Coyo redacta para
--                           presentar los resultados (1-2 frases). NULL si
--                           Coyo aún no procesó o falló.
--
--   2. `resultados_coyo`    jsonb NULL — los 4 grupos de resultados
--                           ({ negocios, ofertas, marketplace, servicios })
--                           tal como los devuelve `buscarEnTodaLaApp`, para
--                           que el frontend los pinte como tarjetas. NULL si
--                           Coyo no encontró nada o no procesó.
--
--   3. `estado_coyo`        varchar(20) NOT NULL DEFAULT 'pendiente' con
--                           CHECK que limita a 5 valores:
--                             · pendiente     → recién creada, Coyo aún no
--                                               la toca.
--                             · procesando    → Coyo está trabajando ahorita.
--                             · listo         → Coyo respondió y hay datos.
--                             · sin_respuesta → Coyo corrió pero no encontró
--                                               nada / IA no disponible. La
--                                               pregunta vive para la
--                                               comunidad.
--                             · no_aplica     → la pregunta no era búsqueda
--                                               local (Coyo redirigió).
--
--   4. `coyo_procesado_at`  timestamptz NULL — cuándo terminó el orquestador
--                           (cualquiera de los estados finales).
--
-- Modelo de ejecución: la pregunta se publica al instante con
-- estado_coyo='pendiente'; un fire-and-forget dispara el orquestador en
-- segundo plano; el frontend sondea con GET /api/preguntas-comunidad/:id/coyo.
--
-- Bonus: índice parcial sobre estado_coyo IN ('pendiente', 'procesando') —
-- pequeño y útil si en el futuro hay un cron que recoja preguntas "atascadas"
-- (ej. servidor reiniciado a mitad de procesamiento).
--
-- IDEMPOTENTE: usa IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.
-- =============================================================================

BEGIN;

-- 1. Columnas nuevas (todas opcionales / con default)
ALTER TABLE preguntas_comunidad
    ADD COLUMN IF NOT EXISTS respuesta_coyo     text,
    ADD COLUMN IF NOT EXISTS resultados_coyo    jsonb,
    ADD COLUMN IF NOT EXISTS estado_coyo        varchar(20) NOT NULL DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS coyo_procesado_at  timestamptz;

-- 2. CHECK del estado_coyo (drop+add por si la migración se re-corre)
ALTER TABLE preguntas_comunidad
    DROP CONSTRAINT IF EXISTS preguntas_comunidad_estado_coyo_check;
ALTER TABLE preguntas_comunidad
    ADD CONSTRAINT preguntas_comunidad_estado_coyo_check
    CHECK (estado_coyo::text = ANY (
        ARRAY['pendiente', 'procesando', 'listo', 'sin_respuesta', 'no_aplica']::text[]
    ));

-- 3. Índice parcial sobre preguntas aún sin terminar (cron futuro / monitoring)
CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_coyo_pendientes
    ON preguntas_comunidad (estado_coyo, created_at DESC)
    WHERE estado_coyo IN ('pendiente', 'procesando');

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'preguntas_comunidad'
-- ORDER BY ordinal_position;
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'preguntas_comunidad'::regclass
--   AND conname = 'preguntas_comunidad_estado_coyo_check';
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'preguntas_comunidad';
