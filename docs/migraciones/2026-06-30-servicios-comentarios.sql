-- =============================================================================
-- 2026-06-30: servicios_comentarios — comentarios públicos con hilos de 1 nivel
-- =============================================================================
--
-- Espejo de marketplace_comentarios (ver 2026-06-29-marketplace-comentarios.sql),
-- ahora para la sección SERVICIOS. Reemplaza el Q&A de `servicios_preguntas`
-- (1 fila = pregunta + respuesta del dueño embebidas) por COMENTARIOS públicos
-- al instante:
--
--   1 fila = 1 mensaje. `parent_id` NULL = raíz; con valor = respuesta a ese raíz
--   (1 nivel). "Responder a una respuesta" cuelga del raíz (se valida en la app).
--
--   publicacion_id → sobre qué publicación de servicio es (FK; CASCADE).
--   autor_id       → quién lo escribió (FK usuarios; CASCADE).
--   parent_id      → NULL = raíz; con valor = respuesta (self-FK; CASCADE).
--   texto          → contenido (máx 500; unifica los 200/respuesta-500 del modelo viejo).
--   editado_at     → última edición (el autor edita SIN límite de tiempo).
--   deleted_at     → soft delete (autor del comentario O dueño de la publicación).
--
-- Visibilidad: TODO público al instante (ya no hay "pendiente").
--
-- Patrón expand-migrate-contract: esta migración SOLO crea la tabla nueva y copia
-- los datos. `servicios_preguntas` queda intacta como respaldo y se elimina en una
-- migración -drop posterior, una vez validado en DEV y PROD.
--
-- Tabla NUEVA y aislada: no toca columnas existentes. IDEMPOTENTE.
-- =============================================================================

BEGIN;

-- ── Tabla ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios_comentarios (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id uuid NOT NULL REFERENCES servicios_publicaciones(id) ON DELETE CASCADE,
    autor_id       uuid NOT NULL REFERENCES usuarios(id)                ON DELETE CASCADE,
    parent_id      uuid          REFERENCES servicios_comentarios(id)   ON DELETE CASCADE, -- NULL = raíz
    texto          varchar(500) NOT NULL,
    editado_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);

-- Listar los comentarios vivos de una publicación (consulta principal del detalle).
CREATE INDEX IF NOT EXISTS idx_servicios_comentarios_publicacion
    ON servicios_comentarios (publicacion_id)
    WHERE deleted_at IS NULL;

-- Traer las respuestas vivas de un comentario raíz.
CREATE INDEX IF NOT EXISTS idx_servicios_comentarios_parent
    ON servicios_comentarios (parent_id)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- MIGRACIÓN DE DATOS desde servicios_preguntas
-- =============================================================================
-- Solo filas VIVAS (deleted_at IS NULL). Cada pregunta-respondida se DESDOBLA en
-- 2 filas: el comentario raíz (autor de la pregunta) + la respuesta (dueño).

-- 1) Comentarios raíz = cada pregunta viva. Conservamos el id ORIGINAL para que
--    la respuesta lo referencie como parent_id. Re-ejecutable (ON CONFLICT).
INSERT INTO servicios_comentarios (id, publicacion_id, autor_id, parent_id, texto, editado_at, created_at, deleted_at)
SELECT
    p.id,
    p.publicacion_id,
    p.autor_id,
    NULL,
    p.pregunta,
    p.editada_at,
    p.created_at,
    NULL
FROM servicios_preguntas p
WHERE p.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2) Respuestas = cada pregunta viva con respuesta del dueño.
--    autor = dueño de la publicación (servicios_publicaciones.usuario_id).
--    parent_id = id de la pregunta (= id del raíz). Re-ejecutable (NOT EXISTS).
INSERT INTO servicios_comentarios (id, publicacion_id, autor_id, parent_id, texto, editado_at, created_at, deleted_at)
SELECT
    gen_random_uuid(),
    p.publicacion_id,
    s.usuario_id,
    p.id,
    p.respuesta,
    NULL,
    COALESCE(p.respondida_at, p.created_at),
    NULL
FROM servicios_preguntas p
INNER JOIN servicios_publicaciones s ON s.id = p.publicacion_id
WHERE p.deleted_at IS NULL
  AND p.respuesta IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM servicios_comentarios c WHERE c.parent_id = p.id
  );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (8 columnas; parent_id/editado_at/deleted_at nullable):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'servicios_comentarios'
--   ORDER BY ordinal_position;
--
-- Conteo esperado vs. origen:
--   SELECT
--     (SELECT count(*) FROM servicios_preguntas WHERE deleted_at IS NULL)                              AS preguntas_vivas,
--     (SELECT count(*) FROM servicios_comentarios WHERE parent_id IS NULL)                              AS raices,
--     (SELECT count(*) FROM servicios_preguntas WHERE deleted_at IS NULL AND respuesta IS NOT NULL)     AS respuestas_origen,
--     (SELECT count(*) FROM servicios_comentarios WHERE parent_id IS NOT NULL)                          AS respuestas_migradas;
--
-- Integridad 1 nivel (debe dar 0 filas):
--   SELECT c.id FROM servicios_comentarios c
--   JOIN servicios_comentarios pp ON pp.id = c.parent_id
--   WHERE pp.parent_id IS NOT NULL;
-- =============================================================================
