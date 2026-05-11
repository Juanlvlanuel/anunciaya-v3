-- =============================================================================
-- 2026-05-09: Retirar `'vendedor_marketplace'` de ChatYA
-- =============================================================================
--
-- Razón: el contexto "vine desde tu perfil" (subtipo `contacto_perfil`)
-- se retiró el 09 May 2026 — no aportaba valor real al receptor ni al
-- iniciador. Los chats nuevos desde el perfil del vendedor (P3) o desde el
-- popup del comentarista usan `'directo'` desde entonces.
--
-- Esta migración:
-- 1. Convierte conversaciones legacy `vendedor_marketplace` → `directo`.
-- 2. Actualiza el CHECK constraint quitando el valor legacy.
--
-- IMPORTANTE: ejecutar manualmente — Drizzle no genera ALTER de CHECK
-- constraints automáticamente. Reflejar también en `schema.ts`.
-- =============================================================================

BEGIN;

-- 1) Limpiar valores legacy en datos
UPDATE chat_conversaciones
SET contexto_tipo = 'directo'
WHERE contexto_tipo = 'vendedor_marketplace';

-- 2) Recrear el CHECK constraint sin el valor legacy
ALTER TABLE chat_conversaciones
  DROP CONSTRAINT IF EXISTS chat_conv_contexto_tipo_check;

ALTER TABLE chat_conversaciones
  ADD CONSTRAINT chat_conv_contexto_tipo_check
  CHECK (
    (contexto_tipo)::text = ANY (ARRAY[
      'negocio'::varchar,
      'marketplace'::varchar,
      'oferta'::varchar,
      'articulo_negocio'::varchar,
      'servicio'::varchar,
      'directo'::varchar,
      'notas'::varchar
    ]::text[])
  );

COMMIT;
