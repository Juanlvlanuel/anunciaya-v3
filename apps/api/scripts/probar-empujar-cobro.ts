/**
 * probar-empujar-cobro.ts — HARNESS (Stripe TEST + DEV)
 * =====================================================
 * Verifica la helper `empujarCobroSuscripcion` (Pieza 2 · Opción A "Marcar pagado"):
 * difiere el próximo cobro N meses con trial_end ABSOLUTO + proration_behavior 'none'
 * + pause_collection '' (limpia pausa residual). Defensiva ({ok,aviso}, nunca lanza).
 *
 * Cubre los 4 puntos de verificación acordados:
 *   [1] Tras el empuje la sub queda `trialing` con trial_end = la fecha EXACTA enviada.
 *   [2] El pause_collection queda LIMPIO incluso si la sub venía pausada.
 *   [3] (requiere `stripe listen` + backend en :4000) El webhook customer.subscription.updated
 *       hace que manejarSuscripcionActualizada escriba fecha_vencimiento/fecha_proximo_cobro
 *       = trial_end → el Hallazgo 2 se DISUELVE (la fecha ya no se pisa con otra).
 *   [4] Una fecha > 2 años la RECHAZA Stripe y la helper la captura ({ok:false, aviso}).
 *
 * Aborta en producción. Crea y limpia sus propios recursos (customer/sub/negocio de prueba).
 * EJECUTAR (con `pnpm stripe:listen` en otra terminal para el punto 3):
 *   cd apps/api && pnpm exec tsx scripts/probar-empujar-cobro.ts
 *
 * Ubicación: apps/api/scripts/probar-empujar-cobro.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import { empujarCobroSuscripcion, pausarCobroSuscripcion } from '../src/services/suscripciones/acciones-stripe.js';

const CORREO = 'prueba.empujar@dev.local';
const PRICE = process.env.STRIPE_PRICE_COMERCIAL!;

const ok = (b: boolean) => (b ? '✓' : '✗');
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : '—');

/** Hoy + N meses (fin del día) — calcula la fecha que el caller mandará como `hasta`. */
function masMeses(meses: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + meses);
    d.setHours(23, 59, 59, 0);
    return d;
}

async function enStripe(subId: string) {
    const s = await stripe.subscriptions.retrieve(subId);
    const pause = (s as unknown as { pause_collection?: { behavior?: string } | null }).pause_collection;
    const trialEnd = (s as unknown as { trial_end?: number | null }).trial_end ?? null;
    return { status: s.status, pause: pause?.behavior ?? null, trialEnd };
}

async function bdFechas(negocioId: string) {
    return (await db.execute(sql`
        SELECT estado_membresia,
               fecha_vencimiento::text   AS fecha_vencimiento,
               fecha_proximo_cobro::text AS fecha_proximo_cobro
        FROM negocios WHERE id = ${negocioId}
    `)).rows[0] as { estado_membresia: string; fecha_vencimiento: string | null; fecha_proximo_cobro: string | null };
}

async function limpiarUsuario(correo: string) {
    const r = (await db.execute(sql`SELECT id::text, stripe_subscription_id FROM usuarios WHERE correo = ${correo}`))
        .rows as Array<{ id: string; stripe_subscription_id: string | null }>;
    if (r[0]) {
        if (r[0].stripe_subscription_id?.startsWith('sub_')) {
            try { await stripe.subscriptions.cancel(r[0].stripe_subscription_id); } catch { /* ya cancelada */ }
        }
        await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`);
    }
}

async function crearNegocio(correo: string, subId: string, customerId: string): Promise<string> {
    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
    const u = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                              estado, modo_activo, tiene_modo_comercial, stripe_customer_id, stripe_subscription_id)
        VALUES ('Prueba', 'Empujar', ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true, ${customerId}, ${subId})
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, metodo_cobro, onboarding_completado, es_borrador,
                              fecha_vencimiento, fecha_proximo_cobro)
        VALUES (${u[0].id}, 'Empujar', ${emb[0]?.id ?? null}, 'al_corriente', 'tarjeta', true, false,
                now() + interval '30 days', now() + interval '30 days')
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
    return n[0].id;
}

/** Espera (polling) a que el webhook escriba fecha_vencimiento ≈ objetivoUnix (segundos). */
async function esperarWebhook(negocioId: string, objetivoUnix: number, timeoutMs = 30000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        const f = await bdFechas(negocioId);
        const venc = f.fecha_vencimiento ? Math.floor(Date.parse(f.fecha_vencimiento) / 1000) : null;
        if (venc !== null && Math.abs(venc - objetivoUnix) <= 2) return { llego: true, fechas: f };
        await new Promise((r) => setTimeout(r, 2000));
    }
    return { llego: false, fechas: await bdFechas(negocioId) };
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }
    if (!PRICE) { console.error('✗ Falta STRIPE_PRICE_COMERCIAL.'); process.exit(1); }

    await limpiarUsuario(CORREO);

    console.log('\n════════ Verificación · empujarCobroSuscripcion (Opción A) ════════');

    // Sub ACTIVE real (tarjeta 4242, cobra de inmediato → status active, YA facturó):
    // así confirmamos que trial_end funciona sobre una sub que ya pagó (la duda del Hallazgo).
    const customer = await stripe.customers.create({ email: CORREO, name: 'Prueba Empujar' });
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: PRICE }], default_payment_method: pm.id });
    const negId = await crearNegocio(CORREO, sub.id, customer.id);
    console.log(`\nNegocio ${negId} · sub ${sub.id} (status inicial=${sub.status})`);

    let fallos = 0;

    // ── PUNTO 1: empujar a +6 meses → trialing con trial_end EXACTO ──────────────
    const hasta6 = masMeses(6);
    const esperado6 = Math.floor(hasta6.getTime() / 1000);
    const r1 = await empujarCobroSuscripcion(sub.id, hasta6.toISOString());
    const s1 = await enStripe(sub.id);
    const p1 = r1.ok && s1.status === 'trialing' && s1.trialEnd === esperado6;
    if (!p1) fallos++;
    console.log(`\n[1] Empuje a +6m (${hasta6.toISOString().slice(0, 10)})  ${ok(p1)}`);
    console.log(`    helper.ok=${r1.ok}  status=${s1.status} (esperado trialing)`);
    console.log(`    trial_end=${iso(s1.trialEnd)}  esperado=${iso(esperado6)}  coincide=${s1.trialEnd === esperado6}`);

    // ── PUNTO 2: pausar y luego empujar → pause_collection LIMPIO ────────────────
    await pausarCobroSuscripcion(sub.id);
    const sPausa = await enStripe(sub.id);
    const hasta6b = masMeses(6);
    const r2 = await empujarCobroSuscripcion(sub.id, hasta6b.toISOString());
    const s2 = await enStripe(sub.id);
    const p2 = sPausa.pause === 'void' && r2.ok && s2.pause === null;
    if (!p2) fallos++;
    console.log(`\n[2] Pausa→empuje limpia pause_collection  ${ok(p2)}`);
    console.log(`    pause tras pausar=${sPausa.pause} (esperado void)  →  pause tras empuje=${s2.pause} (esperado null)`);

    // ── PUNTO 3: webhook escribe fecha_vencimiento/proximo_cobro = trial_end ─────
    // Centinela: dejamos una fecha vieja inequívoca en BD; el webhook debe reemplazarla.
    await db.execute(sql`UPDATE negocios SET fecha_vencimiento='2020-01-01', fecha_proximo_cobro='2020-01-01' WHERE id=${negId}`);
    const hasta7 = masMeses(7);
    const esperado7 = Math.floor(hasta7.getTime() / 1000);
    const r3 = await empujarCobroSuscripcion(sub.id, hasta7.toISOString());
    console.log(`\n[3] Webhook reescribe fechas = trial_end  (requiere 'stripe listen' + backend :4000)`);
    console.log(`    empuje a +7m (${hasta7.toISOString().slice(0, 10)})  helper.ok=${r3.ok} · esperando webhook…`);
    const w = await esperarWebhook(negId, esperado7, 30000);
    const vencUnix = w.fechas.fecha_vencimiento ? Math.floor(Date.parse(w.fechas.fecha_vencimiento) / 1000) : null;
    const proxUnix = w.fechas.fecha_proximo_cobro ? Math.floor(Date.parse(w.fechas.fecha_proximo_cobro) / 1000) : null;
    const p3 = w.llego
        && vencUnix !== null && Math.abs(vencUnix - esperado7) <= 2
        && proxUnix !== null && Math.abs(proxUnix - esperado7) <= 2;
    if (!p3) fallos++;
    console.log(`    fecha_vencimiento=${w.fechas.fecha_vencimiento}  fecha_proximo_cobro=${w.fechas.fecha_proximo_cobro}`);
    console.log(`    esperado (trial_end)=${iso(esperado7)}  ${ok(p3)}${w.llego ? '' : '  (⚠️ no llegó el webhook: ¿stripe listen + backend activos?)'}`);

    // ── PUNTO 4: fecha > 2 años → Stripe rechaza, helper la captura ──────────────
    const hasta3y = masMeses(36);
    const r4 = await empujarCobroSuscripcion(sub.id, hasta3y.toISOString());
    const p4 = r4.ok === false && !!r4.aviso;
    if (!p4) fallos++;
    console.log(`\n[4] Fecha > 2 años rechazada por Stripe  ${ok(p4)}`);
    console.log(`    helper.ok=${r4.ok} (esperado false)  aviso="${r4.aviso ?? ''}"`);

    // ── Limpieza ────────────────────────────────────────────────────────────────
    await limpiarUsuario(CORREO);
    console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
    console.log('════════════════════════════════════════════════════════════════\n');
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-empujar-cobro:', err); process.exit(1); });
