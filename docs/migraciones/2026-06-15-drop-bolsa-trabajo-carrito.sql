-- =============================================================================
-- 2026-06-15: eliminar tablas fantasma/legacy bolsa_trabajo, carrito y
--             carrito_articulos
-- =============================================================================
--
-- Elimina tres tablas sin uso:
--
--   bolsa_trabajo        → tabla VIEJA de empleos (vacante/servicio). Fue
--                          reemplazada por servicios_publicaciones (sección
--                          Servicios, mayo 2026) y quedó huérfana. Sus únicas
--                          referencias en código eran del sistema de limpieza R2
--                          (imageRegistry + negocioManagement), ya removidas.
--   carrito              → carrito de compras tipo e-commerce, nunca implementado.
--   carrito_articulos    → ítems del carrito, nunca implementados.
--
-- POR QUÉ: cero uso funcional en código y 0 filas en BD. El MarketPlace de
-- AnunciaYA es de clasificados/contacto directo (sin checkout con carrito).
--
-- SEGURO: 0 filas en las tres = sin pérdida de datos. carrito_articulos tiene FK
-- a carrito (se dropea primero). bolsa_trabajo es hoja. El código que las
-- definía/referenciaba (schema.ts, relations.ts, imageRegistry.ts,
-- negocioManagement.service.ts) ya se limpió en el mismo commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS. Orden por dependencia.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS carrito_articulos;
DROP TABLE IF EXISTS carrito;
DROP TABLE IF EXISTS bolsa_trabajo;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Las tres tablas ya no deben existir (0 filas):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('bolsa_trabajo','carrito','carrito_articulos');
-- =============================================================================
