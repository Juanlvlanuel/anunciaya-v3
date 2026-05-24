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
-- PREREQUISITO TÉCNICO — `unaccent` debe ser IMMUTABLE:
--
--   Por defecto, la función `unaccent(text)` que crea la extensión `unaccent`
--   está marcada como STABLE (depende de los archivos de configuración del
--   diccionario). Postgres NO permite funciones STABLE en expresiones de
--   índice — exige IMMUTABLE. Si intentas crear el índice sin este paso, el
--   planner falla con:
--       ERROR: functions in index expression must be marked IMMUTABLE
--
--   Por eso esta migración primero hace `ALTER FUNCTION unaccent(text)
--   IMMUTABLE` (idempotente, solo cambia el flag de catálogo). Esto también
--   habilita la misma capacidad para futuros índices con `unaccent` en
--   otras tablas (MarketPlace, Ofertas, etc.).
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
--
-- IDEMPOTENTE: ALTER FUNCTION es idempotente; CREATE INDEX usa IF NOT EXISTS.
-- =============================================================================

BEGIN;

-- 1. Marcar unaccent como IMMUTABLE (necesario para usarla en índice).
--    Requiere ser dueño de la función — en local y Supabase lo es el rol
--    `postgres`. Si la extensión está en otro schema, ajustar nombre.
ALTER FUNCTION unaccent(text) IMMUTABLE;

-- 2. Crear el índice GIN FTS con unaccent integrada.
CREATE INDEX IF NOT EXISTS idx_servicios_pub_titulo_fts_unaccent
    ON servicios_publicaciones
    USING GIN (to_tsvector('spanish', unaccent(titulo || ' ' || descripcion)))
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
