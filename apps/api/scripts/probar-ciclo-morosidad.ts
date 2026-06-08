/**
 * probar-ciclo-morosidad.ts — HARNESS POR PASOS (Stripe TEST + DEV)
 * ================================================================
 * Recorre el ciclo de morosidad UNA ETAPA A LA VEZ, para mirar el modal en vivo
 * entre paso y paso. Eventos REALES de Stripe; el estado vive en Stripe/BD entre
 * invocaciones. Negocio: "Prueba · Ciclo morosidad" (correo prueba.morosidad@dev.local),
 * atribuido a JUAN01.
 *
 * Requiere `stripe listen --forward-to localhost:4000/api/pagos/webhook` + backend :4000.
 * Aborta en producción.
 *
 * USO:  cd apps/api && pnpm exec tsx scripts/probar-ciclo-morosidad.ts <paso>
 *   crear      → customer + tarjeta que rebota + suscripción (trial) + negocio (al_corriente)
 *   fallar     → fuerza el cobro → rebota → webhook → en_gracia
 *   reintento  → fuerza un reintento (invoices.pay) → rebota → refresca "Reintento"
 *   suspender  → vence la gracia + corre el cron real → suspendido
 *   estado     → muestra el estado actual (BD + Stripe), sin cambiar nada
 *   limpiar    → cancela la suscripción en Stripe + borra el negocio/dueño
 *
 * Ubicación: apps/api/scripts/probar-ciclo-morosidad.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import { suspenderGraciasVencidas } from '../src/services/suscripciones/gracia.js';

const CORREO = 'prueba.morosidad@dev.local';
const NOMBRE_NEGOCIO = 'Prueba · Ciclo morosidad';
const PRICE = process.env.STRIPE_PRICE_COMERCIAL!;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function reporte(negocioId: string, titulo: string) {
    const r = (await db.execute(sql`
        SELECT estado_membresia,
               fecha_vencimiento::text   AS vence,
               fecha_proximo_cobro::text AS proximo,
               fecha_limite_gracia::text AS gracia,
               activo
        FROM negocios WHERE id = ${negocioId}
    `)).rows;
    console.log(`\n── ${titulo} ──`);
    console.table(r);
}

async function ctx() {
    const r = (await db.execute(sql`
        SELECT n.id::text AS negocio_id, u.id::text AS usuario_id,
               u.stripe_subscription_id AS sub, u.stripe_customer_id AS customer
        FROM negocios n JOIN usuarios u ON u.id = n.usuario_id
        WHERE u.correo = ${CORREO}
    `)).rows as Array<{ negocio_id: string; usuario_id: string; sub: string | null; customer: string | null }>;
    if (!r[0]) { console.error('✗ No existe el negocio de morosidad. Corre el paso "crear" primero.'); process.exit(1); }
    return r[0];
}

async function esperarEstado(negocioId: string, estado: string, timeoutMs = 40000) {
    const inicio = Date.now();
    while (Date.now() - inicio < timeoutMs) {
        const n = (await db.execute(sql`SELECT estado_membresia FROM negocios WHERE id = ${negocioId}`)).rows as Array<{ estado_membresia: string }>;
        if (n[0]?.estado_membresia === estado) return true;
        await dormir(2500);
    }
    return false;
}

// ── PASOS ────────────────────────────────────────────────────────────────────

async function crear() {
    // Limpieza de corrida previa.
    const prev = (await db.execute(sql`SELECT id::text, stripe_subscription_id FROM usuarios WHERE correo = ${CORREO}`))
        .rows as Array<{ id: string; stripe_subscription_id: string | null }>;
    if (prev[0]) {
        if (prev[0].stripe_subscription_id) { try { await stripe.subscriptions.cancel(prev[0].stripe_subscription_id); } catch { /* ya */ } }
        await db.execute(sql`DELETE FROM usuarios WHERE id = ${prev[0].id}`);
        console.log('🧹 Corrida previa limpiada.');
    }

    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
    if (!emb[0]) { console.error('✗ No existe el embajador JUAN01.'); process.exit(1); }

    const customer = await stripe.customers.create({ email: CORREO, name: 'Prueba Morosidad' });
    const pm = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const sub = await stripe.subscriptions.create({
        customer: customer.id, items: [{ price: PRICE }], trial_period_days: 14, default_payment_method: pm.id,
    });

    const u = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                              estado, modo_activo, tiene_modo_comercial, stripe_customer_id, stripe_subscription_id)
        VALUES ('Prueba', 'Morosidad', ${CORREO}, 'comercial', 1, true, now(),
                'activo', 'comercial', true, ${customer.id}, ${sub.id})
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, onboarding_completado, es_borrador,
                             fecha_primer_pago, fecha_vencimiento, fecha_proximo_cobro, created_at)
        VALUES (${u[0].id}, ${NOMBRE_NEGOCIO}, ${emb[0].id}, 'al_corriente', true, false,
                (now() - interval '14 days')::date, now(), now(), now() - interval '28 days')
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);

    await reporte(n[0].id, 'PASO 1 · Creado (al_corriente)');
    console.log(`\nStripe: sub ${sub.id} (status=${sub.status}).`);
    console.log('👉 Abre "' + NOMBRE_NEGOCIO + '" en el Panel: verás "Próximo cobro" (un renglón).');
    console.log('   Cuando lo veas, dime y corro el paso "fallar".');
}

async function fallar() {
    const c = await ctx();
    if (!c.sub) { console.error('✗ Sin suscripción.'); process.exit(1); }
    console.log('Forzando fin del trial → Stripe cobra $449 con tarjeta que rebota…');
    await stripe.subscriptions.update(c.sub, { trial_end: 'now' });
    const ok = await esperarEstado(c.negocio_id, 'en_gracia');
    if (!ok) {
        console.error('✗ El webhook no movió a en_gracia. ¿`stripe listen` + backend :4000 corriendo?');
        process.exit(1);
    }
    await reporte(c.negocio_id, 'PASO 2 · Cobro falló → EN GRACIA');
    console.log('\n👉 Refresca el modal: ahora verás "Venció", "Reintento" y "Gracia hasta".');
    console.log('   Cuando lo veas, dime y corro "reintento".');
}

async function reintento() {
    const c = await ctx();
    if (!c.sub) { console.error('✗ Sin suscripción.'); process.exit(1); }
    const antes = (await db.execute(sql`SELECT fecha_proximo_cobro::text AS p, fecha_limite_gracia::text AS g FROM negocios WHERE id = ${c.negocio_id}`)).rows[0] as { p: string | null; g: string | null };

    const abiertas = await stripe.invoices.list({ subscription: c.sub, status: 'open', limit: 1 });
    const factura = abiertas.data[0];
    if (!factura?.id) { console.log('(sin factura abierta para reintentar; Stripe pudo agotar los reintentos)'); process.exit(0); }
    console.log(`Forzando reintento sobre ${factura.id} (volverá a rebotar)…`);
    try { await stripe.invoices.pay(factura.id); } catch { /* esperado */ }
    await dormir(8000); // dar tiempo al webhook

    const desp = (await db.execute(sql`SELECT fecha_proximo_cobro::text AS p, fecha_limite_gracia::text AS g FROM negocios WHERE id = ${c.negocio_id}`)).rows[0] as { p: string | null; g: string | null };
    await reporte(c.negocio_id, 'PASO 3 · Reintento');
    console.log(`\nPróximo cobro: ${antes.p} → ${desp.p}`);
    console.log(desp.g === antes.g ? '✅ Gracia NO se reinició (correcto).' : `⚠️ Gracia cambió: ${antes.g} → ${desp.g}`);
    console.log('👉 Refresca el modal y míralo. Dime si repetimos "reintento" o pasamos a "suspender".');
}

async function suspender() {
    const c = await ctx();
    console.log('Venciendo la gracia (fecha_limite_gracia = ayer) y corriendo el cron real…');
    await db.execute(sql`UPDATE negocios SET fecha_limite_gracia = now() - interval '1 day' WHERE id = ${c.negocio_id}`);
    const r = await suspenderGraciasVencidas();
    console.log(`Cron: ${r.suspendidos} suspendido(s), ${r.errores} error(es).`);
    await reporte(c.negocio_id, 'PASO 4 · Gracia vencida → SUSPENDIDO');
    console.log('\n👉 Refresca el modal: estado "Suspendido", sin fechas de cobro. Fin del ciclo.');
    console.log('   Para limpiar todo: corre el paso "limpiar".');
}

async function estado() {
    const c = await ctx();
    await reporte(c.negocio_id, 'Estado actual');
    if (c.sub) {
        const sub = await stripe.subscriptions.retrieve(c.sub);
        console.log(`Stripe: sub.status = ${sub.status}`);
    }
}

async function limpiar() {
    const c = await ctx();
    if (c.sub) { try { await stripe.subscriptions.cancel(c.sub); } catch { /* ya */ } }
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${c.usuario_id}`);
    console.log('🧹 Limpiado: suscripción cancelada en Stripe + negocio/dueño borrados de la BD.');
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }
    if (!PRICE) { console.error('✗ Falta STRIPE_PRICE_COMERCIAL.'); process.exit(1); }

    const paso = process.argv[2];
    switch (paso) {
        case 'crear': await crear(); break;
        case 'fallar': await fallar(); break;
        case 'reintento': await reintento(); break;
        case 'suspender': await suspender(); break;
        case 'estado': await estado(); break;
        case 'limpiar': await limpiar(); break;
        default:
            console.log('Pasos: crear | fallar | reintento | suspender | estado | limpiar');
    }
    process.exit(0);
}

main().catch((err) => { console.error('Error en probar-ciclo-morosidad:', err); process.exit(1); });
