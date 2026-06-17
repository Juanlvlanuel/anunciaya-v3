-- =============================================================================
-- 2026-06-17: scanya_turnos — columna aviso_visto_at (aviso de turno auto-cerrado)
-- =============================================================================
--
-- Agrega `aviso_visto_at` (timestamptz, NULLABLE) a `scanya_turnos`. Marca cuándo
-- el dueño/gerente vio el aviso de que un turno se cerró automáticamente. NULL =
-- aún no lo ha visto.
--
-- Por qué importa: la usa `obtenerAvisoTurnoAutoCerrado()`, que corre DENTRO de
-- `loginDueno`. Si la columna falta, el login de ScanYA (POST /api/scanya/login-dueno)
-- truena con 500 (`column t.aviso_visto_at does not exist`) y nadie puede entrar.
--
-- Origen del hueco: la columna existía en el schema de Drizzle (schema.ts) y se
-- aplicó a desarrollo con `drizzle-kit push`, pero no se generó este archivo de
-- migración one-shot, así que nunca se corrió en producción (DEV ≠ PROD).
--
-- IDEMPOTENTE: usa IF NOT EXISTS.
-- =============================================================================

BEGIN;

ALTER TABLE scanya_turnos
    ADD COLUMN IF NOT EXISTS aviso_visto_at timestamptz;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'scanya_turnos' AND column_name = 'aviso_visto_at';
-- -- Debe devolver: aviso_visto_at | timestamp with time zone | YES
