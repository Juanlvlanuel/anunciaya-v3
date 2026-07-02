-- ============================================================================
-- RESET de datos de prueba en PRODUCCIÓN — AnunciaYA
-- ----------------------------------------------------------------------------
-- Deja prod LIMPIO para la beta: borra usuarios/negocios/contenido de prueba.
--
-- PRESERVA (NO toca):
--   • Cuentas del EQUIPO (superadmin/gerente/vendedor) → WHERE rol_equipo IS NULL
--     solo borra usuarios normales.
--   • configuracion_sistema (precios, datos de cobro, comisión escalera…).
--   • Catálogos: ciudades, categorías, territorios.
--
-- Aprovecha las FK ON DELETE CASCADE: al borrar negocios y usuarios se limpian
-- en cascada sus dependientes (sucursales, artículos, ofertas, chats, etc.).
-- Solo se borran primero las tablas con FK NO-cascada que bloquearían el DELETE.
--
-- ⚠️ IRREVERSIBLE. Correr en la Supabase de PRODUCCIÓN. Idealmente hacer un
--    pg_dump antes (opcional: son datos de prueba desechables).
-- ⚠️ Las imágenes en R2 quedarán huérfanas → las limpia el Recolector R2
--    (Panel → Mantenimiento → Recolector R2) después.
-- ============================================================================

BEGIN;

-- 1) Tablas de interacción con índice único + FK SET NULL: borrarlas antes evita
--    que el SET NULL de la cascada genere duplicados que violan el índice único.
DELETE FROM votos;
DELETE FROM oferta_usos;
DELETE FROM vouchers_canje;
DELETE FROM ofertas_destacadas;

-- 2) Publicidad de prueba (el anuncio de humo; no cascadea desde usuarios normales)
DELETE FROM publicidad_piezas;
DELETE FROM publicidad_compras;

-- 3) Contenido operativo global (por si algo cuelga de la cuenta admin, que NO se borra)
DELETE FROM notificaciones;
DELETE FROM preguntas_comunidad;     -- cascada: comentarios/interesados
DELETE FROM chat_conversaciones;     -- cascada: mensajes/reacciones/fijados

-- 4) Negocios de prueba → cascada: sucursales, artículos, ofertas, recompensas,
--    puntos, empleados, galería, reseñas, horarios, métodos de pago, etc.
DELETE FROM negocios;

-- 5) Usuarios de prueba (PRESERVA el equipo) → cascada: sus datos personales
DELETE FROM usuarios WHERE rol_equipo IS NULL;

COMMIT;

-- Verificación (correr después):
-- SELECT COUNT(*) FROM usuarios;         -- debe quedar solo el equipo (1: superadmin)
-- SELECT COUNT(*) FROM negocios;         -- 0
-- SELECT COUNT(*) FROM publicidad_compras; -- 0
-- SELECT COUNT(*) FROM configuracion_sistema; -- 52 (intacto)
-- SELECT COUNT(*) FROM ciudades;         -- 70 (intacto)
