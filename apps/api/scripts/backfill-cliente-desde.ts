/**
 * backfill-cliente-desde.ts
 * =========================
 * Puebla `negocios.fecha_primer_pago` del "Negocio de Prueba" (JUAN01) con la fecha
 * REAL de su primera factura PAGADA con monto > 0 en Stripe — replicando lo que el
 * webhook (manejarRenovacionPagada) hará de aquí en adelante. Útil para ver "Cliente
 * desde" en la ficha de un negocio cuyo primer cobro ocurrió ANTES del fix.
 *
 * Usa COALESCE: si ya tuviera fecha, NO la pisa. Aborta si DB_ENVIRONMENT=production.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/backfill-cliente-desde.ts
 * Revertir:  UPDATE negocios SET fecha_primer_pago = NULL WHERE id = '<id>';
 *
 * Ubicación: apps/api/scripts/backfill-cliente-desde.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Solo DEV.');
        process.exit(1);
    }

    const filas = (await db.execute(sql`
        SELECT n.id::text AS negocio_id, n.nombre, n.fecha_primer_pago, u.stripe_subscription_id
        FROM negocios n
        JOIN embajadores e ON e.id = n.embajador_id
        JOIN usuarios u ON u.id = n.usuario_id
        WHERE e.codigo_referido = 'JUAN01' AND u.stripe_subscription_id IS NOT NULL
        ORDER BY n.created_at DESC
    `)).rows as Array<{ negocio_id: string; nombre: string; fecha_primer_pago: string | null; stripe_subscription_id: string | null }>;

    if (!filas.length || !filas[0].stripe_subscription_id) {
        console.error('✗ No hay negocio de JUAN01 con suscripción.');
        process.exit(1);
    }
    const { negocio_id: negocioId, nombre, stripe_subscription_id: subId } = filas[0];

    // Primera factura PAGADA con monto > 0 (la del cobro real, no el trial de $0).
    const facturas = await stripe.invoices.list({ subscription: subId, limit: 100 });
    const pagadasReales = facturas.data
        .filter((f) => (f.amount_paid ?? 0) > 0)
        .sort((a, b) => (a.created ?? 0) - (b.created ?? 0));

    if (!pagadasReales.length) {
        console.log('ℹ️ Aún no hay factura pagada con monto > 0 (sigue en trial). Nada que poblar.');
        process.exit(0);
    }

    const primera = pagadasReales[0];
    const unix = (primera as unknown as { status_transitions?: { paid_at?: number } }).status_transitions?.paid_at
        ?? primera.created;
    const fechaISO = new Date((unix ?? 0) * 1000).toISOString().slice(0, 10); // YYYY-MM-DD

    const res = await db.execute(sql`
        UPDATE negocios
        SET fecha_primer_pago = COALESCE(fecha_primer_pago, ${fechaISO}::date),
            updated_at = now()
        WHERE id = ${negocioId}
        RETURNING fecha_primer_pago::text AS fecha_primer_pago
    `);

    console.log(`\nNegocio:  ${nombre} (${negocioId})`);
    console.log(`Factura:  ${primera.id} · total=${((primera.amount_paid ?? 0) / 100).toFixed(2)} ${primera.currency}`);
    console.log(`fecha_primer_pago → ${(res.rows[0] as { fecha_primer_pago: string }).fecha_primer_pago}`);
    console.log('\nRefresca la ficha en el Panel para ver "Cliente desde".\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en backfill-cliente-desde:', err);
    process.exit(1);
});
