-- ============================================================================
-- Migración one-shot: comprobante_url en pagos_vendedor (evidencia del pago)
-- ----------------------------------------------------------------------------
-- Vendedores y comisiones — pieza E (liquidación). Guarda la URL de la foto/
-- comprobante del pago al vendedor (Cloudflare R2). La corre Juan en DEV y PROD.
--
-- Va aparte de 2026-06-17-vendedores-comisiones-fase2.sql porque esa ya se corrió.
-- Idempotente.
-- ============================================================================

ALTER TABLE pagos_vendedor ADD COLUMN IF NOT EXISTS comprobante_url text;

-- Verificación:
-- \d pagos_vendedor
