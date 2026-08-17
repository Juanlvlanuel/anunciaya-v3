-- 2026-08-16 · MarketPlace — Apartados: modelo de 2 estados
-- ==============================================================================
-- Rediseño de "Mi Catálogo → Solicitudes de apartado" (docs/migraciones/
-- 2026-08-12-marketplace-apartados.sql). Se elimina el paso intermedio de
-- "confirmar": una solicitud de apartado ahora BLOQUEA el artículo desde que
-- se crea (ya no hay "pendiente" separado de "confirmado"). El vendedor solo
-- tiene 2 acciones: Rechazar (libera el bloqueo) o Vendido (despublica el
-- artículo). Si nunca actúa, el cron libera el bloqueo al vencer `expira_en`
-- (mismo mecanismo de siempre, solo que ahora arranca desde el momento de la
-- solicitud en vez de desde la confirmación).
--
-- Mapeo de estados:
--   pendiente  → apartado   (si el artículo no tiene ya otro apartado activo)
--   pendiente  → rechazado  (si el artículo YA tiene otro apartado activo —
--                             quedó superado, mismo criterio que aplicaba el
--                             viejo "confirmar" al rechazar automáticamente
--                             las demás solicitudes pendientes)
--   confirmado → apartado   (ya tenía expira_en / apartado_hasta correctos,
--                             solo cambia el nombre del estado)
--   rechazado  → sin cambio
--   expirado   → sin cambio
--
-- Espejo exacto en apps/api/src/db/schemas/schema.ts (marketplaceApartados).
-- Lógica de negocio: apps/api/src/services/marketplace.service.ts
-- (apartarArticulo, marcarApartadoVendido, rechazarApartado,
-- liberarApartadosExpirados).
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Afecta datos existentes en marketplace_apartados (no solo el schema). │
-- │     Correr en DEV primero y verificar, luego en PROD. Desplegar el       │
-- │     backend actualizado ANTES o EN EL MISMO instante — el código viejo   │
-- │     (que espera 'pendiente'/'confirmado') dejaría de funcionar contra    │
-- │     el constraint nuevo.                                                 │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ==============================================================================

BEGIN;

-- 1) Quitar el check constraint viejo para poder reescribir estados libremente.
ALTER TABLE marketplace_apartados
  DROP CONSTRAINT IF EXISTS marketplace_apartados_estado_check;

-- 2) 'confirmado' → 'apartado' (ya traía expira_en/apartado_hasta correctos).
UPDATE marketplace_apartados
  SET estado = 'apartado'
  WHERE estado = 'confirmado';

-- 3) 'pendiente' con el artículo YA bloqueado por otro apartado activo →
--    quedó superada, se marca rechazada (mismo criterio que aplicaba el
--    viejo flujo de "confirmar").
UPDATE marketplace_apartados ap
  SET estado = 'rechazado', resuelto_en = NOW()
  WHERE ap.estado = 'pendiente'
    AND EXISTS (
      SELECT 1 FROM articulos_marketplace art
      WHERE art.id = ap.articulo_id
        AND art.apartado_hasta IS NOT NULL
        AND art.apartado_hasta > NOW()
    );

-- 4) 'pendiente' restante (artículo sin bloqueo activo) → pasa a 'apartado'
--    de verdad: calcula expira_en con las horas configuradas del vendedor
--    dueño del artículo, y bloquea el artículo.
WITH pendientes_a_activar AS (
  SELECT
    ap.id AS apartado_id,
    ap.articulo_id,
    NOW() + make_interval(hours => COALESCE(u.marketplace_apartado_horas, 24)) AS nuevo_expira_en
  FROM marketplace_apartados ap
  JOIN articulos_marketplace art ON art.id = ap.articulo_id
  JOIN usuarios u ON u.id = art.usuario_id
  WHERE ap.estado = 'pendiente'
),
apartados_actualizados AS (
  UPDATE marketplace_apartados ap
    SET estado = 'apartado', expira_en = pa.nuevo_expira_en
    FROM pendientes_a_activar pa
    WHERE ap.id = pa.apartado_id
    RETURNING ap.articulo_id, ap.expira_en
)
UPDATE articulos_marketplace art
  SET apartado_hasta = au.expira_en
  FROM apartados_actualizados au
  WHERE art.id = au.articulo_id;

-- 5) Default y constraint nuevos.
ALTER TABLE marketplace_apartados
  ALTER COLUMN estado SET DEFAULT 'apartado';

ALTER TABLE marketplace_apartados
  ADD CONSTRAINT marketplace_apartados_estado_check
  CHECK (estado IN ('apartado', 'vendido', 'rechazado', 'expirado'));

-- 6) Índice usado por el cron de expiración — ahora sobre 'apartado'.
DROP INDEX IF EXISTS idx_marketplace_apartados_expira;
CREATE INDEX idx_marketplace_apartados_expira
  ON marketplace_apartados (expira_en) WHERE estado = 'apartado';

COMMIT;

-- VERIFICACIÓN:
--   SELECT estado, COUNT(*) FROM marketplace_apartados GROUP BY estado;
--
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'marketplace_apartados'::regclass ORDER BY conname;
--
--   -- No debe haber ningún artículo con apartado_hasta vigente sin una
--   -- solicitud 'apartado' correspondiente (huérfano):
--   SELECT art.id FROM articulos_marketplace art
--   WHERE art.apartado_hasta IS NOT NULL AND art.apartado_hasta > NOW()
--     AND NOT EXISTS (
--       SELECT 1 FROM marketplace_apartados ap
--       WHERE ap.articulo_id = art.id AND ap.estado = 'apartado'
--     );
--
-- ROLLBACK (si hiciera falta deshacer — el mapeo de estados NO es reversible
-- 1:1 porque 'pendiente' se repartió entre 'apartado' y 'rechazado'; esto
-- solo restaura la FORMA del constraint viejo, no los datos):
--   ALTER TABLE marketplace_apartados DROP CONSTRAINT IF EXISTS marketplace_apartados_estado_check;
--   ALTER TABLE marketplace_apartados ALTER COLUMN estado SET DEFAULT 'pendiente';
--   ALTER TABLE marketplace_apartados ADD CONSTRAINT marketplace_apartados_estado_check
--     CHECK (estado IN ('pendiente', 'confirmado', 'rechazado', 'expirado'));
--   DROP INDEX IF EXISTS idx_marketplace_apartados_expira;
--   CREATE INDEX idx_marketplace_apartados_expira
--     ON marketplace_apartados (expira_en) WHERE estado = 'confirmado';
-- ==============================================================================
