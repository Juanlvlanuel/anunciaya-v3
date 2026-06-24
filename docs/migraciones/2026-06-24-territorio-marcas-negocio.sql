-- 2026-06-24-territorio-marcas-negocio.sql
-- =========================================
-- Liga OPCIONAL de una marca del vendedor a un NEGOCIO real (mejora B de Territorios · G.2).
-- El vendedor solo puede ligar a SUS negocios (se valida en territorios-marcas.service.ts).
-- ON DELETE SET NULL: si el negocio se borra, la marca queda sin liga (no se pierde).
--
-- La corre Juan en DEV y PROD (Query Tool de pgAdmin).

ALTER TABLE territorio_marcas
  ADD COLUMN IF NOT EXISTS negocio_id uuid REFERENCES negocios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_territorio_marcas_negocio
  ON territorio_marcas (negocio_id);
