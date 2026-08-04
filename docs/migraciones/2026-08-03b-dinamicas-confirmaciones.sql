-- 2026-08-03b · dinamicas.confirmaciones (checklist legal, Fase 2)
-- ==============================================================================
-- Fase 1 (migración 2026-08-03-dinamicas-fase1-tablas.sql, ya aplicada en DEV)
-- no incluyó el checklist legal del organizador — quedó fuera de ese alcance.
-- Fase 2 (composer de creación) lo necesita: evidencia de que el organizador
-- aceptó responsabilidad (el premio es real, el cobro es fuera de la app, se
-- compromete al resultado del sorteo). Mismo patrón que
-- `articulos_marketplace.confirmaciones` (JSONB, snapshot inmutable con
-- `aceptadasAt` puesto por el backend, nunca por el cliente).
--
-- A diferencia de MarketPlace, aquí se llena al PUBLICAR (borrador→activa),
-- no al crear el borrador — por eso es nullable: un borrador sin publicar
-- puede no tener confirmaciones todavía.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS. Aditivo, sin impacto en filas
-- existentes (si ya hay Dinámicas en borrador, quedan con `confirmaciones`
-- NULL hasta que las publiquen).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Correr en DEV primero, luego PROD. Antes de desplegar el backend de   │
-- │     Fase 2 (que empieza a exigir `confirmaciones` al publicar).           │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ==============================================================================

BEGIN;

ALTER TABLE dinamicas ADD COLUMN IF NOT EXISTS confirmaciones jsonb;

COMMIT;

-- VERIFICACIÓN:
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'dinamicas' AND column_name = 'confirmaciones';
--
-- ROLLBACK:
--   ALTER TABLE dinamicas DROP COLUMN IF EXISTS confirmaciones;
-- ==============================================================================
