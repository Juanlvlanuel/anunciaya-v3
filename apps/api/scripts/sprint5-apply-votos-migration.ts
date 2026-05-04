/**
 * sprint5-apply-votos-migration.ts
 * =================================
 * Aplica la migración del Sprint 5: agrega 'usuario' al check de
 * votos.entity_type. Idempotente.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    await db.execute(sql`ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_entity_type_check`);
    await db.execute(sql`
        ALTER TABLE votos ADD CONSTRAINT votos_entity_type_check
        CHECK ((entity_type)::text = ANY (
            (ARRAY['sucursal'::character varying,
                   'articulo'::character varying,
                   'publicacion'::character varying,
                   'oferta'::character varying,
                   'servicio'::character varying,
                   'usuario'::character varying])::text[]
        ))
    `);
    const r = await db.execute(sql`
        SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'votos_entity_type_check'
    `);
    console.log('Check actualizado:', r.rows);
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
