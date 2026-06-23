/**
 * probar-marcar-pagado.ts — HARNESS (Stripe TEST + DEV)
 * =====================================================
 * Verifica el service marcarPagado (Pieza 3 · Opción A) en 3 escenarios con datos reales:
 *   [A] AL CORRIENTE con suscripción → empuja trial_end, metodo_cobro='tarjeta',
 *       escribe fechas=hasta y REGISTRA el pago (efectivo $449, 6 meses).
 *   [B] EN GRACIA con suscripción → guard v1: devuelve 409 y NO toca BD ni registra.
 *   [C] SIN suscripción → solo BD (metodo_cobro='manual'), registra cortesía SIN monto,
 *       no toca Stripe (advertenciaStripe = null).
 *
 * Aborta en producción. Crea y limpia sus propios recursos. NO requiere webhook
 * (las fechas vía webhook ya se validaron en probar-empujar-cobro.ts).
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-marcar-pagado.ts
 *
 * Ubicación: apps/api/scripts/probar-marcar-pagado.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import { marcarPagado } from '../src/services/admin/negocios-acciones.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { obtenerConfigTexto } from '../src/services/configuracion.service.js';

const CORREO_A = 'prueba.mp.alcorriente@dev.local';
const CORREO_B = 'prueba.mp.gracia@dev.local';
const CORREO_C = 'prueba.mp.sinsub@dev.local';
// El Price ACTIVO vive en config (precio editable desde el Panel); el del env quedó archivado.
async function obtenerPriceMensual(): Promise<string> {
    return obtenerConfigTexto('stripe_price_comercial_id', process.env.STRIPE_PRICE_COMERCIAL || '');
}

const ok = (b: boolean) => (b ? '✓' : '✗');

async function bd(negocioId: string) {
    return (await db.execute(sql`
        SELECT estado_membresia, estado_admin, activo, metodo_cobro,
               fecha_vencimiento::text AS fecha_vencimiento,
               EXTRACT(EPOCH FROM fecha_vencimiento)::bigint AS venc_epoch
        FROM negocios WHERE id = ${negocioId}
    `)).rows[0] as Record<string, unknown>;
}

async function pagos(negocioId: string) {
    return (await db.execute(sql`
        SELECT concepto, monto::text AS monto, meses_cubiertos,
               periodo_hasta::text AS periodo_hasta,
               EXTRACT(EPOCH FROM periodo_hasta)::bigint AS periodo_epoch,
               registrado_por::text AS registrado_por
        FROM pagos_membresia WHERE negocio_id = ${negocioId} ORDER BY created_at DESC
    `)).rows as Array<Record<string, unknown>>;
}

async function enStripe(subId: string) {
    try {
        const s = await stripe.subscriptions.retrieve(subId);
        return { status: s.status, trialEnd: (s as unknown as { trial_end?: number | null }).trial_end ?? null };
    } catch { return { status: 'NO_EXISTE', trialEnd: null as number | null }; }
}

async function limpiar(correo: string) {
    const r = (await db.execute(sql`SELECT id::text, stripe_subscription_id FROM usuarios WHERE correo = ${correo}`))
        .rows as Array<{ id: string; stripe_subscription_id: string | null }>;
    if (r[0]) {
        if (r[0].stripe_subscription_id?.startsWith('sub_') && !r[0].stripe_subscription_id.includes('placeholder')) {
            try { await stripe.subscriptions.cancel(r[0].stripe_subscription_id); } catch { /* ya cancelada */ }
        }
        await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`);
    }
}

async function crearNegocio(correo: string, estadoMembresia: string, subId: string | null, customerId: string | null): Promise<string> {
    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
    const u = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                              estado, modo_activo, tiene_modo_comercial, stripe_customer_id, stripe_subscription_id)
        VALUES ('Prueba', 'MP', ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true, ${customerId}, ${subId})
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, metodo_cobro, onboarding_completado, es_borrador,
                              fecha_vencimiento, fecha_proximo_cobro)
        VALUES (${u[0].id}, 'MP', ${emb[0]?.id ?? null}, ${estadoMembresia}, 'tarjeta', true, false,
                now() + interval '30 days', now() + interval '30 days')
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
    return n[0].id;
}

async function crearSubReal(correo: string, nombre: string) {
    const customer = await stripe.customers.create({ email: correo, name: nombre });
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    // trial_period_days: la sub NO cobra al crearse → no genera un invoice pagado que un `stripe listen`
    // activo registraría como pago extra (false negative del conteo). marcarPagado igual empuja el trial_end.
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: await obtenerPriceMensual() }], default_payment_method: pm.id, trial_period_days: 14 });
    return { subId: sub.id, customerId: customer.id };
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }
    // (El Price se lee de config con fallback al env; ver obtenerPriceMensual.)

    await limpiar(CORREO_A); await limpiar(CORREO_B); await limpiar(CORREO_C);

    // Panel superadmin real (actor de la auditoría / registrado_por).
    const sa = (await db.execute(sql`SELECT id::text FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    const panel = { usuarioId: sa[0]?.id ?? null, rolEquipo: 'superadmin', regionId: null } as unknown as UsuarioPanel;

    const hasta = new Date(); hasta.setMonth(hasta.getMonth() + 6); hasta.setHours(23, 59, 59, 0);
    const hastaISO = hasta.toISOString();
    const esperadoUnix = Math.floor(hasta.getTime() / 1000);

    let fallos = 0;
    console.log('\n════════ Verificación · marcarPagado (Pieza 3) ════════');

    // ── [A] AL CORRIENTE con suscripción → empuja + registra ──────────────────────
    const realA = await crearSubReal(CORREO_A, 'Al Corriente');
    const negA = await crearNegocio(CORREO_A, 'al_corriente', realA.subId, realA.customerId);
    const rA = await marcarPagado(panel, negA, { hasta: hastaISO, concepto: 'efectivo', monto: 449, meses: 6 });
    const bdA = await bd(negA);
    const pagA = await pagos(negA);
    const stA = await enStripe(realA.subId);
    // Lo que marcarPagado ESCRIBIÓ se verifica con periodo_hasta del registro (mismo valor que
    // fecha_vencimiento, escrito en la MISMA transacción) porque ese campo NUNCA lo toca el
    // webhook. negocios.fecha_vencimiento es VOLÁTIL: lo gobierna subscription.updated y converge
    // a trial_end (probado en probar-empujar-cobro.ts). Si hay 'stripe listen' activo, un webhook
    // de la sub recién creada puede pisarlo transitoriamente en este harness → por eso NO se aserta.
    const periodoUnixA = pagA[0]?.periodo_epoch != null ? Number(pagA[0].periodo_epoch) : null;
    const vencUnixA = bdA.venc_epoch != null ? Number(bdA.venc_epoch) : null;
    const pA = rA.ok
        && bdA.estado_membresia === 'al_corriente' && bdA.estado_admin === 'activo' && bdA.activo === true
        && bdA.metodo_cobro === 'tarjeta'
        && periodoUnixA === esperadoUnix
        && stA.status === 'trialing' && stA.trialEnd === esperadoUnix
        && pagA.length === 1 && pagA[0].concepto === 'efectivo' && pagA[0].monto === '449.00' && pagA[0].meses_cubiertos === 6;
    if (!pA) fallos++;
    console.log(`\n[A] Al corriente + sub → empuja y registra  ${ok(pA)}`);
    console.log(`    service.ok=${rA.ok}  metodo_cobro=${bdA.metodo_cobro} (tarjeta)  periodo_hasta≈trial_end=${periodoUnixA === esperadoUnix}`);
    console.log(`    Stripe: status=${stA.status} (trialing)  trial_end=${stA.trialEnd} (esperado ${esperadoUnix})`);
    console.log(`    [info] fecha_vencimiento(BD)=${vencUnixA} — volátil; el webhook lo converge a trial_end=${esperadoUnix}`);
    console.log(`    pagos_membresia (${pagA.length}):`, pagA[0]);

    // ── [B] EN GRACIA con suscripción → guard 409 (no toca nada) ───────────────────
    const negB = await crearNegocio(CORREO_B, 'en_gracia', 'sub_placeholder_guard_409', 'cus_placeholder');
    const rB = await marcarPagado(panel, negB, { hasta: hastaISO, concepto: 'efectivo', monto: 449 });
    const bdB = await bd(negB);
    const pagB = await pagos(negB);
    const pB = rB.ok === false && (rB as { status?: number }).status === 409
        && bdB.estado_membresia === 'en_gracia'   // NO cambió
        && pagB.length === 0;                       // NO registró
    if (!pB) fallos++;
    console.log(`\n[B] En gracia + sub → guard 409 (no toca nada)  ${ok(pB)}`);
    console.log(`    service:`, rB);
    console.log(`    BD sigue en_gracia=${bdB.estado_membresia === 'en_gracia'}  pagos=${pagB.length} (esperado 0)`);

    // ── [C] SIN suscripción → solo BD, cortesía sin monto ─────────────────────────
    const negC = await crearNegocio(CORREO_C, 'al_corriente', null, null);
    const rC = await marcarPagado(panel, negC, { hasta: hastaISO, concepto: 'cortesia' });
    const bdC = await bd(negC);
    const pagC = await pagos(negC);
    const pC = rC.ok
        && bdC.metodo_cobro === 'manual'
        && bdC.estado_membresia === 'al_corriente'
        && pagC.length === 1 && pagC[0].concepto === 'cortesia' && pagC[0].monto === null
        && (rC as { advertenciaStripe?: string | null }).advertenciaStripe == null;
    if (!pC) fallos++;
    console.log(`\n[C] Sin sub → solo BD, cortesía sin monto  ${ok(pC)}`);
    console.log(`    service.ok=${rC.ok}  metodo_cobro=${bdC.metodo_cobro} (esperado manual)  advertenciaStripe=${(rC as { advertenciaStripe?: string | null }).advertenciaStripe ?? 'null'}`);
    console.log(`    pagos_membresia (${pagC.length}):`, pagC[0]);

    // ── Limpieza ──────────────────────────────────────────────────────────────────
    await limpiar(CORREO_A); await limpiar(CORREO_B); await limpiar(CORREO_C);
    console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
    console.log('════════════════════════════════════════════════════════════════\n');
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-marcar-pagado:', err); process.exit(1); });
