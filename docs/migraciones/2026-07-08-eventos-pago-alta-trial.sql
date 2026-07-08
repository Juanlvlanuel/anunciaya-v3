-- ============================================================================
-- Bitácora financiera (eventos_pago): nuevo tipo 'alta_trial'
-- ----------------------------------------------------------------------------
-- Contexto: el alta de un negocio con periodo de PRUEBA (trial) no genera cobro,
-- por lo que antes no dejaba rastro en la Bitácora de Suscripciones del Panel
-- (el badge contaba la suscripción pero la bitácora salía vacía). Se agrega el
-- tipo 'alta_trial' (monto NULL, origen 'stripe') para registrar ese evento y
-- dar trazabilidad completa del ciclo de vida.
--
-- Idempotente. Correr en las 2 Supabase (DEV y PROD).
-- Recrea el CHECK de eventos_pago.tipo agregando 'alta_trial' a la lista.
-- ============================================================================
BEGIN;

ALTER TABLE eventos_pago DROP CONSTRAINT IF EXISTS eventos_pago_tipo_check;

ALTER TABLE eventos_pago ADD CONSTRAINT eventos_pago_tipo_check
  CHECK ((tipo)::text = ANY ((ARRAY[
    'cobro_exitoso'::character varying,
    'cobro_fallido'::character varying,
    'cancelacion'::character varying,
    'pago_manual'::character varying,
    'alta_trial'::character varying
  ])::text[]));

COMMIT;
