-- =============================================================================
-- 2026-06-30: notificaciones — nuevo tipo 'comunidad_respuesta_comentario'
-- =============================================================================
--
-- Para los hilos de 1 nivel en las respuestas de la comunidad: cuando alguien
-- RESPONDE a tu comentario dentro de una pregunta del Home, se te avisa con
-- 'comunidad_respuesta_comentario'.
--
-- Los tipos de comunidad que ya existían se CONSERVAN y se siguen usando:
--   · 'pregunta_comunidad_respondida'          → al autor de la pregunta.
--   · 'pregunta_comunidad_seguida_respondida'  → a los interesados ("yo también").
--   · 'coyo_recomendacion'                     → al dueño de un item recomendado.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA (los 32
-- existentes + el nuevo = 33).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend de         │
-- │     comentarios de comunidad.                                             │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check CHECK (
    (tipo)::text = ANY ((ARRAY[
        'puntos_ganados',
        'voucher_generado',
        'voucher_cobrado',
        'nueva_oferta',
        'nueva_recompensa',
        'recompensa_desbloqueada',
        'cupon_asignado',
        'cupon_revocado',
        'nuevo_cliente',
        'voucher_pendiente',
        'stock_bajo',
        'nueva_resena',
        'sistema',
        'nuevo_marketplace',
        'nuevo_servicio',
        'alerta_seguridad',
        'marketplace_nuevo_mensaje',
        'marketplace_proxima_expirar',
        'marketplace_expirada',
        'marketplace_nueva_pregunta',
        'marketplace_pregunta_respondida',
        'servicios_nueva_pregunta',
        'servicios_pregunta_respondida',
        'pregunta_comunidad_respondida',
        'coyo_recomendacion',
        'pregunta_comunidad_seguida_respondida',
        'negocio_fuera_circulacion',
        'membresia_en_gracia',
        'marketplace_nuevo_comentario',
        'marketplace_respuesta_comentario',
        'servicios_nuevo_comentario',
        'servicios_respuesta_comentario',
        'comunidad_respuesta_comentario'
    ]::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'notificaciones_tipo_check';
-- =============================================================================
