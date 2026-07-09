-- =============================================================================
-- 2026-07-09: notificaciones — nuevos tipos de estatus de pago de membresía
-- =============================================================================
--
-- Avisos PERSONALES al DUEÑO sobre el ciclo de su pago manual de membresía:
--   · 'pago_rechazado' → un admin rechazó su comprobante.
--   · 'pago_aprobado'  → un admin aprobó su pago (membresía activada).
--   · 'pago_anulado'   → un admin anuló un pago suyo (su vigencia pudo retroceder).
--
-- El tipo 'membresia_en_gracia' YA existe (migración 2026-06-10) — no se re-agrega.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA (los 33
-- existentes + los 3 nuevos = 36).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     estos tipos (rechazar/aprobar/anular pago).                           │
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
