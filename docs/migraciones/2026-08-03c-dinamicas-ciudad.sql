-- 2026-08-03c · dinamicas.ciudad_id (filtrado hiperlocal, Fase 2)
-- ==============================================================================
-- Fase 1 (2026-08-03-dinamicas-fase1-tablas.sql, ya aplicada en DEV) no
-- incluyó ciudad — se detectó el hueco al construir el composer de Fase 2:
-- sin `ciudad_id`, el feed de Dinámicas (Fase 3) no tendría forma de filtrar
-- por ciudad, rompiendo el patrón hiperlocal que sigue TODO lo demás en
-- AnunciaYA (articulos_marketplace, servicios_publicaciones, negocios...).
--
-- Mismo patrón que esas tablas: `ciudad_id` lo resuelve el BACKEND desde el
-- texto de ciudad que manda el composer (`resolverCiudadId`), nunca lo manda
-- el cliente directo. `ON DELETE SET NULL` — si se borra una ciudad del
-- catálogo, la Dinámica no se borra, solo pierde el filtro (igual que
-- MarketPlace).
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Correr en DEV primero, luego PROD. Antes de desplegar el backend de   │
-- │     Fase 2 (que empieza a resolver y guardar ciudad_id al crear).         │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ==============================================================================

BEGIN;

ALTER TABLE dinamicas ADD COLUMN IF NOT EXISTS ciudad_id uuid;

-- Postgres no soporta "ADD CONSTRAINT IF NOT EXISTS" — drop+add es el patrón
-- idempotente que ya usa el resto de migraciones del repo para constraints.
ALTER TABLE dinamicas DROP CONSTRAINT IF EXISTS fk_dinamicas_ciudad;
ALTER TABLE dinamicas
  ADD CONSTRAINT fk_dinamicas_ciudad
  FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dinamicas_ciudad ON dinamicas (ciudad_id);

COMMIT;

-- VERIFICACIÓN:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'dinamicas' AND column_name = 'ciudad_id';
--
-- ROLLBACK:
--   ALTER TABLE dinamicas DROP CONSTRAINT IF EXISTS fk_dinamicas_ciudad;
--   DROP INDEX IF EXISTS idx_dinamicas_ciudad;
--   ALTER TABLE dinamicas DROP COLUMN IF EXISTS ciudad_id;
-- ==============================================================================
