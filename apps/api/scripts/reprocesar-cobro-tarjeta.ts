/**
 * reprocesar-cobro-tarjeta.ts — DEV/PROD (operativo)
 * ==================================================
 * Registra en el sistema un cobro de TARJETA que SÍ se cobró en Stripe pero quedó SIN registrar
 * (sin bitácora financiera, sin comisión del vendedor, sin recibo). Caso típico: el cobro "día 1"
 * (Pieza 2) cuyo webhook `invoice.payment_succeeded` llegó antes del negocio y no se reintentó.
 *
 * Lee el ÚLTIMO invoice pagado de la suscripción del negocio y llama `registrarCobroReal` (idempotente
 * por invoice.id), así que es seguro correrlo aunque el cobro ya estuviera parcialmente registrado.
 *
 * USO:  cd apps/api && pnpm exec tsx scripts/reprocesar-cobro-tarjeta.ts "<nombre del negocio>" [--aplicar]
 *
 * Ubicación: apps/api/scripts/reprocesar-cobro-tarjeta.ts
 */

import { config } from 'dotenv';
config();

import { eq, ilike } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { negocios, usuarios } from '../src/db/schemas/schema.js';
import { stripe } from '../src/config/stripe.js';
import { registrarCobroReal } from '../src/services/pago.service.js';

const arg = process.argv[2];
const aplicar = process.argv.includes('--aplicar');

/** Timestamp Unix (segundos) → ISO, o null. */
function unixAISO(s: number | null | undefined): string | null {
    return s ? new Date(s * 1000).toISOString() : null;
}

async function main(): Promise<void> {
    if (!arg || arg.startsWith('--')) {
        console.error('Uso: pnpm exec tsx scripts/reprocesar-cobro-tarjeta.ts "<nombre del negocio>" [--aplicar]');
        process.exit(1);
    }

    // 1) Negocio + su dueño (la suscripción de Stripe vive en el usuario).
    const [fila] = await db
        .select({
            negocioId: negocios.id,
            nombre: negocios.nombre,
            subId: usuarios.stripeSubscriptionId,
            custId: usuarios.stripeCustomerId,
        })
        .from(negocios)
        .innerJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(ilike(negocios.nombre, `%${arg}%`))
        .limit(1);
    if (!fila) {
        console.error(`✗ No se encontró un negocio que contenga "${arg}".`);
        process.exit(1);
    }
    if (!fila.subId) {
        console.error(`✗ "${fila.nombre}" no tiene stripe_subscription_id (¿no pagó con tarjeta?).`);
        process.exit(1);
    }

    // 2) Último invoice de la suscripción (el del cobro inicial / última renovación).
    const sub = await stripe.subscriptions.retrieve(fila.subId, { expand: ['latest_invoice'] });
    const latest = sub.latest_invoice;
    const inv = (typeof latest === 'string' ? await stripe.invoices.retrieve(latest) : latest) as unknown as {
        id?: string;
        amount_paid?: number;
        lines?: { data?: Array<{ period?: { end?: number } }> };
    } | null;
    if (!inv?.id || (inv.amount_paid ?? 0) <= 0) {
        console.error('✗ El último invoice no es un cobro real (monto 0 o sin invoice). Nada que reprocesar.');
        process.exit(1);
    }

    const monto = (inv.amount_paid ?? 0) / 100;
    const finPeriodo = unixAISO(inv.lines?.data?.[0]?.period?.end);
    console.log(`\nNegocio: "${fila.nombre}"`);
    console.log(`Invoice: ${inv.id} · $${monto.toLocaleString('es-MX')} · cobertura hasta ${finPeriodo ?? '—'}`);

    if (!aplicar) {
        console.log('\n(DRY-RUN) Con --aplicar se registra el cobro (bitácora + comisión + recibo) si aún no existe.');
        process.exit(0);
    }

    await registrarCobroReal({
        negocioId: fila.negocioId,
        invoiceId: inv.id,
        montoCentavos: inv.amount_paid ?? 0,
        finPeriodo,
        clienteId: fila.custId ?? null,
    });
    console.log('\n✅ Cobro reprocesado. Si no estaba registrado, ahora hay bitácora financiera + comisión del vendedor + recibo (correo).');
    process.exit(0);
}

main().catch((e) => {
    console.error('Error en reprocesar-cobro-tarjeta:', e);
    process.exit(1);
});
