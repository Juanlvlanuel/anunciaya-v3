-- ============================================================================
-- Corrección de datos: comisión de alta indebida en negocios anteriores al módulo
-- ----------------------------------------------------------------------------
-- Síntoma: un negocio que YA existía y pagaba antes del módulo de comisiones tenía
-- `fecha_primer_pago` vacía (sus pagos fueron antes del sellado). Su primer pago
-- POST-módulo selló la fecha y disparó una comisión de ALTA como si fuera nuevo.
--
-- El código ya se corrigió (devengarComisionAlta no devenga si el negocio ya tenía
-- >1 pago real). Este SQL repara los DATOS existentes. La corre Juan en DEV y PROD.
-- IMPORTANTE: el orden importa — primero el DELETE (usa la fecha "mal sellada" como
-- señal), luego el backfill que corrige esa fecha.
-- ============================================================================

-- Primer pago REAL por negocio (pagos manuales no anulados, sin cortesías).
-- Se usa en los dos pasos.

-- 1. BORRA las comisiones de alta INDEBIDAS: aquellas cuyo negocio tiene la
--    fecha_primer_pago POSTERIOR a su primer pago real (señal inequívoca de que la
--    fecha se selló tarde = el negocio ya había pagado antes → no era un alta nueva).
--    Una comisión LEGÍTIMA tiene fecha_primer_pago = el primer pago, no posterior.
DELETE FROM embajador_comisiones ec
WHERE ec.tipo = 'alta'
  AND EXISTS (
    SELECT 1
    FROM negocios n
    JOIN (
      SELECT negocio_id, MIN(fecha_pago)::date AS primero
      FROM pagos_membresia
      WHERE anulado = false AND concepto <> 'cortesia'
      GROUP BY negocio_id
    ) sub ON sub.negocio_id = n.id
    WHERE n.id = ec.negocio_id
      AND n.fecha_primer_pago IS NOT NULL
      AND n.fecha_primer_pago > sub.primero
  );

-- 2. BACKFILL de fecha_primer_pago: la fija en el PRIMER pago real histórico para los
--    negocios manuales viejos donde está vacía o quedó posterior al primer pago real.
--    Así su próximo cobro ya no la "estrena" y el motor no los toma por altas nuevas.
UPDATE negocios n
SET fecha_primer_pago = sub.primero
FROM (
  SELECT negocio_id, MIN(fecha_pago)::date AS primero
  FROM pagos_membresia
  WHERE anulado = false AND concepto <> 'cortesia'
  GROUP BY negocio_id
) sub
WHERE n.id = sub.negocio_id
  AND (n.fecha_primer_pago IS NULL OR n.fecha_primer_pago > sub.primero);

-- Verificación (debe quedar 0 comisiones de alta indebidas y sin fechas "tardías"):
--   SELECT COUNT(*) FROM embajador_comisiones ec
--   JOIN negocios n ON n.id = ec.negocio_id
--   JOIN (SELECT negocio_id, MIN(fecha_pago)::date AS p FROM pagos_membresia
--         WHERE anulado=false AND concepto<>'cortesia' GROUP BY negocio_id) s ON s.negocio_id = n.id
--   WHERE ec.tipo='alta' AND n.fecha_primer_pago > s.p;
