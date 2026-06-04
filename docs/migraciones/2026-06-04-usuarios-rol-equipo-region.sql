-- =============================================================================
-- 2026-06-04: usuarios — rol_equipo + region_id (cimiento Auth del Panel Admin)
-- =============================================================================
--
-- Agrega el ROL DE EQUIPO y la REGIÓN del gerente a la tabla usuarios.
-- Es el cimiento de "rol de equipo + auth del Panel" (Fase 0 del Panel Admin).
-- NO construye secciones del Panel; solo el "dónde guardar" el rol y la región.
--
--   `rol_equipo varchar(20)` NULL  → superadmin | gerente | vendedor | NULL
--       NULL = usuario normal (todos los existentes). El rol es una capa encima
--       del tipo de cuenta (perfil personal/comercial), no lo reemplaza.
--   `region_id uuid` NULL (FK regiones) → región del GERENTE.
--       Fuente de región por rol (sin duplicar):
--         - gerente  → usuarios.region_id (esta columna)
--         - vendedor → embajadores.region_id (su tabla, ya existe; NO se toca)
--         - superadmin / usuario normal → NULL
--
-- USUARIOS EXISTENTES: ambas columnas se crean nullables sin default, así que
-- todas las filas quedan con rol_equipo = NULL y region_id = NULL = usuarios
-- normales. El login normal NO cambia. Ningún usuario se rompe.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + guardas para constraints e índices.
-- =============================================================================

BEGIN;

-- 1) Columnas
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS rol_equipo varchar(20),
    ADD COLUMN IF NOT EXISTS region_id  uuid;

-- 2) Validación de los 3 roles permitidos (NULL sigue siendo válido)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_rol_equipo_check') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_rol_equipo_check
            CHECK (rol_equipo IN ('superadmin','gerente','vendedor'));
    END IF;

    -- 3) FK de región (se borra la región → region_id queda NULL)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_region') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT fk_usuarios_region
            FOREIGN KEY (region_id) REFERENCES regiones(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4) Índices parciales (solo filas de equipo / con región)
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_equipo
    ON usuarios (rol_equipo) WHERE rol_equipo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_region_id
    ON usuarios (region_id) WHERE region_id IS NOT NULL;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Columnas creadas:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name='usuarios' AND column_name IN ('rol_equipo','region_id');
--
-- Todos los usuarios existentes deben quedar con rol_equipo NULL:
-- SELECT rol_equipo, count(*) FROM usuarios GROUP BY rol_equipo;
-- =============================================================================
