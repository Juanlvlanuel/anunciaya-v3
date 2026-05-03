-- ============================================================================
-- Migración: crear tabla `ofertas_destacadas`
-- Fecha:     2026-04-29
-- Contexto:  Bloque "Oferta del día" del feed público de Ofertas.
--            Permite al admin/equipo interno fijar manualmente la oferta
--            destacada del día (override). Si no hay override vigente,
--            el endpoint calcula la oferta destacada automáticamente
--            (más vistas en últimos 7 días).
-- ============================================================================

CREATE TABLE IF NOT EXISTS ofertas_destacadas (
  id BIGSERIAL PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  -- NOTA: el plan original pedía `ON DELETE SET NULL`, pero `fijada_por` es
  -- NOT NULL y SET NULL sería contradictorio (fallaría al borrar el usuario).
  -- Se usa RESTRICT para preservar trazabilidad histórica del admin que fijó
  -- el destacado.
  fijada_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fijada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vigente_hasta TIMESTAMPTZ NOT NULL,
  motivo VARCHAR(200),
  activa BOOLEAN NOT NULL DEFAULT true
);

-- Índice para la consulta de "destacada vigente ahora"
-- (activa = true AND vigente_desde <= NOW() AND vigente_hasta >= NOW())
CREATE INDEX IF NOT EXISTS idx_ofertas_destacadas_vigencia
  ON ofertas_destacadas (activa, vigente_desde, vigente_hasta);

COMMENT ON TABLE ofertas_destacadas IS
  'Override administrable para la "Oferta del día" del feed público. Una sola fila debería estar activa y vigente al mismo tiempo (controlado por la query, no por constraint, para permitir agendar destacadas futuras).';

COMMENT ON COLUMN ofertas_destacadas.vigente_hasta IS
  'Permite agendar destacadas futuras sin necesidad de despublicar la actual a mano.';

COMMENT ON COLUMN ofertas_destacadas.activa IS
  'Despublicar = activa=false. Mantiene el registro histórico para auditoría.';
