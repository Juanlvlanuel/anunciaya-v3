/**
 * backfill-eventos-pago-manual.ts
 * ===============================
 * Reconstruye el gemelo en `eventos_pago` (tipo='pago_manual') para los pagos de
 * `pagos_membresia` que se registraron ANTES de centralizar el doble INSERT — sobre todo
 * los del ALTA MANUAL, que nunca escribieron su fila en el libro mayor y por eso no
 * aparecían en el módulo Suscripciones.
 *
 * Idempotente: solo inserta cuando NO existe ya el gemelo (referencia_id + tipo='pago_manual').
 * Correrlo dos veces no duplica nada.
 *
 * SOLO pagos MANUALES (concepto efectivo/transferencia/cortesía). EXCLUYE concepto='tarjeta': esas
 * filas son el recibo de un cobro de Stripe (Pieza 1) y su movimiento ya figura en la bitácora como
 * evento cobro_exitoso/origen='stripe' (deduped por stripe_event_id). NO son pagos manuales —
 * meterlas como pago_manual duplicaría el ingreso en los KPIs.
 *
 * - DRY RUN (default): cuenta y lista los huérfanos. NO escribe.
 *       cd apps/api && pnpm exec tsx scripts/backfill-eventos-pago-manual.ts
 * - APLICAR:           inserta los gemelos faltantes y re-cuenta.
 *       cd apps/api && pnpm exec tsx scripts/backfill-eventos-pago-manual.ts --aplicar
 *
 * El SQL equivalente (para PROD) vive en docs/migraciones/2026-06-15-backfill-eventos-pago-manual.sql.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const APLICAR = process.argv.includes('--aplicar');

async function main() {
    // 1) Los huérfanos: pagos_membresia sin gemelo pago_manual en eventos_pago.
    const huerfanos = (await db.execute(sql`
        SELECT pm.id::text AS pago_id, n.nombre AS negocio, pm.concepto,
               pm.monto::text AS monto, pm.anulado, pm.fecha_pago::text AS fecha_pago
        FROM pagos_membresia pm
        LEFT JOIN negocios n ON n.id = pm.negocio_id
        WHERE pm.concepto IN ('efectivo', 'transferencia', 'cortesia')   -- solo MANUALES (excluye 'tarjeta': cobro de Stripe, ya tiene su evento cobro_exitoso)
          AND NOT EXISTS (
            SELECT 1 FROM eventos_pago ep
            WHERE ep.referencia_id = pm.id AND ep.tipo = 'pago_manual'
        )
        ORDER BY pm.fecha_pago DESC
    `)).rows;

    console.log(`\n=== Pagos manuales SIN gemelo en eventos_pago: ${huerfanos.length} ===`);
    console.table(huerfanos.length ? huerfanos : [{ info: 'no hay huérfanos' }]);

    if (!APLICAR) {
        console.log('\nDRY RUN — no se escribió nada. Para aplicar: agrega --aplicar\n');
        process.exit(0);
    }

    if (!huerfanos.length) {
        console.log('\nNada que aplicar.\n');
        process.exit(0);
    }

    // 2) Backfill idempotente. fecha_evento = fecha real del pago (no now), para no desordenar
    //    la bitácora. Anulado → monto NULL + metadata de anulación (igual que anularPago).
    //    metadata.backfill=true para trazar que la fila fue reconstruida, no escrita en vivo.
    const res = await db.execute(sql`
        INSERT INTO eventos_pago
            (negocio_id, tipo, origen, monto, moneda, fecha_evento, actor_id, referencia_id, metadata)
        SELECT
            pm.negocio_id,
            'pago_manual',
            'manual',
            CASE WHEN pm.anulado THEN NULL ELSE pm.monto END,
            'MXN',
            pm.fecha_pago,
            pm.registrado_por,
            pm.id,
            jsonb_build_object(
                'concepto', pm.concepto,
                'meses', pm.meses_cubiertos,
                'hasta', pm.periodo_hasta,
                'metodoCobro', 'manual',
                'backfill', true
            )
            || CASE WHEN pm.anulado
                    THEN jsonb_build_object('anulado', true, 'motivo', pm.motivo_anulacion, 'anuladoAt', pm.anulado_at)
                    ELSE '{}'::jsonb END
        FROM pagos_membresia pm
        WHERE pm.concepto IN ('efectivo', 'transferencia', 'cortesia')   -- solo MANUALES (excluye 'tarjeta': cobro de Stripe, ya tiene su evento cobro_exitoso)
          AND NOT EXISTS (
            SELECT 1 FROM eventos_pago ep
            WHERE ep.referencia_id = pm.id AND ep.tipo = 'pago_manual'
        )
    `);
    console.log(`\n✅ Backfill aplicado. Filas insertadas: ${res.rowCount ?? 'desconocido'}`);

    // 3) Re-verificar: debe quedar 0 huérfanos.
    const restantes = (await db.execute(sql`
        SELECT count(*)::int AS n
        FROM pagos_membresia pm
        WHERE pm.concepto IN ('efectivo', 'transferencia', 'cortesia')   -- solo MANUALES (excluye 'tarjeta': cobro de Stripe, ya tiene su evento cobro_exitoso)
          AND NOT EXISTS (
            SELECT 1 FROM eventos_pago ep
            WHERE ep.referencia_id = pm.id AND ep.tipo = 'pago_manual'
        )
    `)).rows[0];
    console.log(`Huérfanos restantes: ${(restantes as { n: number }).n}\n`);

    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
