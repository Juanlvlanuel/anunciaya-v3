-- =============================================================================
-- 2026-07-28 · negocio_sucursales.telefono_alterno + whatsapp_alterno
-- =============================================================================
--
-- Segundo número opcional de contacto por sucursal (ej. línea de pedidos/domicilios
-- aparte de la principal). Puramente ADITIVO: `telefono`/`whatsapp` (columnas
-- existentes) siguen siendo el número principal que se usa en todos los botones
-- compactos (cards, FABs, modales) cuando no hay alterno. El alterno solo se
-- ofrece como opción extra donde el frontend ya lo contempla.
--
-- NULLABLE, sin default, sin backfill — negocios existentes simplemente no
-- tienen alterno hasta que el dueño lo capture desde BS/Onboarding.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS. REVERSIBLE: ver ROLLBACK al final.
-- AMBIENTE: DEV primero.
-- =============================================================================

BEGIN;

ALTER TABLE negocio_sucursales
    ADD COLUMN IF NOT EXISTS telefono_alterno varchar(20),
    ADD COLUMN IF NOT EXISTS whatsapp_alterno varchar(20);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'negocio_sucursales'
--   AND column_name IN ('telefono_alterno', 'whatsapp_alterno');

-- =============================================================================
-- ROLLBACK (deshacer este paso — seguro, columnas nuevas sin uso aún):
-- ALTER TABLE negocio_sucursales
--     DROP COLUMN IF EXISTS telefono_alterno,
--     DROP COLUMN IF EXISTS whatsapp_alterno;
-- =============================================================================
