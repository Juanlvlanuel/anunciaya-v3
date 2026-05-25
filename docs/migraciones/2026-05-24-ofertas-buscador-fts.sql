-- =============================================================================
-- 2026-05-24: ofertas — índice FTS + tabla de log para búsqueda completa
-- =============================================================================
--
-- Habilita el endpoint nuevo `GET /api/ofertas/buscar` (búsqueda híbrida
-- FTS + ILIKE + unaccent), espejo del de Servicios/MarketPlace.
--
-- Cambios:
--   1. Wrapper `public.immutable_unaccent(text)` (idempotente). Ya se aplicó
--      con la migración de Servicios pero se incluye aquí por si esta
--      migración se ejecuta sola en otra BD. Reemplaza al obsoleto
--      `ALTER FUNCTION unaccent IMMUTABLE` que FALLA EN SUPABASE con:
--         ERROR: 42501: must be owner of function unaccent
--      porque la extensión vive en `extensions` y es propiedad de
--      `supabase_admin`. Ver PATRON_BUSCADOR_FTS.md trampa #7.
--
--   2. `idx_ofertas_titulo_fts_unaccent` — índice GIN FTS con la wrapper
--      `immutable_unaccent` y `coalesce()`. Ofertas tiene `descripcion`
--      NULLABLE (schema.ts:664) — sin coalesce, `titulo || ' ' || NULL =
--      NULL` y la expresión completa devuelve NULL: la fila no se indexa
--      y la query nunca matchea. Ver PATRON_BUSCADOR_FTS.md trampa #6.
--
--      Ofertas NO tiene `deleted_at` (no hay soft-delete; las ofertas se
--      desactivan con `activo=false` o expiran con `fecha_fin < NOW()`),
--      así que el índice NO es parcial — cubre todas las filas.
--
--      `DROP INDEX IF EXISTS` previo para migrar ambientes donde se haya
--      creado una versión vieja del índice con `unaccent(...)` directo.
--
--   3. `ofertas_busquedas_log` (tabla nueva). Estructura idéntica a
--      `marketplace_busquedas_log` y `servicios_busquedas_log`. Alimenta
--      futuros "populares" / métricas. `usuario_id` siempre NULL en INSERT
--      por privacidad (regla del proyecto), aunque la ruta sea autenticada.
--
-- IDEMPOTENTE: CREATE OR REPLACE FUNCTION, DROP INDEX IF EXISTS,
-- CREATE INDEX, CREATE TABLE IF NOT EXISTS.
-- =============================================================================

BEGIN;

-- 1. Wrapper IMMUTABLE de unaccent (idempotente — si Servicios corrió
--    primero ya existe; CREATE OR REPLACE no rompe). Usa schema dinámico
--    porque en Supabase `unaccent` vive en `extensions` y el inlining
--    falla sin calificar. Ver migración de Servicios para detalle completo.
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

-- 2. Recrear el índice GIN FTS con la wrapper + coalesce (descripcion NULLABLE).
--    Drop+Create por si existía una versión vieja con `unaccent(...)` directo.
DROP INDEX IF EXISTS idx_ofertas_titulo_fts_unaccent;

CREATE INDEX idx_ofertas_titulo_fts_unaccent
    ON ofertas
    USING GIN (to_tsvector('spanish', public.immutable_unaccent(titulo || ' ' || coalesce(descripcion, ''))));

-- 3. Tabla de log de búsquedas (espejo de marketplace_busquedas_log)
CREATE TABLE IF NOT EXISTS ofertas_busquedas_log (
    id          BIGSERIAL PRIMARY KEY,
    ciudad      VARCHAR(100) NOT NULL,
    termino     VARCHAR(100) NOT NULL,
    usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ofertas_busq_ciudad_fecha
    ON ofertas_busquedas_log (ciudad, created_at DESC);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'ofertas'
--   AND indexname = 'idx_ofertas_titulo_fts_unaccent';
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'ofertas_busquedas_log'
-- ORDER BY ordinal_position;
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'ofertas_busquedas_log';
