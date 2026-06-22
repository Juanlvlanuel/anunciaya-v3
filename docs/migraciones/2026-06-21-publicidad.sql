-- =============================================================================
-- 2026-06-21: Publicidad (Panel Admin · módulo 7) — venta del ESPACIO en los 3
-- carruseles de la columna derecha (Anuncios · Patrocinadores · Fundadores),
-- SOLO desktop, acotada por ciudades.
-- ----------------------------------------------------------------------------
-- Crea 3 tablas NUEVAS y aisladas (no tocan columnas existentes):
--   publicidad_compras          → la compra/campaña de un anunciante (CUALQUIER
--                                 usuario, personal o comercial)
--   publicidad_piezas           → 1..3 creatividades (una por carrusel comprado)
--   publicidad_compra_ciudades  → N:M dónde se muestra (ciudad(es))
--
-- Notas de diseño:
--   - El anunciante = usuario_id (NO negocio): personal o comercial pueden pagar.
--     negocio_id es OPCIONAL (contexto/métricas si el anunciante es comercial).
--   - Se vende solo el ESPACIO: el anunciante sube su imagen (publicidad_piezas.
--     imagen_url, R2). El clic sobre el anuncio solo agranda la imagen (no navega).
--   - El FOLIO del recibo REUSA la secuencia global `pagos_membresia_folio_seq`
--     (folios correlativos con membresías; Recibos los muestra juntos). Lo asigna
--     el service SOLO en compras con cobro; la cortesía NO genera recibo (folio NULL).
--   - El alcance del gerente es por las CIUDADES del anuncio (≥1 en su región).
--
-- Reemplaza el schema dormido planes_anuncios/promociones_pagadas (jubilado en
-- 2026-06-21-drop-publicidad-dormida.sql). La corre Juan en DEV y PROD. Idempotente.
-- Ver docs/arquitectura/Panel_Admin/Publicidad.md.
-- =============================================================================

BEGIN;

-- 1) La compra / campaña ------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicidad_compras (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id                uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    negocio_id                uuid REFERENCES negocios(id) ON DELETE SET NULL,   -- opcional (si comercial)
    es_combo                  boolean NOT NULL DEFAULT false,                    -- compró los 3 (con descuento)
    estado                    varchar(20) NOT NULL DEFAULT 'activa',             -- activa|pausada|expirada|cancelada
    origen                    varchar(20) NOT NULL,                              -- self|manual|cortesia
    metodo_cobro              varchar(20),                                       -- tarjeta|efectivo|transferencia|cortesia
    monto                     numeric(10,2),                                     -- NULL en cortesía
    folio                     integer,                                           -- recibo (secuencia global; NULL si cortesía)
    stripe_payment_intent_id  varchar(255),                                      -- solo self-service
    recibo_url                text,                                              -- PDF en R2 (como membresías)
    duracion_dias             integer NOT NULL,
    inicia_at                 timestamptz NOT NULL DEFAULT now(),
    expira_at                 timestamptz NOT NULL,
    aviso_vencimiento_enviado boolean NOT NULL DEFAULT false,                    -- cron de aviso (3 días antes)
    registrado_por            uuid REFERENCES usuarios(id) ON DELETE SET NULL,   -- alta manual; NULL en self
    created_at                timestamptz DEFAULT now(),
    updated_at                timestamptz DEFAULT now(),
    CONSTRAINT publicidad_compras_estado_check
        CHECK (estado IN ('activa','pausada','expirada','cancelada')),
    CONSTRAINT publicidad_compras_origen_check
        CHECK (origen IN ('self','manual','cortesia')),
    CONSTRAINT publicidad_compras_monto_check
        CHECK (monto IS NULL OR monto >= 0),
    CONSTRAINT publicidad_compras_cortesia_sin_monto_check
        CHECK (origen <> 'cortesia' OR monto IS NULL),
    CONSTRAINT publicidad_compras_fechas_check
        CHECK (expira_at > inicia_at)
);

CREATE INDEX IF NOT EXISTS idx_publicidad_compras_usuario
    ON publicidad_compras (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publicidad_compras_estado_expira
    ON publicidad_compras (estado, expira_at);
-- Folio único en la tabla; los NULL (cortesías sin recibo) conviven. La unicidad
-- GLOBAL con membresías la garantiza la secuencia compartida, no este índice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_publicidad_compras_folio
    ON publicidad_compras (folio);

-- 2) Las piezas / creatividades (1..3 por compra) -----------------------------
CREATE TABLE IF NOT EXISTS publicidad_piezas (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id   uuid NOT NULL REFERENCES publicidad_compras(id) ON DELETE CASCADE,
    carrusel    varchar(20) NOT NULL,                          -- anuncios|patrocinadores|fundadores
    imagen_url  text NOT NULL,                                 -- creatividad del anunciante (R2)
    clicks      integer NOT NULL DEFAULT 0,                    -- el "ver grande" (zoom) de la imagen
    impresiones integer NOT NULL DEFAULT 0,
    prioridad   integer NOT NULL DEFAULT 0,                    -- orden dentro del carrusel (futuro)
    created_at  timestamptz DEFAULT now(),
    CONSTRAINT publicidad_piezas_carrusel_check
        CHECK (carrusel IN ('anuncios','patrocinadores','fundadores'))
);

-- Una pieza por carrusel por compra (no se compra el mismo carrusel dos veces).
CREATE UNIQUE INDEX IF NOT EXISTS idx_publicidad_piezas_compra_carrusel
    ON publicidad_piezas (compra_id, carrusel);

-- 3) Ciudades donde se muestra (N:M) ------------------------------------------
CREATE TABLE IF NOT EXISTS publicidad_compra_ciudades (
    compra_id uuid NOT NULL REFERENCES publicidad_compras(id) ON DELETE CASCADE,
    ciudad_id uuid NOT NULL REFERENCES ciudades(id) ON DELETE CASCADE,
    CONSTRAINT publicidad_compra_ciudades_pkey PRIMARY KEY (compra_id, ciudad_id)
);

-- El carrusel público pregunta "¿qué anuncios vigentes hay en esta ciudad?".
CREATE INDEX IF NOT EXISTS idx_publicidad_compra_ciudades_ciudad
    ON publicidad_compra_ciudades (ciudad_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Las 3 tablas existen:
--   SELECT to_regclass('public.publicidad_compras'),
--          to_regclass('public.publicidad_piezas'),
--          to_regclass('public.publicidad_compra_ciudades');
--
-- Columnas de publicidad_compras (18; monto/folio/metodo_cobro/negocio_id/... nullable):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'publicidad_compras' ORDER BY ordinal_position;
--
-- CHECK de cortesía sin monto (debe FALLAR):
--   INSERT INTO publicidad_compras (usuario_id, origen, monto, duracion_dias, expira_at)
--   VALUES ((SELECT id FROM usuarios LIMIT 1), 'cortesia', 100, 30, now() + interval '30 days');
--   -- ↑ ERROR: viola "publicidad_compras_cortesia_sin_monto_check"
--
-- CHECK del carrusel (debe FALLAR):
--   INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url)
--   VALUES (gen_random_uuid(), 'banner', 'x');  -- ERROR: viola "..._carrusel_check"
-- =============================================================================
