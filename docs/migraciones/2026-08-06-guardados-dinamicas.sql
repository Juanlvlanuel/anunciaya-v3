-- =============================================================================
-- 2026-08-06: Guardados de Dinámicas ("Mis Guardados" → tab Dinámicas)
-- =============================================================================
--
-- Habilita guardar Dinámicas en la colección personal, igual que ya se puede
-- con Ofertas / MarketPlace / Servicios (sistema genérico `guardados`).
--
-- 1) Agrega `dinamicas.total_guardados` — contador denormalizado, mismo
--    patrón que `articulos_marketplace.total_guardados` y
--    `servicios_publicaciones.total_guardados`. Se incrementa/decrementa en
--    `guardados.service.ts` (agregarGuardado/quitarGuardado).
--
-- 2) Amplía el CHECK de `guardados.entity_type` para aceptar 'dinamica'
--    (antes solo 'oferta' | 'servicio' | 'articulo_marketplace').
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + DROP/ADD CONSTRAINT.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD (misma BD de Supabase).                          │
-- │ Correr ANTES de desplegar el código que agrega 'dinamica' como           │
-- │ entityType válido: si el CHECK viejo sigue activo, POST /api/guardados   │
-- │ con entityType='dinamica' fallaría con violación de constraint.          │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE dinamicas ADD COLUMN IF NOT EXISTS total_guardados INTEGER NOT NULL DEFAULT 0;

ALTER TABLE guardados DROP CONSTRAINT IF EXISTS guardados_entity_type_check;

ALTER TABLE guardados ADD CONSTRAINT guardados_entity_type_check CHECK (
    (entity_type)::text = ANY ((ARRAY[
        'oferta',
        'servicio',
        'articulo_marketplace',
        'dinamica'
    ]::character varying[])::text[])
);

COMMIT;
