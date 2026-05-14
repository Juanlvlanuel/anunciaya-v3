-- =============================================================================
-- 2026-05-13: MarketPlace — persistir confirmaciones del checklist de publicar
-- =============================================================================
--
-- Razón: el wizard de publicar (Paso 3) pide al vendedor que marque 4
-- confirmaciones explícitas antes de habilitar el botón "Publicar":
--   1. El artículo es de mi propiedad y de procedencia lícita.
--   2. Lo tengo en mi poder y está disponible para entregar.
--   3. Las fotos, la descripción y el precio reflejan honestamente el artículo.
--   4. Coordinaré la entrega y el pago en un lugar público y seguro.
--
-- Hasta ahora estas confirmaciones vivían solo en el state del wizard y se
-- descartaban al publicar. Eso significa que ante una denuncia (artículo
-- robado, falsificado, fraude) la plataforma no podía demostrar que el
-- vendedor había declarado explícitamente estos compromisos.
--
-- Esta migración agrega una columna `confirmaciones JSONB` para persistir
-- el snapshot completo de lo que aceptó el vendedor al publicar, junto con
-- la versión del texto (por si los compromisos cambian a futuro) y el
-- timestamp de aceptación (generado por el backend, no manipulable por el
-- cliente).
--
-- Estructura esperada del JSONB (el backend valida con Zod antes del INSERT):
--   {
--     "licito":      true,
--     "enPoder":     true,
--     "honesto":     true,
--     "seguro":      true,
--     "version":     "v1-2026-05-13",
--     "aceptadasAt": "2026-05-13T18:45:00.000Z"
--   }
--
-- IMPORTANTE:
--   - La columna es NULLABLE para artículos legacy (creados antes de esta
--     fecha) que no pasaron por el checklist.
--   - Solo se INSERTA al crear el artículo. Al editar no se modifica
--     (las confirmaciones reflejan el momento de la publicación original).
--
-- Reflejar también en `schema.ts` (`apps/api/src/db/schemas/`).
-- =============================================================================

BEGIN;

ALTER TABLE articulos_marketplace
    ADD COLUMN confirmaciones JSONB;

COMMENT ON COLUMN articulos_marketplace.confirmaciones IS
    'Snapshot de las confirmaciones del checklist legal del wizard de publicar (licito, enPoder, honesto, seguro) + version + aceptadasAt. NULL para artículos legacy.';

COMMIT;
