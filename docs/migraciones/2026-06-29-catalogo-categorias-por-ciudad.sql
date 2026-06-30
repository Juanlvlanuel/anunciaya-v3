-- =============================================================================
-- 2026-06-29: catálogo de categorías gestionable + disponibilidad POR CIUDAD
-- =============================================================================
--
-- Habilita el módulo "Categorías" del Panel Admin (solo SuperAdmin): además del
-- CRUD del catálogo (que ya existe en las tablas categorias_negocio /
-- subcategorias_negocio), agrega la CAPA DE DISPONIBILIDAD por ciudad.
--
-- Modelo: catálogo GLOBAL + relaciones N:M de disponibilidad.
--   - categoria_ciudades     → en qué ciudades aparece una categoría.
--   - subcategoria_ciudades  → en qué ciudades aparece una subcategoría.
--
-- Regla de visibilidad (sin backfill, retrocompatible):
--   - Si una categoría/subcategoría NO tiene filas aquí  → es GLOBAL (todas las
--     ciudades). Por eso al crear estas tablas vacías, NADA cambia: todo el
--     catálogo actual sigue visible en todas las ciudades.
--   - Si tiene filas → solo aparece en esas ciudades.
--   - Una subcategoría solo es visible en una ciudad donde su categoría también
--     lo sea (se valida en la app / Panel, no por constraint).
--
-- categorias_negocio.id y subcategorias_negocio.id son SERIAL (integer);
-- ciudades.id es UUID. De ahí los tipos de las FK.
--
-- Tablas NUEVAS y aisladas. IDEMPOTENTE: IF NOT EXISTS.
-- EJECUTAR EN: dev y prod. La corre Juan.
-- =============================================================================

BEGIN;

-- Disponibilidad de CATEGORÍAS por ciudad ------------------------------------
CREATE TABLE IF NOT EXISTS categoria_ciudades (
    categoria_id integer NOT NULL REFERENCES categorias_negocio(id) ON DELETE CASCADE,
    ciudad_id    uuid    NOT NULL REFERENCES ciudades(id)           ON DELETE CASCADE,
    created_at   timestamptz DEFAULT now(),
    CONSTRAINT categoria_ciudades_pkey PRIMARY KEY (categoria_id, ciudad_id)
);

-- Para resolver "qué hay disponible en la ciudad X" (filtro del endpoint público).
CREATE INDEX IF NOT EXISTS idx_categoria_ciudades_ciudad
    ON categoria_ciudades (ciudad_id);

-- Disponibilidad de SUBCATEGORÍAS por ciudad ---------------------------------
CREATE TABLE IF NOT EXISTS subcategoria_ciudades (
    subcategoria_id integer NOT NULL REFERENCES subcategorias_negocio(id) ON DELETE CASCADE,
    ciudad_id       uuid    NOT NULL REFERENCES ciudades(id)              ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),
    CONSTRAINT subcategoria_ciudades_pkey PRIMARY KEY (subcategoria_id, ciudad_id)
);

CREATE INDEX IF NOT EXISTS idx_subcategoria_ciudades_ciudad
    ON subcategoria_ciudades (ciudad_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('categoria_ciudades','subcategoria_ciudades');
-- =============================================================================
