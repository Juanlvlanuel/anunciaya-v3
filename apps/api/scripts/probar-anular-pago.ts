/**
 * probar-anular-pago.ts — HARNESS (Stripe TEST + DEV)
 * ===================================================
 * Verifica `anularPagoMembresia` en un negocio CON tarjeta (Stripe) y deja VER, paso a paso,
 * cómo la fecha de cobro de Stripe (`trial_end`) se TRASLADA al registrar un pago manual
 * adelantado y REGRESA al anularlo. Usa datos reales y una suscripción real en Stripe TEST.
 *
 * Escenario (un negocio, dos pagos):
 *   PASO 0 · Estado inicial (sub recién creada, sin adelanto)        → trial_end vacío
 *   PASO 1 · Registrar pago manual a 3 meses                          → trial_end = +3m  (se traslada)
 *   PASO 2 · Registrar pago manual a 6 meses                          → trial_end = +6m  (se traslada)
 *   PASO 3 · ANULAR el pago de 6 meses                                → trial_end = +3m  (REGRESA)
 *   PASO 4 · ANULAR también el de 3 meses (ya no queda pago vigente)  → trial_end = fecha original (REGRESA)
 *
 * Aborta en producción. Crea y limpia sus propios recursos. NO requiere webhook (el trial_end
 * se lee directo de Stripe; la convergencia vía webhook ya se validó en probar-empujar-cobro.ts).
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-anular-pago.ts
 *
 * Ubicación: apps/api/scripts/probar-anular-pago.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import { marcarPagado, anularPagoMembresia } from '../src/services/admin/negocios-acciones.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { obtenerConfigTexto } from '../src/services/configuracion.service.js';

const CORREO = 'prueba.anular.tarjeta@dev.local';
// El Price ACTIVO vive en config (precio editable desde el Panel); el del env quedó archivado.
async function obtenerPriceMensual(): Promise<string> {
    return obtenerConfigTexto('stripe_price_comercial_id', process.env.STRIPE_PRICE_COMERCIAL || '');
}

const ok = (b: boolean) => (b ? '✓' : '✗');
/** Unix (segundos) → fecha legible es-MX, o '—' si no hay. */
const fmt = (unix: number | null) => (unix == null ? '—' : new Date(unix * 1000).toISOString().replace('T', ' ').slice(0, 16));

async function bd(negocioId: string) {
    return (await db.execute(sql`
        SELECT estado_membresia, metodo_cobro,
               fecha_proximo_cobro::text AS fecha_proximo_cobro,
               EXTRACT(EPOCH FROM fecha_proximo_cobro)::bigint AS cobro_epoch
        FROM negocios WHERE id = ${negocioId}
    `)).rows[0] as { estado_membresia: string; metodo_cobro: string; fecha_proximo_cobro: string; cobro_epoch: string };
}

/** Pagos del negocio, más recientes primero (incluye anulados, para ver el borrado lógico). */
async function pagos(negocioId: string) {
    return (await db.execute(sql`
        SELECT id::text, concepto, monto::text AS monto, meses_cubiertos, anulado,
               periodo_hasta::text AS periodo_hasta,
               EXTRACT(EPOCH FROM periodo_hasta)::bigint AS periodo_epoch,
               EXTRACT(EPOCH FROM cobro_previo)::bigint AS cobro_previo_epoch
        FROM pagos_membresia WHERE negocio_id = ${negocioId}
        ORDER BY fecha_pago DESC, created_at DESC
    `)).rows as Array<{ id: string; concepto: string; monto: string | null; meses_cubiertos: number | null; anulado: boolean; periodo_hasta: string; periodo_epoch: string; cobro_previo_epoch: string | null }>;
}

async function enStripe(subId: string) {
    try {
        const s = await stripe.subscriptions.retrieve(subId);
        const raw = s as unknown as { trial_end?: number | null; current_period_end?: number | null };
        return { status: s.status, trialEnd: raw.trial_end ?? null, periodEnd: raw.current_period_end ?? null };
    } catch { return { status: 'NO_EXISTE', trialEnd: null as number | null, periodEnd: null as number | null }; }
}

/** Imprime el estado de un paso: BD + Stripe con fechas legibles. */
async function mostrar(titulo: string, negocioId: string, subId: string) {
    const b = await bd(negocioId);
    const s = await enStripe(subId);
    console.log(`\n${titulo}`);
    console.log(`   BD     proximo_cobro = ${b.fecha_proximo_cobro?.slice(0, 16)}   (estado=${b.estado_membresia}, metodo=${b.metodo_cobro})`);
    console.log(`   Stripe status=${s.status}   trial_end=${fmt(s.trialEnd)}   period_end=${fmt(s.periodEnd)}`);
    return { b, s };
}

async function limpiar() {
    const r = (await db.execute(sql`SELECT id::text, stripe_subscription_id FROM usuarios WHERE correo = ${CORREO}`))
        .rows as Array<{ id: string; stripe_subscription_id: string | null }>;
    if (r[0]) {
        if (r[0].stripe_subscription_id?.startsWith('sub_') && !r[0].stripe_subscription_id.includes('placeholder')) {
            try { await stripe.subscriptions.cancel(r[0].stripe_subscription_id); } catch { /* ya cancelada */ }
        }
        await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`);
    }
}

async function crearSubReal() {
    const customer = await stripe.customers.create({ email: CORREO, name: 'Prueba Anular' });
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    // trial_period_days: la sub NO cobra al crearse → no genera un invoice pagado que un `stripe listen`
    // activo registraría (el escenario mide el trial_end, no el cobro). Los pagos manuales igual lo trasladan.
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: await obtenerPriceMensual() }], default_payment_method: pm.id, trial_period_days: 14 });
    return { subId: sub.id, customerId: customer.id };
}

async function crearNegocio(subId: string, customerId: string): Promise<string> {
    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
    const u = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                              estado, modo_activo, tiene_modo_comercial, stripe_customer_id, stripe_subscription_id)
        VALUES ('Prueba', 'Anular', ${CORREO}, 'comercial', 1, true, now(), 'activo', 'comercial', true, ${customerId}, ${subId})
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, metodo_cobro, onboarding_completado, es_borrador,
                              fecha_vencimiento, fecha_proximo_cobro)
        VALUES (${u[0].id}, 'Negocio Anular', ${emb[0]?.id ?? null}, 'al_corriente', 'tarjeta', true, false,
                now() + interval '30 days', now() + interval '30 days')
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
    return n[0].id;
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }
    // (El Price se lee de config con fallback al env; ver obtenerPriceMensual.)

    await limpiar();

    const sa = (await db.execute(sql`SELECT id::text FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    const panel = { usuarioId: sa[0]?.id ?? null, rolEquipo: 'superadmin', regionId: null } as unknown as UsuarioPanel;

    // Fechas relativas: +3 y +6 meses (23:59 como en el modal real).
    const en = (meses: number) => { const d = new Date(); d.setMonth(d.getMonth() + meses); d.setHours(23, 59, 59, 0); return d; };
    const hasta3 = en(3); const unix3 = Math.floor(hasta3.getTime() / 1000);
    const hasta6 = en(6); const unix6 = Math.floor(hasta6.getTime() / 1000);

    let fallos = 0;
    console.log('\n════════ Verificación · anularPagoMembresia (negocio con tarjeta) ════════');
    console.log(`   Objetivo: ver el trial_end de Stripe TRASLADARSE al registrar y REGRESAR al anular.`);

    const { subId, customerId } = await crearSubReal();
    const negId = await crearNegocio(subId, customerId);

    // ── PASO 0 · estado inicial ────────────────────────────────────────────────────
    await mostrar('PASO 0 · Estado inicial (sub recién creada, sin adelanto)', negId, subId);

    // ── PASO 1 · pago a 3 meses → empuja a +3m ──────────────────────────────────────
    await marcarPagado(panel, negId, { hasta: hasta3.toISOString(), concepto: 'efectivo', monto: 449, meses: 3 });
    const e1 = await mostrar('PASO 1 · Registrar pago manual a 3 meses  → trial_end DEBE trasladarse a +3m', negId, subId);
    const p1 = e1.s.trialEnd === unix3 && Number(e1.b.cobro_epoch) === unix3;
    if (!p1) fallos++;
    console.log(`   ${ok(p1)} trial_end y proximo_cobro = +3m (${fmt(unix3)})`);

    // ── PASO 2 · pago a 6 meses → empuja a +6m ──────────────────────────────────────
    await marcarPagado(panel, negId, { hasta: hasta6.toISOString(), concepto: 'efectivo', monto: 449, meses: 6 });
    const e2 = await mostrar('PASO 2 · Registrar pago manual a 6 meses  → trial_end DEBE trasladarse a +6m', negId, subId);
    const p2 = e2.s.trialEnd === unix6 && Number(e2.b.cobro_epoch) === unix6;
    if (!p2) fallos++;
    console.log(`   ${ok(p2)} trial_end y proximo_cobro = +6m (${fmt(unix6)})`);

    // ── PASO 3 · ANULAR el de 6 meses → trial_end REGRESA a +3m ─────────────────────
    const ps = await pagos(negId);                       // [0] = el de 6m (más reciente)
    const pago6 = ps.find((p) => p.meses_cubiertos === 6)!;
    const r3 = await anularPagoMembresia(panel, negId, pago6.id, 'Prueba: anular el de 6 meses');
    const e3 = await mostrar('PASO 3 · ANULAR el pago de 6 meses  → trial_end DEBE REGRESAR a +3m', negId, subId);
    const p3 = r3.ok && (r3 as { advertenciaStripe: string | null }).advertenciaStripe == null
        && e3.s.trialEnd === unix3 && Number(e3.b.cobro_epoch) === unix3;
    if (!p3) fallos++;
    console.log(`   ${ok(p3)} REGRESÓ a +3m (${fmt(unix3)})   advertenciaStripe=${r3.ok ? ((r3 as { advertenciaStripe: string | null }).advertenciaStripe ?? 'null') : 'N/A'}`);

    // ── PASO 4 · ANULAR el de 3 meses → ya no queda pago → DEVUELVE el cobro a la fecha ORIGINAL ──
    const ps2 = await pagos(negId);
    const pago3 = ps2.find((p) => p.meses_cubiertos === 3 && !p.anulado)!;
    // La fecha original = cobro_previo del primer pago manual (el de 3m): lo que había antes de él.
    const origenUnix = pago3.cobro_previo_epoch != null ? Number(pago3.cobro_previo_epoch) : null;
    const r4 = await anularPagoMembresia(panel, negId, pago3.id, 'Prueba: anular el de 3 meses (ya no queda pago)');
    const e4 = await mostrar('PASO 4 · ANULAR el pago de 3 meses (ya no queda vigente)  → cobro REGRESA a la fecha original', negId, subId);
    const p4 = r4.ok && (r4 as { advertenciaStripe: string | null }).advertenciaStripe == null
        && origenUnix != null
        && e4.s.trialEnd === origenUnix && Number(e4.b.cobro_epoch) === origenUnix;
    if (!p4) fallos++;
    console.log(`   ${ok(p4)} REGRESÓ a la fecha original (${fmt(origenUnix)})   advertenciaStripe=${r4.ok ? ((r4 as { advertenciaStripe: string | null }).advertenciaStripe ?? 'null') : 'N/A'}`);

    // ── Limpieza ────────────────────────────────────────────────────────────────────
    await limpiar();
    console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
    console.log('════════════════════════════════════════════════════════════════════════\n');
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-anular-pago:', err); process.exit(1); });
