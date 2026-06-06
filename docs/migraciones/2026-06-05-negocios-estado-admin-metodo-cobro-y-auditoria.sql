-- =============================================================================
-- 2026-06-05: negocios — estado administrativo + método de cobro + auditoría
-- =============================================================================
--
-- Cimientos de la Entrega 2 (ACTUAR) del Panel · sección Negocios. Crea SOLO el
-- "dónde guardar" — la lógica de las acciones vive en el código. NO toca Stripe.
--
-- 1) `negocios.metodo_cobro varchar(20)` NOT NULL DEFAULT 'tarjeta'
--      tarjeta | manual. Para la Parada 2 (marcar pagado pasa el cobro a manual y
--      pausa Stripe). Se crea ahora junto con el resto.
--
-- 2) `negocios.estado_admin varchar(20)` NOT NULL DEFAULT 'activo'
--      activo | suspendido | archivado. Eje ADMINISTRATIVO (lo decide el Panel),
--      SEPARADO del eje de pago (`estado_membresia`, que gobierna Stripe/cron).
--      Es la RAZÓN por la que un negocio está oculto. La VISIBILIDAD efectiva la
--      sigue dando `negocios.activo` (que el feed público ya respeta):
--        - suspender / archivar → activo=false  (oculta del feed)
--        - reactivar            → activo=true
--      Como el webhook nunca toca `activo`, un pago NO revive una suspensión
--      manual (además se agrega un guard defensivo en el código del webhook).
--
-- 3) Tabla `admin_auditoria` — bitácora de acciones sensibles del Panel
--      (suspender, reactivar, reasignar vendedor; y a futuro marcar pagado /
--      cancelar). Guarda quién/cuándo/qué + snapshots antes/después + motivo.
--
-- NEGOCIOS EXISTENTES: ambas columnas se crean con DEFAULT NOT NULL, así que
-- Postgres rellena TODAS las filas actuales en 'tarjeta' / 'activo'. Ningún
-- negocio queda oculto ni roto.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + CREATE TABLE IF NOT EXISTS + guardas
-- para constraints e índices.
-- =============================================================================

BEGIN;

-- 1) Columnas nuevas en negocios -------------------------------------------------
ALTER TABLE negocios
    ADD COLUMN IF NOT EXISTS metodo_cobro varchar(20) NOT NULL DEFAULT 'tarjeta',
    ADD COLUMN IF NOT EXISTS estado_admin varchar(20) NOT NULL DEFAULT 'activo';

-- 2) Validaciones (guardas de idempotencia) -------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'negocios_metodo_cobro_check') THEN
        ALTER TABLE negocios
            ADD CONSTRAINT negocios_metodo_cobro_check
            CHECK (metodo_cobro IN ('tarjeta','manual'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'negocios_estado_admin_check') THEN
        ALTER TABLE negocios
            ADD CONSTRAINT negocios_estado_admin_check
            CHECK (estado_admin IN ('activo','suspendido','archivado'));
    END IF;
END $$;

-- 3) Índice para filtrar por estado administrativo (suspendidos / archivados) ----
CREATE INDEX IF NOT EXISTS idx_negocios_estado_admin
    ON negocios (estado_admin);

-- 4) Tabla de auditoría del Panel -----------------------------------------------
CREATE TABLE IF NOT EXISTS admin_auditoria (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      uuid REFERENCES usuarios(id) ON DELETE SET NULL, -- quién (null = legacy x-admin-secret)
    actor_rol     varchar(20),                                     -- rol_equipo al momento
    accion        varchar(50)  NOT NULL,                           -- p.ej. negocio_suspender
    entidad_tipo  varchar(50)  NOT NULL,                           -- p.ej. negocio
    entidad_id    uuid,                                            -- id de la entidad afectada
    datos_previos jsonb,                                           -- snapshot antes
    datos_nuevos  jsonb,                                           -- snapshot después
    motivo        varchar(500),                                    -- texto opcional
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_auditoria_entidad ON admin_auditoria (entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_admin_auditoria_actor   ON admin_auditoria (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_auditoria_created ON admin_auditoria (created_at);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Columnas nuevas en negocios (todas las filas deben quedar tarjeta / activo):
-- SELECT metodo_cobro, estado_admin, count(*) FROM negocios GROUP BY 1,2;
--
-- Tabla de auditoría creada:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name='admin_auditoria' ORDER BY ordinal_position;
-- =============================================================================
