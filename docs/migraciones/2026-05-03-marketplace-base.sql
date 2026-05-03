-- ============================================================================
-- Migración: MarketPlace base (Sprint 1)
-- Fecha:     2026-05-03
-- Contexto:  Crea la tabla `articulos_marketplace` y los campos / enums
--            necesarios en tablas existentes para soportar la sección
--            MarketPlace v1 (compra-venta P2P de objetos físicos entre
--            usuarios en modo Personal).
--
-- Documento maestro: docs/arquitectura/MarketPlace.md (§10 Base de Datos)
-- Sprint:            docs/prompts Marketplace/Sprint-1-Backend-Base.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Extensión PostGIS
-- ----------------------------------------------------------------------------
-- Defensa: ya está habilitada en Supabase, pero IF NOT EXISTS lo hace
-- idempotente y no rompe si se corre dos veces.
CREATE EXTENSION IF NOT EXISTS postgis;


-- ----------------------------------------------------------------------------
-- 2) Tabla articulos_marketplace
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articulos_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Contenido
  titulo VARCHAR(80) NOT NULL,
  descripcion TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL,
  condicion VARCHAR(20) NOT NULL
    CHECK (condicion IN ('nuevo','seminuevo','usado','para_reparar')),
  acepta_ofertas BOOLEAN NOT NULL DEFAULT true,

  -- Fotos (array de URLs en R2 — se valida en Zod min 1 max 8)
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto_portada_index SMALLINT NOT NULL DEFAULT 0,

  -- Ubicación (con privacidad)
  --   ubicacion             = real, NUNCA se devuelve al frontend
  --   ubicacion_aproximada  = aleatorizada dentro de 500m, ESTA es pública
  ubicacion              GEOGRAPHY(POINT, 4326) NOT NULL,
  ubicacion_aproximada   GEOGRAPHY(POINT, 4326) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  zona_aproximada VARCHAR(150) NOT NULL,

  -- Estado del ciclo de vida (matriz §6 del doc maestro)
  estado VARCHAR(20) NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa','pausada','vendida','eliminada')),

  -- Métricas
  total_vistas    INTEGER NOT NULL DEFAULT 0,
  total_mensajes  INTEGER NOT NULL DEFAULT 0,
  total_guardados INTEGER NOT NULL DEFAULT 0,

  -- TTL: el cron del Sprint 7 mueve a 'pausada' cuando expira_at < NOW().
  -- Se setea SOLO al crear (NOW() + 30 días). El UPDATE general no lo
  -- modifica; solo el endpoint futuro de "Reactivar" puede extenderlo.
  expira_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vendida_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_marketplace_estado
  ON articulos_marketplace (estado);

CREATE INDEX IF NOT EXISTS idx_marketplace_ciudad
  ON articulos_marketplace (ciudad);

CREATE INDEX IF NOT EXISTS idx_marketplace_usuario
  ON articulos_marketplace (usuario_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_created
  ON articulos_marketplace (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_expira
  ON articulos_marketplace (expira_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_ubicacion
  ON articulos_marketplace USING GIST (ubicacion_aproximada);

-- Búsqueda full-text en español sobre titulo + descripcion (Sprint 6)
CREATE INDEX IF NOT EXISTS idx_marketplace_titulo_fts
  ON articulos_marketplace
  USING GIN (to_tsvector('spanish', titulo || ' ' || descripcion));

COMMENT ON TABLE articulos_marketplace IS
  'Publicaciones de la sección MarketPlace v1: objetos físicos en venta P2P entre usuarios en modo Personal. Transacción 100% offline (la app NO procesa pagos ni envíos).';

COMMENT ON COLUMN articulos_marketplace.ubicacion IS
  'Ubicación real (privada). NUNCA se devuelve al frontend; solo se usa para recomputar ubicacion_aproximada si fuese necesario.';

COMMENT ON COLUMN articulos_marketplace.ubicacion_aproximada IS
  'Ubicación aleatorizada dentro de un círculo de 500m alrededor de la real. Es la ÚNICA ubicación que se devuelve al frontend (protege privacidad del vendedor).';

COMMENT ON COLUMN articulos_marketplace.expira_at IS
  'TTL: NOW() + 30 días al crear. Sprint 7 instalará un cron que mueve a estado=pausada cuando expira. El UPDATE general no debe modificar este campo.';


-- ----------------------------------------------------------------------------
-- 3) chat_conversaciones — agregar articulo_marketplace_id + nuevo contexto
-- ----------------------------------------------------------------------------
-- Nota: la tabla en BD se llama `chat_conversaciones` (el doc maestro la
-- abrevia como `chat_conv` por legibilidad). El check ya incluye
-- 'marketplace' históricamente; aquí sumamos 'vendedor_marketplace'.

ALTER TABLE chat_conversaciones
  ADD COLUMN IF NOT EXISTS articulo_marketplace_id UUID
    REFERENCES articulos_marketplace(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conv_articulo_marketplace
  ON chat_conversaciones (articulo_marketplace_id)
  WHERE articulo_marketplace_id IS NOT NULL;

ALTER TABLE chat_conversaciones
  DROP CONSTRAINT IF EXISTS chat_conv_contexto_tipo_check;

ALTER TABLE chat_conversaciones
  ADD CONSTRAINT chat_conv_contexto_tipo_check
  CHECK (
    (contexto_tipo)::text = ANY (
      (ARRAY[
        'negocio'::character varying,
        'marketplace'::character varying,
        'vendedor_marketplace'::character varying,
        'oferta'::character varying,
        'servicio'::character varying,
        'directo'::character varying,
        'notas'::character varying
      ])::text[]
    )
  );


-- ----------------------------------------------------------------------------
-- 4) guardados — permitir entity_type='articulo_marketplace'
-- ----------------------------------------------------------------------------
ALTER TABLE guardados
  DROP CONSTRAINT IF EXISTS guardados_entity_type_check;

ALTER TABLE guardados
  ADD CONSTRAINT guardados_entity_type_check
  CHECK (
    (entity_type)::text = ANY (
      (ARRAY[
        'oferta'::character varying,
        'servicio'::character varying,
        'articulo_marketplace'::character varying
      ])::text[]
    )
  );


-- ----------------------------------------------------------------------------
-- 5) notificaciones — sumar 3 tipos del MarketPlace
-- ----------------------------------------------------------------------------
-- Ya existía 'nuevo_marketplace' y referencia_tipo='marketplace'. Solo se
-- agregan los 3 tipos nuevos del prompt. La emisión real de estas
-- notificaciones queda fuera del Sprint 1 (cron del Sprint 7).

ALTER TABLE notificaciones
  DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (
    (tipo)::text = ANY (
      (ARRAY[
        'puntos_ganados'::character varying,
        'voucher_generado'::character varying,
        'voucher_cobrado'::character varying,
        'nueva_oferta'::character varying,
        'nueva_recompensa'::character varying,
        'recompensa_desbloqueada'::character varying,
        'cupon_asignado'::character varying,
        'cupon_revocado'::character varying,
        'nuevo_cliente'::character varying,
        'voucher_pendiente'::character varying,
        'stock_bajo'::character varying,
        'nueva_resena'::character varying,
        'sistema'::character varying,
        'nuevo_marketplace'::character varying,
        'nuevo_servicio'::character varying,
        'alerta_seguridad'::character varying,
        'marketplace_nuevo_mensaje'::character varying,
        'marketplace_proxima_expirar'::character varying,
        'marketplace_expirada'::character varying
      ])::text[]
    )
  );


-- ============================================================================
-- FIN — Verificación rápida sugerida (no se ejecuta automáticamente)
-- ============================================================================
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'articulos_marketplace';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_conversaciones' AND column_name = 'articulo_marketplace_id';
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'chat_conv_contexto_tipo_check';
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'guardados_entity_type_check';
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'notificaciones_tipo_check';
