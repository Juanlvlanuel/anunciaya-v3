-- ============================================================================
-- Migración: Vendedores y comisiones — Fase 2 (devengo + liquidación)
-- ----------------------------------------------------------------------------
-- Despierta y rediseña las tablas de comisiones para el modelo de MONTO FIJO
-- (no porcentajes) y crea las tablas de liquidación. La corre Juan en DEV y PROD.
--
-- Qué hace:
--   1) embajadores            — quita el modelo viejo de porcentajes (D3).
--   2) embajador_comisiones   — pasa de % a monto fijo; la recurrente es por
--      vendedor/periodo (no por-negocio): negocio_id nullable + columna periodo (D4).
--   3) pagos_vendedor (NUEVA) — bitácora de egresos: lo que se le paga al vendedor (D6).
--   4) vendedor_datos_cobro (NUEVA) — datos de cobro sensibles, aislados (D7).
--
-- Idempotente y transaccional. El módulo estaba "dormido" (sin backend de
-- comisiones), así que normalmente no hay datos que migrar.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) embajadores — quitar el modelo viejo de porcentajes (D3)
--    negocios_registrados se calcula EN VIVO (count de atribuidos), no se guarda.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE embajadores DROP CONSTRAINT IF EXISTS embajadores_porcentaje_primer_check;
ALTER TABLE embajadores DROP CONSTRAINT IF EXISTS embajadores_porcentaje_recurrente_check;
ALTER TABLE embajadores DROP CONSTRAINT IF EXISTS embajadores_negocios_check;

ALTER TABLE embajadores DROP COLUMN IF EXISTS porcentaje_primer_pago;
ALTER TABLE embajadores DROP COLUMN IF EXISTS porcentaje_recurrente;
ALTER TABLE embajadores DROP COLUMN IF EXISTS negocios_registrados;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) embajador_comisiones — de % a monto fijo + recurrente por periodo (D4)
-- ─────────────────────────────────────────────────────────────────────────────
-- 2a) Quitar el modelo de % (porcentaje + monto_base eran del cálculo por porcentaje).
ALTER TABLE embajador_comisiones DROP CONSTRAINT IF EXISTS embajador_comisiones_porcentaje_check;
ALTER TABLE embajador_comisiones DROP CONSTRAINT IF EXISTS embajador_comisiones_monto_base_check;
ALTER TABLE embajador_comisiones DROP COLUMN IF EXISTS porcentaje;
ALTER TABLE embajador_comisiones DROP COLUMN IF EXISTS monto_base;

-- 2b) La comisión RECURRENTE no es por-negocio (es # activos × monto del escalón) → negocio_id nullable.
ALTER TABLE embajador_comisiones ALTER COLUMN negocio_id DROP NOT NULL;

-- 2c) Periodo del devengo recurrente ('YYYY-MM'); NULL para la comisión de alta (que sí es por-negocio).
ALTER TABLE embajador_comisiones ADD COLUMN IF NOT EXISTS periodo varchar(7);

-- 2d) Desglose histórico de la fila (para el estado de cuenta sin recalcular contra datos que cambian):
--     recurrente → {"activos":12,"montoUnitario":30,"escalon":"10-24"}; alta → libre/NULL.
ALTER TABLE embajador_comisiones ADD COLUMN IF NOT EXISTS detalle jsonb;

-- 2e) tipo: alinear con D4 ('primer_pago' → 'alta'); 'recurrente' se queda.
UPDATE embajador_comisiones SET tipo = 'alta' WHERE tipo = 'primer_pago';
ALTER TABLE embajador_comisiones DROP CONSTRAINT IF EXISTS embajador_comisiones_tipo_check;
ALTER TABLE embajador_comisiones ADD CONSTRAINT embajador_comisiones_tipo_check
  CHECK ((tipo)::text = ANY (ARRAY['alta'::text, 'recurrente'::text]));

-- 2f) Coherencia de forma: recurrente lleva periodo y va sin negocio; alta va con negocio.
ALTER TABLE embajador_comisiones DROP CONSTRAINT IF EXISTS embajador_comisiones_forma_check;
ALTER TABLE embajador_comisiones ADD CONSTRAINT embajador_comisiones_forma_check CHECK (
  (tipo = 'recurrente' AND periodo IS NOT NULL AND negocio_id IS NULL)
  OR (tipo = 'alta' AND negocio_id IS NOT NULL)
);

-- 2g) Idempotencia del cron: a lo sumo UNA comisión recurrente por (vendedor, periodo).
CREATE UNIQUE INDEX IF NOT EXISTS uq_comision_recurrente_periodo
  ON embajador_comisiones (embajador_id, periodo)
  WHERE tipo = 'recurrente';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) pagos_vendedor (NUEVA) — bitácora de egresos: lo que se le PAGA al vendedor (D6)
--    (La gemela de eventos_pago/pagos_membresia, pero del lado de los egresos.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos_vendedor (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embajador_id    uuid NOT NULL REFERENCES embajadores(id) ON DELETE CASCADE,
  monto           numeric(10,2) NOT NULL,
  metodo          varchar(20) NOT NULL,
  fecha_pago      date NOT NULL DEFAULT CURRENT_DATE,
  periodo         varchar(7),                     -- mes que cubre, si aplica
  nota            varchar(500),
  registrado_por  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT pagos_vendedor_monto_check  CHECK (monto > 0),
  CONSTRAINT pagos_vendedor_metodo_check CHECK ((metodo)::text = ANY (ARRAY['transferencia'::text, 'efectivo'::text]))
);
CREATE INDEX IF NOT EXISTS idx_pagos_vendedor_embajador ON pagos_vendedor (embajador_id, fecha_pago DESC);

-- 3b) Vínculo comisión → pago que la liquidó (trazabilidad). Va DESPUÉS de crear pagos_vendedor.
ALTER TABLE embajador_comisiones ADD COLUMN IF NOT EXISTS pago_id uuid REFERENCES pagos_vendedor(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_embajador_comisiones_pago ON embajador_comisiones (pago_id) WHERE pago_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) vendedor_datos_cobro (NUEVA) — datos de cobro sensibles, aislados, 1 por vendedor (D7)
--    En lectura se enmascaran (últimos 4 de la CLABE) en el service; aquí se guardan completos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendedor_datos_cobro (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embajador_id     uuid NOT NULL UNIQUE REFERENCES embajadores(id) ON DELETE CASCADE,
  metodo           varchar(20) NOT NULL DEFAULT 'transferencia',
  banco            varchar(80),
  clabe            varchar(18),                   -- CLABE = 18 dígitos
  titular          varchar(120),
  nota             varchar(300),
  actualizado_por  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT vendedor_datos_cobro_metodo_check CHECK ((metodo)::text = ANY (ARRAY['transferencia'::text, 'efectivo'::text]))
);

COMMIT;

-- ── Verificación ────────────────────────────────────────────────────────────
-- \d embajadores
-- \d embajador_comisiones
-- \d pagos_vendedor
-- \d vendedor_datos_cobro
-- SELECT tipo, count(*) FROM embajador_comisiones GROUP BY tipo;
