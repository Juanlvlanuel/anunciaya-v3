-- =============================================================================
-- 2026-07-19: notificaciones — comentario_id + tipos de comentario de Negocios
-- =============================================================================
--
-- Dos cambios:
--   1. Columna nueva `comentario_id` (nullable, sin FK — igual criterio que
--      `referencia_id`, que tampoco tiene FK porque apunta a tablas distintas
--      según el módulo). Permite deep-link con scroll + highlight al
--      comentario puntual que originó la notificación (MarketPlace y ahora
--      también Negocios).
--   2. Dos tipos nuevos para notificar comentarios en publicaciones de
--      Negocios (antes "fuera de alcance v1"): 'negocio_publicacion_nuevo_comentario'
--      y 'negocio_publicacion_respuesta_comentario' — mismo patrón 1:1 que
--      'marketplace_nuevo_comentario'/'marketplace_respuesta_comentario'.
--      Nuevo referencia_tipo 'negocio_publicacion' para acompañarlos.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA. La
-- lista de `tipo` parte del último estado aplicado (migración 2026-07-17,
-- que agregó 'puntos_por_vencer' = 37 valores) + los 2 nuevos = 39.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     'negocio_publicacion_nuevo_comentario'/'..._respuesta_comentario'.    │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS comentario_id varchar(100);

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
        'negocio_publicacion_respuesta_comentario'
    ]::character varying[])::text[])
);

ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_referencia_tipo_check;

ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_referencia_tipo_check CHECK (
    referencia_tipo IS NULL OR (referencia_tipo)::text = ANY ((ARRAY[
        'transaccion',
        'voucher',
        'oferta',
        'recompensa',
        'resena',
        'cupon',
        'marketplace',
        'servicio',
        'alerta',
        'pregunta_comunidad',
        'negocio_publicacion'
    ]::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname IN ('notificaciones_tipo_check', 'notificaciones_referencia_tipo_check');
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'notificaciones' AND column_name = 'comentario_id';
-- =============================================================================
