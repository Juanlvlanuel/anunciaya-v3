-- ============================================================================
-- Migración: tabla marketplace_busquedas_log
-- Fecha:     2026-05-04
-- Contexto:  Sprint 6 del MarketPlace registra cada búsqueda que ejecuta un
--            usuario para calcular las búsquedas populares por ciudad
--            (top 6 últimos 7 días). El cálculo on-demand se cachea en
--            Redis con TTL 1h. En Sprint 7 se agrega un cron diario.
--
-- Privacidad: aunque la columna `usuario_id` existe (opt-in retroactivo
-- para v2), el insert del Sprint 6 SIEMPRE pone NULL. Solo se persiste
-- ciudad + termino + created_at para calcular populares — imposible de
-- usar para perfilamiento.
--
-- El índice GIN para FTS sobre articulos_marketplace ya existe desde la
-- migración del Sprint 1 (idx_marketplace_titulo_fts). NO se recrea.
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_busquedas_log (
    id BIGSERIAL PRIMARY KEY,
    ciudad VARCHAR(100) NOT NULL,
    termino VARCHAR(100) NOT NULL,
    /**
     * Nullable por diseño. Sprint 6 inserta NULL siempre; queda como
     * opt-in retroactivo si v2 decide tracking personalizado.
     */
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_busquedas_ciudad_fecha
    ON marketplace_busquedas_log (ciudad, created_at DESC);

COMMENT ON TABLE marketplace_busquedas_log IS
    'Log de términos buscados en MarketPlace. Sprint 6 lo usa para calcular populares por ciudad. usuario_id se inserta siempre NULL para privacidad.';
