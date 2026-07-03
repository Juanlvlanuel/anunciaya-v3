-- =============================================================================
-- MarketPlace — Categorías (1 nivel, globales)
-- Fecha: 2026-07-02
-- Doc: docs/arquitectura/Marketplace_Categorias.md
--
-- Tabla propia (no reusa las de negocios). Cada artículo pertenece a una
-- categoría. Seguro con datos existentes: se backfillean a "Otros".
-- Idempotente: se puede correr más de una vez. Aplicar en DEV y en PROD.
-- =============================================================================

BEGIN;

-- 1) Tabla de categorías -------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_marketplace (
  id          serial PRIMARY KEY,
  nombre      varchar(50) NOT NULL,
  orden       smallint NOT NULL DEFAULT 0,
  activa      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categorias_marketplace_nombre_key UNIQUE (nombre)
);

-- 2) Semilla (11 categorías). ON CONFLICT = idempotente por nombre -------------
INSERT INTO categorias_marketplace (nombre, orden) VALUES
  ('Vehículos',        1),
  ('Electrónica',      2),
  ('Hogar',            3),
  ('Muebles',          4),
  ('Ropa y calzado',   5),
  ('Bebés y niños',    6),
  ('Deportes',         7),
  ('Herramientas',     8),
  ('Mascotas',         9),
  ('Casas y Terrenos', 10),
  ('Otros',            11)
ON CONFLICT (nombre) DO NOTHING;

-- 3) Columna categoria_id en articulos_marketplace ----------------------------
ALTER TABLE articulos_marketplace
  ADD COLUMN IF NOT EXISTS categoria_id integer;

ALTER TABLE articulos_marketplace
  DROP CONSTRAINT IF EXISTS articulos_marketplace_categoria_id_fkey;
ALTER TABLE articulos_marketplace
  ADD CONSTRAINT articulos_marketplace_categoria_id_fkey
  FOREIGN KEY (categoria_id) REFERENCES categorias_marketplace(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_categoria
  ON articulos_marketplace USING btree (categoria_id);

-- 4) Backfill: los artículos existentes quedan en "Otros" ----------------------
UPDATE articulos_marketplace
SET categoria_id = (SELECT id FROM categorias_marketplace WHERE nombre = 'Otros')
WHERE categoria_id IS NULL;

COMMIT;
