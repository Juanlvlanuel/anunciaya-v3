-- =============================================================================
-- 2026-06-29-drop-catalogo-icono.sql
-- =============================================================================
-- Fase CONTRACT (expand-migrate-contract): elimina la columna `icono` de
-- categorias_negocio y subcategorias_negocio. Era data muerta: la app web nunca
-- renderizó ese emoji (mostraba un placeholder), y el Panel dejó de usarlo.
--
-- ⚠️ ORDEN OBLIGATORIO: correr este DROP SOLO DESPUÉS de desplegar el código que
-- ya NO lee la columna (ORM schema.ts, categorias.service público, negocios.service,
-- ofertas.service, tipos). Si se corre antes del deploy, el backend viejo —que aún
-- hace SELECT icono— rompe. En DEV local se puede correr ya (el código local ya no
-- la usa); en PROD: deploy primero, DROP después.
--
-- Idempotente: DROP COLUMN IF EXISTS. Re-ejecutable.
-- EJECUTAR EN: dev y prod. La corre Juan.
-- =============================================================================

BEGIN;

ALTER TABLE categorias_negocio    DROP COLUMN IF EXISTS icono;
ALTER TABLE subcategorias_negocio DROP COLUMN IF EXISTS icono;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('categorias_negocio','subcategorias_negocio')
--     AND column_name = 'icono';   -- debe devolver 0 filas
-- =============================================================================
