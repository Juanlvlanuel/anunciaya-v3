-- =============================================================================
-- 2026-06-29: notificaciones — nuevos tipos de COMENTARIOS de MarketPlace
-- =============================================================================
--
-- Agrega 2 tipos al CHECK de `notificaciones`, para el nuevo modelo de
-- comentarios públicos con hilos (reemplaza el Q&A de marketplace_preguntas):
--
--   'marketplace_nuevo_comentario'    → al DUEÑO del artículo cuando alguien
--                                        comenta en su publicación.
--   'marketplace_respuesta_comentario'→ al AUTOR de un comentario cuando
--                                        alguien le responde.
--
-- Los tipos viejos ('marketplace_nueva_pregunta' / '..._pregunta_respondida')
-- se CONSERVAN en el CHECK: pueden existir notificaciones históricas con ellos.
--
-- IDEMPOTENTE: DROP CONSTRAINT IF EXISTS + ADD con la lista COMPLETA de tipos
-- (los 28 existentes + los 2 nuevos = 30).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD (misma BD de Supabase).                          │
-- │ Correr ANTES de desplegar el backend de comentarios: si el CHECK viejo   │
-- │ sigue activo, el INSERT de estas notificaciones fallaría.                │
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
        'marketplace_respuesta_comentario'
    ]::character varying[])::text[])
);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Debe listar los 2 tipos nuevos dentro de la definición del CHECK:
--   SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname = 'notificaciones_tipo_check';
-- =============================================================================
