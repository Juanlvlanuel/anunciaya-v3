-- =============================================================================
-- 2026-05-17: usuarios — servicio_tiempo_respuesta_minutos
-- =============================================================================
--
-- Agrega 1 columna a `usuarios` para el perfil del prestador de Servicios:
--
--   `servicio_tiempo_respuesta_minutos int` — mediana del tiempo de
--   respuesta del usuario en conversaciones de ChatYA con contexto
--   'servicio_publicacion'. La poblará un cron mensual (TODO Sprint 9+)
--   que calcula `AVG(timestamp(respuesta_dueño) - timestamp(primer_msj_cliente))`
--   filtrado por `subtipo='servicio_publicacion'`. Por ahora la columna
--   es NULL para todos y el frontend oculta el KPI cuando es null.
--
-- NOTA HISTÓRICA: una versión previa de esta migración también agregaba
-- `identidad_verificada boolean`. Se descartó el 2026-05-17 — no hay forma
-- sostenible de validar identidad real en la beta (manual no escala,
-- terceros cuestan $1-5 USD). Si en el futuro vuelve la feature, será como
-- beneficio del plan comercial $449/mes con verificación manual desde
-- Panel Admin.
--
-- IDEMPOTENTE: ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- =============================================================================

BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS servicio_tiempo_respuesta_minutos integer;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios'
--   AND column_name = 'servicio_tiempo_respuesta_minutos';
