-- ============================================================================
-- Migración: agregar 'usuario' al check de votos.entity_type
-- Fecha:     2026-05-04
-- Contexto:  Sprint 5 del MarketPlace agrega "Seguir vendedor" en el perfil
--            del vendedor. Reusa el sistema de votos existente con
--            entity_type='usuario' y tipo_accion='follow'. Hoy el check de
--            la tabla votos solo permite ('sucursal','articulo',
--            'publicacion','oferta','servicio') — sin esta migración,
--            el INSERT del follow rompería con violation de check constraint.
--
-- Idempotente — DROP IF EXISTS antes de recrear.
-- ============================================================================

ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_entity_type_check;

ALTER TABLE votos ADD CONSTRAINT votos_entity_type_check
    CHECK (
        (entity_type)::text = ANY (
            (ARRAY[
                'sucursal'::character varying,
                'articulo'::character varying,
                'publicacion'::character varying,
                'oferta'::character varying,
                'servicio'::character varying,
                'usuario'::character varying
            ])::text[]
        )
    );

-- Verificación rápida (manual):
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'votos_entity_type_check';
