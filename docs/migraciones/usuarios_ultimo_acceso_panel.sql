-- =============================================================================
-- Migración: registrar el ÚLTIMO ACCESO AL PANEL ADMIN por miembro de equipo.
-- =============================================================================
-- Contexto: `usuarios.ultima_conexion` mide la app AnunciaYA (se escribe al
-- desconectarse del Socket.io de la app web). El Panel no abre ese socket, así
-- que para las cuentas de equipo (gerente/vendedor/superadmin) ese dato sale "—".
-- Esta columna registra cuándo la cuenta abrió el Panel (se actualiza en
-- GET /api/admin/yo, que es el arranque del Panel para los 3 roles).
--
-- One-shot, MANUAL: el deploy no toca la BD. Ejecutar en Supabase (SQL editor)
-- ANTES de desplegar el código que la usa. Seguro: columna nullable, instantánea.
-- =============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ultimo_acceso_panel timestamptz;

COMMENT ON COLUMN usuarios.ultimo_acceso_panel IS
  'Última vez que la cuenta abrió el Panel Admin (se actualiza en GET /api/admin/yo). Distinto de ultima_conexion, que mide la app AnunciaYA vía Socket.io.';
