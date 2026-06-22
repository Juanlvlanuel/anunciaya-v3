-- =============================================================================
-- 2026-06-22 · configuracion_sistema → permitir la categoría 'publicidad'
-- =============================================================================
-- PROBLEMA: el CHECK `configuracion_categoria_check` solo aceptaba
--   transacciones · notificaciones · seguridad · pagos · promociones · trials · general
-- El módulo Publicidad (Panel Admin, módulo 7) usa categoria = 'publicidad' en sus 9
-- claves de CONFIG_EDITABLE. Mientras solo se LEÍAN (valores por defecto del código) no
-- había fila en la tabla, así que el CHECK nunca se disparaba. Al GUARDAR un precio por
-- primera vez, el UPSERT hace INSERT con categoria='publicidad' y la BD lo rechaza:
--   ERROR 23514: new row ... violates check constraint "configuracion_categoria_check"
--
-- SOLUCIÓN: recrear el CHECK incluyendo 'publicidad'. Idempotente (DROP IF EXISTS).
-- Correr en DEV y en PROD. No toca datos; solo amplía las categorías válidas.
-- =============================================================================

ALTER TABLE configuracion_sistema
    DROP CONSTRAINT IF EXISTS configuracion_categoria_check;

ALTER TABLE configuracion_sistema
    ADD CONSTRAINT configuracion_categoria_check
    CHECK ((categoria)::text = ANY (ARRAY[
        'transacciones'::character varying,
        'notificaciones'::character varying,
        'seguridad'::character varying,
        'pagos'::character varying,
        'promociones'::character varying,
        'trials'::character varying,
        'general'::character varying,
        'publicidad'::character varying
    ]::text[]));

-- Verificación (opcional):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'configuracion_categoria_check';
