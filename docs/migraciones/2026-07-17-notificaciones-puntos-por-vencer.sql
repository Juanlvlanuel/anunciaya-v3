-- =============================================================================
-- 2026-07-17: notificaciones — nuevo tipo 'puntos_por_vencer'
-- =============================================================================
--
-- Aviso PERSONAL al CLIENTE cuando sus puntos en un negocio están por vencer
-- (aviso previo, ~7 días antes). Lo emite el cron diario de expiración de puntos.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA (los 36
-- existentes + 'puntos_por_vencer' = 37). La lista parte del último estado
-- aplicado (migración 2026-07-09, que agregó los 3 tipos de pago).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     'puntos_por_vencer'.                                                  │
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
        'puntos_por_vencer',
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
        'comunidad_respuesta_comentario',
        'pago_rechazado',
        'pago_aprobado',
        'pago_anulado'
    ]::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'notificaciones_tipo_check';
-- =============================================================================
