/**
 * sprint3-setup-test.ts
 * ======================
 * Setup one-shot para verificación visual del Sprint 3.
 * - Lista artículos vivos en MarketPlace.
 * - Asigna teléfono al usuario test 1 para que el botón WhatsApp sea visible.
 *
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/sprint3-setup-test.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    const r1 = await db.execute(sql`
        SELECT id, usuario_id, estado, titulo
        FROM articulos_marketplace
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
    `);
    console.log('Artículos vivos:', JSON.stringify(r1.rows, null, 2));

    const r2 = await db.execute(sql`
        UPDATE usuarios
        SET telefono = '526380000001'
        WHERE id = 'a0000000-0000-4000-a000-000000000001'
        RETURNING id, telefono
    `);
    console.log('Teléfono seteado:', JSON.stringify(r2.rows, null, 2));

    process.exit(0);
}

main().catch((e) => {
    console.error('Error:', e);
    process.exit(1);
});
