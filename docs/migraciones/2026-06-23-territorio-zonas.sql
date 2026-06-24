-- =============================================================================
-- 2026-06-23: territorio_zonas — particiones del mapa de la red de ventas (G.1)
-- =============================================================================
--
-- Primera pieza del módulo TERRITORIOS del Panel (sección nueva en "Red de ventas").
-- El gerente/super dibuja PARTICIONES (polígonos) sobre el mapa de una ciudad y se las
-- ASIGNA a un vendedor. El vendedor solo verá su pedazo asignado (capa de marcas, G.2).
--
--   ciudad_id    → en qué ciudad vive la zona (FK ciudades; CASCADE: si se borra la ciudad, se va la zona).
--   embajador_id → vendedor asignado. NULL = zona sin asignar (SET NULL: si se borra el vendedor,
--                  la zona queda libre, NO se borra — se puede reasignar).
--   nombre       → etiqueta humana ("Centro", "Zona Norte").
--   poligono     → GeoJSON Polygon: {"type":"Polygon","coordinates":[[[lng,lat],...,[lng,lat]]]}.
--                  Decisión D4: GeoJSON en jsonb (NO PostGIS). Dibujar/mostrar/asignar basta con esto;
--                  la validación punto-en-polígono (G.2) y el NO-traslape (D3) se hacen en la app (turf.js).
--   color        → relleno en el mapa (hex), para distinguir zonas.
--   creada_por   → quién la creó (FK usuarios, SET NULL).
--
-- NO-traslape (D3): se valida en la aplicación al crear/editar (no hay constraint de BD sin PostGIS).
-- Tabla NUEVA y aislada: no toca columnas existentes. IDEMPOTENTE: IF NOT EXISTS.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS territorio_zonas (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ciudad_id    uuid NOT NULL REFERENCES ciudades(id)   ON DELETE CASCADE,
    embajador_id uuid          REFERENCES embajadores(id) ON DELETE SET NULL, -- NULL = sin asignar
    nombre       varchar(80)  NOT NULL,
    poligono     jsonb        NOT NULL,                                       -- GeoJSON Polygon
    color        varchar(9),                                                  -- hex (#RRGGBB / #RRGGBBAA)
    creada_por   uuid          REFERENCES usuarios(id)    ON DELETE SET NULL,
    created_at   timestamptz  DEFAULT now(),
    updated_at   timestamptz  DEFAULT now()
);

-- Zonas de una ciudad (vista del gerente/super: pintar todas las de la ciudad).
CREATE INDEX IF NOT EXISTS idx_territorio_zonas_ciudad
    ON territorio_zonas (ciudad_id);

-- Zonas de un vendedor (vista del vendedor: "mi pedazo asignado").
CREATE INDEX IF NOT EXISTS idx_territorio_zonas_embajador
    ON territorio_zonas (embajador_id);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Estructura (9 columnas; embajador_id/color/creada_por nullable):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'territorio_zonas'
--   ORDER BY ordinal_position;
--
-- Constraints (PK + 3 FK: ciudad_id/embajador_id/creada_por):
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'territorio_zonas'::regclass ORDER BY conname;
--
-- Índices (los 2 idx_territorio_zonas_*):
--   SELECT indexname FROM pg_indexes WHERE tablename = 'territorio_zonas';
-- =============================================================================
