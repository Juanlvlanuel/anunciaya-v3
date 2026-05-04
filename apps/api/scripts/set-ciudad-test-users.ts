/**
 * set-ciudad-test-users.ts
 * =========================
 * Helper one-shot para Sprint 2 (verificación visual del feed).
 * Asigna ciudad='Manzanillo' a los usuarios test creados por
 * marketplace-test-tokens.ts. Útil para que el feed muestre datos.
 *
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/set-ciudad-test-users.ts
 *
 * UBICACIÓN: apps/api/scripts/set-ciudad-test-users.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    const resultado = await db.execute(sql`
        UPDATE usuarios
        SET ciudad = 'Manzanillo'
        WHERE id IN (
            'a0000000-0000-4000-a000-000000000001',
            'a0000000-0000-4000-a000-000000000002'
        )
        RETURNING id, ciudad
    `);
    console.log('Filas actualizadas:', resultado.rows);
    process.exit(0);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
