-- =========================================================================
-- MIGRACIÓN: Estado "leída" y "resuelta" de alertas por usuario
-- Fecha: 22 Abril 2026
-- Motivo: las alertas son avisos del negocio que todos los usuarios con
--         acceso deben ver. Tener `leida`/`resuelta` globales hace que la
--         acción de un usuario afecte a los demás (si el gerente marca,
--         el dueño y otros gerentes también la ven como leída).
--
-- Cambio: nueva tabla `alerta_lecturas` con estado por usuario.
--         Las columnas `leida`, `leida_at`, `resuelta`, `resuelta_at` de
--         `alertas_seguridad` se dejan por ahora (backwards-compat) y se
--         retirarán en una migración futura cuando haya confianza.
-- =========================================================================

BEGIN;

-- 1) Tabla de lecturas/resoluciones por usuario
CREATE TABLE IF NOT EXISTS alerta_lecturas (
  alerta_id     UUID NOT NULL REFERENCES alertas_seguridad(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leida_at      TIMESTAMPTZ,
  resuelta_at   TIMESTAMPTZ,
  PRIMARY KEY (alerta_id, usuario_id)
);

-- 2) Índices para lecturas eficientes
CREATE INDEX IF NOT EXISTS idx_alerta_lecturas_usuario
  ON alerta_lecturas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_alerta_lecturas_usuario_leida
  ON alerta_lecturas(usuario_id) WHERE leida_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alerta_lecturas_usuario_resuelta
  ON alerta_lecturas(usuario_id) WHERE resuelta_at IS NOT NULL;

-- 3) Backfill: el estado actual se atribuye al dueño del negocio.
--    Los gerentes empezarán con estado limpio (verán todo como no leído).
INSERT INTO alerta_lecturas (alerta_id, usuario_id, leida_at, resuelta_at)
SELECT
  a.id,
  n.usuario_id,
  CASE WHEN a.leida = true THEN COALESCE(a.leida_at, a.created_at) ELSE NULL END,
  CASE WHEN a.resuelta = true THEN COALESCE(a.resuelta_at, a.created_at) ELSE NULL END
FROM alertas_seguridad a
JOIN negocios n ON n.id = a.negocio_id
WHERE a.leida = true OR a.resuelta = true
ON CONFLICT (alerta_id, usuario_id) DO NOTHING;

COMMIT;
