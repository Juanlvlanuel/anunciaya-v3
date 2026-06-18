-- =============================================================================
-- 2026-06-18 · Permitir el concepto 'tarjeta' en pagos_membresia
-- =============================================================================
-- Sprint de Stripe · comprobante en cobros con TARJETA.
--
-- Hasta ahora `pagos_membresia` solo registraba pagos MANUALES (efectivo / transferencia / cortesía).
-- Para que los cobros automáticos de Stripe también emitan recibo con FOLIO correlativo (continuando
-- la misma serie que los manuales) y aparezcan en el historial del negocio, el webhook inserta una
-- fila con concepto 'tarjeta'. Esta migración amplía el CHECK para aceptar ese valor.
--
-- One-shot, idempotente. Correr en DEV y PROD.
-- =============================================================================

ALTER TABLE pagos_membresia DROP CONSTRAINT IF EXISTS pagos_membresia_concepto_check;

ALTER TABLE pagos_membresia ADD CONSTRAINT pagos_membresia_concepto_check
    CHECK ((concepto)::text = ANY (ARRAY['efectivo', 'transferencia', 'cortesia', 'tarjeta']::text[]));

-- El CHECK de "cortesía sin monto" se conserva como está (tarjeta lleva monto, no es cortesía):
--   pagos_membresia_cortesia_sin_monto_check: (concepto <> 'cortesia') OR (monto IS NULL)
