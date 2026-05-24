-- =============================================================================
-- 2026-05-24: ofertas — índice FTS + tabla de log para búsqueda completa
-- =============================================================================
--
-- Habilita el endpoint nuevo `GET /api/ofertas/buscar` (búsqueda híbrida
-- FTS + ILIKE + unaccent), espejo del de Servicios/MarketPlace.
--
-- Cambios:
--   1. `ALTER FUNCTION unaccent(text) IMMUTABLE` — idempotente. Ya se aplicó
--      con la migración de Servicios (2026-05-24-servicios-buscador-fts.sql)
--      pero se incluye aquí por si esta migración se ejecuta en otra BD que
--      aún no lo tenga. Ver PATRON_BUSCADOR_FTS.md trampa #7.
--
--   2. `idx_ofertas_titulo_fts_unaccent` — índice GIN FTS con `unaccent` y
--      `coalesce()` integrados. Ofertas tiene `descripcion` NULLABLE
--      (schema.ts:664) — sin coalesce, `titulo || ' ' || NULL = NULL` y la
--      expresión completa devuelve NULL: la fila no se indexa y la query
--      nunca matchea. Ver PATRON_BUSCADOR_FTS.md trampa #6.
--
--      Ofertas NO tiene `deleted_at` (no hay soft-delete; las ofertas se
--      desactivan con `activo=false` o expiran con `fecha_fin < NOW()`),
--      así que el índice NO es parcial — cubre todas las filas.
--
--   3. `ofertas_busquedas_log` (tabla nueva). Estructura idéntica a
--      `marketplace_busquedas_log` y `servicios_busquedas_log`. Alimenta
--      futuros "populares" / métricas. `usuario_id` siempre NULL en INSERT
--      por privacidad (regla del proyecto), aunque la ruta sea autenticada.
--
-- IDEMPOTENTE: ALTER FUNCTION es idempotente; CREATE INDEX e CREATE TABLE
-- usan IF NOT EXISTS.
-- =============================================================================

BEGIN;

-- 1. unaccent IMMUTABLE (prerequisito de cualquier índice con unaccent)
ALTER FUNCTION unaccent(text) IMMUTABLE;

-- 2. Índice FTS GIN con unaccent + coalesce (descripcion es NULLABLE)
CREATE INDEX IF NOT EXISTS idx_ofertas_titulo_fts_unaccent
    ON ofertas
    USING GIN (to_tsvector('spanish', unaccent(titulo || ' ' || coalesce(descripcion, ''))));

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
