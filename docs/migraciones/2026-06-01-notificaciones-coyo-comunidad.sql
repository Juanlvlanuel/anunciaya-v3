-- ============================================================================
-- 2026-06-01 — Sprint 1.D del Home / Coyo:
-- Notificaciones nuevas (extiende los CHECK constraints existentes):
--   (a) `pregunta_comunidad_respondida` — al autor cuando alguien responde
--       a su pregunta del Home.
--   (b) `coyo_recomendacion` — al gerente (fallback dueño) cuando un negocio,
--       oferta o servicio aparece en los resultados de Coyo para una pregunta.
--       También para usuarios que publican en Marketplace cuando su artículo
--       aparece.
--
-- También agrega 'pregunta_comunidad' al CHECK de `referencia_tipo` — ambas
-- notificaciones nuevas usan ese referenciaTipo apuntando al `preguntas_
-- comunidad.id`.
--
-- Idempotente: se puede aplicar varias veces sin romper nada (DROP CONSTRAINT
-- IF EXISTS).
--
-- Aplicar en: local + producción (Supabase).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Extender `notificaciones_tipo_check` con los 2 tipos nuevos
-- ============================================================================
-- Postgres no tiene "ALTER CHECK CONSTRAINT" — hay que dropearlo y crearlo
-- de nuevo con la lista completa de valores aceptados.

ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check
    CHECK ((tipo)::text = ANY ((ARRAY[
        'puntos_ganados'::character varying,
        'voucher_generado'::character varying,
        'voucher_cobrado'::character varying,
        'nueva_oferta'::character varying,
        'nueva_recompensa'::character varying,
        'recompensa_desbloqueada'::character varying,
        'cupon_asignado'::character varying,
        'cupon_revocado'::character varying,
        'nuevo_cliente'::character varying,
        'voucher_pendiente'::character varying,
        'stock_bajo'::character varying,
        'nueva_resena'::character varying,
        'sistema'::character varying,
        'nuevo_marketplace'::character varying,
        'nuevo_servicio'::character varying,
        'alerta_seguridad'::character varying,
        'marketplace_nuevo_mensaje'::character varying,
        'marketplace_proxima_expirar'::character varying,
        'marketplace_expirada'::character varying,
        'marketplace_nueva_pregunta'::character varying,
        'marketplace_pregunta_respondida'::character varying,
        'servicios_nueva_pregunta'::character varying,
        'servicios_pregunta_respondida'::character varying,
        -- ── Sprint 1.D — Home / Coyo ──────────────────────────────────────
        'pregunta_comunidad_respondida'::character varying,
        'coyo_recomendacion'::character varying
    ])::text[]));

-- ============================================================================
-- 2. Extender `notificaciones_referencia_tipo_check` con 'pregunta_comunidad'
-- ============================================================================

ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_referencia_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_referencia_tipo_check
    CHECK (
        referencia_tipo IS NULL
        OR (referencia_tipo)::text = ANY ((ARRAY[
            'transaccion'::character varying,
            'voucher'::character varying,
            'oferta'::character varying,
            'recompensa'::character varying,
            'resena'::character varying,
            'cupon'::character varying,
            'marketplace'::character varying,
            'servicio'::character varying,
            'alerta'::character varying,
            -- ── Sprint 1.D — apunta a `preguntas_comunidad.id` ──────────
            'pregunta_comunidad'::character varying
        ])::text[])
    );

COMMIT;
