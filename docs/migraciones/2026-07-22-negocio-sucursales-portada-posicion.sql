-- Migración: posición de encuadre de la portada de sucursal
-- Fecha: 2026-07-22
-- Permite al comerciante reposicionar (arrastrar) la portada ya subida sin
-- volver a subir el archivo. Se guarda como % (0-100) desde la esquina
-- superior izquierda y se aplica como object-position del <img>.

ALTER TABLE negocio_sucursales
  ADD COLUMN IF NOT EXISTS portada_pos_x SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS portada_pos_y SMALLINT NOT NULL DEFAULT 50;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'negocio_sucursales_portada_pos_x_check'
  ) THEN
    ALTER TABLE negocio_sucursales
      ADD CONSTRAINT negocio_sucursales_portada_pos_x_check CHECK (portada_pos_x BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'negocio_sucursales_portada_pos_y_check'
  ) THEN
    ALTER TABLE negocio_sucursales
      ADD CONSTRAINT negocio_sucursales_portada_pos_y_check CHECK (portada_pos_y BETWEEN 0 AND 100);
  END IF;
END $$;
