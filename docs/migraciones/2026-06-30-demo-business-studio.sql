-- 2026-06-30 · Demo de Business Studio para vendedores
-- ============================================================================
-- Marca negocios que son DEMO (no se listan al público) y distingue el "maestro" (curado, uno) de
-- las "copias" (privadas, una por vendedor). El vendedor entra a BS por impersonación de un
-- usuario-sombra dueño de su copia; nunca se le ata un negocio_id real.
--   - es_demo: bandera de exclusión pública (maestro Y copias). Separada de `activo` a propósito:
--     el demo necesita activo=true + onboarding_completado=true para que BS funcione completo,
--     pero debe estar OCULTO del público.
--   - demo_tipo: 'maestro' | 'copia' (NULL = negocio normal).
--   - demo_vendedor_id: en copias, qué vendedor es su dueño funcional (unique parcial ⇒ 1 por vendedor).
--   - demo_maestro_id: de qué maestro se clonó (trazabilidad; "Reiniciar" sabe el origen).
--
-- Doc: docs/arquitectura/Demo_Business_Studio.md
-- Correr en DEV y PROD (idempotente).

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS es_demo boolean NOT NULL DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS demo_tipo varchar(10);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS demo_vendedor_id uuid REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS demo_maestro_id uuid REFERENCES negocios(id) ON DELETE SET NULL;

-- demo_tipo solo acepta 'maestro' o 'copia' (o NULL para negocios normales).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'negocios_demo_tipo_check') THEN
    ALTER TABLE negocios
      ADD CONSTRAINT negocios_demo_tipo_check
      CHECK (demo_tipo IS NULL OR demo_tipo IN ('maestro', 'copia'));
  END IF;
END $$;

-- "¿qué negocios son demo?" (excluirlos de las queries públicas).
CREATE INDEX IF NOT EXISTS idx_negocios_es_demo ON negocios (es_demo) WHERE es_demo = true;

-- Garantiza UNA sola copia por vendedor.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_negocios_demo_vendedor
  ON negocios (demo_vendedor_id) WHERE demo_tipo = 'copia';
