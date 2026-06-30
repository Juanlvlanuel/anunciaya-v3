-- 2026-06-29-publicidad-renovacion.sql
-- ======================================
-- Renovar / extender la vigencia de un anuncio de publicidad pagado (desde Mi Perfil).
--
-- Modelo: cada renovación es una fila NUEVA en `publicidad_compras` (con su propio folio + recibo),
-- ligada al anuncio original por `renovacion_de`. Al confirmarse el pago, esa fila NO se muestra como
-- anuncio (el carrusel público y el Panel la excluyen por `renovacion_de IS NOT NULL`); en su lugar
-- EXTIENDE el `expira_at` del anuncio original y le aplica los cambios de imagen/ciudades/tamaños.
--
-- Correr en DEV y PROD (Juan).

ALTER TABLE publicidad_compras
  ADD COLUMN IF NOT EXISTS renovacion_de uuid REFERENCES publicidad_compras(id) ON DELETE SET NULL;

-- Índice parcial: solo las filas de renovación (la mayoría son anuncios reales con NULL).
CREATE INDEX IF NOT EXISTS idx_publicidad_compras_renovacion_de
  ON publicidad_compras(renovacion_de) WHERE renovacion_de IS NOT NULL;
