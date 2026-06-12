/**
 * correr-migracion.ts — aplica una migración SQL one-shot de docs/migraciones/ en DEV.
 * Aborta en producción. Uso:
 *   cd apps/api && pnpm exec tsx scripts/correr-migracion.ts 2026-06-11-anular-pago.sql
 */

import { config } from 'dotenv';
config();

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production.');
        process.exit(1);
    }
    const archivo = process.argv[2];
    if (!archivo) {
        console.error('Uso: pnpm exec tsx scripts/correr-migracion.ts <archivo.sql>');
        process.exit(1);
    }

    const ruta = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/migraciones/', archivo);
    const sqlText = readFileSync(ruta, 'utf8');

    console.log(`▶ Ejecutando migración: ${archivo}…`);
    await db.execute(sql.raw(sqlText));
    console.log('✓ Migración aplicada.');
    process.exit(0);
}

main().catch((e) => { console.error('Error en la migración:', e); process.exit(1); });
