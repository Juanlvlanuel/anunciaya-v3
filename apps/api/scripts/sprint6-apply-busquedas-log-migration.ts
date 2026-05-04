/**
 * sprint6-apply-busquedas-log-migration.ts
 * =========================================
 * Aplica la migración del Sprint 6: tabla marketplace_busquedas_log.
 * Idempotente.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS marketplace_busquedas_log (
            id BIGSERIAL PRIMARY KEY,
            ciudad VARCHAR(100) NOT NULL,
            termino VARCHAR(100) NOT NULL,
            usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_busquedas_ciudad_fecha
            ON marketplace_busquedas_log (ciudad, created_at DESC)
    `);
    const r = await db.execute(sql`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'marketplace_busquedas_log'
        ORDER BY ordinal_position
    `);
    console.log('Tabla marketplace_busquedas_log:', r.rows);
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
