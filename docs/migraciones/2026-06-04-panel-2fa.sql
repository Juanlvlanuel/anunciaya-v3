-- =============================================================================
-- Panel Admin — 2FA del Panel (solo SuperAdmin, separado del 2FA general)
-- =============================================================================
-- Agrega el interruptor del 2FA del Panel y su secreto TOTP.
--
-- IMPORTANTE: columnas SEPARADAS de doble_factor_* (que es el 2FA general de la
-- app). Así, prender el 2FA del Panel NUNCA afecta el login de AnunciaYA.
--
-- Idempotente (IF NOT EXISTS). Correr en DEV y luego en PROD — dev y prod deben
-- quedar SIEMPRE iguales.
-- =============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS panel_2fa_habilitado boolean NOT NULL DEFAULT false;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS panel_2fa_secreto varchar(64);
