-- =============================================================================
-- 2026-07-03: Centro de Ayuda — contadores de "¿Te sirvió?"
-- =============================================================================
--
-- El botón "¿Te sirvió?" usa contadores AGREGADOS (sin identidad de usuario),
-- para que funcione igual desde AnunciaYA y desde ScanYA (que usa otro token).
-- El anti-doble-voto se maneja en el cliente (localStorage). `vistas` ya existe.
--
-- Tabla NUEVA de columnas sobre ayuda_articulos. IDEMPOTENTE.
-- =============================================================================

BEGIN;

ALTER TABLE ayuda_articulos
  ADD COLUMN IF NOT EXISTS util_si integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS util_no integer NOT NULL DEFAULT 0;

COMMIT;

-- Verificar:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'ayuda_articulos' AND column_name IN ('vistas','util_si','util_no');
