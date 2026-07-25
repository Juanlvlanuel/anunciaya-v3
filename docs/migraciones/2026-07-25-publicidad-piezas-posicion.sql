-- Migración: posición de encuadre de la creatividad de publicidad
-- Fecha: 2026-07-25
-- Permite al anunciante reposicionar (arrastrar) la imagen de su anuncio ya
-- subida, sin volver a subir el archivo. Se guarda como % (0-100) desde la
-- esquina superior izquierda y se aplica como object-position del <img> en
-- la columna derecha. Mismo patrón que negocio_sucursales.portada_pos_x/y
-- (ver 2026-07-22-negocio-sucursales-portada-posicion.sql).

ALTER TABLE publicidad_piezas
  ADD COLUMN IF NOT EXISTS pos_x SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS pos_y SMALLINT NOT NULL DEFAULT 50;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'publicidad_piezas_pos_x_check'
  ) THEN
    ALTER TABLE publicidad_piezas
      ADD CONSTRAINT publicidad_piezas_pos_x_check CHECK (pos_x BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'publicidad_piezas_pos_y_check'
  ) THEN
    ALTER TABLE publicidad_piezas
      ADD CONSTRAINT publicidad_piezas_pos_y_check CHECK (pos_y BETWEEN 0 AND 100);
  END IF;
END $$;
