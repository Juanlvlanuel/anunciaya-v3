-- =============================================================================
-- 2026-07-25: servicios_comentarios — columna `modo`
-- =============================================================================
--
-- Mismo patrón que 2026-07-25-comunidad-comentarios-modo.sql /
-- 2026-07-19-negocio-publicaciones-comentarios-modo.sql, ahora para los
-- comentarios de Servicios. Antes, comentar en Servicios estaba BLOQUEADO en
-- Modo Comercial (mismo criterio que MarketPlace). Ahora se habilita: si el
-- autor comenta en Modo Comercial y tiene negocio propio (dueño) o pertenece
-- a uno (gerente/empleado), se muestra el nombre + logo del NEGOCIO en vez de
-- su identidad personal — coherente con que Servicios sí acepta publicaciones
-- de negocio (tipo 'vacante-empresa').
--
-- Sin backfill: la columna nunca existió, así que todo el historial existente
-- se queda 'personal' (comportamiento idéntico al de antes).
--
-- IDEMPOTENTE.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Va en DEV y en PROD. Correr ANTES de desplegar el backend que exige   │
-- │     la columna `modo` en el INSERT de servicios_comentarios.             │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

BEGIN;

ALTER TABLE servicios_comentarios
    ADD COLUMN IF NOT EXISTS modo varchar(15) NOT NULL DEFAULT 'personal';

ALTER TABLE servicios_comentarios DROP CONSTRAINT IF EXISTS servicios_comentarios_modo_check;

ALTER TABLE servicios_comentarios ADD CONSTRAINT servicios_comentarios_modo_check CHECK (
    (modo)::text = ANY ((ARRAY['personal', 'comercial']::character varying[])::text[])
);

COMMIT;

-- Verificación:
--   SELECT modo, count(*) FROM servicios_comentarios GROUP BY modo;
-- =============================================================================
