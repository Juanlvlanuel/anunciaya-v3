-- =============================================================================
-- 2026-06-15: eliminar negocio_modulos y negocio_preferencias (legacy sin uso)
-- =============================================================================
--
-- Elimina dos tablas de configuración por negocio que el código ya no usa:
--
--   negocio_modulos       → flags de módulos activos por negocio (catalogo,
--                           pedidos_online, citas, reservaciones, apartados,
--                           empleados). Incluía citas_activo/reservaciones_activo,
--                           flags de las tablas de citas ya eliminadas.
--   negocio_preferencias  → flags de mensajes/mapa/notificaciones por negocio.
--
-- POR QUÉ: cero uso en código. Ningún service, controller ni frontend las
-- lee/escribe (solo aparecían en el schema de Drizzle y sus relaciones
-- declaradas). Business Studio resuelve los módulos de otra forma.
--
-- OJO — TIENEN DATOS: ~15 filas cada una (de 21 negocios), residuales de una
-- versión anterior del onboarding que insertaba config por defecto al crear un
-- negocio (ese código ya no existe). Esos datos NO los consume nada, pero el
-- DROP los elimina. Confirmado por el dueño que se eliminan ambas.
--
-- SEGURO a nivel código: ambas son HOJA (FK saliente a negocios; nada las
-- referencia). El código que las definía (schema.ts, relations.ts) ya se limpió
-- en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS negocio_modulos;
DROP TABLE IF EXISTS negocio_preferencias;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ambas tablas ya no deben existir:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('negocio_modulos','negocio_preferencias');
-- =============================================================================
