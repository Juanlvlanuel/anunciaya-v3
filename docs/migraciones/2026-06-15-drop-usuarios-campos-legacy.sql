-- =============================================================================
-- 2026-06-15: usuarios — eliminar 5 columnas legacy sin uso real
-- =============================================================================
--
-- Quita de la tabla usuarios columnas que nunca llegaron a usarse de verdad.
-- Ninguna soporta funcionalidad activa; el código que las leía ya se limpió en
-- el mismo commit. No hay FK, vistas, triggers ni funciones que dependan de
-- ellas. El único objeto dependiente es el índice único usuarios_alias_unique.
--
--   alias                     varchar(35)  → "handle" de usuario que nunca se
--                             implementó (sin endpoint que lo asigne; siempre
--                             NULL). Lo leía la búsqueda de personas de ChatYA
--                             (inerte por estar siempre vacío) y el expediente
--                             del Panel Admin. Tiene índice único asociado.
--   autenticado_por_facebook  boolean      → login con Facebook nunca existió
--                             (solo Google). Siempre false. Solo se mostraba un
--                             chip en la ficha del Panel Admin.
--   telefono_verificado       boolean      → verificación de teléfono no
--                             implementada (sin flujo SMS/OTP). Siempre false.
--   codigo_verificacion       varchar(10)  → columna fantasma: TODO el flujo de
--                             códigos (registro/recuperación) vive en Redis con
--                             TTL, nunca en esta columna. Nadie la escribía ni
--                             leía.
--   fecha_reactivacion        timestamptz  → solo se escribía al reactivar un
--                             usuario; nunca se leía. El "cuándo" de la
--                             reactivación queda en fecha_cambio_estado y en la
--                             bitácora de auditoría (accion 'usuario_reactivar').
--
-- IDEMPOTENTE: DROP ... IF EXISTS en columnas e índice. Re-ejecutar no falla.
--
-- ORDEN DE DESPLIEGUE: este SQL se ejecuta DESPUÉS de subir el código que ya no
-- referencia estas columnas (primero DEV, validar, luego PROD). El schema.ts de
-- Drizzle ya está actualizado a mano (no hay drizzle-kit en el proyecto).
-- =============================================================================

BEGIN;

-- 1) Índice único de alias (se eliminaría solo al dropear la columna, pero lo
--    hacemos explícito por idempotencia y por si quedó en estado inconsistente).
DROP INDEX IF EXISTS usuarios_alias_unique;

-- 2) Columnas
ALTER TABLE usuarios
    DROP COLUMN IF EXISTS alias,
    DROP COLUMN IF EXISTS autenticado_por_facebook,
    DROP COLUMN IF EXISTS telefono_verificado,
    DROP COLUMN IF EXISTS codigo_verificacion,
    DROP COLUMN IF EXISTS fecha_reactivacion;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Las 5 columnas deben haber desaparecido (la query debe devolver 0 filas):
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios'
--   AND column_name IN ('alias','autenticado_por_facebook','telefono_verificado',
--                       'codigo_verificacion','fecha_reactivacion');
--
-- El índice único de alias ya no debe existir (0 filas):
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'usuarios' AND indexname = 'usuarios_alias_unique';
-- =============================================================================
