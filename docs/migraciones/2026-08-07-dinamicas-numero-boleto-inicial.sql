-- 2026-08-07: dinamicas — numeración de boletos elegible por el organizador
-- =============================================================================
--
-- Antes los boletos siempre numeraban 1..numeroTotalBoletos. Ahora el
-- organizador puede elegir el número inicial al crear la Dinámica (ej.
-- empezar en 100 en vez de 1) — el número final se sigue calculando
-- siempre como `numeroBoletoInicial + numeroTotalBoletos - 1`, nunca se
-- guarda como columna aparte.
--
-- Default 1 + NOT NULL: todas las Dinámicas ya existentes (numeradas 1..N)
-- quedan consistentes sin tocar sus filas.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     el campo `numeroBoletoInicial`.                                      │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE dinamicas
    ADD COLUMN IF NOT EXISTS numero_boleto_inicial INTEGER NOT NULL DEFAULT 1;

COMMIT;

-- VERIFICACIÓN:
--   SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'dinamicas' AND column_name = 'numero_boleto_inicial';
-- =============================================================================
