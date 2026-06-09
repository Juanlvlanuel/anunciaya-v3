-- =============================================================================
-- 2026-06-09: pagos_membresia — bitácora de pagos manuales de membresía
-- =============================================================================
--
-- Primer ladrillo de la "bitácora de pagos" (Pagos_Suscripciones.md §12). Registra
-- cada acción "Marcar pagado" del Panel (Parada 2 · Opción A): el comerciante pagó
-- en efectivo/transferencia (ingreso) o se le dio cortesía (sin monto). El empuje
-- del cobro en Stripe (trial_end) y el estado del negocio viven en `negocios`; esta
-- tabla es SOLO el registro contable/histórico (antes ese dato se perdía por
-- completo: solo quedaba la acción en admin_auditoria, sin monto ni concepto).
--
--   concepto:        efectivo | transferencia | cortesia
--   monto:           numeric(10,2) — NULL en cortesía (no es ingreso); el CHECK lo exige
--   meses_cubiertos: N cuando se eligió "por meses"; NULL en "fecha exacta"
--   periodo_hasta:   la fecha de vencimiento aplicada (= trial_end empujado en Stripe)
--   registrado_por:  el admin/superadmin que lo registró (SET NULL si se borra el usuario)
--
-- NO toca Stripe ni `negocios`. Tabla NUEVA y aislada: no afecta nada existente.
-- IDEMPOTENTE: CREATE TABLE / CREATE INDEX IF NOT EXISTS.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS pagos_membresia (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id      uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    monto           numeric(10,2),                                   -- NULL en cortesía
    concepto        varchar(20)  NOT NULL,                           -- efectivo | transferencia | cortesia
    fecha_pago      timestamptz  NOT NULL DEFAULT now(),
    meses_cubiertos integer,                                         -- N en "por meses"; NULL en "fecha exacta"
    periodo_hasta   timestamptz  NOT NULL,                           -- vencimiento aplicado (= trial_end)
    registrado_por  uuid REFERENCES usuarios(id) ON DELETE SET NULL, -- quién lo registró
    nota            varchar(500),
    created_at      timestamptz  DEFAULT now(),
    CONSTRAINT pagos_membresia_concepto_check
        CHECK (concepto IN ('efectivo','transferencia','cortesia')),
    CONSTRAINT pagos_membresia_monto_check
        CHECK (monto IS NULL OR monto >= 0),
    -- Cortesía = sin ingreso → nunca lleva monto (decisión de producto).
    CONSTRAINT pagos_membresia_cortesia_sin_monto_check
        CHECK (concepto <> 'cortesia' OR monto IS NULL)
);

-- Historial de un negocio (lo más reciente primero) — para la futura UI de bitácora.
CREATE INDEX IF NOT EXISTS idx_pagos_membresia_negocio
    ON pagos_membresia (negocio_id, created_at DESC);

-- Lookup por periodo cubierto — lo usa el webhook trial_will_end para saber el
-- concepto del periodo que está por terminar (cortesía → suprime aviso; efectivo/
-- transferencia → avisa "se cobrará el día X").
CREATE INDEX IF NOT EXISTS idx_pagos_membresia_periodo
    ON pagos_membresia (negocio_id, periodo_hasta);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (10 columnas; monto/meses_cubiertos/registrado_por/nota nullable):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'pagos_membresia'
--   ORDER BY ordinal_position;
--
-- Constraints (PK + FK negocio_id/registrado_por + 3 CHECK):
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'pagos_membresia'::regclass ORDER BY conname;
--
-- Índices (los 2 idx_pagos_membresia_*):
--   SELECT indexname FROM pg_indexes WHERE tablename = 'pagos_membresia';
--
-- Prueba rápida del CHECK de cortesía (debe FALLAR):
--   INSERT INTO pagos_membresia (negocio_id, concepto, monto, periodo_hasta)
--   VALUES ((SELECT id FROM negocios LIMIT 1), 'cortesia', 100, now() + interval '1 month');
--   -- ↑ ERROR: new row violates check constraint "pagos_membresia_cortesia_sin_monto_check"
-- =============================================================================
