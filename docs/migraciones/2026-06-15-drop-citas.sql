-- =============================================================================
-- 2026-06-15: eliminar sistema de citas no implementado (3 tablas)
-- =============================================================================
--
-- Elimina el sistema de agendamiento de citas, que nunca se implementó:
--
--   citas                              → citas/reservas (cliente reserva un
--                                        servicio con un empleado de un negocio)
--   negocio_citas_config               → configuración de citas por negocio
--   negocio_citas_fechas_especificas   → excepciones de horario por fecha
--
-- POR QUÉ: cero uso en código. No hay módulo (citas.service/controller/routes),
-- ni queries (query builder ni SQL crudo), ni UI de agendamiento. Solo aparecían
-- en el schema de Drizzle y sus relaciones declaradas. Verificado en BD: 0 filas
-- en las tres.
--
-- SEGURO: 0 filas = sin pérdida de datos. Las tres son HOJA (nada las referencia
-- por FK; sus FKs son salientes a negocios/usuarios/empleados/articulos). El
-- código que las definía (schema.ts, relations.ts) ya se limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS citas;
DROP TABLE IF EXISTS negocio_citas_fechas_especificas;
DROP TABLE IF EXISTS negocio_citas_config;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Las tres tablas ya no deben existir (0 filas):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('citas','negocio_citas_config','negocio_citas_fechas_especificas');
-- =============================================================================
