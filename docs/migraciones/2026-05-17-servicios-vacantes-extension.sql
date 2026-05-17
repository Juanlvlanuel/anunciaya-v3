-- =============================================================================
-- 2026-05-17: servicios_publicaciones — extensión para Vacantes (Sprint 8 / BS)
-- =============================================================================
--
-- Agrega 3 columnas + 1 estado nuevo a `servicios_publicaciones` para soportar
-- el módulo "Vacantes" de Business Studio. Las vacantes son un caso especial
-- de publicación con `tipo='vacante-empresa'`, publicadas desde BS por un
-- operador del negocio. Aparecen en el feed público de Servicios igual que
-- el resto de publicaciones.
--
-- Cambios:
--
--   1. `sucursal_id` (UUID FK a negocio_sucursales, NULLABLE) — vincula la
--      vacante a una sucursal específica del negocio. NULL para publicaciones
--      personales (servicio-persona / solicito); requerido para vacantes.
--
--   2. `tipo_empleo` (varchar 20, NULLABLE) — solo aplica a vacantes:
--      'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual'.
--      NULL para otros tipos.
--
--   3. `beneficios` (text[], NOT NULL default '{}') — array de prestaciones
--      ("Aguinaldo", "2 días home office", etc.). Max 8 elementos, cada uno
--      hasta 100 chars. Solo aplica a vacantes en la UI; otros tipos lo
--      mantienen vacío.
--
--   4. Nuevo estado `'cerrada'` en el CHECK de `estado`. Distinto de pausada
--      — pausada sugiere "puede volver", cerrada es "puesto cubierto, no
--      retorna". Útil para métricas históricas del comerciante.
--
--   5. Índice nuevo en `sucursal_id` para queries filtradas (cada empleado
--      de sucursal solo ve sus vacantes).
--
-- IDEMPOTENTE: usa IF NOT EXISTS y DROP IF EXISTS.
-- =============================================================================

BEGIN;

-- 1. Columnas nuevas
ALTER TABLE servicios_publicaciones
    ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES negocio_sucursales(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tipo_empleo varchar(20),
    ADD COLUMN IF NOT EXISTS beneficios text[] NOT NULL DEFAULT '{}';

-- 2. CHECK para tipo_empleo (valores válidos cuando no es NULL)
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_tipo_empleo_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_tipo_empleo_check
    CHECK (
        tipo_empleo IS NULL
        OR tipo_empleo::text = ANY (
            ARRAY['tiempo-completo', 'medio-tiempo', 'por-proyecto', 'eventual']::text[]
        )
    );

-- 3. CHECK: tipo_empleo solo cuando tipo='vacante-empresa'
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_tipo_empleo_solo_vacante_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_tipo_empleo_solo_vacante_check
    CHECK (tipo_empleo IS NULL OR tipo = 'vacante-empresa');

-- 4. CHECK: beneficios max 8 elementos
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_beneficios_max_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_beneficios_max_check
    CHECK (array_length(beneficios, 1) IS NULL OR array_length(beneficios, 1) <= 8);

-- 5. Actualizar CHECK de estado para incluir 'cerrada'
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_estado_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_estado_check
    CHECK (
        estado::text = ANY (
            ARRAY['activa', 'pausada', 'cerrada', 'eliminada']::text[]
        )
    );

-- 6. Índice nuevo en sucursal_id (parcial — solo filas con sucursal)
CREATE INDEX IF NOT EXISTS idx_servicios_pub_sucursal
    ON servicios_publicaciones(sucursal_id)
    WHERE sucursal_id IS NOT NULL;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'servicios_publicaciones'
--   AND column_name IN ('sucursal_id', 'tipo_empleo', 'beneficios');
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'servicios_publicaciones'::regclass
--   AND conname IN (
--       'servicios_pub_estado_check',
--       'servicios_pub_tipo_empleo_check',
--       'servicios_pub_tipo_empleo_solo_vacante_check',
--       'servicios_pub_beneficios_max_check'
--   );
