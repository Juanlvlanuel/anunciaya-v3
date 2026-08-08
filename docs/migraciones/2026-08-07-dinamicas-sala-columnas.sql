-- 2026-08-07: dinamicas — sala en vivo + configuración del sorteo (Fase 4.1)
-- =============================================================================
--
-- Agrega las columnas que permiten programar la sala en vivo del sorteo y
-- configurar, desde el composer, cuántos lugares premiados hay (K) y a qué
-- intento (bola sorteada sin reemplazo) sale cada uno (N). El estado de la
-- sala NO es una columna nueva: reusa `dinamicas.estado` (activa/pospuesta →
-- en_sorteo → cerrada), que ya declaraba esos valores desde Fase 1 sin que
-- nada los usara todavía.
--
-- También agrega a `dinamica_ganadores` el lugar (1ro, 2do, ...) y el
-- número de intento en que salió cada ganador, con UNIQUE(dinamica_id, lugar)
-- para que no pueda haber dos ganadores en el mismo lugar.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + DROP CONSTRAINT IF EXISTS antes de
-- recrear los CHECK (Postgres no soporta "ADD CONSTRAINT IF NOT EXISTS").
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que emite   │
-- │     numeroLugaresGanadores/numeroIntentosSorteo/salaProgramadaPara.      │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE dinamicas
    ADD COLUMN IF NOT EXISTS sala_programada_para TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS numero_lugares_ganadores INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS numero_intentos_sorteo INTEGER;

ALTER TABLE dinamicas DROP CONSTRAINT IF EXISTS dinamicas_numero_lugares_ganadores_check;
ALTER TABLE dinamicas
    ADD CONSTRAINT dinamicas_numero_lugares_ganadores_check CHECK (numero_lugares_ganadores > 0);

ALTER TABLE dinamicas DROP CONSTRAINT IF EXISTS dinamicas_numero_intentos_sorteo_check;
ALTER TABLE dinamicas
    ADD CONSTRAINT dinamicas_numero_intentos_sorteo_check
    CHECK (numero_intentos_sorteo IS NULL OR numero_intentos_sorteo >= numero_lugares_ganadores);

ALTER TABLE dinamica_ganadores
    ADD COLUMN IF NOT EXISTS lugar SMALLINT,
    ADD COLUMN IF NOT EXISTS numero_intento INTEGER;

ALTER TABLE dinamica_ganadores DROP CONSTRAINT IF EXISTS dinamica_ganadores_lugar_check;
ALTER TABLE dinamica_ganadores
    ADD CONSTRAINT dinamica_ganadores_lugar_check CHECK (lugar > 0);

ALTER TABLE dinamica_ganadores DROP CONSTRAINT IF EXISTS dinamica_ganadores_dinamica_lugar_key;
ALTER TABLE dinamica_ganadores
    ADD CONSTRAINT dinamica_ganadores_dinamica_lugar_key UNIQUE (dinamica_id, lugar);

COMMIT;

-- VERIFICACIÓN:
--   SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'dinamicas'
--     AND column_name IN ('sala_programada_para', 'numero_lugares_ganadores', 'numero_intentos_sorteo');
--
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'dinamica_ganadores' AND column_name IN ('lugar', 'numero_intento');
-- =============================================================================
