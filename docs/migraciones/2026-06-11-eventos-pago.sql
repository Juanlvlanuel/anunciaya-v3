-- =============================================================================
-- 2026-06-11: eventos_pago — bitácora financiera global de la membresía
-- =============================================================================
--
-- El "libro mayor" del Panel Admin (módulo Suscripciones). Un renglón por cada
-- MOVIMIENTO de dinero/membresía, de DOS orígenes que hasta hoy estaban dispersos:
--
--   origen='stripe'  → lo persiste el WEBHOOK (pago.service.ts), que antes NO guardaba
--                      nada: cobro_exitoso (invoice.payment_succeeded con monto>0),
--                      cobro_fallido (invoice.payment_failed), cancelacion
--                      (customer.subscription.deleted).
--   origen='manual'  → lo persiste "Registrar pago" del Panel (marcarPagado), como
--                      GEMELO de la fila contable en `pagos_membresia`
--                      (referencia_id → pagos_membresia.id). tipo='pago_manual'.
--
-- Así la bitácora se LEE de UNA sola tabla (paginar/filtrar/ordenar es trivial) en vez
-- de unir 3 fuentes con shapes distintos en read-time.
--
--   tipo:            cobro_exitoso | cobro_fallido | cancelacion | pago_manual
--   origen:          stripe | manual
--   monto:           numeric(10,2) — NULL si no aplica (fallido/cancelación/cortesía)
--   fecha_evento:    cuándo OCURRIÓ el movimiento (del invoice / de la acción)
--   actor_id:        admin que lo registró; NULL en eventos automáticos de Stripe
--   stripe_event_id: event.id de Stripe → IDEMPOTENCIA (UNIQUE): un evento reentregado
--                    NO duplica fila (INSERT ... ON CONFLICT DO NOTHING). NULL en manual
--                    (Postgres trata los NULL como distintos → varios manuales conviven).
--   referencia_id:   FK SUAVE a pagos_membresia.id en pago_manual (sin FK dura, para no acoplar).
--   metadata:        jsonb con extras (invoice/subscription/customer, concepto, reintento...).
--
-- El INSERT del webhook es DEFENSIVO (try/catch propio): si falla, NO rompe el cobro ni
-- provoca un reintento de Stripe. La BD del ciclo de cobro (negocios) sigue mandando; el
-- registro en la bitácora es secundario.
--
-- Tabla NUEVA y aislada: no toca columnas existentes. IDEMPOTENTE: IF NOT EXISTS.
-- Ver docs/arquitectura/Panel_Admin/Suscripciones_Pendientes.md y Pagos_Suscripciones.md §12.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS eventos_pago (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id      uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    tipo            varchar(30)  NOT NULL,                           -- cobro_exitoso | cobro_fallido | cancelacion | pago_manual
    origen          varchar(10)  NOT NULL,                           -- stripe | manual
    monto           numeric(10,2),                                   -- NULL si no aplica
    moneda          varchar(3)   NOT NULL DEFAULT 'MXN',
    fecha_evento    timestamptz  NOT NULL DEFAULT now(),             -- cuándo OCURRIÓ
    actor_id        uuid REFERENCES usuarios(id) ON DELETE SET NULL, -- NULL si automático de Stripe
    stripe_event_id varchar(255),                                    -- event.id de Stripe (NULL en manual)
    referencia_id   uuid,                                            -- FK suave → pagos_membresia.id (en pago_manual)
    metadata        jsonb,                                           -- extras (invoice/subscription/customer, concepto...)
    created_at      timestamptz  DEFAULT now(),                      -- cuándo se REGISTRÓ la fila
    CONSTRAINT eventos_pago_tipo_check
        CHECK (tipo IN ('cobro_exitoso','cobro_fallido','cancelacion','pago_manual')),
    CONSTRAINT eventos_pago_origen_check
        CHECK (origen IN ('stripe','manual')),
    CONSTRAINT eventos_pago_monto_check
        CHECK (monto IS NULL OR monto >= 0)
);

-- Orden principal de la bitácora (lo más reciente primero, vista global).
CREATE INDEX IF NOT EXISTS idx_eventos_pago_fecha
    ON eventos_pago (fecha_evento DESC);

-- Historial financiero de UN negocio (deep-link desde su ficha en Negocios).
CREATE INDEX IF NOT EXISTS idx_eventos_pago_negocio
    ON eventos_pago (negocio_id, fecha_evento DESC);

-- Filtro por tipo de evento.
CREATE INDEX IF NOT EXISTS idx_eventos_pago_tipo
    ON eventos_pago (tipo);

-- IDEMPOTENCIA: un event.id de Stripe reentregado no duplica fila. UNIQUE sobre una
-- columna nullable → los NULL (pagos manuales) son distintos entre sí y conviven.
CREATE UNIQUE INDEX IF NOT EXISTS idx_eventos_pago_stripe_event
    ON eventos_pago (stripe_event_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (12 columnas; monto/actor_id/stripe_event_id/referencia_id/metadata nullable):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'eventos_pago'
--   ORDER BY ordinal_position;
--
-- Constraints (PK + FK negocio_id/actor_id + 3 CHECK):
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'eventos_pago'::regclass ORDER BY conname;
--
-- Índices (los 4 idx_eventos_pago_*, uno UNIQUE):
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'eventos_pago';
--
-- Prueba del CHECK de tipo (debe FALLAR):
--   INSERT INTO eventos_pago (negocio_id, tipo, origen)
--   VALUES ((SELECT id FROM negocios LIMIT 1), 'algo_invalido', 'stripe');
--   -- ↑ ERROR: viola "eventos_pago_tipo_check"
--
-- Prueba de IDEMPOTENCIA (la 2ª debe NO insertar, 0 filas):
--   INSERT INTO eventos_pago (negocio_id, tipo, origen, stripe_event_id)
--   VALUES ((SELECT id FROM negocios LIMIT 1), 'cobro_exitoso', 'stripe', 'evt_test_dup')
--   ON CONFLICT (stripe_event_id) DO NOTHING;   -- 1ª: inserta
--   INSERT INTO eventos_pago (negocio_id, tipo, origen, stripe_event_id)
--   VALUES ((SELECT id FROM negocios LIMIT 1), 'cobro_exitoso', 'stripe', 'evt_test_dup')
--   ON CONFLICT (stripe_event_id) DO NOTHING;   -- 2ª: 0 filas (dedup) ✓
--   DELETE FROM eventos_pago WHERE stripe_event_id = 'evt_test_dup';  -- limpiar
-- =============================================================================
