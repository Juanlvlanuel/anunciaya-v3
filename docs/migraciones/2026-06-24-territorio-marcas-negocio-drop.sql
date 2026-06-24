-- 2026-06-24-territorio-marcas-negocio-drop.sql
-- =============================================
-- Revierte la columna `negocio_id` de `territorio_marcas`: la liga marca↔negocio se descartó por no
-- tener caso de uso real (el onboarding siempre captura ubicación, así que no hay negocios "sin ubicar"
-- que necesiten una marca, y ligar a uno que ya está en el mapa es redundante).
--
-- Seguro de correr en cualquier momento: el código ya NO usa esta columna. La corre Juan en DEV y PROD
-- (Query Tool de pgAdmin).

DROP INDEX IF EXISTS idx_territorio_marcas_negocio;

ALTER TABLE territorio_marcas
  DROP COLUMN IF EXISTS negocio_id;
