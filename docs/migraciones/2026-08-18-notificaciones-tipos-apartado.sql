-- 2026-08-18: notificaciones — nuevos tipos del feature de Apartado
-- =============================================================================
--
-- 3 tipos nuevos del chat automático + notificaciones de Apartado
-- (docs/arquitectura/Catalogo_MarketPlace_Apartado.md §3.4):
--   - 'marketplace_articulo_apartado'   → al VENDEDOR, alguien apartó su artículo
--   - 'marketplace_apartado_rechazado'  → al COMPRADOR (con cuenta), el vendedor rechazó
--   - 'marketplace_apartado_vendido'    → al COMPRADOR (con cuenta), el vendedor confirmó la venta
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA. Parte de
-- los 44 valores dejados por 2026-08-07-notificaciones-dinamica-boleto-liberado.sql
-- + 3 nuevos = 47.
-- `referencia_tipo` no cambia (ya incluye 'marketplace').
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     estos 3 tipos (ya en código — sin esta migración, crearNotificacion  │
-- │     falla con "violates check constraint notificaciones_tipo_check" y    │
-- │     ninguna de las 3 notificaciones se crea).                            │
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
        'dinamica_boleto_liberado',
        -- ── Apartado / MarketPlace (agosto 2026) ─────────────────────────
        'marketplace_articulo_apartado',
        'marketplace_apartado_rechazado',
        'marketplace_apartado_vendido'
    ]::character varying[])::text[])
);

COMMIT;

-- VERIFICACIÓN:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'notificaciones_tipo_check';
--   (debe mostrar 47 valores)
-- =============================================================================
