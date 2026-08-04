-- 2026-08-03: notificaciones — tipos de Dinámicas + corrige drift de producción
-- =============================================================================
--
-- Dos cosas en esta migración:
--
--   1. Dos tipos nuevos para el módulo Dinámicas (Fase 1):
--        'dinamica_pospuesta' → al organizador y participantes cuando se
--                               pospone la fecha límite de inscripción.
--        'dinamica_resultado' → a los participantes cuando se anuncia el
--                               ganador del sorteo.
--      Nuevo referencia_tipo 'dinamica' para acompañarlos (apunta a
--      `dinamicas.id`, mismo criterio que 'marketplace'/'servicio').
--
--   2. Corrige un drift real detectado entre `schema.ts` y la BD de
--      producción: la migración 2026-07-09-notificaciones-tipos-pago-membresia.sql
--      agregó 'pago_rechazado', 'pago_aprobado' y 'pago_anulado' a la BD, y
--      quedaron confirmados en el estado real hasta la migración
--      2026-07-19-notificaciones-comentarios-negocio-y-comentario-id.sql (39
--      valores) — pero el `CHECK` que quedó escrito en `schema.ts` nunca los
--      tuvo. Esta migración parte de la lista REAL de 2026-07-19 (no de lo
--      que decía `schema.ts`) para no dejar caer esos 3 valores.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA. La
-- lista de `tipo` parte del último estado real aplicado (39 valores,
-- migración 2026-07-19) + los 2 nuevos = 41. La de `referencia_tipo` parte
-- de 11 valores (sin drift, coincidía con schema.ts) + 1 nuevo = 12.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     'dinamica_pospuesta'/'dinamica_resultado'.                           │
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
        -- ── Dinámicas (Fase 1, agosto 2026) ─────────────────────────────
        'dinamica_pospuesta',
        'dinamica_resultado'
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
        'negocio_publicacion',
        -- ── Dinámicas (Fase 1, agosto 2026) — apunta a `dinamicas.id` ────
        'dinamica'
    ]::character varying[])::text[])
);

COMMIT;

-- VERIFICACIÓN:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname IN ('notificaciones_tipo_check', 'notificaciones_referencia_tipo_check');
--   (debe mostrar 41 valores en tipo, 12 en referencia_tipo)
-- =============================================================================
