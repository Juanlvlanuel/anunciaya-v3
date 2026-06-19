-- =============================================================================
-- 2026-06-19-comision-al-cobro.sql
-- Pieza 3 del Sprint de Stripe — Comisión recurrente "al COBRO" (anti-doble-pago del prepago).
-- La corre Juan en DEV y PROD.
-- =============================================================================
-- Cambia el devengo de la comisión recurrente de "foto mensual agregada" (1 fila por vendedor por
-- mes, negocio_id NULL, recalculada por cron) a "devengo al cobro, por negocio": cada cobro real
-- devenga (dinero pagado ÷ precio mensual) × monto del escalón vigente, de golpe, y marca hasta
-- dónde quedó cubierto el negocio para no volver a devengar esos meses.

-- 1) Marcador por negocio: hasta qué instante está YA devengada su comisión recurrente. Un negocio
--    prepagado sigue contando como ACTIVO (para el escalón del vendedor), pero no genera pago
--    repetido mientras su cobertura siga dentro de este marcador.
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS comision_devengada_hasta timestamptz;

-- 2) Las recurrentes pasan a ser POR NEGOCIO → el único (embajador_id, periodo) ya no aplica
--    (un vendedor puede tener varias recurrentes el mismo mes, una por cada negocio que cobró).
DROP INDEX IF EXISTS uq_comision_recurrente_periodo;

-- 3) La "forma" de una recurrente cambia: ahora lleva negocio_id (antes el CHECK lo exigía NULL). Se
--    relaja a "recurrente ⇒ periodo NOT NULL" (negocio_id libre) para que CONVIVAN las filas viejas
--    (agregadas, negocio_id NULL) y las nuevas (por negocio). Alta sigue exigiendo negocio_id.
ALTER TABLE embajador_comisiones DROP CONSTRAINT IF EXISTS embajador_comisiones_forma_check;
ALTER TABLE embajador_comisiones ADD CONSTRAINT embajador_comisiones_forma_check CHECK (
  (tipo = 'recurrente' AND periodo IS NOT NULL)
  OR (tipo = 'alta' AND negocio_id IS NOT NULL)
);

-- 4) (Opcional, SOLO dev/staging) limpiar las recurrentes PENDIENTES del modelo viejo (foto mensual
--    agregada: tipo='recurrente' con negocio_id NULL) para no mezclarlas con el nuevo modelo. Las
--    PAGADAS se conservan como historial. Descomenta si quieres arrancar limpio:
-- DELETE FROM embajador_comisiones
--  WHERE tipo = 'recurrente' AND negocio_id IS NULL AND estado = 'pendiente';
