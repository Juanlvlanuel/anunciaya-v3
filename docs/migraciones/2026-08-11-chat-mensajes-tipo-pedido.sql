-- =============================================================================
-- 2026-08-11: chat_mensajes — nuevo tipo 'pedido'
-- =============================================================================
--
-- Agrega el valor 'pedido' al CHECK de `chat_mensajes.tipo`. Permite que un
-- cliente arme una orden en el Catálogo público de un Negocio (varios
-- artículos + cantidades + nota) y la envíe como mensaje real de ChatYA —
-- a diferencia de las cards `tipo='sistema'` (auto-generadas por el
-- backend, snapshot de UN recurso ya existente, sin autor humano), este
-- mensaje SÍ tiene emisor (el cliente que arma el pedido) y su contenido
-- (items + total + nota) es compuesto por el cliente, no derivado de una
-- fila existente en BD — por eso es un `tipo` nuevo y no un subtipo más
-- dentro de `sistema`.
--
-- El backend NO necesita lógica nueva para insertar/enviar este tipo:
-- `enviarMensaje()` (chatya.service.ts) ya inserta cualquier `tipo`/
-- `contenido` que reciba sin validación por tipo (el único gate real es
-- este CHECK). El JSON de `contenido` para `tipo='pedido'`:
--   { "negocioNombre": "...", "sucursalId": "...",
--     "items": [{ "articuloId", "nombre", "precio", "cantidad", "subtotal" }],
--     "total": number, "nota": "..."|null }
--
-- NO se toca `chat_conversaciones.contexto_tipo` — el pedido se envía sobre
-- una conversación ya abierta con el negocio (contexto genérico 'negocio'),
-- no requiere su propio contexto de creación de conversación.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA de
-- valores (los 8 existentes + el nuevo).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD (misma BD de Supabase).                          │
-- │ Correr ANTES de que el código nuevo intente insertar este valor: si el   │
-- │ CHECK viejo sigue activo, enviar un pedido desde el Catálogo público     │
-- │ fallaría con un error de BD.                                             │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE chat_mensajes DROP CONSTRAINT IF EXISTS chat_msg_tipo_check;

ALTER TABLE chat_mensajes ADD CONSTRAINT chat_msg_tipo_check CHECK (
    (tipo)::text = ANY ((ARRAY[
        'texto',
        'imagen',
        'audio',
        'documento',
        'ubicacion',
        'contacto',
        'sistema',
        'cupon',
        'pedido'
    ]::character varying[])::text[])
);

-- ─────────────────────────────────────────────────────────────────────────
-- ADDENDUM (mismo día): `chat_conversaciones.ultimo_mensaje_tipo` tiene su
-- PROPIO CHECK (`chat_conv_ultimo_mensaje_tipo_check`), separado del de
-- `chat_mensajes.tipo` de arriba — se detectó al probar el envío real: el
-- INSERT en `chat_mensajes` pasaba, pero el UPDATE de preview en
-- `chat_conversaciones` (actualizarPreview) fallaba con este constraint y
-- revertía TODA la transacción (el mensaje nunca quedaba, aunque el
-- frontend ya había mostrado "enviado" de forma optimista). No estaba
-- reflejado en `schema.ts` — se agregó ahí también en este mismo cambio.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE chat_conversaciones DROP CONSTRAINT IF EXISTS chat_conv_ultimo_mensaje_tipo_check;

ALTER TABLE chat_conversaciones ADD CONSTRAINT chat_conv_ultimo_mensaje_tipo_check CHECK (
    ultimo_mensaje_tipo IS NULL OR (ultimo_mensaje_tipo)::text = ANY ((ARRAY[
        'texto',
        'imagen',
        'audio',
        'documento',
        'ubicacion',
        'contacto',
        'sistema',
        'cupon',
        'pedido'
    ]::character varying[])::text[])
);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conname IN ('chat_msg_tipo_check', 'chat_conv_ultimo_mensaje_tipo_check');
-- =============================================================================
