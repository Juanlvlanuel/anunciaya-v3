-- 2026-07-12 · Columnas de promoción de apertura + contraprestación en `negocios`
-- ==============================================================================
-- Da soporte a la afiliación con paquete promocional y a la activación diferida:
--   - promo_pendiente        → true = negocio afiliado a un paquete pero SIN membresía iniciada
--                              (nace activo=false; al "Activar promoción" corren los meses y se publica).
--   - promo_paquete_id       → snapshot del id del paquete aplicado (trazabilidad).
--   - promo_meses_otorgados  → snapshot de los meses de vigencia que otorga el paquete.
--   - promo_meses_cobrados   → snapshot de los meses cobrados (monto = mesesCobrados × precio_membresia).
--   - contraprestacion       → nota libre de lo que el negocio ofrece durante la promo (editable en la ficha).
--
-- Los snapshots evitan que editar/desactivar el paquete después altere afiliaciones ya hechas.
-- Aditivo (columnas nullable / con default) → seguro de aplicar en vivo. Correr en DEV y PROD. Idempotente.

BEGIN;

ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS promo_pendiente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_paquete_id varchar(60),
  ADD COLUMN IF NOT EXISTS promo_meses_otorgados integer,
  ADD COLUMN IF NOT EXISTS promo_meses_cobrados integer,
  ADD COLUMN IF NOT EXISTS contraprestacion varchar(500);

CREATE INDEX IF NOT EXISTS idx_negocios_promo_pendiente
  ON negocios (promo_pendiente) WHERE promo_pendiente = true;

COMMIT;
