/**
 * seed-efectivo-pendiente-dev.ts — SEED (DEV) · módulo Resumen
 * ===========================================================
 * Carga "efectivo por entregar" a algunos vendedores para VER poblada la cola de pendientes del
 * Resumen (bloque "Efectivo por entregar"). Cada carga es un movimiento REAL en `efectivo_movimientos`
 * (tipo 'cobro'), idéntico al que produce `registrarCobroEfectivo` cuando un vendedor cobra en efectivo
 * y aún no lo entrega → su `saldoEfectivo` queda > 0.
 *
 * Reparte montos distintos entre los primeros vendedores activos para que se note el orden por saldo
 * (desc) en la cola. Enlaza cada cobro a un negocio de la cartera del vendedor si lo tiene.
 *
 * Idempotente: marca cada movimiento con una NOTA y limpia los previos antes de insertar.
 * Aborta en producción.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/seed-efectivo-pendiente-dev.ts
 * Revertir:  DELETE FROM efectivo_movimientos WHERE nota = '[seed-dev] efectivo de prueba';
 *
 * Ubicación: apps/api/scripts/seed-efectivo-pendiente-dev.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const NOTA = '[seed-dev] efectivo de prueba';
// Saldos distintos (múltiplos del precio de membresía) para ver el orden desc en la cola.
const MONTOS = [2547, 1698, 849];

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Solo DEV.');
        process.exit(1);
    }

    const embs = (await db.execute(sql`
        SELECT e.id::text AS id, (u.nombre || ' ' || COALESCE(u.apellidos, '')) AS nombre
        FROM embajadores e
        JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.estado = 'activo'
        ORDER BY u.created_at
        LIMIT ${MONTOS.length}
    `)).rows as Array<{ id: string; nombre: string }>;

    if (!embs.length) {
        console.error('✗ No hay vendedores activos. Corre seed-vendedor-prueba.ts primero.');
        process.exit(1);
    }

    // Idempotencia: limpia los cobros sembrados previos (de cualquier vendedor).
    await db.execute(sql`DELETE FROM efectivo_movimientos WHERE nota = ${NOTA}`);

    const resumen: Array<{ vendedor: string; cobrado: string }> = [];
    for (let i = 0; i < embs.length; i++) {
        const e = embs[i];
        const monto = MONTOS[i] ?? 849;
        await db.execute(sql`
            INSERT INTO efectivo_movimientos (embajador_id, tipo, monto, negocio_id, fecha, registrado_por, nota)
            VALUES (
                ${e.id}::uuid, 'cobro', ${String(monto)},
                (SELECT id FROM negocios WHERE embajador_id = ${e.id}::uuid LIMIT 1),
                now()::date, NULL, ${NOTA}
            )
        `);
        resumen.push({ vendedor: e.nombre.trim() || e.id, cobrado: `$${monto.toLocaleString('es-MX')}` });
    }

    console.log('\n───────── RESUMEN seed-efectivo-pendiente-dev ─────────');
    console.log(`Ambiente BD: ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.table(resumen);
    console.log('Abre el Resumen del Panel: "Efectivo por entregar" debe listar estos vendedores (orden por monto).');
    console.log(`Revertir: DELETE FROM efectivo_movimientos WHERE nota = '${NOTA}';`);
    console.log('───────────────────────────────────────────────────────\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-efectivo-pendiente-dev:', err);
    process.exit(1);
});
