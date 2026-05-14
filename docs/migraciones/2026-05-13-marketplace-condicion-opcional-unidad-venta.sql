-- =============================================================================
-- 2026-05-13: MarketPlace — condición opcional, acepta_ofertas opcional, unidad_venta
-- =============================================================================
--
-- Razón: el wizard de publicar actualmente exige `condicion` (nuevo/seminuevo/
-- usado/para_reparar) y `acepta_ofertas` para TODO artículo. Eso no encaja con
-- casos comunes en marketplace local:
--   - Productos consumibles vendidos por unidad (pan dulce, tamales, miel) —
--     no aplica condición ni negociación de oferta.
--   - Productos hechos a mano nuevos (no son "nuevo"/"usado" en sentido P2P).
--
-- Cambios:
-- 1. `condicion` pasa de NOT NULL a NULLABLE.
-- 2. `acepta_ofertas` pasa de NOT NULL DEFAULT true a NULLABLE (mantiene default).
-- 3. Se agrega `unidad_venta VARCHAR(30)` opcional con sugerencias UI: c/u, por
--    kg, por docena, por litro, por metro, por porción (texto libre para casos
--    no cubiertos).
--
-- IMPORTANTE: ejecutar manualmente — Drizzle no detecta cambios de NOT NULL
-- automáticamente. Reflejar también en `schema.ts` (`apps/api/src/db/schemas/`).
-- =============================================================================

BEGIN;

-- 1) Quitar NOT NULL de `condicion` (manteniendo el CHECK existente,
--    que ya permite valores válidos del enum nuevo/seminuevo/usado/para_reparar).
--    El CHECK actual NO permite NULL, hay que recrearlo permitiéndolo.
ALTER TABLE articulos_marketplace
    ALTER COLUMN condicion DROP NOT NULL;

ALTER TABLE articulos_marketplace
    DROP CONSTRAINT IF EXISTS articulos_marketplace_condicion_check;

ALTER TABLE articulos_marketplace
    ADD CONSTRAINT articulos_marketplace_condicion_check
    CHECK (
        condicion IS NULL OR
        (condicion)::text = ANY (ARRAY[
            'nuevo'::varchar,
            'seminuevo'::varchar,
            'usado'::varchar,
            'para_reparar'::varchar
        ]::text[])
    );

-- 2) Quitar NOT NULL de `acepta_ofertas`. Mantenemos el DEFAULT true para no
--    romper escrituras legacy que omitan el campo. NULL = "no especificado".
ALTER TABLE articulos_marketplace
    ALTER COLUMN acepta_ofertas DROP NOT NULL;

-- 3) Agregar columna `unidad_venta` opcional (texto libre, máximo 30 chars).
ALTER TABLE articulos_marketplace
    ADD COLUMN unidad_venta VARCHAR(30);

COMMIT;
