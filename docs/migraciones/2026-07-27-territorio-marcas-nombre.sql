-- Territorios: nombre del negocio que representa el punto (marca), separado de la nota libre.
ALTER TABLE territorio_marcas ADD COLUMN IF NOT EXISTS nombre varchar(120);
