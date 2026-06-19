/**
 * probar-cobro-dia1.ts — HARNESS (Stripe TEST + Test Clock)
 * =========================================================
 * Pieza 2 del Sprint de Stripe · cobro "día 1" para ventas por vendedor.
 *
 * Valida el MECANISMO elegido para el cobro día-1: suscripción SIN trial (cobra HOY)
 * + empuje del próximo cobro a +44d reusando `empujarCobroSuscripcion` (trial_end
 * absoluto + proration 'none', el mismo helper que ya usa "Registrar pago"). Con un
 * Stripe Test Clock comprueba el CALENDARIO completo sin esperar días reales:
 *
 *   [1] Al crear la sub SIN trial → se cobra el precio HOY (factura pagada, monto>0) → día-1.
 *   [2] Tras empujar a +44d → la sub queda `trialing` con trial_end = +44d.
 *   [3] Al avanzar el reloj a +44d → la sub vuelve a cobrar (renovación) → siguiente ciclo.
 *   [4] Entre el día 0 y el día 44 NO hubo cobros extra (exactamente 2 facturas pagadas).
 *
 * Es MECÁNICA PURA de Stripe: NO toca la BD ni el webhook (la cadena
 * webhook→comisión/recibo se valida E2E aparte, con `stripe listen`). Crea y limpia sus
 * propios recursos (test clock + customer + sub). Aborta en producción.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-cobro-dia1.ts
 *
 * Ubicación: apps/api/scripts/probar-cobro-dia1.ts
 */

import { config } from 'dotenv';
config();

import { stripe } from '../src/config/stripe.js';
import { env } from '../src/config/env.js';
import { obtenerConfigTexto } from '../src/services/configuracion.service.js';
import { empujarCobroSuscripcion } from '../src/services/suscripciones/acciones-stripe.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : '—');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DIA = 86400; // segundos en un día

/** Avanza el Test Clock a `target` (unix) y espera a que termine de procesar (status 'ready'). */
async function avanzarReloj(clockId: string, target: number): Promise<void> {
    await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: target });
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
        const c = await stripe.testHelpers.testClocks.retrieve(clockId);
        if (c.status === 'ready') return;
        if (c.status === 'internal_failure') throw new Error('Test clock: internal_failure al avanzar.');
        await sleep(2000);
    }
    throw new Error('Test clock no llegó a "ready" (timeout 120s).');
}

/** Facturas del customer que realmente cobraron dinero (pagadas y con monto > 0). */
async function facturasPagadas(customerId: string) {
    const inv = await stripe.invoices.list({ customer: customerId, limit: 20 });
    return inv.data.filter((i) => i.status === 'paid' && (i.amount_paid ?? 0) > 0);
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: production.');
        process.exit(1);
    }
    // Lee el price ACTIVO de la MISMA fuente que producción (config; el env solo siembra). Clave tras la
    // Pieza 1: el botón de precio ARCHIVA el price viejo (el del env) y crea uno nuevo cuyo ID vive en
    // config — usar el env daría un price inactivo (lo que reventó la 1ª corrida del spike).
    const PRICE = await obtenerConfigTexto('stripe_price_comercial_id', env.STRIPE_PRICE_COMERCIAL);
    if (!PRICE) {
        console.error('✗ No hay price comercial configurado (ni config stripe_price_comercial_id ni env STRIPE_PRICE_COMERCIAL).');
        process.exit(1);
    }

    const price = await stripe.prices.retrieve(PRICE);
    const montoEsperado = price.unit_amount ?? 0; // centavos
    console.log('\n════════ Pieza 2 · cobro día-1 + empuje a +44d (Test Clock) ════════');
    console.log(`Price ${PRICE} = ${(montoEsperado / 100).toFixed(2)} ${price.currency?.toUpperCase()}`);

    let fallos = 0;
    let clockId: string | null = null;
    let customerId: string | null = null;
    let subId: string | null = null;

    try {
        const ahora = Math.floor(Date.now() / 1000);

        // Reloj de prueba + cliente anclado a él + tarjeta de prueba como método por defecto.
        const clock = await stripe.testHelpers.testClocks.create({ frozen_time: ahora, name: 'Pieza2 dia-1' });
        clockId = clock.id;
        const customer = await stripe.customers.create({
            name: 'Prueba Día-1',
            email: `dia1+${ahora}@dev.local`,
            test_clock: clockId,
        });
        customerId = customer.id;
        const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
        await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });

        // ── [1] Sub SIN trial → cobra HOY (día-1) ───────────────────────────────────
        const sub = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: PRICE }],
            default_payment_method: pm.id,
            expand: ['latest_invoice'],
        });
        subId = sub.id;
        const inv0 = sub.latest_invoice as unknown as { status?: string; amount_paid?: number } | null;
        const cobroHoy = sub.status === 'active' && inv0?.status === 'paid' && (inv0?.amount_paid ?? 0) === montoEsperado;
        if (!cobroHoy) fallos++;
        console.log(`\n[1] Sub SIN trial cobra HOY (día-1)  ${ok(cobroHoy)}`);
        console.log(`    status=${sub.status} (esperado active) · factura=${inv0?.status} · cobrado=${(inv0?.amount_paid ?? 0) / 100} (esperado ${montoEsperado / 100})`);

        // ── [2] Empuje del próximo cobro a +44d → trialing con trial_end EXACTO ──────
        const objetivo = ahora + 44 * DIA;
        const r2 = await empujarCobroSuscripcion(subId, new Date(objetivo * 1000).toISOString());
        const s2 = await stripe.subscriptions.retrieve(subId);
        const trialEnd2 = (s2 as unknown as { trial_end?: number | null }).trial_end ?? null;
        const empujado = r2.ok && s2.status === 'trialing' && Math.abs((trialEnd2 ?? 0) - objetivo) <= 5;
        if (!empujado) fallos++;
        console.log(`\n[2] Empuje del próximo cobro a +44d  ${ok(empujado)}`);
        console.log(`    helper.ok=${r2.ok} · status=${s2.status} (esperado trialing) · trial_end=${iso(trialEnd2)} (esperado ${iso(objetivo)})`);

        // ── [3] Avanzar el reloj a +44d (+2h de margen) → cobra de nuevo (renovación) ─
        await avanzarReloj(clockId, objetivo + 2 * 3600);
        const s3 = await stripe.subscriptions.retrieve(subId);
        const pagadas = await facturasPagadas(customerId);
        const renovo = s3.status === 'active' && pagadas.length === 2;
        if (!renovo) fallos++;
        console.log(`\n[3] Al llegar a +44d la sub cobra de nuevo  ${ok(renovo)}`);
        console.log(`    status=${s3.status} (esperado active) · facturas pagadas=${pagadas.length} (esperado 2) · montos=[${pagadas.map((i) => (i.amount_paid ?? 0) / 100).join(', ')}]`);

        // ── [4] No hubo cobros extra entre el día 0 y el día 44 ──────────────────────
        const sinExtra = pagadas.length === 2 && pagadas.every((i) => (i.amount_paid ?? 0) === montoEsperado);
        if (!sinExtra) fallos++;
        console.log(`\n[4] Exactamente 2 cobros del monto correcto (sin extras entre medias)  ${ok(sinExtra)}`);
    } catch (err) {
        fallos++;
        console.error('\n✗ Error durante la prueba:', err);
    } finally {
        // ── Limpieza: borrar el test clock cascadea sus customer/sub; cancel/del son red de seguridad.
        try { if (subId) await stripe.subscriptions.cancel(subId); } catch { /* ya cancelada / cascadeada */ }
        try { if (customerId) await stripe.customers.del(customerId); } catch { /* el clock la cascadea */ }
        try { if (clockId) await stripe.testHelpers.testClocks.del(clockId); } catch { /* ya borrado */ }
    }

    console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
    console.log('════════════════════════════════════════════════════════════════\n');
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('Error en probar-cobro-dia1:', err);
    process.exit(1);
});
