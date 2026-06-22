-- =============================================================================
-- 2026-06-21: Publicidad — estado 'pendiente' (wizard self-service con Stripe)
-- ----------------------------------------------------------------------------
-- El anuncio comprado por el wizard self-service nace 'pendiente' (creado con sus piezas
-- y ciudades) y el webhook de Stripe lo pasa a 'activa' al confirmarse el pago. El carrusel
-- público solo muestra 'activa', así que un 'pendiente' nunca se ve hasta que se paga.
--
-- Reescribe el CHECK de estado para sumar 'pendiente'. La corre Juan en DEV y PROD. Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE publicidad_compras DROP CONSTRAINT IF EXISTS publicidad_compras_estado_check;
ALTER TABLE publicidad_compras ADD CONSTRAINT publicidad_compras_estado_check
    CHECK (estado IN ('pendiente', 'activa', 'pausada', 'expirada', 'cancelada'));

COMMIT;

-- Verificación:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'publicidad_compras_estado_check';
