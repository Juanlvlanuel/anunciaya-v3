-- ============================================================================
-- Migración: embajador_comisiones.monto_pagado (Liquidación v2 — abonos)
-- ----------------------------------------------------------------------------
-- Permite ABONOS PARCIALES: una comisión deja de ser "todo o nada". `monto_pagado`
-- acumula lo saldado (por abono en transferencia/efectivo + por compensación de
-- efectivo). El estado pasa a 'pagada' cuando monto_pagado >= monto_comision; entre
-- 0 y el total se considera "parcial" (derivado en la lectura, sin tocar el CHECK).
-- La corre Juan en DEV y PROD. Idempotente.
-- ============================================================================

ALTER TABLE embajador_comisiones
  ADD COLUMN IF NOT EXISTS monto_pagado numeric(10,2) NOT NULL DEFAULT 0;

-- Coherencia con lo ya existente: las comisiones ya 'pagada' cuentan como saldadas completas.
UPDATE embajador_comisiones
SET monto_pagado = monto_comision
WHERE estado = 'pagada' AND monto_pagado = 0;

-- Verificación:
--   SELECT estado, monto_comision, monto_pagado FROM embajador_comisiones;
