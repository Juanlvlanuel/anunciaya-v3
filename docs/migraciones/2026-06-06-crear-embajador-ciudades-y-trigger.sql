-- =============================================================================
-- 2026-06-06 · Paso 3 — Tabla `embajador_ciudades` + trigger "una sola región"
-- =============================================================================
--
-- Cobertura de un VENDEDOR (embajador) sobre una o varias CIUDADES. Una fila por
-- ciudad cubierta. La región del vendedor se DEDUCE de sus ciudades (no se guarda).
--
-- Regla cerrada: un vendedor solo cubre ciudades de UNA MISMA región (trabaja bajo
-- un solo Gerente Regional). Se impone en DOS CAPAS:
--   1) validación en el service de cobertura (Paso 8, código), y
--   2) este TRIGGER como cinturón a nivel BD (defensa ante escrituras directas/seed).
--
-- Llaves: PK compuesta (embajador_id, ciudad_id) → evita duplicados.
--   embajador_id → embajadores  ON DELETE CASCADE  (si se borra el vendedor, su cobertura cae)
--   ciudad_id    → ciudades      ON DELETE RESTRICT (no se borra una ciudad cubierta)
--
-- ORDEN: esta tabla NO se puebla aquí (eso es el Paso 7, DESPUÉS del Paso 5 que asigna
-- `ciudades.region_id`). Hoy las ciudades tienen region_id NULL, así que el trigger
-- RECHAZARÁ cualquier inserción (correcto): no hay región que cubrir todavía.
--
-- IDEMPOTENTE: CREATE TABLE/INDEX IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- DROP TRIGGER IF EXISTS + CREATE TRIGGER. Re-ejecutable sin efectos.
-- REVERSIBLE: ver bloque ROLLBACK al final. AMBIENTE: DEV primero.
-- =============================================================================

BEGIN;

-- 1) Tabla de cobertura vendedor ↔ ciudades --------------------------------------
CREATE TABLE IF NOT EXISTS embajador_ciudades (
    embajador_id uuid NOT NULL REFERENCES embajadores(id) ON DELETE CASCADE,
    ciudad_id    uuid NOT NULL REFERENCES ciudades(id)    ON DELETE RESTRICT,
    created_at   timestamptz DEFAULT now(),
    PRIMARY KEY (embajador_id, ciudad_id)
);

-- Índice para resolver "qué vendedores cubren esta ciudad" (la PK ya cubre embajador_id).
CREATE INDEX IF NOT EXISTS idx_embajador_ciudades_ciudad ON embajador_ciudades (ciudad_id);

-- 2) Trigger: todas las ciudades de un vendedor deben ser de la MISMA región ------
CREATE OR REPLACE FUNCTION fn_embajador_una_region() RETURNS trigger AS $$
DECLARE
    v_region_nueva uuid;
    v_otra         uuid;
BEGIN
    -- Región de la ciudad que se intenta agregar.
    SELECT region_id INTO v_region_nueva FROM ciudades WHERE id = NEW.ciudad_id;

    -- Una ciudad sin región no puede asignarse a un vendedor (se agrupa primero).
    IF v_region_nueva IS NULL THEN
        RAISE EXCEPTION 'La ciudad % no tiene region asignada; no se puede asignar al vendedor', NEW.ciudad_id;
    END IF;

    -- ¿El vendedor ya cubre alguna ciudad de OTRA región?
    SELECT c.region_id INTO v_otra
    FROM embajador_ciudades ec
    JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE ec.embajador_id = NEW.embajador_id
      AND ec.ciudad_id <> NEW.ciudad_id
      AND c.region_id IS DISTINCT FROM v_region_nueva
    LIMIT 1;

    IF v_otra IS NOT NULL THEN
        RAISE EXCEPTION 'El vendedor % ya cubre otra region; todas sus ciudades deben ser de la misma region', NEW.embajador_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_embajador_una_region ON embajador_ciudades;
CREATE TRIGGER trg_embajador_una_region
    BEFORE INSERT OR UPDATE ON embajador_ciudades
    FOR EACH ROW EXECUTE FUNCTION fn_embajador_una_region();

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después)
-- =============================================================================
-- Columnas (embajador_id, ciudad_id, created_at):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'embajador_ciudades' ORDER BY ordinal_position;
-- Constraints (PK + 2 FK):
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'embajador_ciudades'::regclass;
-- Trigger presente (trg_embajador_una_region):
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'embajador_ciudades'::regclass AND NOT tgisinternal;
-- Filas (0):
-- SELECT count(*) FROM embajador_ciudades;

-- PRUEBA OPCIONAL DEL TRIGGER (no deja datos): hoy toda ciudad tiene region NULL,
-- así que el trigger DEBE rechazar con "La ciudad ... no tiene region asignada".
-- BEGIN;
--   INSERT INTO embajador_ciudades (embajador_id, ciudad_id)
--   VALUES ((SELECT id FROM embajadores LIMIT 1),
--           (SELECT id FROM ciudades WHERE slug = 'caborca'));
-- ROLLBACK;

-- =============================================================================
-- ROLLBACK (deshacer este paso — seguro, nada cuelga aún):
-- DROP TRIGGER IF EXISTS trg_embajador_una_region ON embajador_ciudades;
-- DROP FUNCTION IF EXISTS fn_embajador_una_region();
-- DROP TABLE IF EXISTS embajador_ciudades;
-- =============================================================================
