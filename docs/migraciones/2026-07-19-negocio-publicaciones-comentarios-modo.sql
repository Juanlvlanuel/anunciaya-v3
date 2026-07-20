-- =============================================================================
-- 2026-07-19: negocio_publicaciones_comentarios — columna `modo`
-- =============================================================================
--
-- Antes, la etiqueta "Negocio" en un comentario se calculaba de forma
-- puramente ESTRUCTURAL (¿el autor es dueño/gerente del negocio dueño de la
-- publicación?), sin importar en qué modo estaba el usuario al escribir el
-- comentario. Resultado: un dueño que comenta desde Modo Personal igual
-- salía etiquetado "Negocio".
--
-- Ahora se guarda el modo activo AL MOMENTO de comentar. El backfill marca
-- 'comercial' en los comentarios que YA se mostraban con la etiqueta
-- "Negocio" bajo el criterio viejo (para no voltear de golpe el historial
-- existente); todo lo demás queda 'personal'.
--
-- IDEMPOTENTE.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que exige   │
-- │     la columna `modo` en el INSERT de negocio_publicaciones_comentarios.  │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE negocio_publicaciones_comentarios
    ADD COLUMN IF NOT EXISTS modo varchar(15) NOT NULL DEFAULT 'personal';

-- Backfill: comentarios de quien YA era dueño/gerente del negocio dueño de
-- la publicación (mismo criterio que el `es_vendedor` viejo) se marcan
-- 'comercial', preservando cómo se veían hasta ahora.
UPDATE negocio_publicaciones_comentarios c
SET modo = 'comercial'
FROM negocio_publicaciones p
INNER JOIN negocios n ON n.id = p.negocio_id
WHERE c.publicacion_id = p.id
  AND (
      n.usuario_id = c.autor_id
      OR EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = c.autor_id AND u.negocio_id = p.negocio_id
      )
  );

ALTER TABLE negocio_publicaciones_comentarios DROP CONSTRAINT IF EXISTS negocio_pub_comentarios_modo_check;

ALTER TABLE negocio_publicaciones_comentarios ADD CONSTRAINT negocio_pub_comentarios_modo_check CHECK (
    (modo)::text = ANY ((ARRAY['personal', 'comercial']::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT modo, count(*) FROM negocio_publicaciones_comentarios GROUP BY modo;
-- =============================================================================
