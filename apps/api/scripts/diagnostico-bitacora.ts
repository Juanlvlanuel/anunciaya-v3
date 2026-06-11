/**
 * diagnostico-bitacora.ts — solo lectura
 * ======================================
 * Diagnostica por qué un pago manual reciente no aparece en la bitácora financiera:
 * cruza pagos_membresia con su gemelo en eventos_pago (referencia_id). Si el último
 * pago NO tiene evento_id → el INSERT del gemelo no corrió (p. ej. backend sin recargar).
 *
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/diagnostico-bitacora.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('\n=== ¿Existe la tabla eventos_pago? ===');
    const existe = (await db.execute(sql`SELECT to_regclass('public.eventos_pago')::text AS t`)).rows[0];
    console.log(existe);

    console.log('\n=== Últimos pagos_membresia + su gemelo en eventos_pago ===');
    const pm = (await db.execute(sql`
        SELECT pm.created_at::text AS pago_creado, n.nombre, pm.concepto, pm.monto::text AS monto,
               (ep.id IS NOT NULL) AS tiene_evento
        FROM pagos_membresia pm
        LEFT JOIN negocios n ON n.id = pm.negocio_id
        LEFT JOIN eventos_pago ep ON ep.referencia_id = pm.id AND ep.tipo = 'pago_manual'
        ORDER BY pm.created_at DESC LIMIT 8
    `)).rows;
    console.table(pm);

    console.log('\n=== eventos_pago por tipo/origen ===');
    const tot = (await db.execute(sql`SELECT tipo, origen, count(*)::int AS n FROM eventos_pago GROUP BY tipo, origen ORDER BY n DESC`)).rows;
    console.table(tot.length ? tot : [{ info: 'tabla vacía' }]);

    console.log('\n=== Últimos eventos_pago ===');
    const ult = (await db.execute(sql`
        SELECT ep.created_at::text AS creado, ep.tipo, ep.origen, ep.monto::text AS monto, n.nombre
        FROM eventos_pago ep LEFT JOIN negocios n ON n.id = ep.negocio_id
        ORDER BY ep.created_at DESC LIMIT 8
    `)).rows;
    console.table(ult.length ? ult : [{ info: 'tabla vacía' }]);

    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
