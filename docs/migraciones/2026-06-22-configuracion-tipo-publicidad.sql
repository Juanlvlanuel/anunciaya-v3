-- =============================================================================
-- 2026-06-22 · configuracion_sistema → permitir los tipos 'tramos_ciudades' y 'periodos_meses'
-- =============================================================================
-- PROBLEMA: el CHECK `configuracion_tipo_check` solo aceptaba
--   numero · texto · booleano · json
-- El módulo Publicidad (Panel Admin, módulo 7) usa dos tipos PROPIOS para sus editores
-- dedicados: `tramos_ciudades` (multiplicador por #ciudades) y `periodos_meses` (pago por
-- adelantado). Mientras solo se LEÍAN (valores por defecto del código) no había fila, así
-- que el CHECK nunca se disparaba. Al GUARDAR cualquiera de esos dos por primera vez, el
-- UPSERT hace INSERT con tipo='tramos_ciudades' / 'periodos_meses' y la BD lo rechaza:
--   ERROR 23514: new row ... violates check constraint "configuracion_tipo_check"
-- (La escalera de comisiones no falla porque usa tipo='json', que sí está permitido.)
--
-- SOLUCIÓN: recrear el CHECK incluyendo los dos tipos. Idempotente (DROP IF EXISTS).
-- Correr en DEV y en PROD. No toca datos; solo amplía los tipos válidos.
-- Relacionada: 2026-06-22-configuracion-categoria-publicidad.sql (mismo módulo, categoría).
-- =============================================================================

ALTER TABLE configuracion_sistema
    DROP CONSTRAINT IF EXISTS configuracion_tipo_check;

ALTER TABLE configuracion_sistema
    ADD CONSTRAINT configuracion_tipo_check
    CHECK ((tipo)::text = ANY (ARRAY[
        'numero'::character varying,
        'texto'::character varying,
        'booleano'::character varying,
        'json'::character varying,
        'tramos_ciudades'::character varying,
        'periodos_meses'::character varying
    ]::text[]));

-- Verificación (opcional):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'configuracion_tipo_check';
