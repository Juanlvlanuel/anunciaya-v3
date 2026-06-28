-- =============================================================================
-- 2026-06-27: pagos_manuales_solicitudes — cola de verificación de pago manual
-- =============================================================================
--
-- Pieza 3 de "Mi Perfil – Pagos" (Mi_Perfil.md): el dueño que NO quiere tarjeta
-- recurrente paga por transferencia/depósito, sube un comprobante y crea una
-- SOLICITUD. Un admin la revisa en el Panel (módulo Suscripciones · pestaña "Por
-- verificar") y la APRUEBA (genera el pago real reusando registrarPagoManual) o la
-- RECHAZA con motivo. Esta tabla es SOLO la cola/solicitud; el pago contable sigue
-- viviendo en pagos_membresia (FK pago_membresia_id se llena al aprobar).
--
--   estado:           pendiente | aprobado | rechazado
--   monto:            numeric(10,2) — lo DECLARA el dueño (> 0); el admin lo confirma
--   meses_declarados: cuántos meses dice pagar (> 0); el admin puede ajustar al aprobar
--   comprobante_url:  imagen del comprobante en R2 (carpeta 'comprobantes/')
--   pago_membresia_id: el recibo generado al aprobar (SET NULL si se borra el pago)
--
-- Tabla NUEVA y aislada: no afecta nada existente.
-- IDEMPOTENTE: CREATE TABLE / CREATE INDEX IF NOT EXISTS.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS pagos_manuales_solicitudes (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id         uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    usuario_id         uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,  -- el dueño que la creó
    monto              numeric(10,2) NOT NULL,                                    -- declarado por el dueño
    meses_declarados   integer NOT NULL,                                         -- meses que dice pagar
    referencia         varchar(120),                                             -- folio/referencia de la transferencia (opcional)
    nota               varchar(500),                                             -- nota del dueño (opcional)
    comprobante_url    text NOT NULL,                                            -- comprobante en R2
    estado             varchar(20) NOT NULL DEFAULT 'pendiente',
    creado_at          timestamptz NOT NULL DEFAULT now(),
    revisado_por       uuid REFERENCES usuarios(id) ON DELETE SET NULL,          -- admin que aprobó/rechazó
    revisado_at        timestamptz,
    motivo_rechazo     varchar(500),
    pago_membresia_id  uuid REFERENCES pagos_membresia(id) ON DELETE SET NULL,   -- recibo generado al aprobar
    CONSTRAINT pagos_manuales_solicitudes_estado_check
        CHECK (estado IN ('pendiente','aprobado','rechazado')),
    CONSTRAINT pagos_manuales_solicitudes_monto_check
        CHECK (monto > 0),
    CONSTRAINT pagos_manuales_solicitudes_meses_check
        CHECK (meses_declarados > 0)
);

-- Historial de un negocio (lo más reciente primero) + detectar si ya hay una pendiente.
CREATE INDEX IF NOT EXISTS idx_pagos_manuales_solicitudes_negocio
    ON pagos_manuales_solicitudes (negocio_id, creado_at DESC);

-- La cola del admin: todo lo pendiente por revisar (índice parcial, el más usado).
CREATE INDEX IF NOT EXISTS idx_pagos_manuales_solicitudes_pendientes
    ON pagos_manuales_solicitudes (creado_at DESC)
    WHERE estado = 'pendiente';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (13 columnas):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'pagos_manuales_solicitudes'
--   ORDER BY ordinal_position;
--
-- Constraints (PK + 3 FK + 3 CHECK):
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'pagos_manuales_solicitudes'::regclass ORDER BY conname;
--
-- Índices (los 2 idx_pagos_manuales_solicitudes_*):
--   SELECT indexname FROM pg_indexes WHERE tablename = 'pagos_manuales_solicitudes';
-- =============================================================================
