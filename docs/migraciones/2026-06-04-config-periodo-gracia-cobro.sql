-- =============================================================================
-- 2026-06-04: configuracion_sistema — periodo_gracia_cobro_dias (Ronda 3 pagos)
-- =============================================================================
--
-- Crea la clave de configuración del PERIODO DE GRACIA tras un cobro de
-- renovación fallido. NO se reusa `dias_retencion_pago` (esa es del camino de
-- pago en efectivo, otro concepto). El webhook de renovaciones (Ronda 2) usa
-- este valor para fijar `negocios.fecha_limite_gracia` al entrar en gracia.
--
-- Valor: 14 días (cuadra con la ventana de reintentos de Stripe ~2 semanas).
--
-- IDEMPOTENTE: ON CONFLICT (clave) DO NOTHING — no pisa un valor ya editado.
-- =============================================================================

INSERT INTO configuracion_sistema
    (clave, valor, tipo, descripcion, categoria, unidad, valor_minimo, valor_maximo)
VALUES (
    'periodo_gracia_cobro_dias',
    '14',
    'numero',
    'Días de gracia tras un cobro de renovación fallido antes de suspender el negocio',
    'pagos',
    'días',
    0,
    60
)
ON CONFLICT (clave) DO NOTHING;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT clave, valor, tipo, categoria, unidad, valor_minimo, valor_maximo
-- FROM configuracion_sistema WHERE clave = 'periodo_gracia_cobro_dias';
-- =============================================================================
