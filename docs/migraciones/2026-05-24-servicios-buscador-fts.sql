-- =============================================================================
-- 2026-05-24: servicios_publicaciones — índice FTS para búsqueda completa
-- =============================================================================
--
-- Agrega el índice GIN FTS con `unaccent` integrada sobre titulo+descripcion
-- para soportar el endpoint nuevo `GET /api/servicios/buscar` (búsqueda
-- híbrida FTS + ILIKE + unaccent), espejo del de MarketPlace.
--
-- Sigue la "Opción A" del PATRON_BUSCADOR_FTS.md: el índice incluye `unaccent`
-- desde el inicio para que coincida con la expresión de la query y evite la
-- trampa del sequential scan.
--
-- PREREQUISITO TÉCNICO — wrapper IMMUTABLE de `unaccent`:
--
--   Postgres exige funciones IMMUTABLE en expresiones de índice; `unaccent`
--   viene como STABLE. La solución obvia (`ALTER FUNCTION unaccent IMMUTABLE`)
--   funciona en local pero FALLA EN SUPABASE con:
--       ERROR: 42501: must be owner of function unaccent
--   porque la extensión vive en el schema `extensions` y es propiedad de
--   `supabase_admin`, no del rol `postgres` del SQL Editor.
--
--   La solución PORTABLE es crear un wrapper IMMUTABLE en `public` (donde
--   sí somos owners) que internamente llame a `unaccent`. Las queries del
--   service y la expresión del índice usan `immutable_unaccent(...)`. La
--   función vive en `public` para que no se tenga que calificar con schema
--   en el código del backend.
--
-- Notas:
--   - `titulo` y `descripcion` son NOT NULL en `servicios_publicaciones`
--     (schema.ts:2391-2392), así que NO se requiere `coalesce()` en la
--     expresión del índice. `descripcion` puede ser '' (Sprint 9 — composer
--     sin descripción), lo cual es válido para `||` y FTS.
--   - La tabla `servicios_busquedas_log` YA existe (creada en
--     `2026-05-15-servicios-base.sql`), no se recrea.
--   - El índice GIST sobre `ubicacion_aproximada` también YA existe (creado
--     en la misma migración base), así que no se duplica aquí.
--   - Índice parcial `WHERE deleted_at IS NULL` para ignorar soft-deletes
--     (igual que `idx_servicios_preg_publicacion` del schema).
--   - El `DROP INDEX IF EXISTS` antes del `CREATE INDEX` permite migrar
--     ambientes donde se haya creado una versión vieja del índice con
--     `unaccent(...)` directo (mi local antes de este cambio). Si el índice
--     no existe, el DROP no hace nada.
--
-- IDEMPOTENTE: CREATE OR REPLACE FUNCTION, DROP INDEX IF EXISTS, CREATE INDEX.
-- =============================================================================

BEGIN;

-- 1. Wrapper IMMUTABLE de unaccent en el schema `public`.
--
--    OJO — schema explícito obligatorio. Durante el INLINING de la función
--    en una expresión de índice, Postgres NO siempre tiene el schema de la
--    extensión (`extensions` en Supabase) en el search_path, y `SELECT
--    unaccent($1)` sin calificar falla con:
--        ERROR: 42883: function unaccent(text) does not exist
--        CONTEXT: SQL function "immutable_unaccent" during inlining
--
--    El bloque DO detecta dinámicamente en qué schema vive `unaccent`
--    (Supabase: `extensions`, local típico: `public`) y crea la wrapper
--    calificando con ese schema. Funciona idéntico en ambos ambientes.
DO $do$
DECLARE
    unaccent_schema text;
BEGIN
    SELECT n.nspname INTO unaccent_schema
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'unaccent'
    LIMIT 1;

    IF unaccent_schema IS NULL THEN
        RAISE EXCEPTION 'La extensión unaccent no está instalada';
    END IF;

    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text AS $body$
            SELECT %I.unaccent($1)
        $body$ LANGUAGE sql IMMUTABLE PARALLEL SAFE
    $fn$, unaccent_schema);
END
$do$;

-- 2. Recrear el índice GIN FTS usando la wrapper. Drop+Create por si existía
--    una versión vieja con `unaccent(...)` directo.
DROP INDEX IF EXISTS idx_servicios_pub_titulo_fts_unaccent;

CREATE INDEX idx_servicios_pub_titulo_fts_unaccent
    ON servicios_publicaciones
    USING GIN (to_tsvector('spanish', public.immutable_unaccent(titulo || ' ' || descripcion)))
    WHERE deleted_at IS NULL;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'servicios_publicaciones'
--   AND indexname = 'idx_servicios_pub_titulo_fts_unaccent';
--
-- EXPLAIN ANALYZE
-- SELECT id, titulo
-- FROM servicios_publicaciones
-- WHERE deleted_at IS NULL
--   AND to_tsvector('spanish', unaccent(titulo || ' ' || descripcion))
--       @@ plainto_tsquery('spanish', unaccent('plomero'));
-- -- Debe mostrar "Bitmap Index Scan on idx_servicios_pub_titulo_fts_unaccent".
