/**
 * forzar-cobro-trial.ts
 * =====================
 * PRUEBA (Stripe TEST). Fuerza el fin del trial de la suscripción del "Negocio de
 * Prueba" (atribuido a JUAN01) con `trial_end: 'now'`, lo que hace que Stripe genere
 * la factura real y la cobre de inmediato con la tarjeta adjunta (4242). Dispara
 * `invoice.payment_succeeded`, que el `stripe listen` reenvía al webhook local →
 * `manejarRenovacionPagada` actualiza la BD.
 *
 * Solo modifica la SUSCRIPCIÓN en Stripe test; NO escribe en la BD (eso lo hace el
 * webhook). Aborta si DB_ENVIRONMENT=production.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/forzar-cobro-trial.ts
 *
 * Ubicación: apps/api/scripts/forzar-cobro-trial.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';

function unixAISO(unix: number | null | undefined): string | null {
    return unix ? new Date(unix * 1000).toISOString() : null;
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Solo para DEV/test.');
        process.exit(1);
    }

    const filas = (await db.execute(sql`
        SELECT n.nombre, u.stripe_subscription_id
        FROM negocios n
        JOIN embajadores e ON e.id = n.embajador_id
        JOIN usuarios u ON u.id = n.usuario_id
        WHERE e.codigo_referido = 'JUAN01' AND u.stripe_subscription_id IS NOT NULL
        ORDER BY n.created_at DESC
    `)).rows as Array<{ nombre: string; stripe_subscription_id: string | null }>;

    if (!filas.length || !filas[0].stripe_subscription_id) {
        console.error('✗ No hay negocio de JUAN01 con suscripción.');
        process.exit(1);
    }
    const subId = filas[0].stripe_subscription_id;

    const antes = await stripe.subscriptions.retrieve(subId);
    console.log(`\nANTES   → status=${antes.status} · trial_end=${unixAISO(antes.trial_end)}`);

    // Forzar el fin del trial: Stripe factura el periodo y cobra de inmediato.
    const sub = await stripe.subscriptions.update(subId, { trial_end: 'now' });

    const item = (sub as unknown as { items?: { data?: Array<{ current_period_end?: number }> } }).items?.data?.[0];
    console.log(`DESPUÉS → status=${sub.status} · current_period_end=${unixAISO(item?.current_period_end)}`);

    // Última factura generada (debería reflejar el cobro de $449).
    const facturas = await stripe.invoices.list({ subscription: subId, limit: 1 });
    const f = facturas.data[0];
    if (f) {
        const total = typeof f.total === 'number' ? (f.total / 100).toFixed(2) : '?';
        console.log(`Factura → ${f.id} · status=${f.status} · total=${total} ${f.currency}`);
    }

    console.log('\n⏳ El webhook invoice.payment_succeeded debe llegar por `stripe listen` en unos segundos.');
    console.log('   Verifica luego con: pnpm exec tsx scripts/diagnostico-stripe-suscripcion.ts\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en forzar-cobro-trial:', err);
    process.exit(1);
});
