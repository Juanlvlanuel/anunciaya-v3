-- =============================================================================
-- 2026-06-11-folio-recibo.sql
-- Folio SECUENCIAL GLOBAL para los recibos de pago de membresía.
--
-- Qué resuelve: el recibo PDF usaba `pagos_membresia.id` (un UUID) como folio. Se cambia
-- a un número correlativo (00001, 00002, …) COMPARTIDO entre todos los que registran pagos
-- (vendedor / gerente / superadmin). Una SECUENCIA de Postgres es atómica y global → entrega
-- números en orden, sin duplicados, aunque dos personas registren un pago al mismo tiempo.
--
-- One-shot. Correr en DEV y luego en PROD. Idempotente (IF NOT EXISTS / ON CONFLICT).
-- =============================================================================

-- 1) Columna del folio.
ALTER TABLE pagos_membresia ADD COLUMN IF NOT EXISTS folio INTEGER;

-- 2) Secuencia dedicada (se borra junto con la columna gracias a OWNED BY).
CREATE SEQUENCE IF NOT EXISTS pagos_membresia_folio_seq OWNED BY pagos_membresia.folio;

-- 3) Backfill: asigna folio a los pagos YA existentes, en orden cronológico.
UPDATE pagos_membresia p
SET folio = s.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY fecha_pago ASC, created_at ASC) AS rn
    FROM pagos_membresia
) s
WHERE p.id = s.id AND p.folio IS NULL;

-- 4) Avanza la secuencia más allá del máximo ya asignado (si no había filas → arranca en 1).
SELECT setval('pagos_membresia_folio_seq', COALESCE((SELECT MAX(folio) FROM pagos_membresia), 0));

-- 5) Default para filas nuevas + unicidad.
ALTER TABLE pagos_membresia ALTER COLUMN folio SET DEFAULT nextval('pagos_membresia_folio_seq');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagos_membresia_folio_unique'
    ) THEN
        ALTER TABLE pagos_membresia ADD CONSTRAINT pagos_membresia_folio_unique UNIQUE (folio);
    END IF;
END $$;
