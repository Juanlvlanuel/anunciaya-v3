-- =============================================================================
-- 2026-07-03: Centro de Ayuda ("Ayuda y Tutoriales") — 3 tablas base
-- =============================================================================
--
-- Feature nuevo: Centro de Ayuda tipo Help Center (categorías + buscador) donde
-- cada artículo es una pregunta/tarea con pasos en texto + un video tutorial
-- embebido. Sirve a las 3 audiencias (usuario / comerciante BS / ScanYA) y cada
-- video puede compartirse por una landing pública (/ayuda/<slug>).
-- Doc canónico: docs/arquitectura/Centro_Ayuda.md
--
-- Crea 3 tablas NUEVAS y aisladas (no tocan columnas existentes). IDEMPOTENTE.
-- El contenido se carga después desde el Panel Admin (solo SuperAdmin); esta
-- migración solo crea la estructura, sin seeds.
--
--   ayuda_categorias → agrupador. app + audiencia definen a quién se le muestra.
--   ayuda_articulos  → una pregunta/tarea (video + pasos). Hereda app/audiencia
--                      de su categoría. `slug` = URL pública; `compartible_publico`
--                      expone la landing; `publicado` = borrador vs visible.
--   ayuda_feedback   → botón "¿Te sirvió?" (binario 👍/👎). 1 voto por usuario.
-- =============================================================================

BEGIN;

-- ── ayuda_categorias ─────────────────────────────────────────────────────────
--   nombre    → etiqueta ("MarketPlace", "Puntos y recompensas").
--   icono     → slug de apps/web/src/config/iconos.ts (opcional).
--   app       → 'anunciaya' | 'scanya'.
--   audiencia → 'cliente' | 'comerciante' (ScanYA siempre 'comerciante').
--   orden     → posición en el sidebar de categorías.
--   activo    → oculta la categoría sin borrarla.
CREATE TABLE IF NOT EXISTS ayuda_categorias (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     varchar(80)  NOT NULL,
    icono      varchar(60),
    app        varchar(20)  NOT NULL CHECK (app IN ('anunciaya', 'scanya')),
    audiencia  varchar(20)  NOT NULL CHECK (audiencia IN ('cliente', 'comerciante')),
    orden      integer      NOT NULL DEFAULT 0,
    activo     boolean      NOT NULL DEFAULT true,
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz  NOT NULL DEFAULT now()
);

-- Listar las categorías activas de una audiencia (consulta principal del Centro).
CREATE INDEX IF NOT EXISTS idx_ayuda_categorias_app_audiencia
    ON ayuda_categorias (app, audiencia)
    WHERE activo = true;

-- ── ayuda_articulos ──────────────────────────────────────────────────────────
--   slug                → URL amigable única: /ayuda/<slug>.
--   pregunta            → título / la pregunta que resuelve.
--   respuesta           → markdown con los pasos (opcional: puede ser solo video).
--   video_url           → R2 (registrar en IMAGE_REGISTRY + helper de huérfanos).
--   poster_url          → R2, portada del video (og:image al compartir).
--   duracion_seg        → duración del clip, para mostrarla en la ficha.
--   orden               → posición dentro de la categoría.
--   publicado           → false = borrador (solo lo ve el Panel); true = visible.
--   compartible_publico → expone la landing pública /ayuda/<slug> sin login.
--   vistas              → contador (se incrementa al abrir el artículo).
CREATE TABLE IF NOT EXISTS ayuda_articulos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id        uuid NOT NULL REFERENCES ayuda_categorias(id) ON DELETE CASCADE,
    slug                varchar(120) NOT NULL UNIQUE,
    pregunta            varchar(160) NOT NULL,
    respuesta           text,
    video_url           text,
    poster_url          text,
    duracion_seg        integer,
    orden               integer      NOT NULL DEFAULT 0,
    publicado           boolean      NOT NULL DEFAULT false,
    compartible_publico boolean      NOT NULL DEFAULT true,
    vistas              integer      NOT NULL DEFAULT 0,
    created_at          timestamptz  NOT NULL DEFAULT now(),
    updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- Listar los artículos de una categoría, ordenados (consulta principal del detalle).
CREATE INDEX IF NOT EXISTS idx_ayuda_articulos_categoria
    ON ayuda_articulos (categoria_id, orden);

-- ── ayuda_feedback ───────────────────────────────────────────────────────────
--   util       → 👍 true / 👎 false.
--   comentario → opcional; sobre todo cuando util=false ("¿qué te faltó?").
--   1 voto por usuario por artículo (UNIQUE); re-votar hace UPSERT en la app.
CREATE TABLE IF NOT EXISTS ayuda_feedback (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id uuid NOT NULL REFERENCES ayuda_articulos(id) ON DELETE CASCADE,
    usuario_id  uuid NOT NULL REFERENCES usuarios(id)        ON DELETE CASCADE,
    util        boolean      NOT NULL,
    comentario  varchar(500),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (articulo_id, usuario_id)
);

-- Agregar 👍/👎 de un artículo (KPI en el Panel).
CREATE INDEX IF NOT EXISTS idx_ayuda_feedback_articulo
    ON ayuda_feedback (articulo_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Las 3 tablas existen:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('ayuda_categorias','ayuda_articulos','ayuda_feedback')
--   ORDER BY table_name;
--
-- Estructura de ayuda_articulos (13 columnas):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'ayuda_articulos'
--   ORDER BY ordinal_position;
--
-- Constraints (PK + FKs + CHECK app/audiencia + UNIQUE slug + UNIQUE voto):
--   SELECT conrelid::regclass AS tabla, conname, contype
--   FROM pg_constraint
--   WHERE conrelid IN ('ayuda_categorias'::regclass,'ayuda_articulos'::regclass,'ayuda_feedback'::regclass)
--   ORDER BY tabla, conname;
--
-- Índices (los 3 idx_ayuda_*):
--   SELECT tablename, indexname FROM pg_indexes
--   WHERE tablename LIKE 'ayuda_%' ORDER BY tablename, indexname;
-- =============================================================================
