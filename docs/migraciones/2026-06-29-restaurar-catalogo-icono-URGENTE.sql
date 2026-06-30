-- =============================================================================
-- 2026-06-29-restaurar-catalogo-icono-URGENTE.sql  (ROLLBACK del DROP)
-- =============================================================================
-- El DROP de `icono` se corrió ANTES de desplegar el código nuevo. El backend en
-- PROD todavía es el viejo (hace SELECT icono en Negocios/Ofertas/Categorías), así
-- que esas consultas fallan con la columna borrada. Este script RE-CREA la columna
-- (vacía) para que PROD vuelva a funcionar de inmediato con el código actual.
--
-- CORRER YA en PROD (y en DEV si también quieres dejarlo consistente).
-- Idempotente: ADD COLUMN IF NOT EXISTS.
--
-- Después, cuando se despliegue el código que ya NO lee `icono`, volver a correr
-- docs/migraciones/2026-06-29-drop-catalogo-icono.sql (esta vez en el orden correcto).
-- =============================================================================

BEGIN;

ALTER TABLE categorias_negocio    ADD COLUMN IF NOT EXISTS icono varchar(50);
ALTER TABLE subcategorias_negocio ADD COLUMN IF NOT EXISTS icono varchar(50);

COMMIT;
