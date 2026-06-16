-- =============================================================================
-- 2026-06-15: eliminar sistema de pedidos/checkout no implementado (2 tablas)
-- =============================================================================
--
-- Elimina el sistema de pedidos (e-commerce con checkout), que nunca se
-- implementó. Es la otra mitad del carrito de compras ya eliminado:
--
--   pedidos            → pedidos/órdenes (tipo entrega, método pago, total, etc.)
--   pedido_articulos   → líneas/ítems de cada pedido (snapshot del artículo)
--
-- POR QUÉ: cero uso funcional en código. No hay módulo (pedidos.service/
-- controller/routes/frontend). La única referencia era la entrada de
-- pedido_articulos.imagen_url en el imageRegistry del recolector R2, ya removida.
-- Verificado en BD: 0 filas en ambas. El comercio local de AnunciaYA es de
-- contacto directo, sin e-commerce con pedidos.
--
-- SEGURO: 0 filas = sin pérdida de datos. pedido_articulos tiene FK a pedidos
-- (se dropea primero); pedidos solo era referenciada por pedido_articulos. El
-- código que las definía (schema.ts, relations.ts, imageRegistry.ts) ya se
-- limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS. Orden por dependencia.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS pedido_articulos;
DROP TABLE IF EXISTS pedidos;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ambas tablas ya no deben existir:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('pedidos','pedido_articulos');
-- =============================================================================
