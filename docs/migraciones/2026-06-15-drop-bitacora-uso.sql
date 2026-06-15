-- =============================================================================
-- 2026-06-15: eliminar tabla fantasma bitacora_uso
-- =============================================================================
--
-- Elimina bitacora_uso, una tabla diseñada como bitácora/tracking de uso
-- (clave, seccion, accion incremento/decremento, cantidad, entidad, notas) que
-- NUNCA se implementó.
--
-- POR QUÉ: cero uso en código. Solo aparecía en el schema de Drizzle y en sus
-- relaciones declaradas; ningún service, controller, ruta, validación ni
-- frontend la toca. Verificado en BD: 0 filas. Es tabla HOJA: solo tiene FKs
-- salientes (a usuarios y negocios); nada externo la referencia.
--
-- SEGURO: 0 filas = sin pérdida de datos. El código que la definía (schema.ts +
-- relations.ts) ya se limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS bitacora_uso;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- La tabla ya no debe existir (0 filas):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'bitacora_uso';
-- =============================================================================
