-- =============================================================================
-- 2026-08-05: chat_conversaciones — nuevo contexto_tipo 'dinamica'
-- =============================================================================
--
-- Agrega el valor 'dinamica' al CHECK de `chat_conversaciones.contexto_tipo`.
-- Permite que el botón "Contactar" de la ficha de una Dinámica
-- (PaginaDinamica.tsx) abra ChatYA con una card de contexto (foto + título +
-- precio por boleto) igual que ya pasa con MarketPlace/Servicios/Ofertas.
--
-- Dinámicas NO tiene columna FK dedicada (a diferencia de
-- articulo_marketplace_id / servicio_publicacion_id): reusa la columna
-- genérica `contexto_referencia_id`, mismo patrón que 'oferta' /
-- 'articulo_negocio' — no hace falta agregar ninguna columna nueva.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA de
-- valores (los 7 existentes + el nuevo).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD (misma BD de Supabase).                          │
-- │ Correr ANTES de que el código nuevo intente insertar este valor: si el   │
-- │ CHECK viejo sigue activo, crearObtenerConversacion() fallaría al abrir   │
-- │ ChatYA desde una Dinámica.                                                │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE chat_conversaciones DROP CONSTRAINT IF EXISTS chat_conv_contexto_tipo_check;

ALTER TABLE chat_conversaciones ADD CONSTRAINT chat_conv_contexto_tipo_check CHECK (
    (contexto_tipo)::text = ANY ((ARRAY[
        'negocio',
        'marketplace',
        'oferta',
        'articulo_negocio',
        'servicio',
        'directo',
        'notas',
        'dinamica'
    ]::character varying[])::text[])
);

COMMIT;
