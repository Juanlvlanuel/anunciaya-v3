-- =============================================================================
-- 2026-06-29: marketplace_comentarios — comentarios públicos con hilos de 1 nivel
-- =============================================================================
--
-- Reemplaza el modelo Q&A de `marketplace_preguntas` (1 fila = pregunta + respuesta
-- del vendedor embebidas) por COMENTARIOS públicos al instante, estilo feed:
--
--   1 fila = 1 mensaje. Un comentario raíz (parent_id NULL) puede tener
--   respuestas (parent_id = id del raíz). Solo 1 nivel de anidación —
--   "responder a una respuesta" cuelga del mismo raíz (se valida en la app).
--
--   articulo_id → sobre qué artículo es (FK; CASCADE: si se borra el artículo,
--                 se van sus comentarios).
--   autor_id    → quién lo escribió (FK usuarios; CASCADE).
--   parent_id   → NULL = comentario raíz; con valor = respuesta a ese raíz
--                 (self-FK; CASCADE: borrar el raíz arrastra sus respuestas).
--   texto       → contenido (máx 500; unifica los 200/respuesta-500 del modelo viejo).
--   editado_at  → marca de última edición (el autor edita SIN límite de tiempo).
--   deleted_at  → soft delete (autor del comentario O dueño del artículo).
--
-- Visibilidad: TODO es público al instante (ya no hay "pendiente"). El filtro de
-- "1 nivel" (un parent no puede a su vez tener parent) se valida en el service,
-- no con constraint de BD (CHECK no admite subconsultas).
--
-- Patrón expand-migrate-contract: esta migración SOLO crea la tabla nueva y copia
-- los datos. `marketplace_preguntas` queda intacta como respaldo y se elimina en
-- una migración -drop posterior, una vez validado en DEV y PROD.
--
-- Tabla NUEVA y aislada: no toca columnas existentes. IDEMPOTENTE (IF NOT EXISTS +
-- ON CONFLICT + NOT EXISTS), se puede re-ejecutar sin duplicar.
-- =============================================================================

BEGIN;

-- ── Tabla ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_comentarios (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id uuid NOT NULL REFERENCES articulos_marketplace(id)   ON DELETE CASCADE,
    autor_id    uuid NOT NULL REFERENCES usuarios(id)                ON DELETE CASCADE,
    parent_id   uuid          REFERENCES marketplace_comentarios(id) ON DELETE CASCADE, -- NULL = raíz
    texto       varchar(500) NOT NULL,
    editado_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

-- Listar los comentarios vivos de un artículo (consulta principal del feed/detalle).
CREATE INDEX IF NOT EXISTS idx_mp_comentarios_articulo
    ON marketplace_comentarios (articulo_id)
    WHERE deleted_at IS NULL;

-- Traer las respuestas vivas de un comentario raíz.
CREATE INDEX IF NOT EXISTS idx_mp_comentarios_parent
    ON marketplace_comentarios (parent_id)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- MIGRACIÓN DE DATOS desde marketplace_preguntas
-- =============================================================================
-- Se migran solo las filas VIVAS (deleted_at IS NULL). Cada pregunta-respondida
-- se DESDOBLA en 2 filas: el comentario raíz (comprador) + la respuesta (vendedor).

-- 1) Comentarios raíz = cada pregunta viva.
--    Conservamos el id ORIGINAL de la pregunta como id del raíz, para que la
--    respuesta pueda referenciarlo como parent_id sin tablas puente.
--    ON CONFLICT (id) DO NOTHING → re-ejecutable sin duplicar.
INSERT INTO marketplace_comentarios (id, articulo_id, autor_id, parent_id, texto, editado_at, created_at, deleted_at)
SELECT
    p.id,
    p.articulo_id,
    p.comprador_id,
    NULL,
    p.pregunta,
    p.editada_at,
    p.created_at,
    NULL
FROM marketplace_preguntas p
WHERE p.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2) Respuestas = cada pregunta viva que tenga respuesta del vendedor.
--    autor = dueño del artículo (articulos_marketplace.usuario_id).
--    parent_id = id de la pregunta (= id del raíz insertado arriba).
--    created_at = respondida_at (cuándo respondió el vendedor).
--    NOT EXISTS → re-ejecutable: no re-inserta si ya hay una respuesta para ese raíz.
INSERT INTO marketplace_comentarios (id, articulo_id, autor_id, parent_id, texto, editado_at, created_at, deleted_at)
SELECT
    gen_random_uuid(),
    p.articulo_id,
    a.usuario_id,
    p.id,
    p.respuesta,
    NULL,
    COALESCE(p.respondida_at, p.created_at),
    NULL
FROM marketplace_preguntas p
INNER JOIN articulos_marketplace a ON a.id = p.articulo_id
WHERE p.deleted_at IS NULL
  AND p.respuesta IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM marketplace_comentarios c WHERE c.parent_id = p.id
  );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (8 columnas; parent_id/editado_at/deleted_at nullable):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'marketplace_comentarios'
--   ORDER BY ordinal_position;
--
-- Constraints (PK + 3 FK: articulo_id/autor_id/parent_id):
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'marketplace_comentarios'::regclass ORDER BY conname;
--
-- Conteo esperado vs. origen:
--   -- Raíces migrados == preguntas vivas:
--   SELECT
--     (SELECT count(*) FROM marketplace_preguntas WHERE deleted_at IS NULL)                       AS preguntas_vivas,
--     (SELECT count(*) FROM marketplace_comentarios WHERE parent_id IS NULL)                       AS raices,
--     (SELECT count(*) FROM marketplace_preguntas WHERE deleted_at IS NULL AND respuesta IS NOT NULL) AS respuestas_origen,
--     (SELECT count(*) FROM marketplace_comentarios WHERE parent_id IS NOT NULL)                   AS respuestas_migradas;
--
-- Integridad 1 nivel (debe dar 0 filas — ningún parent es a su vez respuesta):
--   SELECT c.id FROM marketplace_comentarios c
--   JOIN marketplace_comentarios pp ON pp.id = c.parent_id
--   WHERE pp.parent_id IS NOT NULL;
-- =============================================================================
