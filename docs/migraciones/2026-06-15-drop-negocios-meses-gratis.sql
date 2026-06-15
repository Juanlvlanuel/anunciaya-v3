-- =============================================================================
-- 2026-06-15: negocios — eliminar meses_gratis_restantes (columna fósil)
-- =============================================================================
--
-- Quita de la tabla negocios la columna meses_gratis_restantes y su índice
-- parcial idx_negocios_meses_gratis.
--
-- POR QUÉ: la columna nació para el programa de embajadores ("meses gratis por
-- referido") pero NUNCA se le cableó lógica. Ningún flujo la escribe (siempre
-- queda en su default 0); solo se leía para mostrarla en la ficha del Panel, y
-- esa etiqueta nunca se renderiza porque se condiciona a `> 0`. No hay cron que
-- la calcule ni la decremente.
--
-- Las CORTESÍAS / meses gratis de membresía NO usan esta columna: se materializan
-- empujando negocios.fecha_vencimiento + fecha_proximo_cobro (fecha de vigencia
-- absoluta) y registrando una fila en pagos_membresia (concepto='cortesia',
-- monto NULL). El cron de vencimientos-manuales vigila fecha_vencimiento.
--
-- VERIFICADO EN DEV: 0 de 21 negocios tienen meses_gratis_restantes > 0 (max=0),
-- así que no hay datos en riesgo. El código que la leía ya se limpió en el mismo
-- commit. No hay FK, vistas ni triggers que dependan de ella; el único objeto
-- dependiente es el índice parcial idx_negocios_meses_gratis.
--
-- IDEMPOTENTE: DROP ... IF EXISTS. Re-ejecutar no falla.
--
-- ORDEN DE DESPLIEGUE: ejecutar DESPUÉS de subir el código que ya no la
-- referencia (primero DEV, validar, luego PROD). El schema.ts de Drizzle ya
-- está actualizado a mano (no hay drizzle-kit en el proyecto).
-- =============================================================================

BEGIN;

-- 1) Índice parcial (se eliminaría solo al dropear la columna; explícito por idempotencia).
DROP INDEX IF EXISTS idx_negocios_meses_gratis;

-- 2) Columna
ALTER TABLE negocios
    DROP COLUMN IF EXISTS meses_gratis_restantes;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- La columna debe haber desaparecido (0 filas):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'negocios' AND column_name = 'meses_gratis_restantes';
--
-- El índice ya no debe existir (0 filas):
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'negocios' AND indexname = 'idx_negocios_meses_gratis';
-- =============================================================================
