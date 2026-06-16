-- =============================================================================
-- 2026-06-15: eliminar planes y plan_reglas (catálogo de planes sin uso)
-- =============================================================================
--
-- Elimina el par de tablas del catálogo de planes de membresía:
--
--   planes        → catálogo de planes (perfil, membresia 1/2/3, precio_mensual,
--                   precio_anual). 3 filas (seed), sin uso en código.
--   plan_reglas   → límites/reglas configurables por plan (clave, tipo, seccion,
--                   valor). 0 filas, sin uso.
--
-- POR QUÉ: cero uso en código. Ningún service, controller, ruta ni SQL crudo del
-- backend las consulta (solo aparecían en el schema de Drizzle + relaciones
-- declaradas); el frontend tampoco (no hay endpoint que las exponga). La
-- membresía real se maneja con Stripe + columnas en negocios/usuarios
-- (estado_membresia, membresia smallint), no con estas tablas.
--
-- SEGURO: plan_reglas tiene FK a planes (se dropea primero) y es la única tabla
-- que referencia a planes. planes tiene 3 filas residuales (seed) y plan_reglas
-- 0; confirmado por el dueño que se eliminan ambas. NO confundir con
-- planes_anuncios (planes de anuncios destacados), que es otra tabla y se queda.
-- El código que las definía (schema.ts, relations.ts) ya se limpió en el mismo
-- commit.
--
-- IDEMPOTENTE: DROP TABLE IF EXISTS. Orden por dependencia.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS plan_reglas;
DROP TABLE IF EXISTS planes;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ambas tablas ya no deben existir (planes_anuncios SÍ debe seguir):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('planes','plan_reglas','planes_anuncios');
-- =============================================================================
