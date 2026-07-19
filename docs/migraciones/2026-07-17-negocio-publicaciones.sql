-- =============================================================================
-- 2026-07-17: negocio_publicaciones + negocio_publicaciones_comentarios
-- =============================================================================
--
-- Feed de publicaciones libres de negocio (Negocios). Contenido "todo tipo,
-- libre" — aviso, foto del local, producto nuevo, evento — publicado SOLO por
-- negocios en modo Comercial. NO reemplaza a `ofertas` (descuentos
-- estructurados); es contenido informal estilo post.
--
-- Diferencias clave vs. articulos_marketplace (MP, C2C):
--   - Lleva negocio_id + sucursal_id (un post pertenece a UN local físico).
--   - Sin categoría estructurada, sin modo vendo/busco.
--   - Precio simple opcional, sin moneda/estructura.
--   - Fotos SIN límite de producto (solo tope técnico de 40 anti-abuso).
--   - SIN TTL (a diferencia de MP, que expira a 30 días): se archiva manual.
--
-- negocio_publicaciones_comentarios es espejo exacto de marketplace_comentarios
-- (hilos de 1 nivel, comentarios públicos al instante).
--
-- Tablas NUEVAS y aisladas: no tocan columnas existentes. IDEMPOTENTE.
-- Doc maestro: docs/arquitectura/Negocios.md.
-- =============================================================================

BEGIN;

-- ── Tabla: negocio_publicaciones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negocio_publicaciones (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id          uuid NOT NULL REFERENCES negocios(id)          ON DELETE CASCADE,
    sucursal_id         uuid NOT NULL REFERENCES negocio_sucursales(id) ON DELETE CASCADE,
    autor_usuario_id    uuid NOT NULL REFERENCES usuarios(id)          ON DELETE CASCADE,

    texto               text NOT NULL,
    precio              numeric(10,2),

    fotos               jsonb NOT NULL DEFAULT '[]'::jsonb,
    foto_portada_index  smallint NOT NULL DEFAULT 0,

    ciudad_id           uuid REFERENCES ciudades(id) ON DELETE SET NULL,

    estado              varchar(20) NOT NULL DEFAULT 'activa',
    total_vistas        integer NOT NULL DEFAULT 0,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,

    CONSTRAINT negocio_pub_estado_check CHECK (estado IN ('activa', 'archivada')),
    CONSTRAINT negocio_pub_precio_check CHECK (precio IS NULL OR precio >= 0),
    CONSTRAINT negocio_pub_fotos_array_check CHECK (jsonb_typeof(fotos) = 'array'),
    -- Tope TÉCNICO de seguridad (no es un límite de producto — el negocio
    -- puede publicar tantas fotos como quiera hasta este guardarraíl).
    CONSTRAINT negocio_pub_fotos_max_check CHECK (jsonb_array_length(fotos) <= 40)
);

CREATE INDEX IF NOT EXISTS idx_negocio_pub_sucursal
    ON negocio_publicaciones (sucursal_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_negocio_pub_negocio
    ON negocio_publicaciones (negocio_id);

CREATE INDEX IF NOT EXISTS idx_negocio_pub_ciudad
    ON negocio_publicaciones (ciudad_id)
    WHERE ciudad_id IS NOT NULL AND deleted_at IS NULL;

-- Orden del feed (más reciente primero).
CREATE INDEX IF NOT EXISTS idx_negocio_pub_created
    ON negocio_publicaciones (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_negocio_pub_estado
    ON negocio_publicaciones (estado);

-- ── Tabla: negocio_publicaciones_comentarios ────────────────────────────────
-- Espejo exacto de marketplace_comentarios (docs/migraciones/2026-06-29-marketplace-comentarios.sql).
CREATE TABLE IF NOT EXISTS negocio_publicaciones_comentarios (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id uuid NOT NULL REFERENCES negocio_publicaciones(id)            ON DELETE CASCADE,
    autor_id       uuid NOT NULL REFERENCES usuarios(id)                        ON DELETE CASCADE,
    parent_id      uuid          REFERENCES negocio_publicaciones_comentarios(id) ON DELETE CASCADE, -- NULL = raíz
    texto          varchar(500) NOT NULL,
    editado_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_negocio_pub_comentarios_publicacion
    ON negocio_publicaciones_comentarios (publicacion_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_negocio_pub_comentarios_parent
    ON negocio_publicaciones_comentarios (parent_id)
    WHERE deleted_at IS NULL;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura de ambas tablas:
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name IN ('negocio_publicaciones', 'negocio_publicaciones_comentarios')
--   ORDER BY table_name, ordinal_position;
--
-- Constraints activos:
--   SELECT conname, contype FROM pg_constraint WHERE conrelid = 'negocio_publicaciones'::regclass;
-- =============================================================================
