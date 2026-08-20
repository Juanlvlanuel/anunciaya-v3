-- 2026-08-19: marketplace_apartados — lock BD contra apartados simultáneos
-- =============================================================================
--
-- Cierra el pendiente "Lock BD contra carrera de apartados simultáneos"
-- (docs/arquitectura/Catalogo_MarketPlace_Apartado.md §5). Antes de esta
-- migración `apartarArticulo` era check-then-insert sin ningún constraint que
-- impidiera 2 solicitudes casi simultáneas para el mismo artículo cuando
-- ambas leían apartado_hasta = NULL antes de que cualquiera escribiera.
--
-- El fix real vive en el código (marketplace.service.ts): `apartarArticulo`
-- ahora hace un UPDATE condicional sobre articulos_marketplace DENTRO de la
-- transacción (WHERE apartado_hasta IS NULL OR apartado_hasta < NOW()) —
-- Postgres serializa la carrera vía el row-lock del propio UPDATE, así que
-- solo una de las dos solicitudes concurrentes puede "reclamar" el artículo.
--
-- Este índice único parcial es la defensa de ÚLTIMO nivel a nivel BD: nunca
-- pueden coexistir 2 filas estado='apartado' para el mismo articulo_id, sin
-- importar qué código dispare el INSERT (incluso uno futuro que no pase por
-- `apartarArticulo`). Reflejado también en schema.ts (tabla
-- marketplaceApartados, índice uniq_marketplace_apartados_articulo_activo).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que lo usa. │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

-- Por si alguna vez quedaron 2 filas 'apartado' para el mismo artículo antes
-- del fix (no debería, pero el índice fallaría al crearse si existieran):
-- deja la más reciente como 'apartado' y expira las demás.
WITH duplicados AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY articulo_id ORDER BY creado_en DESC) AS rn
    FROM marketplace_apartados
    WHERE estado = 'apartado'
)
UPDATE marketplace_apartados
SET estado = 'expirado', resuelto_en = NOW()
WHERE id IN (SELECT id FROM duplicados WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_marketplace_apartados_articulo_activo
    ON marketplace_apartados (articulo_id)
    WHERE estado = 'apartado';

COMMIT;
