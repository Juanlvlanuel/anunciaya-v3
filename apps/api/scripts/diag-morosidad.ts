/**
 * diag-morosidad.ts — SOLO LECTURA. Diagnóstico del negocio de prueba de morosidad:
 * estado en BD vs estado real de su suscripción/última factura en Stripe.
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/diag-morosidad.ts
 */
import { config } from 'dotenv';
config();
import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';

async function main() {
    const r = (await db.execute(sql`
        SELECT n.estado_membresia, n.fecha_proximo_cobro::text AS proximo, u.stripe_subscription_id AS sub
        FROM negocios n JOIN usuarios u ON u.id = n.usuario_id
        WHERE u.correo = 'prueba.morosidad@dev.local'
    `)).rows as Array<{ estado_membresia: string; proximo: string | null; sub: string | null }>;
    console.log('── BD ──'); console.table(r);

    const subId = r[0]?.sub;
    if (!subId) { console.log('Sin suscripción.'); process.exit(0); }

    const sub = await stripe.subscriptions.retrieve(subId, { expand: ['latest_invoice'] });
    const inv = sub.latest_invoice as unknown as {
        id?: string; status?: string; paid?: boolean; attempted?: boolean;
        total?: number; next_payment_attempt?: number | null;
    } | string | null;
    console.log('── Stripe ──');
    console.log('sub.status:', sub.status);
    if (inv && typeof inv !== 'string') {
        console.log('invoice:', {
            id: inv.id, status: inv.status, paid: inv.paid, attempted: inv.attempted,
            total: typeof inv.total === 'number' ? inv.total / 100 : inv.total,
            next_payment_attempt: inv.next_payment_attempt
                ? new Date(inv.next_payment_attempt * 1000).toISOString() : null,
        });
    } else {
        console.log('latest_invoice:', inv);
    }
    process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
