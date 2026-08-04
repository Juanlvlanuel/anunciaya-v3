-- 2026-08-04 · dinamicas — borrador parcial (solo título obligatorio al crear)
-- ==============================================================================
-- Hasta ahora "Guardar" (borrador) exigía exactamente los mismos campos que
-- "Publicar" — la única diferencia real era el checklist legal. Eso hacía que
-- un borrador no sirviera para "anotar el título y volver después": había que
-- terminar casi toda la Dinámica para poder guardar cualquier avance.
--
-- Esta migración libera de NOT NULL las columnas que ahora pueden quedar
-- vacías mientras la Dinámica sigue en 'borrador' — se vuelven obligatorias
-- otra vez recién al PUBLICAR (esa validación de completitud vive en
-- `publicarDinamica`, en el backend, no en un CHECK de BD — un CHECK no puede
-- condicionar "obligatorio SOLO si estado != borrador").
--
-- `titulo` y `ciudad_id` NO se tocan — siguen obligatorios incluso para el
-- borrador (título para poder identificarlo en un futuro listado; ciudad se
-- siembra sola desde el GPS, así que en la práctica nunca es una fricción
-- real para el usuario).
--
-- Los CHECK existentes (`dinamicas_metodo_sorteo_check`,
-- `dinamicas_numero_total_boletos_check`, `dinamicas_precio_boleto_check`,
-- `dinamicas_regla_desempate_metodo_check`) NO necesitan tocarse: en
-- Postgres un CHECK se evalúa a UNKNOWN (no a FALSE) cuando el valor es NULL,
-- y UNKNOWN se trata como que SÍ pasa la restricción — así que estas 4
-- columnas pueden quedar en NULL sin violar ningún CHECK ya existente.
--
-- IDEMPOTENTE: DROP NOT NULL no falla si la columna ya lo tenía quitado
-- (Postgres simplemente no hace nada).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Correr en DEV primero, luego PROD. Antes de desplegar el backend que  │
-- │     ya no manda estos campos al crear un borrador.                       │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ==============================================================================

BEGIN;

ALTER TABLE dinamicas ALTER COLUMN descripcion DROP NOT NULL;
ALTER TABLE dinamicas ALTER COLUMN tipo_premio DROP NOT NULL;
ALTER TABLE dinamicas ALTER COLUMN metodo_sorteo DROP NOT NULL;
ALTER TABLE dinamicas ALTER COLUMN numero_total_boletos DROP NOT NULL;
ALTER TABLE dinamicas ALTER COLUMN precio_boleto DROP NOT NULL;
ALTER TABLE dinamicas ALTER COLUMN fecha_limite_inscripcion DROP NOT NULL;

COMMIT;

-- VERIFICACIÓN:
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'dinamicas'
--   AND column_name IN ('descripcion','tipo_premio','metodo_sorteo','numero_total_boletos','precio_boleto','fecha_limite_inscripcion');
--   (deben mostrar is_nullable = 'YES')
--
-- ROLLBACK (solo si no hay filas con estos campos en NULL todavía):
--   ALTER TABLE dinamicas ALTER COLUMN descripcion SET NOT NULL;
--   ALTER TABLE dinamicas ALTER COLUMN tipo_premio SET NOT NULL;
--   ALTER TABLE dinamicas ALTER COLUMN metodo_sorteo SET NOT NULL;
--   ALTER TABLE dinamicas ALTER COLUMN numero_total_boletos SET NOT NULL;
--   ALTER TABLE dinamicas ALTER COLUMN precio_boleto SET NOT NULL;
--   ALTER TABLE dinamicas ALTER COLUMN fecha_limite_inscripcion SET NOT NULL;
-- ==============================================================================
