-- 2026-06-15-backfill-eventos-pago-manual.sql
-- =====================================================================================
-- Reconstruye el gemelo en `eventos_pago` (tipo='pago_manual') para los pagos de
-- `pagos_membresia` que se registraron ANTES de centralizar el doble INSERT — sobre todo
-- los del ALTA MANUAL, que nunca escribieron su fila en el libro mayor y por eso no
-- aparecían en el módulo Suscripciones del Panel Admin.
--
-- IDEMPOTENTE: solo inserta cuando NO existe ya el gemelo (referencia_id + tipo='pago_manual').
-- Correr dos veces no duplica nada. One-shot manual: ejecutar en DEV y en PROD.
--
-- Notas de fidelidad:
--   - SOLO conceptos MANUALES (efectivo/transferencia/cortesía). EXCLUYE concepto='tarjeta': esas filas
--     son el recibo de un cobro de Stripe (Pieza 1) y su movimiento ya figura en la bitácora como evento
--     cobro_exitoso/origen='stripe' (deduped por stripe_event_id) — meterlas como pago_manual duplicaría el ingreso.
--   - fecha_evento = pm.fecha_pago (la fecha REAL del pago, no now()) → no desordena la bitácora.
--   - Pago anulado  → monto NULL + metadata de anulación (igual que como anularPago deja el evento).
--   - Cortesía       → monto NULL (ya viene null por el CHECK de pagos_membresia).
--   - metodoCobro='manual' literal: todo pago en pagos_membresia es manual (efectivo/transferencia/cortesía).
--   - metadata.backfill=true → traza que la fila fue reconstruida, no escrita en vivo.
-- =====================================================================================

INSERT INTO eventos_pago
    (negocio_id, tipo, origen, monto, moneda, fecha_evento, actor_id, referencia_id, metadata)
SELECT
    pm.negocio_id,
    'pago_manual',
    'manual',
    CASE WHEN pm.anulado THEN NULL ELSE pm.monto END,
    'MXN',
    pm.fecha_pago,
    pm.registrado_por,
    pm.id,
    jsonb_build_object(
        'concepto', pm.concepto,
        'meses', pm.meses_cubiertos,
        'hasta', pm.periodo_hasta,
        'metodoCobro', 'manual',
        'backfill', true
    )
    || CASE WHEN pm.anulado
            THEN jsonb_build_object('anulado', true, 'motivo', pm.motivo_anulacion, 'anuladoAt', pm.anulado_at)
            ELSE '{}'::jsonb END
FROM pagos_membresia pm
WHERE pm.concepto IN ('efectivo', 'transferencia', 'cortesia')   -- solo MANUALES (excluye 'tarjeta': cobro de Stripe, ya tiene su evento cobro_exitoso)
  AND NOT EXISTS (
    SELECT 1 FROM eventos_pago ep
    WHERE ep.referencia_id = pm.id AND ep.tipo = 'pago_manual'
);
