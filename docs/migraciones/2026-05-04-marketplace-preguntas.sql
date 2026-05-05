-- ============================================================================
-- Migración: tabla marketplace_preguntas + tipos notificación Q&A
-- Fecha:     2026-05-04
-- Contexto:  Sprint 9.2 — Sistema de Preguntas y Respuestas públicas sobre
--            artículos del MarketPlace. Compradores preguntan, vendedor
--            responde. Las respuestas quedan visibles para futuros compradores.
--
-- Antes de ejecutar, verificar nombre exacto del CHECK constraint:
--   SELECT constraint_name
--   FROM information_schema.table_constraints
--   WHERE table_name = 'notificaciones' AND constraint_type = 'CHECK';
-- ============================================================================

-- ── 1. Tabla principal ──────────────────────────────────────────────────────

CREATE TABLE marketplace_preguntas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id     UUID        NOT NULL REFERENCES articulos_marketplace(id) ON DELETE CASCADE,
    comprador_id    UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pregunta        VARCHAR(200) NOT NULL,
    respuesta       VARCHAR(500),
    respondida_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- Un comprador solo puede tener una pregunta activa por artículo.
    -- No impide preguntar en otro artículo del mismo vendedor.
    CONSTRAINT preguntas_unique_comprador UNIQUE (articulo_id, comprador_id)
);

COMMENT ON TABLE marketplace_preguntas IS
    'Preguntas públicas de compradores sobre artículos del MarketPlace. '
    'Estado inferido: respuesta IS NULL = pendiente, NOT NULL = respondida, '
    'deleted_at IS NOT NULL = eliminada (soft delete).';

-- ── 2. Índices ───────────────────────────────────────────────────────────────

-- Para listar preguntas de un artículo (visitante y vendedor)
CREATE INDEX idx_preguntas_articulo
    ON marketplace_preguntas(articulo_id)
    WHERE deleted_at IS NULL;

-- Para listar solo preguntas respondidas (vista pública) y para el LEFT JOIN
-- que calcula total_preguntas_respondidas en el feed
CREATE INDEX idx_preguntas_respondidas
    ON marketplace_preguntas(articulo_id, respondida_at)
    WHERE respondida_at IS NOT NULL AND deleted_at IS NULL;

-- ── 3. Tipos notificación nuevos ─────────────────────────────────────────────
-- Agrega 'marketplace_nueva_pregunta' y 'marketplace_pregunta_respondida'
-- al CHECK constraint de notificaciones.tipo.
--
-- El nombre 'notificaciones_tipo_check' fue verificado en schema.ts línea 1942.
-- Si la BD real usa un nombre distinto, reemplazarlo abajo.

ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check
    CHECK (tipo::text = ANY (ARRAY[
        'puntos_ganados',
        'voucher_generado',
        'voucher_cobrado',
        'nueva_oferta',
        'nueva_recompensa',
        'recompensa_desbloqueada',
        'cupon_asignado',
        'cupon_revocado',
        'nuevo_cliente',
        'voucher_pendiente',
        'stock_bajo',
        'nueva_resena',
        'sistema',
        'nuevo_marketplace',
        'nuevo_servicio',
        'alerta_seguridad',
        'marketplace_nuevo_mensaje',
        'marketplace_proxima_expirar',
        'marketplace_expirada',
        'marketplace_nueva_pregunta',
        'marketplace_pregunta_respondida'
    ]::text[]));
