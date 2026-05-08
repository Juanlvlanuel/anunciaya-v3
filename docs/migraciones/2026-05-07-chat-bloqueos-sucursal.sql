-- ============================================================================
-- Migración: chat_bloqueados — soporte de bloqueo a sucursales (negocios)
-- Fecha:     2026-05-07
-- Contexto:  Hasta hoy `chat_bloqueados` solo soportaba bloquear personas
--            (FK a usuarios.id). Bloquear a Juan persona NO debe afectar tu
--            chat con "Tacos Juan" (su negocio en modo comercial). Y al
--            revés: bloquear "Tacos Juan" no debe bloquear a Juan persona.
--            Ambos tipos de bloqueo son mutuamente excluyentes.
--
-- Estrategia: agregar columna `bloqueada_sucursal_id` opcional. Cada fila
-- representa exactamente UN tipo de bloqueo (persona O sucursal, no ambos).
-- ============================================================================

BEGIN;

-- ── 1. Hacer bloqueado_id nullable ──────────────────────────────────────────
ALTER TABLE chat_bloqueados
    ALTER COLUMN bloqueado_id DROP NOT NULL;

-- ── 2. Agregar columna bloqueada_sucursal_id ────────────────────────────────
ALTER TABLE chat_bloqueados
    ADD COLUMN bloqueada_sucursal_id UUID
    REFERENCES negocio_sucursales(id) ON DELETE CASCADE;

CREATE INDEX idx_chat_bloqueados_sucursal
    ON chat_bloqueados(bloqueada_sucursal_id)
    WHERE bloqueada_sucursal_id IS NOT NULL;

-- ── 3. Constraint: exactamente uno de los dos (persona XOR sucursal) ───────
ALTER TABLE chat_bloqueados
    ADD CONSTRAINT chat_bloqueados_uno_de_dos
    CHECK (
        (bloqueado_id IS NOT NULL AND bloqueada_sucursal_id IS NULL) OR
        (bloqueado_id IS NULL AND bloqueada_sucursal_id IS NOT NULL)
    );

-- ── 4. Reemplazar UNIQUE — separados por tipo (NULLs no chocan) ────────────
ALTER TABLE chat_bloqueados
    DROP CONSTRAINT chat_bloqueados_unique;

ALTER TABLE chat_bloqueados
    ADD CONSTRAINT chat_bloqueados_unique_usuario
    UNIQUE (usuario_id, bloqueado_id);

ALTER TABLE chat_bloqueados
    ADD CONSTRAINT chat_bloqueados_unique_sucursal
    UNIQUE (usuario_id, bloqueada_sucursal_id);

COMMIT;

-- ── Verificación post-ejecución ─────────────────────────────────────────────
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'chat_bloqueados'
-- ORDER BY ordinal_position;
--
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'chat_bloqueados';
