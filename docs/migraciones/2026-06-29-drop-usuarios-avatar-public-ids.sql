-- =============================================================================
-- 2026-06-29: usuarios — eliminar avatar_public_id y avatar_thumb_public_id
-- =============================================================================
--
-- Quita de la tabla usuarios dos columnas legado de la época de Cloudinary, que
-- guardaban el "public_id" del asset para borrarlo/transformarlo. La app migró a
-- Cloudflare R2, donde NO se usa public_id: el borrado y el reconcile trabajan con
-- la URL/key directamente (ver r2.service.ts → eliminarArchivo / extraerKeyDeUrl,
-- e imageRegistry.ts que registra usuarios.avatar_url para el Recolector).
--
--   avatar_public_id        varchar(100) → ID en Cloudinary. Siempre NULL; ningún
--                           código lo escribe ni lo lee (grep en apps/api y apps/web
--                           el 29-jun-2026: solo aparecía en schema.ts y en un doc
--                           legacy). El nuevo tab "Datos Personales" guarda únicamente
--                           avatar_url.
--   avatar_thumb_public_id  varchar(100) → ID del thumbnail en Cloudinary. Mismo caso:
--                           nunca se cableó con R2. Siempre NULL.
--
-- No hay FK, índices, vistas, triggers ni funciones que dependan de estas columnas.
--
-- IDEMPOTENTE: DROP ... IF EXISTS. Re-ejecutar no falla.
--
-- ORDEN DE DESPLIEGUE: ejecutar DESPUÉS de subir el código que ya no referencia estas
-- columnas (el schema.ts de Drizzle ya se actualizó a mano en este commit). Primero
-- DEV, validar, luego PROD. Importante: NO correr este DROP antes de desplegar el
-- código nuevo, porque el código viejo lista las columnas en sus SELECT (Drizzle) y
-- fallaría. No hay drizzle-kit en el proyecto.
-- =============================================================================

BEGIN;

ALTER TABLE usuarios
    DROP COLUMN IF EXISTS avatar_public_id,
    DROP COLUMN IF EXISTS avatar_thumb_public_id;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (debe devolver 0 filas)
-- =============================================================================
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios'
--   AND column_name IN ('avatar_public_id', 'avatar_thumb_public_id');
-- =============================================================================
