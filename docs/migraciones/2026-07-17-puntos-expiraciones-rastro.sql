-- 2026-07-17 · Tabla puntos_expiraciones (rastro auditable de vencimientos)
-- ==============================================================================
-- La expiración de puntos por inactividad solo movía el agregado
-- puntos_billetera.puntos_expirados_total, sin dejar rastro de cuándo ni cuánto
-- venció. Esta tabla registra un evento por cada expiración, para poder auditar
-- y explicar la diferencia entre acumulados / disponibles / canjeados.
--
-- `origen` distingue quién materializó el vencimiento:
--   'cron'    → el job diario de expiración proactiva.
--   'on_read' → el camino heredado (ScanYA al identificar al cliente).
--
-- Aditivo. Correr en DEV y PROD.

BEGIN;

CREATE TABLE IF NOT EXISTS puntos_expiraciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billetera_id      uuid NOT NULL,
  negocio_id        uuid NOT NULL,
  usuario_id        uuid NOT NULL,
  puntos_expirados  integer NOT NULL,
  ultima_actividad  timestamptz,
  dias_expiracion   integer,
  origen            varchar(10) NOT NULL,
  created_at        timestamptz DEFAULT now(),

  CONSTRAINT fk_puntos_expiraciones_billetera
    FOREIGN KEY (billetera_id) REFERENCES puntos_billetera(id) ON DELETE CASCADE,
  CONSTRAINT fk_puntos_expiraciones_negocio
    FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  CONSTRAINT fk_puntos_expiraciones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT puntos_expiraciones_puntos_check CHECK (puntos_expirados > 0),
  CONSTRAINT puntos_expiraciones_origen_check CHECK (origen IN ('cron', 'on_read'))
);

CREATE INDEX IF NOT EXISTS idx_puntos_expiraciones_negocio
  ON puntos_expiraciones (negocio_id);
CREATE INDEX IF NOT EXISTS idx_puntos_expiraciones_usuario_negocio
  ON puntos_expiraciones (usuario_id, negocio_id);

COMMIT;
