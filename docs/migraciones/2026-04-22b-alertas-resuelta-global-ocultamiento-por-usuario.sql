-- =========================================================================
-- MIGRACIÓN: Ajuste semántico de estados de alertas (22 Abril 2026 — parte 2)
--
-- Contexto: la migración previa (2026-04-22-alerta-lecturas-por-usuario.sql)
-- movió `leida` y `resuelta` a `alerta_lecturas` como estado por usuario.
-- Al probarla salió que `resuelta` NO debe ser por usuario: una alerta
-- resuelta es un problema ya atendido — todos los usuarios del negocio deben
-- saberlo.
--
-- Modelo corregido:
--   • leída        → por usuario  (alerta_lecturas.leida_at)
--   • resuelta     → GLOBAL       (alertas_seguridad.resuelta + resuelta_por_usuario_id)
--   • ocultada     → por usuario  (alerta_lecturas.ocultada_at)
--     "Eliminar" desde UI ahora oculta la alerta solo del feed del usuario;
--     nadie la borra físicamente desde la app. El borrado físico queda para
--     jobs admin (ej. purga de alertas resueltas > 90 días).
-- =========================================================================

BEGIN;

-- 1) alerta_lecturas: quitar `resuelta_at` (el estado resuelto se promueve a global),
--    agregar `ocultada_at` (nuevo estado por usuario).
ALTER TABLE alerta_lecturas
	DROP COLUMN IF EXISTS resuelta_at;

ALTER TABLE alerta_lecturas
	ADD COLUMN IF NOT EXISTS ocultada_at TIMESTAMPTZ;

DROP INDEX IF EXISTS idx_alerta_lecturas_usuario_resuelta;

CREATE INDEX IF NOT EXISTS idx_alerta_lecturas_usuario_ocultada
	ON alerta_lecturas(usuario_id) WHERE ocultada_at IS NOT NULL;

-- 2) alertas_seguridad: agregar quién resolvió (para mostrar "Resuelta por X el Y"
--    en el UI). Las columnas `resuelta` y `resuelta_at` ya existen y vuelven a ser
--    la fuente de verdad del estado global.
ALTER TABLE alertas_seguridad
	ADD COLUMN IF NOT EXISTS resuelta_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alertas_resuelta_por
	ON alertas_seguridad(resuelta_por_usuario_id) WHERE resuelta_por_usuario_id IS NOT NULL;

COMMIT;
