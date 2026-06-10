-- =============================================================================
-- 2026-06-10: notificaciones — nuevo tipo 'membresia_en_gracia'
-- =============================================================================
--
-- Agrega el tipo 'membresia_en_gracia' al CHECK de la tabla `notificaciones`.
-- Es el AVISO PERSISTENTE al DUEÑO cuando su negocio de PAGO MANUAL entra en gracia
-- (su membresía venció y tiene unos días para ponerse al día antes de que lo suspendan).
-- Lo dispara el cron de expiración de manuales (suscripciones/vencimientos-manuales.ts).
-- El frontend lo muestra en el centro de notificaciones del MODO PERSONAL.
-- Se borra solo cuando el negocio sale de circulación o se reactiva/paga.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA de tipos
-- (los 27 existentes + el nuevo).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD (misma BD de Supabase).                          │
-- │ Correr ANTES de que el código nuevo intente insertar este tipo: si el    │
-- │ CHECK viejo sigue activo, el INSERT de la notificación fallaría.          │
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
        'membresia_en_gracia'
    ]::character varying[])::text[])
);

COMMIT;
