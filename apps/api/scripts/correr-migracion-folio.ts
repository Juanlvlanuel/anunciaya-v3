/**
 * correr-migracion-folio.ts — aplica la migración del folio secuencial en DEV.
 * Lee docs/migraciones/2026-06-11-folio-recibo.sql y la ejecuta. Aborta en producción.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/correr-migracion-folio.ts
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

    const ruta = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/migraciones/2026-06-11-folio-recibo.sql');
    const sqlText = readFileSync(ruta, 'utf8');

    console.log('▶ Ejecutando migración del folio (2026-06-11-folio-recibo.sql)…');
    await db.execute(sql.raw(sqlText));

    const col = (await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'pagos_membresia' AND column_name = 'folio'
    `)).rows;
    const seq = (await db.execute(sql`SELECT last_value FROM pagos_membresia_folio_seq`)).rows as Array<{ last_value: string }>;
    const conFolio = (await db.execute(sql`SELECT COUNT(*)::int AS n FROM pagos_membresia WHERE folio IS NOT NULL`)).rows as Array<{ n: number }>;

    console.log(col.length ? '✓ Columna `folio` creada.' : '✗ La columna `folio` NO existe.');
    console.log(`✓ Secuencia en ${seq[0]?.last_value} · pagos existentes con folio: ${conFolio[0]?.n}`);
    console.log('Siguiente folio que se asignará:', Number(seq[0]?.last_value ?? 0) + 1);
    process.exit(col.length ? 0 : 1);
}

main().catch((e) => { console.error('Error en la migración:', e); process.exit(1); });
