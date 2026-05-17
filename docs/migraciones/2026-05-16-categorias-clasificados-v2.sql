-- =============================================================================
-- 2026-05-16: Categorías Clasificados v2 — consolidación a 5 + Otros
-- =============================================================================
--
-- Cambia el enum de categorías de 7 valores específicos a 5 macro + Otros,
-- pensado para Peñasco beta. Decisión UX 2026-05-16:
--
--   ANTES (7):                      AHORA (6):
--     hogar      ────────────────►    hogar             (absorbe mudanzas)
--     eventos    ────────────────►    eventos
--     empleo     ────────────────►    empleo
--     mudanzas   ──┐
--                  └──────────────►    hogar
--     tutorias   ──┐
--                  └──────────────►    cuidados         (cuida personas + mascotas)
--     mascotas   ──┘
--     otros      ────────────────►    otros
--                ─────────────────►    belleza-bienestar (NUEVA — estética + masajes)
--
-- IDEMPOTENTE: si se vuelve a correr, los UPDATE no hacen nada y el CHECK ya
-- estará en su forma nueva.
-- =============================================================================

BEGIN;

-- ─── 1) Migrar valores existentes ───────────────────────────────────────────
-- mudanzas → hogar (todo lo de mantenimiento de casa)
UPDATE servicios_publicaciones
SET categoria = 'hogar'
WHERE categoria = 'mudanzas';

-- tutorias y mascotas → cuidados (cuida personas + cuida mascotas)
UPDATE servicios_publicaciones
SET categoria = 'cuidados'
WHERE categoria IN ('tutorias', 'mascotas');

-- ─── 2) Reemplazar CHECK constraint con el set nuevo ────────────────────────
ALTER TABLE servicios_publicaciones
    DROP CONSTRAINT IF EXISTS servicios_pub_categoria_check;
ALTER TABLE servicios_publicaciones
    ADD CONSTRAINT servicios_pub_categoria_check
    CHECK (
        categoria IS NULL
        OR (categoria)::text = ANY (
            (ARRAY[
                'hogar'::character varying,
                'cuidados'::character varying,
                'eventos'::character varying,
                'belleza-bienestar'::character varying,
                'empleo'::character varying,
                'otros'::character varying
            ])::text[]
        )
    );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT categoria, COUNT(*) AS total
-- FROM servicios_publicaciones
-- WHERE modo = 'solicito'
-- GROUP BY categoria
-- ORDER BY total DESC;
--
-- SELECT conname, pg_get_constraintdef(oid) AS def
-- FROM pg_constraint
-- WHERE conrelid = 'servicios_publicaciones'::regclass
--   AND conname = 'servicios_pub_categoria_check';
