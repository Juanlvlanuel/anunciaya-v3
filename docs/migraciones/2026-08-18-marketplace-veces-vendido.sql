-- 2026-08-18: articulos_marketplace — contador histórico veces_vendido
-- =============================================================================
--
-- Se incrementa cada vez que el artículo pasa a estado='vendida' (vía
-- apartado o "Marcar vendido" directo) y NUNCA se resetea al reactivar.
-- Sin esto, "Vendidos" en Mis Publicaciones (que filtra por estado ACTUAL)
-- perdía todo rastro de una venta pasada en cuanto el vendedor reactivaba
-- la publicación — no había forma de saber que ese artículo ya se había
-- vendido antes.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que lo usa. │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

ALTER TABLE articulos_marketplace
    ADD COLUMN IF NOT EXISTS veces_vendido integer NOT NULL DEFAULT 0;

-- Backfill: artículos que YA están vendidos hoy (vendida_at IS NOT NULL)
-- arrancan el contador en 1 en vez de 0, para no perder la venta actual.
UPDATE articulos_marketplace
SET veces_vendido = 1
WHERE estado = 'vendida' AND veces_vendido = 0;
