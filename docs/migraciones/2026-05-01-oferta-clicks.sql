-- =====================================================================
-- MIGRACIÓN: Tabla `oferta_clicks` — separar engagement de impression
-- =====================================================================
-- Fecha: 1 Mayo 2026
-- Módulo: Ofertas
--
-- CONTEXTO:
-- Antes "vista" significaba "modal abierto" (engagement). Después de
-- adoptar el modelo estándar de analytics:
--   - VISTA (impression): card en viewport del usuario.
--   - CLICK  (engagement): usuario abre el modal de detalle.
--
-- Esta migración crea la tabla gemela de `oferta_vistas` para los clicks.
-- Misma estructura, mismo índice único anti-inflación (1 click por
-- usuario por día calendario en zona horaria de Sonora).
-- =====================================================================

CREATE TABLE IF NOT EXISTS oferta_clicks (
  id BIGSERIAL PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oferta_clicks_oferta_fecha
  ON oferta_clicks (oferta_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oferta_clicks_usuario_fecha
  ON oferta_clicks (usuario_id, created_at DESC);

-- Anti-inflación: 1 click por usuario por día calendario Sonora.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_oferta_clicks_por_dia
ON oferta_clicks (
  oferta_id,
  usuario_id,
  ((created_at AT TIME ZONE 'America/Hermosillo')::date)
);
