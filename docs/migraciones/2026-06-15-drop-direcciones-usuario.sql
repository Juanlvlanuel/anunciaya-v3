-- =============================================================================
-- 2026-06-15: eliminar tabla fantasma direcciones_usuario
-- =============================================================================
--
-- Elimina direcciones_usuario, diseñada para guardar direcciones de envío/delivery
-- de los usuarios, pero que NUNCA se implementó.
--
-- POR QUÉ: cero uso en código (solo schema de Drizzle + relaciones declaradas;
-- ningún service, controller, ruta ni frontend la toca) y 0 filas en BD. El
-- comercio local de AnunciaYA es de contacto directo, sin e-commerce con envío
-- (el carrito ya se eliminó por la misma razón). Es tabla HOJA: su única FK es
-- saliente (a usuarios); nada la referencia.
--
-- SEGURO: 0 filas = sin pérdida de datos. El código que la definía (schema.ts,
-- relations.ts) ya se limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS direcciones_usuario;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- La tabla ya no debe existir (0 filas):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'direcciones_usuario';
-- =============================================================================
