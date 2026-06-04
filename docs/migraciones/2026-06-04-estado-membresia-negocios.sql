-- =============================================================================
-- 2026-06-04: negocios — estado de membresía (cimiento del webhook de renovaciones)
-- =============================================================================
--
-- Ronda 1 de 3 del webhook de renovaciones. Crea SOLO el "dónde guardar" el
-- estado de la membresía de cada negocio y su línea de tiempo. NO toca lógica
-- de webhook, comisiones ni configs (eso es de rondas posteriores).
--
-- Agrega 5 columnas a `negocios`:
--
--   `estado_membresia varchar(20)` NOT NULL DEFAULT 'al_corriente'
--       4 estados: al_corriente / en_gracia / suspendido / cancelado.
--       - en_gracia = falló el cobro pero sigue en su plazo; el negocio SIGUE
--         visible y funcionando, marcado "en riesgo".
--       - Para comisiones (ronda futura): activo = al_corriente | en_gracia.
--       - El trial se trata como al_corriente (no hay estado 'trial' aparte).
--   `fecha_vencimiento timestamptz`      — fin del periodo vigente (pagado/trial).
--   `fecha_proximo_cobro timestamptz`    — próximo intento de cobro de Stripe.
--   `fecha_inicio_gracia timestamptz`    — cuándo entró en gracia (NULL si no).
--   `fecha_limite_gracia timestamptz`    — cuándo se suspende si no paga. Se
--       calcula UNA VEZ al entrar en gracia y queda FIJA: si el periodo de
--       gracia cambia en el Panel, los negocios que ya estaban en gracia
--       conservan su plazo original; solo los nuevos usan el número nuevo.
--
-- NEGOCIOS EXISTENTES: la columna `estado_membresia` se crea con DEFAULT
-- 'al_corriente' NOT NULL, así que Postgres rellena TODAS las filas actuales
-- en 'al_corriente' y las fechas en NULL. Ningún negocio queda suspendido,
-- invisible ni roto. Las fechas (NULL = aún no sincronizado con Stripe) las
-- llenará el webhook en la Ronda 2 al procesar el próximo evento de cada
-- suscripción, o un backfill opcional contra Stripe.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + guardas para constraint e índice.
-- =============================================================================

BEGIN;

-- 1) Columnas de estado y línea de tiempo
ALTER TABLE negocios
    ADD COLUMN IF NOT EXISTS estado_membresia    varchar(20) NOT NULL DEFAULT 'al_corriente',
    ADD COLUMN IF NOT EXISTS fecha_vencimiento   timestamptz,
    ADD COLUMN IF NOT EXISTS fecha_proximo_cobro timestamptz,
    ADD COLUMN IF NOT EXISTS fecha_inicio_gracia timestamptz,
    ADD COLUMN IF NOT EXISTS fecha_limite_gracia timestamptz;

-- 2) Validación de los 4 estados permitidos (guarda de idempotencia)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'negocios_estado_membresia_check'
    ) THEN
        ALTER TABLE negocios
            ADD CONSTRAINT negocios_estado_membresia_check
            CHECK (estado_membresia IN ('al_corriente','en_gracia','suspendido','cancelado'));
    END IF;
END $$;

-- 3) Índice para filtrar por estado (comisiones, "en riesgo", suspendidos)
CREATE INDEX IF NOT EXISTS idx_negocios_estado_membresia
    ON negocios (estado_membresia);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Columnas creadas:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name='negocios'
--   AND column_name IN ('estado_membresia','fecha_vencimiento',
--                       'fecha_proximo_cobro','fecha_inicio_gracia','fecha_limite_gracia')
-- ORDER BY column_name;
--
-- Todos los negocios existentes deben quedar en 'al_corriente':
-- SELECT estado_membresia, count(*) FROM negocios GROUP BY estado_membresia;
-- =============================================================================
