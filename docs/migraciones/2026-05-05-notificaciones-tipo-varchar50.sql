-- =============================================================================
-- Migración: 2026-05-05 — notificaciones.tipo VARCHAR(30) → VARCHAR(50)
-- =============================================================================
--
-- Fix de bug detectado en verificación de Sprint 9.2 (Q&A Marketplace):
-- el tipo `marketplace_pregunta_respondida` mide 31 caracteres y excede el
-- límite original VARCHAR(30) de la columna `notificaciones.tipo`. El INSERT
-- fallaba con "value too long for type character varying(30)" y la
-- notificación al comprador nunca se guardaba.
--
-- La migración del Sprint 9.2 actualizó el CHECK constraint para aceptar el
-- tipo nuevo, pero olvidó subir el ancho del varchar.
--
-- Aplicar en: BD local + Supabase producción.
-- =============================================================================

ALTER TABLE notificaciones ALTER COLUMN tipo TYPE VARCHAR(50);
