-- =============================================================================
-- 2026-06-11-anular-pago.sql
-- Anulación (borrado lógico) de un pago de membresía.
--
-- Permite "cancelar" un recibo registrado por error: el pago NO se borra (queda para
-- auditoría), se marca como anulado con quién/cuándo/por qué. Al anular, la vigencia del
-- negocio se recalcula desde el pago más reciente NO anulado (solo negocios manuales).
--
-- One-shot. Correr en DEV y luego en PROD. Idempotente.
-- =============================================================================

ALTER TABLE pagos_membresia ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pagos_membresia ADD COLUMN IF NOT EXISTS anulado_at TIMESTAMPTZ;
ALTER TABLE pagos_membresia ADD COLUMN IF NOT EXISTS anulado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE pagos_membresia ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(500);

-- Índice para listar/recalcular ignorando los anulados (vigencia = último pago NO anulado).
CREATE INDEX IF NOT EXISTS idx_pagos_membresia_no_anulados
    ON pagos_membresia (negocio_id, fecha_pago DESC)
    WHERE anulado = false;
