/**
 * diagnostico-stripe-suscripcion.ts
 * =================================
 * SOLO LECTURA. Muestra el estado real en Stripe de la suscripción del "Negocio de
 * Prueba" (el atribuido a JUAN01): status, fin de trial, fin de periodo, tarjeta y
 * última factura. Sirve para ver cuándo caería el primer cobro post-trial.
 *
 * NO modifica nada en Stripe ni en la BD.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/diagnostico-stripe-suscripcion.ts
 *
 * Ubicación: apps/api/scripts/diagnostico-stripe-suscripcion.ts
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
    console.log('\n══════════ ESTADO DE SUSCRIPCIÓN EN STRIPE (SOLO LECTURA) ══════════');
    console.log(`Ambiente BD: ${process.env.DB_ENVIRONMENT || 'local'}`);

    const filas = (await db.execute(sql`
        SELECT n.id::text AS negocio_id, n.nombre, u.correo,
               u.stripe_customer_id, u.stripe_subscription_id,
               n.estado_membresia, n.fecha_vencimiento, n.fecha_proximo_cobro, n.fecha_primer_pago
        FROM negocios n
        JOIN embajadores e ON e.id = n.embajador_id
        JOIN usuarios u ON u.id = n.usuario_id
        WHERE e.codigo_referido = 'JUAN01' AND u.stripe_subscription_id IS NOT NULL
        ORDER BY n.created_at DESC
    `)).rows as Array<{
        negocio_id: string; nombre: string; correo: string;
        stripe_customer_id: string | null; stripe_subscription_id: string | null;
        estado_membresia: string; fecha_vencimiento: string | null;
        fecha_proximo_cobro: string | null; fecha_primer_pago: string | null;
    }>;

    console.log('\n── Negocio (lo que dice NUESTRA BD) ─────────────────────────────');
    console.table(filas);

    if (!filas.length || !filas[0].stripe_subscription_id) {
        console.log('No hay negocio de JUAN01 con suscripción de Stripe.');
        process.exit(0);
    }

    const subId = filas[0].stripe_subscription_id;
    const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ['default_payment_method', 'latest_invoice'],
    });

    // En la API clover, current_period_end vive a nivel de item.
    const item = (sub as unknown as { items?: { data?: Array<{ current_period_end?: number }> } }).items?.data?.[0];
    const periodEnd = item?.current_period_end
        ?? (sub as unknown as { current_period_end?: number }).current_period_end;

    console.log('── Suscripción (lo que dice STRIPE) ─────────────────────────────');
    console.table([{
        id: sub.id,
        status: sub.status,
        trial_end: unixAISO(sub.trial_end),
        current_period_end: unixAISO(periodEnd),
        cancel_at_period_end: sub.cancel_at_period_end,
    }]);

    const pm = sub.default_payment_method;
    if (pm && typeof pm !== 'string' && 'card' in pm && pm.card) {
        console.log(`Tarjeta adjunta: ${pm.card.brand} ****${pm.card.last4} (exp ${pm.card.exp_month}/${pm.card.exp_year})`);
    } else {
        console.log(`Método de pago default: ${typeof pm === 'string' ? pm : '(ninguno expandido)'}`);
    }

    const inv = sub.latest_invoice;
    if (inv && typeof inv !== 'string') {
        const total = typeof inv.total === 'number' ? (inv.total / 100).toFixed(2) : '?';
        console.log(`Última factura: ${inv.id} · status=${inv.status} · total=${total} ${inv.currency} · paid=${inv.paid}`);
    }

    console.log('\nPara forzar el cobro YA (sin esperar al trial_end):');
    console.log(`  stripe.subscriptions.update('${subId}', { trial_end: 'now' })`);
    console.log('══════════════════════════════════════════════════════════════════\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en diagnostico-stripe-suscripcion:', err);
    process.exit(1);
});
