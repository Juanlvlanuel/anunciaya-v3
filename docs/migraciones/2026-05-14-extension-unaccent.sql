-- =============================================================================
-- 2026-05-14: Activar extensión `unaccent` para búsquedas accent-insensitive
-- =============================================================================
--
-- Razón: los buscadores de Ofertas y MarketPlace (sugerencias en vivo + FTS)
-- necesitan que el match sea independiente de acentos — el usuario que escribe
-- "panaderia" debe encontrar "Panadería", y viceversa. Sin esta extensión,
-- `ILIKE` y `to_tsvector('spanish', ...)` con `plainto_tsquery('spanish', ...)`
-- no garantizan ese comportamiento de forma consistente.
--
-- La extensión `unaccent` viene con PostgreSQL contrib (incluido en Supabase
-- por default — solo hay que activarla con CREATE EXTENSION). Provee la
-- función `unaccent(text)` que devuelve el texto sin marcas diacríticas:
--
--   SELECT unaccent('Panadería Tijuana');  -- → 'Panaderia Tijuana'
--
-- USO en los services del backend:
--   - apps/api/src/services/ofertas/buscador.ts
--       WHERE unaccent(o.titulo) ILIKE unaccent(${patron})
--          OR unaccent(o.descripcion) ILIKE unaccent(${patron})
--          OR unaccent(n.nombre) ILIKE unaccent(${patron})
--
--   - apps/api/src/services/marketplace/buscador.ts
--       AND to_tsvector('spanish', unaccent(titulo || ' ' || descripcion))
--           @@ plainto_tsquery('spanish', unaccent(${q}))
--
-- IMPORTANTE — performance:
--   Para datasets pequeños (decenas a pocos miles) `unaccent()` corre
--   inline sin problema. Si el volumen crece y se nota lentitud, hay que
--   crear índices funcionales:
--     CREATE INDEX idx_negocios_nombre_unaccent
--       ON negocios USING gin (unaccent(nombre) gin_trgm_ops);
--   (requiere también `pg_trgm` para soporte de ILIKE indexable). Por
--   ahora NO se crean índices — el dataset piloto no lo justifica.
--
-- Idempotente: `IF NOT EXISTS` permite correrla múltiples veces sin error.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

COMMIT;
