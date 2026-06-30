-- =============================================================================
-- 2026-06-30: comunidad_comentarios — comentarios con hilos de 1 nivel (Home/Coyo)
-- =============================================================================
--
-- Espejo de marketplace_comentarios / servicios_comentarios, ahora para las
-- RESPUESTAS a preguntas de la comunidad ("Pregúntale a Peñasco"). Reemplaza
-- `respuestas_preguntas_comunidad` (planas) por comentarios con hilos de 1 nivel.
--
--   pregunta_id → la pregunta de comunidad (post) que se comenta (FK; CASCADE).
--   autor_id    → quién escribió el comentario (FK usuarios; CASCADE).
--   parent_id   → NULL = comentario raíz; con valor = respuesta a ese raíz
--                 (self-FK; CASCADE). 1 nivel (se valida en la app).
--   texto       → varchar(500) (unificado con MP/Servicios; antes era 1000).
--   editado_at  → última edición (el autor edita sin límite de tiempo).
--   deleted_at  → soft delete. En Coyo, SOLO el autor del comentario lo borra.
--
-- Reglas propias de Coyo que NO cambian (se aplican en el service, no aquí):
--   · el AUTOR DE LA PREGUNTA no puede comentar en su propio hilo (403);
--   · el autor de la pregunta NO modera (no borra respuestas ajenas).
--
-- Coyo (IA), "yo también", resuelta, expiración y deep-link viven en
-- `preguntas_comunidad` / `preguntas_interesados` y NO se tocan.
--
-- Patrón expand-migrate-contract: crea tabla nueva + copia datos. La tabla
-- vieja `respuestas_preguntas_comunidad` queda de respaldo; se elimina en un
-- -drop posterior tras validar. IDEMPOTENTE.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS comunidad_comentarios (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta_id uuid NOT NULL REFERENCES preguntas_comunidad(id)   ON DELETE CASCADE,
    autor_id    uuid NOT NULL REFERENCES usuarios(id)              ON DELETE CASCADE,
    parent_id   uuid          REFERENCES comunidad_comentarios(id) ON DELETE CASCADE, -- NULL = raíz
    texto       varchar(500) NOT NULL,
    editado_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

-- Listar los comentarios vivos de una pregunta.
CREATE INDEX IF NOT EXISTS idx_comunidad_comentarios_pregunta
    ON comunidad_comentarios (pregunta_id)
    WHERE deleted_at IS NULL;

-- Traer las respuestas vivas de un comentario raíz.
CREATE INDEX IF NOT EXISTS idx_comunidad_comentarios_parent
    ON comunidad_comentarios (parent_id)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- MIGRACIÓN DE DATOS desde respuestas_preguntas_comunidad
-- =============================================================================
-- Las respuestas viejas son todas planas (no hay hilos): cada una con estado
-- 'activa' se convierte en un comentario RAÍZ. Las 'borrada' no se migran.
-- El texto se recorta a 500 por si alguna excede (varchar(500)). Conservamos
-- el id original. Re-ejecutable (ON CONFLICT).
INSERT INTO comunidad_comentarios (id, pregunta_id, autor_id, parent_id, texto, editado_at, created_at, deleted_at)
SELECT
    r.id,
    r.pregunta_id,
    r.usuario_id,
    NULL,
    LEFT(r.texto, 500),
    NULL,
    r.created_at,
    NULL
FROM respuestas_preguntas_comunidad r
WHERE r.estado = 'activa'
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (8 columnas):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'comunidad_comentarios' ORDER BY ordinal_position;
--
-- Conteo (raíces migrados == respuestas activas):
--   SELECT
--     (SELECT count(*) FROM respuestas_preguntas_comunidad WHERE estado = 'activa') AS respuestas_activas,
--     (SELECT count(*) FROM comunidad_comentarios WHERE parent_id IS NULL)          AS raices;
-- =============================================================================
