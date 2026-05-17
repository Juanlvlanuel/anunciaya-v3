-- =============================================================================
-- 2026-05-15: ChatYA — FK opcional a servicios_publicaciones
-- =============================================================================
--
-- Agrega la columna `servicio_publicacion_id` a `chat_conversaciones`. Es el
-- equivalente exacto de `articulo_marketplace_id` pero apuntando a la nueva
-- tabla de Servicios.
--
-- Necesaria porque cuando un usuario abre ChatYA desde el detalle de un
-- servicio (botón "Contactar por ChatYA") o desde el perfil del prestador, el
-- chat queda asociado a la publicación para:
--
--   1. Insertar automáticamente una "card de contexto" como mensaje sistema
--      con snapshot del título, foto, precio, modalidad.
--   2. Que el comprador y el oferente puedan ver de un vistazo desde qué
--      publicación arrancó esta conversación.
--   3. Reusar la conversación si vuelven a contactar por la misma publicación
--      (no duplicar la card).
--
-- NOTAS IMPORTANTES:
--
-- - El check constraint `chat_conv_contexto_tipo_check` YA incluye el valor
--   'servicio' (revisado en schema.ts línea 2031). NO se modifica aquí.
--
-- - El parche al `chatya.service.ts` que inserta el mensaje-sistema con la
--   card snapshot llegará en Sprint 3 (junto con la BarraContacto del detalle).
--   En Sprint 1 solo dejamos lista la columna para que la FK exista cuando se
--   construya la lógica.
--
-- - ON DELETE SET NULL: si una publicación se elimina (soft o hard), la
--   conversación NO se borra (las personas pueden seguir hablando aunque la
--   publicación original ya no exista), pero pierde el link al snapshot.
--
-- Reflejar también en `apps/api/src/db/schemas/schema.ts` agregando el campo
-- `servicioPublicacionId` a la tabla `chatConversaciones`.
-- =============================================================================

BEGIN;

ALTER TABLE chat_conversaciones
    ADD COLUMN servicio_publicacion_id uuid
        REFERENCES servicios_publicaciones(id) ON DELETE SET NULL;

COMMENT ON COLUMN chat_conversaciones.servicio_publicacion_id IS
    'FK a la publicación de Servicios desde la que arrancó la conversación. NULL si no aplica. Análogo a articulo_marketplace_id.';

-- Índice parcial — solo indexamos filas con valor (ahorra espacio y mantiene
-- las queries del FE rápidas al filtrar conversaciones por publicación).
CREATE INDEX idx_chat_conv_servicio_publicacion
    ON chat_conversaciones(servicio_publicacion_id)
    WHERE servicio_publicacion_id IS NOT NULL;

COMMIT;
