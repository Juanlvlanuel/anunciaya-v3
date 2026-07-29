-- Territorios: teléfono/celular libre de contacto en las marcas de prospección del vendedor/gerente.
-- Opcional, sin formato validado — es una nota de campo, no un dato de negocio real ya registrado.
ALTER TABLE territorio_marcas ADD COLUMN IF NOT EXISTS telefono varchar(20);
