-- 2026-08-12 · MarketPlace — Apartar artículos (catálogo público P2P para lives)
-- ==============================================================================
-- Soporta el flujo "Mi Catálogo": un vendedor de MarketPlace comparte el link
-- público de su catálogo (ej. durante un live de venta en Facebook) y quien lo
-- ve puede "apartar" una pieza sin necesidad de cuenta en AnunciaYA — solo
-- nombre + WhatsApp. El vendedor confirma o rechaza cada solicitud desde su
-- panel privado; si confirma, el artículo queda bloqueado un tiempo (config.
-- por vendedor, único para todos sus artículos) y se libera solo si nunca se
-- concreta la venta. Mismo espíritu que Dinámicas (docs/migraciones/
-- 2026-08-03-dinamicas-fase1-tablas.sql): AnunciaYA solo organiza el apartado,
-- el pago y la entrega ocurren 100% fuera de la plataforma.
--
-- A diferencia de dinamica_boletos, aquí SIEMPRE es "sin cuenta" (nombre +
-- whatsapp manual) — no hay modo con usuario_id, porque quien aparta viene de
-- un link compartido en redes, nunca logueado.
--
-- Crea:
--   · marketplace_apartados     → una fila por SOLICITUD de apartado (historial
--       completo: pendiente → confirmado|rechazado, o confirmado → expirado).
--   · articulos_marketplace.apartado_hasta → el LOCK vigente del artículo (NULL
--       = disponible). Se llena solo cuando el vendedor confirma una solicitud;
--       lectura O(1) para pintar "Apartado" en el catálogo sin JOIN.
--   · usuarios.marketplace_apartado_horas  → cuántas horas dura el apartado
--       confirmado antes de liberarse solo. Un solo número por vendedor (no por
--       artículo), default 24h.
--
-- Espejo exacto en apps/api/src/db/schemas/schema.ts (marketplaceApartados,
-- articulosMarketplace.apartadoHasta, usuarios.marketplaceApartadoHoras).
--
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS +
-- ADD COLUMN IF NOT EXISTS.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Aditivo, sin impacto en tablas existentes. Correr en DEV primero,     │
-- │     luego en PROD. Las columnas nuevas no reciben tráfico hasta que el   │
-- │     backend de la Fase 1 (schema + endpoints) esté desplegado.           │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS marketplace_apartados (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id         uuid NOT NULL,
  nombre_comprador    varchar(100) NOT NULL,
  whatsapp_comprador  varchar(20) NOT NULL,
  estado              varchar(20) NOT NULL DEFAULT 'pendiente',  -- pendiente | confirmado | rechazado | expirado
  creado_en           timestamptz NOT NULL DEFAULT now(),
  -- Cuándo el vendedor confirmó o rechazó (NULL mientras sigue pendiente).
  resuelto_en         timestamptz,
  -- Solo se llena al confirmar = resuelto_en + usuarios.marketplace_apartado_horas
  -- del vendedor en ese momento (snapshot, no recalcula si el vendedor cambia
  -- su config después).
  expira_en           timestamptz,

  CONSTRAINT fk_marketplace_apartados_articulo
    FOREIGN KEY (articulo_id) REFERENCES articulos_marketplace(id) ON DELETE CASCADE,
  CONSTRAINT marketplace_apartados_estado_check
    CHECK (estado IN ('pendiente', 'confirmado', 'rechazado', 'expirado'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_apartados_articulo
  ON marketplace_apartados (articulo_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_apartados_articulo_estado
  ON marketplace_apartados (articulo_id, estado);
-- Usado por el cron de expiración (busca confirmados vencidos).
CREATE INDEX IF NOT EXISTS idx_marketplace_apartados_expira
  ON marketplace_apartados (expira_en) WHERE estado = 'confirmado';

ALTER TABLE articulos_marketplace
  ADD COLUMN IF NOT EXISTS apartado_hasta timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketplace_apartado_hasta
  ON articulos_marketplace (apartado_hasta) WHERE apartado_hasta IS NOT NULL;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS marketplace_apartado_horas integer NOT NULL DEFAULT 24;

COMMIT;

-- VERIFICACIÓN:
--   SELECT table_name FROM information_schema.tables WHERE table_name = 'marketplace_apartados';
--
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'marketplace_apartados'::regclass ORDER BY conname;
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'articulos_marketplace' AND column_name = 'apartado_hasta';
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'usuarios' AND column_name = 'marketplace_apartado_horas';
--
-- ROLLBACK (si hiciera falta deshacer, en orden por dependencias de FK):
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS marketplace_apartado_horas;
--   ALTER TABLE articulos_marketplace DROP COLUMN IF EXISTS apartado_hasta;
--   DROP TABLE IF EXISTS marketplace_apartados;
-- ==============================================================================
