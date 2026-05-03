-- ============================================================================
-- Migración: crear tabla `oferta_vistas`
-- Fecha:     2026-04-29
-- Contexto:  Eventos individuales de vistas de ofertas para poder calcular
--            "más populares en los últimos N días" en el feed público.
--
--            El contador acumulado `metricas_entidad.total_views` se mantiene
--            sin cambios — lo usan otras partes del sistema (modal de detalle,
--            métricas BS). Esta tabla es complementaria, no lo reemplaza.
-- ============================================================================

CREATE TABLE IF NOT EXISTS oferta_vistas (
  id BIGSERIAL PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para queries por ventana de tiempo + agrupación por oferta
-- (caso de uso principal: orden=populares y destacada-del-dia)
CREATE INDEX IF NOT EXISTS idx_oferta_vistas_oferta_fecha
  ON oferta_vistas (oferta_id, created_at DESC);

-- Índice para queries por usuario
-- (caso de uso futuro: "ofertas que vio recientemente este usuario")
CREATE INDEX IF NOT EXISTS idx_oferta_vistas_usuario_fecha
  ON oferta_vistas (usuario_id, created_at DESC);

COMMENT ON TABLE oferta_vistas IS
  'Eventos individuales de vista de ofertas. Permite medir popularidad por ventana de tiempo (últimos 7 días, 24h, etc.). Sin UNIQUE: un usuario puede ver la misma oferta múltiples veces y cada vista cuenta. Si se quiere deduplicar, usar DISTINCT en el query.';
