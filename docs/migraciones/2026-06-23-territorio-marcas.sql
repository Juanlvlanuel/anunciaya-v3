-- =============================================================================
-- 2026-06-23: territorio_marcas — pines personales del vendedor (Territorios · G.2)
-- =============================================================================
--
-- Segunda pieza del módulo TERRITORIOS. El VENDEDOR "raya" sobre su pedazo del mapa
-- poniendo marcas (pines) de los lugares por donde ya pasó: cada marca tiene un ESTADO
-- (color) y una NOTA personal escrita por él. Son suyas (embajador_id); el super/gerente
-- podrán verlas a futuro, pero la gestión (crear/editar/borrar) es solo del vendedor.
--
--   tipo:  visitado | interesado | cerrado | sin_interes (CHECK; los 4 estados de la Fase 0).
--   nota:  texto libre del vendedor (opcional).
--   ciudad_id: contexto/filtro (de la sucursal/zona donde cae), opcional.
--
-- Tabla NUEVA y aislada. IDEMPOTENTE: IF NOT EXISTS.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS territorio_marcas (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    embajador_id uuid NOT NULL REFERENCES embajadores(id) ON DELETE CASCADE, -- el vendedor dueño
    lat          numeric(9,6) NOT NULL,
    lng          numeric(9,6) NOT NULL,
    tipo         varchar(20)  NOT NULL DEFAULT 'visitado',
    nota         text,
    ciudad_id    uuid REFERENCES ciudades(id) ON DELETE SET NULL,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now(),
    CONSTRAINT territorio_marcas_tipo_check
        CHECK (tipo IN ('visitado','interesado','cerrado','sin_interes'))
);

-- Las marcas de un vendedor (su capa personal sobre el mapa).
CREATE INDEX IF NOT EXISTS idx_territorio_marcas_embajador
    ON territorio_marcas (embajador_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'territorio_marcas' ORDER BY ordinal_position;
-- =============================================================================
