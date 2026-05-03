-- =====================================================================
-- MIGRACIÓN: Tabla `oferta_shares` — alinear shares al modelo de
-- vistas/clicks (anti-inflación 1/usuario/día)
-- =====================================================================
-- Fecha: 1 Mayo 2026
-- Módulo: Ofertas
--
-- CONTEXTO:
-- Antes los shares usaban la función SQL global `registrar_share` que
-- solo incrementaba `metricas_entidad.total_shares` sin trackear quién
-- compartió ni cuándo. Un usuario podía inflar el contador haciendo
-- click N veces al botón "Compartir".
--
-- DESPUÉS DE ESTA MIGRACIÓN:
-- Solo se cuenta UN share por usuario por día calendario en zona
-- horaria de Sonora. Misma estructura y semántica que `oferta_vistas`
-- y `oferta_clicks`.
--
-- NOTA: la función SQL global `registrar_share` puede seguir usándose
-- para otros entity_types (negocio, articulo, etc.) — solo se cambia
-- el flow de ofertas para usar la tabla específica con dedup.
-- =====================================================================

CREATE TABLE IF NOT EXISTS oferta_shares (
  id BIGSERIAL PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oferta_shares_oferta_fecha
  ON oferta_shares (oferta_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oferta_shares_usuario_fecha
  ON oferta_shares (usuario_id, created_at DESC);

-- Anti-inflación: 1 share por usuario por día calendario Sonora.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_oferta_shares_por_dia
ON oferta_shares (
  oferta_id,
  usuario_id,
  ((created_at AT TIME ZONE 'America/Hermosillo')::date)
);
