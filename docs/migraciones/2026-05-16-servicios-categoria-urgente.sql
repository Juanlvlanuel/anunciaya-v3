-- =============================================================================
-- 2026-05-16: Servicios — Clasificados (categoria + urgente)
-- =============================================================================
--
-- Agrega los campos `categoria` y `urgente` a `servicios_publicaciones`. Ambos
-- se usan para el widget de **Clasificados** que vive embebido en el feed de
-- Servicios. Decisión del handoff `design_handoff_clasificados/`:
--
--   - `categoria` solo aplica a `modo='solicito'` (los "Busco X"). Las publicaciones
--     `ofrezco` (servicio-persona, vacante-empresa) la dejan NULL. La UI del feed
--     normal no la usa.
--   - `urgente` aplica a cualquier modo en BD, pero en UI solo se renderiza para
--     solicito (eyebrow rojo + pin al top de la lista del widget).
--
-- Las 7 categorías reales (sin 'Urgente' que es campo aparte, sin 'Todos' que
-- es solo filtro UI):
--   hogar · eventos · empleo · mudanzas · tutorias · mascotas · otros
--
-- En BD: lowercase, sin tildes (estándar del proyecto).
-- En frontend: se mapean a labels bonitas ("Tutorías", "Mudanzas", etc.).
--
-- IDEMPOTENTE: se puede ejecutar varias veces sin romper.
-- =============================================================================

BEGIN;

-- ─── 1) Columnas nuevas ─────────────────────────────────────────────────────
ALTER TABLE servicios_publicaciones
    ADD COLUMN IF NOT EXISTS categoria varchar(20),
    ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false;

-- ─── 2) CHECK constraints ───────────────────────────────────────────────────
-- 2a) Solo valores permitidos para categoria.
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_categoria_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_categoria_check
    CHECK (
        categoria IS NULL
        OR (categoria)::text = ANY (
            (ARRAY[
                'hogar'::character varying,
                'eventos'::character varying,
                'empleo'::character varying,
                'mudanzas'::character varying,
                'tutorias'::character varying,
                'mascotas'::character varying,
                'otros'::character varying
            ])::text[]
        )
    );

-- 2b) categoria solo aplica a modo='solicito'. Garantiza coherencia.
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_categoria_solo_solicito_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_categoria_solo_solicito_check
    CHECK (categoria IS NULL OR modo = 'solicito');

-- ─── 3) Índices para queries del widget ─────────────────────────────────────
-- 3a) Feed de clasificados filtrando por categoria (incluye 'todos' = sin filtro).
--     Orden por created_at desc para el "Recién publicado" del widget.
CREATE INDEX IF NOT EXISTS idx_servicios_pub_solicito_categoria
    ON servicios_publicaciones(categoria, estado, created_at DESC)
    WHERE modo = 'solicito';

-- 3b) "Urgente al top" — el widget sube los urgentes a la cabeza de la lista.
CREATE INDEX IF NOT EXISTS idx_servicios_pub_solicito_urgente
    ON servicios_publicaciones(urgente DESC, created_at DESC)
    WHERE modo = 'solicito' AND estado = 'activa';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN — corre esto después para confirmar:
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'servicios_publicaciones'
--   AND column_name IN ('categoria', 'urgente');
--
-- SELECT conname, pg_get_constraintdef(oid) AS def
-- FROM pg_constraint
-- WHERE conrelid = 'servicios_publicaciones'::regclass
--   AND conname LIKE '%categoria%';
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'servicios_publicaciones'
--   AND indexname LIKE '%solicito%';
