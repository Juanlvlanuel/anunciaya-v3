-- =============================================================================
-- 2026-04-28: Scanya turnos — marca de "aviso visto" para cierre automático
-- =============================================================================
--
-- Contexto: Cuando un turno se cierra automáticamente, el siguiente login del
-- operador muestra un modal informativo. Sin esta columna, el modal volvía a
-- aparecer en cada login subsiguiente dentro de las 24h posteriores al cierre,
-- hasta que se abriera un turno nuevo.
--
-- Esta columna marca el momento en que el operador VIO el aviso por primera
-- vez (lo setea el backend en `obtenerAvisoTurnoAutoCerrado` justo después de
-- entregar el aviso al login). Las consultas posteriores filtran por
-- `aviso_visto_at IS NULL` y ya no lo retornan.
--
-- Idempotente: usa IF NOT EXISTS para poder re-ejecutarse sin error.
-- =============================================================================

ALTER TABLE scanya_turnos
ADD COLUMN IF NOT EXISTS aviso_visto_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN scanya_turnos.aviso_visto_at IS
'Timestamp en que el operador vio el aviso de cierre automático. NULL = aviso pendiente, no NULL = ya visto. Solo aplica a turnos auto-cerrados (cerrado_por IS NULL).';
