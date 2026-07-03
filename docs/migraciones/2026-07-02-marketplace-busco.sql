-- =============================================================================
-- MarketPlace — Doble sentido (Vendo ↔ Busco)
-- Fecha: 2026-07-02
-- Doc: docs/arquitectura/Marketplace_Busco.md
--
-- Agrega el modo 'busco' (demanda de compra) a articulos_marketplace, calcando
-- el patrón servicios_publicaciones.modo. Seguro con datos existentes:
--   - `modo` default 'vendo'  → todo el histórico queda como venta.
--   - `precio` pasa a nullable → no afecta filas existentes.
--   - Los CHECK nuevos se cumplen para todo el histórico (vendo + precio + >=1 foto).
--
-- Idempotente: se puede correr más de una vez. Aplicar en DEV y en PROD.
-- =============================================================================

BEGIN;

-- 1) Columnas nuevas ----------------------------------------------------------
ALTER TABLE articulos_marketplace
  ADD COLUMN IF NOT EXISTS modo varchar(20) NOT NULL DEFAULT 'vendo';

ALTER TABLE articulos_marketplace
  ADD COLUMN IF NOT EXISTS presupuesto jsonb;

ALTER TABLE articulos_marketplace
  ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false;

-- 2) Precio deja de ser obligatorio (requerido solo en 'vendo', vía CHECK) -----
ALTER TABLE articulos_marketplace
  ALTER COLUMN precio DROP NOT NULL;

-- 3) CHECK constraints (DROP IF EXISTS + ADD = idempotente) --------------------
ALTER TABLE articulos_marketplace
  DROP CONSTRAINT IF EXISTS articulos_marketplace_modo_check;
ALTER TABLE articulos_marketplace
  ADD CONSTRAINT articulos_marketplace_modo_check
  CHECK ((modo)::text = ANY ((ARRAY['vendo'::varchar, 'busco'::varchar])::text[]));

ALTER TABLE articulos_marketplace
  DROP CONSTRAINT IF EXISTS articulos_marketplace_precio_modo_check;
ALTER TABLE articulos_marketplace
  ADD CONSTRAINT articulos_marketplace_precio_modo_check
  CHECK (modo = 'busco' OR (modo = 'vendo' AND precio IS NOT NULL));

ALTER TABLE articulos_marketplace
  DROP CONSTRAINT IF EXISTS articulos_marketplace_fotos_modo_check;
ALTER TABLE articulos_marketplace
  ADD CONSTRAINT articulos_marketplace_fotos_modo_check
  CHECK (modo = 'busco' OR jsonb_array_length(fotos) >= 1);

ALTER TABLE articulos_marketplace
  DROP CONSTRAINT IF EXISTS articulos_marketplace_presupuesto_modo_check;
ALTER TABLE articulos_marketplace
  ADD CONSTRAINT articulos_marketplace_presupuesto_modo_check
  CHECK (presupuesto IS NULL OR modo = 'busco');

-- 4) Índice para el feed de búsquedas (orden urgente + recientes por ciudad) ---
CREATE INDEX IF NOT EXISTS idx_marketplace_modo
  ON articulos_marketplace USING btree (modo);

COMMIT;
