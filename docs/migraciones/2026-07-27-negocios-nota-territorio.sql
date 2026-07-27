-- Territorios: nota libre del vendedor asignado sobre un negocio (pin del mapa).
-- Solo la escribe el vendedor dueño de la asignación (embajador_id); gerente/super la ven
-- en la tarjeta de detalle del mapa de Territorios.
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS nota_territorio text;
