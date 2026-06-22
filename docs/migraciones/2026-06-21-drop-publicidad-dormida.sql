-- =============================================================================
-- 2026-06-21: Jubilar el schema DORMIDO de publicidad (planes_anuncios /
-- promociones_pagadas) — reemplazado por publicidad_compras/piezas/ciudades.
-- ----------------------------------------------------------------------------
-- Estas 2 tablas eran de un diseño anterior del proyecto (self-service por
-- "planes" con hasta 5 secciones, pago Stripe, SIN dimensión ciudad). Estaban
-- DORMIDAS: ningún controller/service/ruta/front las usaba (solo aparecían en el
-- ORM, ya retiradas de schema.ts/relations.ts). El nuevo módulo Publicidad las
-- reemplaza, así que se DROPEAN aquí.
--
-- SEGURIDAD: la migración ABORTA si alguna tiene filas (no debería: estaban
-- dormidas), para no borrar datos reales por accidente. Si abortara, revisa el
-- contenido antes de decidir. La corre Juan en DEV y PROD. Idempotente.
-- Ver docs/arquitectura/Panel_Admin/Publicidad.md.
-- =============================================================================

DO $$
DECLARE
    n_promos bigint := 0;
    n_planes bigint := 0;
BEGIN
    IF to_regclass('public.promociones_pagadas') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM promociones_pagadas' INTO n_promos;
    END IF;
    IF to_regclass('public.planes_anuncios') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM planes_anuncios' INTO n_planes;
    END IF;

    IF n_promos > 0 OR n_planes > 0 THEN
        RAISE EXCEPTION 'No se dropea: planes_anuncios=% filas, promociones_pagadas=% filas. Revisa antes de forzar.',
            n_planes, n_promos;
    END IF;

    -- promociones_pagadas primero (tiene FK → planes_anuncios).
    DROP TABLE IF EXISTS promociones_pagadas;
    DROP TABLE IF EXISTS planes_anuncios;
END $$;

-- =============================================================================
-- VERIFICACIÓN (ambas deben devolver NULL):
--   SELECT to_regclass('public.planes_anuncios'),
--          to_regclass('public.promociones_pagadas');
-- =============================================================================
