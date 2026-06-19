-- =============================================================================
-- 2026-06-19 · Fase CONTRACT — DROP de la columna texto `usuarios.ciudad`
-- =============================================================================
--
-- Cierre de la migración ciudad↔catálogo para la tabla CENTRAL `usuarios`. La columna de
-- TEXTO `usuarios.ciudad` (NULLABLE) queda RETIRADA. Todo el código ya lee el nombre desde
-- el catálogo `ciudades` vía la FK `ciudad_id`:
--   · /auth/yo y login → usuarioAPublico() resuelve el nombre por ciudad_id.
--   · Expediente del Panel Usuarios → LEFT JOIN ciudades (el filtro/métrica ya usaban ciudad_id).
--   · Ciudad del oferente/vendedor/prestador (servicios, marketplace, perfilPrestador) → LEFT JOIN ciudades cu.
-- Las escrituras solo persisten `ciudad_id` (resolverCiudadId): actualizarUbicacionUsuario,
-- onboarding (guardarBorradorSucursal) y negocioManagement (actualizarSucursal). El ORM ya no
-- define la columna texto.
--
-- ⚠️ ORDEN: la columna es NULLABLE (no hay ventana NOT NULL), así que NO hace falta un PASO 0.
--   Pero igual: 1) correr el RE-BACKFILL (2026-06-19-usuarios-ciudad-backfill.sql) y dejar 0
--   filas con texto sin ciudad_id; 2) desplegar el commit de contract (Render); 3) recién
--   entonces este DROP. Correr PRIMERO EN DEV, validar, y SOLO DESPUÉS en PROD.
--
-- IDEMPOTENTE: DROP IF EXISTS. El guard aborta si quedara algún usuario con ciudad de texto
-- significativa pero SIN ciudad_id (perdería su ciudad). usuarios tiene pocos registros.
-- =============================================================================

BEGIN;

-- Guard de seguridad: nadie debe perder su ciudad.
DO $$
DECLARE
    v_huerfanas integer;
BEGIN
    SELECT count(*) INTO v_huerfanas
    FROM usuarios
    WHERE ciudad_id IS NULL
      AND ciudad IS NOT NULL
      AND ciudad <> ''
      AND ciudad <> 'Por configurar';

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'No se puede soltar la columna: % usuario(s) tienen ciudad de texto sin ciudad_id. Correr el re-backfill / reasignar primero.', v_huerfanas;
    END IF;

    RAISE NOTICE 'Guard OK: 0 usuarios perderían su ciudad. Procede el DROP.';
END $$;

-- DROP de la columna texto (borra en cascada cualquier índice que dependa de ella).
ALTER TABLE usuarios DROP COLUMN IF EXISTS ciudad;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (correr después; debe quedar SOLO 'ciudad_id')
-- =============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'usuarios' AND column_name IN ('ciudad','ciudad_id');
-- =============================================================================
