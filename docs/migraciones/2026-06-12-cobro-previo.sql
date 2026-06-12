-- =============================================================================
-- 2026-06-12-cobro-previo.sql
-- Fecha de cobro PREVIA a un pago manual (para deshacer el adelanto en Stripe).
--
-- Al registrar un pago manual en un negocio CON tarjeta, "Registrar pago" empuja el
-- trial_end de Stripe. Esta columna guarda la fecha de cobro que la suscripción tenía
-- JUSTO ANTES de ese pago. Así, al anular el ÚLTIMO pago vigente, se puede DEVOLVER el
-- cobro de Stripe a la fecha original (la del pago manual más antiguo del negocio) en
-- vez de dejarlo desincronizado. Negocios sin Stripe: la columna queda NULL (no se usa).
--
-- One-shot. Correr en DEV y luego en PROD. Idempotente.
-- =============================================================================

ALTER TABLE pagos_membresia ADD COLUMN IF NOT EXISTS cobro_previo TIMESTAMPTZ;
