-- =============================================================================
-- 2026-04-28: Chat — Mis Notas multi-sucursal (backfill emisor_sucursal_id)
-- =============================================================================
--
-- Contexto: Mis Notas pasa a ser independiente por sucursal — cuando el
-- operador (dueño o gerente) cambia de sucursal activa, debe ver SOLO las
-- notas que escribió estando en esa sucursal. El bug previo: el mismo
-- mensaje aparecía a la derecha en una sucursal y a la izquierda en otra
-- (efecto espejo) porque la lógica `mensajeEsMio` del frontend ya considera
-- la tupla (emisorId, emisorSucursalId) por la Coherencia A inter-sucursal
-- introducida en el Sprint 13.
--
-- Esta migración backfilea `emisor_sucursal_id` para mensajes históricos
-- de Mis Notas que tenían NULL:
--   - Si el emisor es DUEÑO (negocio.usuario_id = emisor_id):
--       → asigna la Matriz del negocio (sucursal con es_principal = true).
--   - Si el emisor es GERENTE (usuarios.sucursal_asignada NOT NULL):
--       → asigna su sucursal asignada.
--   - Si no se puede resolver (caso raro):
--       → se deja NULL (el filtro del backend tolera NULL como "personal"
--         en modo no-comercial).
--
-- Idempotente: solo toca filas con emisor_sucursal_id IS NULL en
-- conversaciones tipo 'notas'.
-- =============================================================================

-- Backfill DUEÑOS: notas escritas por el dueño del negocio → Matriz del negocio
UPDATE chat_mensajes m
SET emisor_sucursal_id = ns.id
FROM chat_conversaciones c, negocios n, negocio_sucursales ns
WHERE m.conversacion_id = c.id
  AND c.contexto_tipo = 'notas'
  AND m.emisor_sucursal_id IS NULL
  AND n.usuario_id = m.emisor_id        -- el emisor es dueño del negocio
  AND ns.negocio_id = n.id
  AND ns.es_principal = true;

-- Backfill GERENTES: notas escritas por gerente con sucursal asignada
UPDATE chat_mensajes m
SET emisor_sucursal_id = u.sucursal_asignada
FROM chat_conversaciones c, usuarios u
WHERE m.conversacion_id = c.id
  AND c.contexto_tipo = 'notas'
  AND m.emisor_sucursal_id IS NULL
  AND u.id = m.emisor_id
  AND u.sucursal_asignada IS NOT NULL;
