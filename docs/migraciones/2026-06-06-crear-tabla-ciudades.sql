-- =============================================================================
-- 2026-06-06 · Paso 1 — Crear tabla `ciudades` (separación ciudad ↔ región)
-- =============================================================================
--
-- Primer paso de la migración que separa CIUDADES de REGIONES. Crea SOLO el
-- "dónde guardar" el catálogo real de ciudades. NO puebla datos (eso es el Paso 2,
-- script `seed-ciudades.ts`) y NO toca regiones/negocios/embajadores todavía.
--
-- Modelo nuevo (recordatorio):
--   · `ciudades` = catálogo real (nombre/estado/coords/alias), poblado desde el
--     catálogo hardcodeado `ciudadesPopulares`.
--   · Cada ciudad pertenece a UNA región (Modelo 1) vía `region_id` — NULLABLE al
--     inicio: las ciudades nacen sin región y el SuperAdmin las agrupa después.
--   · `slug` UNIQUE (nombre normalizado: minúsculas, sin acentos, espacios→'-') es
--     la salvaguarda contra duplicados tipo "Puerto Peñasco" / "Puerto Penasco".
--
-- IDEMPOTENTE: CREATE TABLE/INDEX IF NOT EXISTS. Re-ejecutable sin efectos.
-- REVERSIBLE 100%: `DROP TABLE IF EXISTS ciudades;` (aún no cuelga nada de ella).
-- AMBIENTE: correr en DEV primero. (PROD: igual, pero más adelante, con tu OK.)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ciudades (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      varchar(100) NOT NULL,                 -- "Puerto Peñasco"
    estado      varchar(100) NOT NULL,                 -- "Sonora"
    pais        varchar(100) NOT NULL DEFAULT 'México',
    slug        varchar(140) NOT NULL,                 -- "puerto-penasco" (normalizado, único)
    lat         numeric(9,6),                          -- coordenada (del catálogo)
    lng         numeric(9,6),
    alias       jsonb,                                 -- ["rocky point","puerto penasco"]
    importancia smallint NOT NULL DEFAULT 0,           -- orden del buscador
    activa      boolean  NOT NULL DEFAULT true,
    region_id   uuid REFERENCES regiones(id) ON DELETE SET NULL,  -- Modelo 1, nullable al inicio
    created_at  timestamptz DEFAULT now()
);

-- Salvaguarda anti-duplicados (acentos/mayúsculas): el slug normalizado es único.
CREATE UNIQUE INDEX IF NOT EXISTS ciudades_slug_unique ON ciudades (slug);

-- Filtrar/agrupar por región y por activas.
CREATE INDEX IF NOT EXISTS idx_ciudades_region ON ciudades (region_id);
CREATE INDEX IF NOT EXISTS idx_ciudades_activa ON ciudades (activa) WHERE activa = true;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después; deben salir las columnas, 3 índices y 0 filas)
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns WHERE table_name = 'ciudades' ORDER BY ordinal_position;
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ciudades' ORDER BY indexname;
-- SELECT count(*) AS filas FROM ciudades;   -- 0 (se puebla en el Paso 2)
-- =============================================================================

-- ROLLBACK (si quisieras deshacer este paso — es seguro, nada depende aún):
-- DROP TABLE IF EXISTS ciudades;
