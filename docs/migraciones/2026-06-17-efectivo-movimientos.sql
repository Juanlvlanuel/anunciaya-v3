-- ============================================================================
-- Migración: efectivo_movimientos (Vendedores · pieza D — cortes de efectivo)
-- ----------------------------------------------------------------------------
-- Libro de movimientos del efectivo que el VENDEDOR te debe entregar (cobró
-- membresías en efectivo). Saldo = Σ cobros − Σ (entregas + compensaciones).
--   - cobro        → el vendedor cobró efectivo de un negocio (le carga deuda)
--   - entrega      → entregó efectivo en físico (lo confirma super/gerente)
--   - compensacion → se descontó de un pago de comisión (neteo, pieza E)
-- La corre Juan en DEV y PROD. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS efectivo_movimientos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embajador_id    uuid NOT NULL REFERENCES embajadores(id) ON DELETE CASCADE,
  tipo            varchar(20) NOT NULL,
  monto           numeric(10,2) NOT NULL,
  negocio_id      uuid REFERENCES negocios(id) ON DELETE SET NULL,        -- en 'cobro'
  pago_id         uuid REFERENCES pagos_vendedor(id) ON DELETE SET NULL,  -- en 'compensacion'
  fecha           date NOT NULL DEFAULT CURRENT_DATE,
  registrado_por  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  nota            varchar(500),
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT efectivo_mov_monto_check CHECK (monto > 0),
  CONSTRAINT efectivo_mov_tipo_check  CHECK ((tipo)::text = ANY (ARRAY['cobro'::text, 'entrega'::text, 'compensacion'::text]))
);

CREATE INDEX IF NOT EXISTS idx_efectivo_mov_embajador ON efectivo_movimientos (embajador_id, created_at DESC);

-- Verificación:
-- \d efectivo_movimientos
