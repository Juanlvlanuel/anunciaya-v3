-- 2026-08-07: notificaciones — nuevo tipo 'dinamica_boleto_liberado'
-- =============================================================================
--
-- Al participante CON CUENTA AnunciaYA cuando el organizador libera su
-- boleto (acción "Liberar boleto" en la lista de participantes) — el
-- número vuelve a estar disponible de inmediato y el participante pierde su
-- lugar. No aplica a participantes manuales "Sin cuenta AY" (no tienen
-- usuario al que notificar dentro de la app).
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA. Parte
-- de los 43 valores dejados por la migración
-- 2026-08-07-notificaciones-dinamica-boleto-reasignado.sql + 1 nuevo = 44.
-- `referencia_tipo` no cambia (ya incluye 'dinamica').
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     'dinamica_boleto_liberado'.                                          │
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
        'pago_anulado',
        'negocio_publicacion_nuevo_comentario',
        'negocio_publicacion_respuesta_comentario',
        'dinamica_pospuesta',
        'dinamica_resultado',
        'dinamica_pago_confirmado',
        'dinamica_boleto_reasignado',
        -- ── Dinámicas — boleto liberado (agosto 2026) ────────────────────
        'dinamica_boleto_liberado'
    ]::character varying[])::text[])
);

COMMIT;

-- VERIFICACIÓN:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'notificaciones_tipo_check';
--   (debe mostrar 44 valores)
-- =============================================================================
