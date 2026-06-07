-- =============================================================================
-- 2026-06-06 · Paso 5 — Adelgazar `regiones` + regiones de ejemplo + limpieza
-- =============================================================================
--
-- ⚠️ PASO DESTRUCTIVO (doble): (a) QUITA columnas de `regiones` y (b) BORRA filas viejas.
--
-- DECISIÓN DE MODELO: `regiones` es un AGRUPADOR de ciudades, NO una entidad con
-- ubicación. El estado y el país viven en `ciudades` (ya sembrada). Por eso se
-- ELIMINAN `regiones.estado` y `regiones.pais`, y la unicidad pasa de
-- UNIQUE(nombre,estado) a UNIQUE(nombre). El "quién manda" sigue en
-- `usuarios.region_id` del Gerente Regional (no se agrega gerente a esta tabla).
--
-- `regiones` queda con: id, nombre (único), activa, created_at.
--
-- Además crea 2 regiones AGRUPADORAS de ejemplo (solo para probar permisos; el mapa
-- real lo arma el SuperAdmin después):
--   · Sonora-Norte  → Puerto Peñasco + Sonoyta
--   · Sonora-Centro → Caborca
--
-- 🔒 HAZ SNAPSHOT/BACKUP DE DEV ANTES (las columnas estado/pais y las filas viejas se
--    pierden definitivamente al COMMIT; el undo es restaurar del respaldo). Sugerencia:
--      CREATE TABLE _backup_regiones_20260606    AS SELECT * FROM regiones;
--      CREATE TABLE _backup_embajadores_20260606 AS SELECT * FROM embajadores;
--
-- Orden seguro, TODO en una transacción (si algo no cuadra, RAISE → revierte completo):
--   DDL:  quitar unique viejo → DROP estado/pais → crear UNIQUE(nombre)
--   DML:  crear nuevas → asignar ciudades → re-apuntar embajadores → (guard) → borrar viejas → verificar
--
-- IDEMPOTENTE: IF EXISTS / ON CONFLICT / guards. Re-ejecutable. AMBIENTE: DEV primero.
--
-- CÓDIGO: schema.ts y admin/negocios.service.ts ya se ajustaron para NO leer
-- estado/pais (el único lector era regionNombre del detalle del Panel → ahora solo nombre).
-- =============================================================================

BEGIN;

-- ── DDL: adelgazar la tabla `regiones` ──────────────────────────────────────────
ALTER TABLE regiones DROP CONSTRAINT IF EXISTS regiones_nombre_estado_unique;
DROP INDEX IF EXISTS idx_regiones_estado;          -- índice sobre la columna que se elimina
ALTER TABLE regiones DROP COLUMN IF EXISTS estado;
ALTER TABLE regiones DROP COLUMN IF EXISTS pais;

-- Nuevo unique por nombre (idempotente).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regiones_nombre_unique') THEN
        ALTER TABLE regiones ADD CONSTRAINT regiones_nombre_unique UNIQUE (nombre);
    END IF;
END $$;

-- ── DML: regiones de ejemplo, asignar ciudades, limpiar viejas (con guards) ──────
DO $$
DECLARE
    v_norte   uuid;
    v_centro  uuid;
    v_n       integer;
    v_cuelgan integer;
BEGIN
    -- 1) Crear las 2 regiones nuevas (SOLO nombre) — idempotente.
    INSERT INTO regiones (nombre, activa) VALUES
        ('Sonora-Norte',  true),
        ('Sonora-Centro', true)
    ON CONFLICT (nombre) DO NOTHING;

    SELECT id INTO v_norte  FROM regiones WHERE nombre = 'Sonora-Norte';
    SELECT id INTO v_centro FROM regiones WHERE nombre = 'Sonora-Centro';
    IF v_norte IS NULL OR v_centro IS NULL THEN
        RAISE EXCEPTION 'No se pudieron crear/encontrar las regiones nuevas (Norte=%, Centro=%)', v_norte, v_centro;
    END IF;

    -- 2) Asignar ciudades a las nuevas, por slug.
    UPDATE ciudades SET region_id = v_norte WHERE slug IN ('puerto-penasco', 'sonoyta');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Ciudades -> Sonora-Norte: % (esperado 2)', v_n;
    IF v_n <> 2 THEN
        RAISE WARNING 'Sonora-Norte: se esperaban 2 ciudades (puerto-penasco, sonoyta) y se afectaron %. Revisar slugs.', v_n;
    END IF;

    UPDATE ciudades SET region_id = v_centro WHERE slug = 'caborca';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Ciudades -> Sonora-Centro: % (esperado 1)', v_n;
    IF v_n <> 1 THEN
        RAISE WARNING 'Sonora-Centro: se esperaba 1 ciudad (caborca) y se afectaron %. Revisar slug.', v_n;
    END IF;

    -- 3) Liberar el RESTRICT: re-apuntar embajadores viejos a Sonora-Norte ANTES de borrar
    --    (provisional — su cobertura real son las ciudades del Paso 7; esta columna
    --     `embajadores.region_id` se elimina en el Paso 10).
    UPDATE embajadores SET region_id = v_norte
        WHERE region_id NOT IN (SELECT id FROM regiones WHERE nombre IN ('Sonora-Norte', 'Sonora-Centro'));
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Embajadores re-apuntados a Sonora-Norte (provisional): %', v_n;

    -- 4) GUARD anti-RESTRICT/pérdida: nada (usuarios/negocios/embajadores) debe colgar aún
    --    de una región vieja antes de borrar. (Como ya no hay columna `estado`, el DELETE
    --    se acota por nombre; este guard evita chocar con el RESTRICT de embajadores y
    --    perder silenciosamente la región de un gerente/negocio.)
    SELECT count(*) INTO v_cuelgan FROM (
        SELECT region_id FROM usuarios    WHERE region_id IS NOT NULL
        UNION ALL SELECT region_id FROM negocios   WHERE region_id IS NOT NULL
        UNION ALL SELECT region_id FROM embajadores WHERE region_id IS NOT NULL
    ) t
    WHERE region_id NOT IN (SELECT id FROM regiones WHERE nombre IN ('Sonora-Norte', 'Sonora-Centro'));
    IF v_cuelgan > 0 THEN
        RAISE EXCEPTION 'No se puede borrar: % referencia(s) (usuarios/negocios/embajadores) aun cuelgan de regiones viejas. Reasignar primero.', v_cuelgan;
    END IF;

    -- 5) Borrar las regiones viejas (todo lo que no sean las 2 nuevas).
    DELETE FROM regiones WHERE nombre NOT IN ('Sonora-Norte', 'Sonora-Centro');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Regiones viejas borradas: %', v_n;

    -- 6) Verificación final (aborta y revierte si algo no cuadra).
    SELECT count(*) INTO v_n FROM regiones;
    IF v_n <> 2 THEN
        RAISE EXCEPTION 'Se esperaban 2 regiones tras la limpieza, hay %', v_n;
    END IF;

    SELECT count(*) INTO v_n FROM embajadores
        WHERE region_id IS NULL OR region_id NOT IN (SELECT id FROM regiones WHERE nombre IN ('Sonora-Norte', 'Sonora-Centro'));
    IF v_n > 0 THEN
        RAISE EXCEPTION '% embajador(es) quedaron sin region valida', v_n;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'regiones' AND column_name IN ('estado', 'pais')
    ) THEN
        RAISE EXCEPTION 'Las columnas estado/pais aun existen en regiones';
    END IF;

    RAISE NOTICE '=== Paso 5 OK: regiones = (id, nombre, activa, created_at) con {Sonora-Norte, Sonora-Centro}; embajadores validos ===';
END $$;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- `regiones` ya sin estado/pais (4 columnas: id, nombre, activa, created_at):
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'regiones' ORDER BY ordinal_position;
-- Unique nuevo por nombre:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'regiones'::regclass AND contype = 'u';
-- Solo quedan las 2 nuevas:
-- SELECT id, nombre, activa FROM regiones ORDER BY nombre;
-- Las 3 ciudades de ejemplo con su región:
-- SELECT c.slug, c.nombre, r.nombre AS region
--   FROM ciudades c JOIN regiones r ON r.id = c.region_id ORDER BY r.nombre, c.slug;
--   -- caborca→Sonora-Centro · puerto-penasco→Sonora-Norte · sonoyta→Sonora-Norte
-- El Vendedor Prueba en Sonora-Norte (provisional):
-- SELECT e.codigo_referido, r.nombre AS region FROM embajadores e JOIN regiones r ON r.id = e.region_id;

-- =============================================================================
-- ROLLBACK: este paso NO tiene undo SQL simple (quita columnas y borra filas).
--   · Si el bloque falla a media ejecución → la transacción se revierte sola (nada cambia).
--   · Si ya hizo COMMIT y quieres volver atrás → restaura desde el SNAPSHOT que tomaste antes.
-- =============================================================================
