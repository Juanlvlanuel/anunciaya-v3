-- ============================================================================
-- 2026-06-01 — Sprint 2.B' del Home / Coyo:
-- Nueva notificación `pregunta_comunidad_seguida_respondida` para los vecinos
-- que marcaron "Yo también quiero saber" en una pregunta del Home. Cuando
-- alguien responde a esa pregunta, cada interesado recibe esta notificación
-- (excepto el autor de la pregunta, que ya recibe la suya distinta, y el
-- responder mismo).
--
-- Extiende el CHECK existente `notificaciones_tipo_check` con UN solo valor
-- nuevo. No toca `notificaciones_referencia_tipo_check` porque
-- `'pregunta_comunidad'` ya está aceptado desde la migración anterior
-- (2026-06-01-notificaciones-coyo-comunidad.sql).
--
-- Idempotente: se puede aplicar varias veces sin romper nada (DROP CONSTRAINT
-- IF EXISTS).
--
-- Aplicar en: local + producción (Supabase).
-- ============================================================================

BEGIN;

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
        'coyo_recomendacion'::character varying,
        -- ── Sprint 2.B' — Notificación a interesados (Yo también) ────────
        'pregunta_comunidad_seguida_respondida'::character varying
    ])::text[]));

COMMIT;
