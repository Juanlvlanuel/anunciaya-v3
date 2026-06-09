/**
 * probar-acciones-parada2.ts — HARNESS (Stripe TEST + DEV)
 * ========================================================
 * Ejercita las 4 acciones del Panel "Parada 2" contra una suscripción de Stripe
 * REAL, llamando a los services reales y verificando el efecto en Stripe + BD:
 *   1. marcarPagado (Opción A: empuja trial_end N meses; concepto efectivo/cortesía)
 *   2. suspenderNegocio  → pause_collection 'void' + activo=false
 *   3. reactivarNegocio  → pause_collection vacío + activo=true
 *   4. cancelarNegocio   → subscription.cancel + dueño a personal + subId limpiado
 * Y la defensa §4.3: con un stripeSubscriptionId BASURA, la acción aplica en BD igual
 * y devuelve advertenciaStripe != null (no aborta).
 *
 * NOTA: prueba la capa SERVICE + helpers de Stripe (el corazón). La capa HTTP
 * (controller/toast del Hallazgo 1) se valida mejor desde el Panel.
 *
 * Aborta en producción. Idempotente. Limpia al final.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-acciones-parada2.ts
 *
 * Ubicación: apps/api/scripts/probar-acciones-parada2.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import {
    suspenderNegocio, reactivarNegocio, marcarPagado, cancelarNegocio,
} from '../src/services/admin/negocios-acciones.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const CORREO_A = 'prueba.acciones@dev.local';   // negocio con suscripción real
const CORREO_B = 'prueba.striperoto@dev.local'; // negocio con subId basura (§4.3)
const PRICE = process.env.STRIPE_PRICE_COMERCIAL!;

async function bd(negocioId: string) {
    return (await db.execute(sql`
        SELECT estado_membresia, estado_admin, activo, metodo_cobro,
               (SELECT stripe_subscription_id FROM usuarios u WHERE u.id = n.usuario_id) AS sub
        FROM negocios n WHERE n.id = ${negocioId}
    `)).rows[0] as Record<string, unknown>;
}

async function enStripe(subId: string) {
    try {
        const s = await stripe.subscriptions.retrieve(subId);
        const pause = (s as unknown as { pause_collection?: { behavior?: string } | null }).pause_collection;
        return { status: s.status, pause: pause?.behavior ?? null };
    } catch (e) { return { status: 'ERROR', pause: (e as Error).message }; }
}

async function limpiarUsuario(correo: string) {
    const r = (await db.execute(sql`SELECT id::text, stripe_subscription_id FROM usuarios WHERE correo = ${correo}`))
        .rows as Array<{ id: string; stripe_subscription_id: string | null }>;
    if (r[0]) {
        if (r[0].stripe_subscription_id?.startsWith('sub_') && !r[0].stripe_subscription_id.includes('basura')) {
            try { await stripe.subscriptions.cancel(r[0].stripe_subscription_id); } catch { /* ya */ }
        }
        await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`);
    }
}

async function crearNegocio(correo: string, nombre: string, subId: string, customerId: string | null) {
    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
    const u = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                              estado, modo_activo, tiene_modo_comercial, stripe_customer_id, stripe_subscription_id)
        VALUES ('Prueba', ${nombre}, ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true,
                ${customerId}, ${subId})
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, onboarding_completado, es_borrador,
                             fecha_vencimiento, fecha_proximo_cobro)
        VALUES (${u[0].id}, ${nombre}, ${emb[0].id}, 'al_corriente', true, false, now() + interval '30 days', now() + interval '30 days')
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
    return n[0].id;
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }
    if (!PRICE) { console.error('✗ Falta STRIPE_PRICE_COMERCIAL.'); process.exit(1); }

    await limpiarUsuario(CORREO_A);
    await limpiarUsuario(CORREO_B);

    // Panel superadmin (actor real para la auditoría).
    const sa = (await db.execute(sql`SELECT id::text FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    const actorId = sa[0]?.id
        ?? (await db.execute(sql`SELECT id::text FROM usuarios WHERE correo = 'vendedor.prueba@dev.local'`)).rows[0] as unknown as { id: string };
    const panel = { usuarioId: typeof actorId === 'string' ? actorId : actorId.id, rolEquipo: 'superadmin', regionId: null } as unknown as UsuarioPanel;

    console.log('\n════════ HARNESS · Acciones Parada 2 contra Stripe REAL ════════');

    // ── NEGOCIO A: suscripción real ACTIVA (tarjeta 4242, cobra de inmediato) ──
    const customer = await stripe.customers.create({ email: CORREO_A, name: 'Prueba Acciones' });
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: PRICE }], default_payment_method: pm.id });
    const negA = await crearNegocio(CORREO_A, 'Acciones', sub.id, customer.id);
    console.log(`\nNegocio A: ${negA} · sub ${sub.id} (status=${sub.status})`);

    // 1) marcar pagado — efectivo con monto (Opción A: empuja trial_end, retoma solo)
    let r = await marcarPagado(panel, negA, { hasta: new Date(Date.now() + 90 * 86400000).toISOString(), concepto: 'efectivo', monto: 449, meses: 3 });
    console.log('\n1a) marcarPagado efectivo $449 (3m) →', r.ok ? 'ok' : r);
    console.log('    Stripe:', await enStripe(sub.id), '· BD:', await bd(negA), '· aviso:', (r as { advertenciaStripe?: string }).advertenciaStripe ?? null);

    // 1b) marcar pagado — cortesía sin monto (también empuja el cobro; sigue retomando)
    r = await marcarPagado(panel, negA, { hasta: new Date(Date.now() + 90 * 86400000).toISOString(), concepto: 'cortesia' });
    console.log('1b) marcarPagado cortesía →', r.ok ? 'ok' : r);
    console.log('    Stripe:', await enStripe(sub.id), '· BD:', await bd(negA));

    // 2) suspender (pausa cobro en Stripe + activo=false)
    r = await suspenderNegocio(panel, negA, 'Prueba suspender');
    console.log('\n2) suspenderNegocio →', r.ok ? 'ok' : r);
    console.log('    Stripe:', await enStripe(sub.id), '· BD:', await bd(negA));

    // 3) reactivar (reanuda cobro + activo=true)
    r = await reactivarNegocio(panel, negA, 'Prueba reactivar');
    console.log('\n3) reactivarNegocio →', r.ok ? 'ok' : r);
    console.log('    Stripe:', await enStripe(sub.id), '· BD:', await bd(negA));

    // 4) cancelar (corta Stripe + degrada dueño + archiva + limpia subId)
    r = await cancelarNegocio(panel, negA, 'Prueba cancelar');
    console.log('\n4) cancelarNegocio →', r.ok ? 'ok' : r);
    console.log('    Stripe:', await enStripe(sub.id), '· BD:', await bd(negA));
    const duenoA = (await db.execute(sql`SELECT tiene_modo_comercial, modo_activo, stripe_subscription_id FROM usuarios WHERE correo = ${CORREO_A}`)).rows[0];
    console.log('    Dueño:', duenoA);

    // ── NEGOCIO B: §4.3 con stripeSubscriptionId BASURA ──
    const negB = await crearNegocio(CORREO_B, 'StripeRoto', 'sub_basura_inexistente_999', null);
    console.log(`\nNegocio B (§4.3): ${negB} · sub basura`);
    const rB = await suspenderNegocio(panel, negB, 'Prueba §4.3 fallo Stripe');
    console.log('5) suspenderNegocio con sub basura →', rB.ok ? 'ok' : rB);
    console.log('    BD:', await bd(negB));
    console.log('    advertenciaStripe:', (rB as { advertenciaStripe?: string }).advertenciaStripe ?? '(ninguna ⚠️ se esperaba una)');

    // ── Limpieza ──
    await limpiarUsuario(CORREO_A);
    await limpiarUsuario(CORREO_B);
    console.log('\n🧹 Limpieza hecha (negocios + subs de prueba borrados).');
    console.log('════════════════════════════════════════════════════════════════\n');
    process.exit(0);
}

main().catch((err) => { console.error('Error en probar-acciones-parada2:', err); process.exit(1); });
