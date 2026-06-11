/**
 * probar-bitacora-eventos.ts — HARNESS (DEV, sin Stripe)
 * ======================================================
 * Verifica la BITÁCORA FINANCIERA (módulo Suscripciones del Panel) de punta a punta con
 * datos reales, SIN necesitar `stripe listen` (usa marcarPagado sin suscripción + el helper
 * registrarEventoPago directo, que es lo mismo que invocan los handlers del webhook).
 *
 * PERSISTENCIA
 *   [A] pago_manual end-to-end: marcarPagado (efectivo) escribe la fila GEMELA en eventos_pago
 *       en la MISMA transacción, con referencia_id → pagos_membresia, actor y monto correctos.
 *   [B] pago_manual cortesía: la fila gemela queda con monto NULL.
 *   [C] eventos de Stripe vía helper: cobro_exitoso / cobro_fallido / cancelacion caen con su
 *       tipo, origen='stripe' y monto (o NULL) correctos.
 *   [D] idempotencia: reenviar el MISMO stripe_event_id NO duplica fila (onConflictDoNothing).
 *   [E] CHECK de tipo: un tipo inválido es rechazado por la BD.
 *   [F] defensividad: registrarEventoPago con un negocio inexistente (viola FK) NO lanza y no inserta.
 *
 * LECTURA (alcance por rol)
 *   [G] superadmin: listarEventos(negocioId) ve los 4 eventos, conteos por tipo y KPIs (ingresos/fallidos) correctos.
 *   [H] detalle: obtenerDetalleEvento devuelve el evento con sus campos.
 *   [I] filtro: tipo='cobro_fallido' deja solo 1.
 *   [J] gerente: NO ve los eventos de un negocio fuera de su región (el negocio de prueba no tiene matriz con ciudad).
 *
 * Aborta en producción. Crea y limpia sus propios recursos (el cascade de negocio_id borra los eventos).
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-bitacora-eventos.ts
 *
 * Ubicación: apps/api/scripts/probar-bitacora-eventos.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { marcarPagado } from '../src/services/admin/negocios-acciones.service.js';
import { registrarEventoPago } from '../src/services/suscripciones/eventos-pago.js';
import { listarEventos, obtenerDetalleEvento } from '../src/services/admin/suscripciones.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const CORREO_A = 'prueba.bitacora.a@dev.local';
const CORREO_B = 'prueba.bitacora.b@dev.local';

const ok = (b: boolean) => (b ? '✓' : '✗');

type Fila = Record<string, unknown>;

async function eventos(negocioId: string): Promise<Fila[]> {
    return (await db.execute(sql`
        SELECT id::text, tipo, origen, monto::text AS monto, moneda,
               actor_id::text AS actor_id, stripe_event_id,
               referencia_id::text AS referencia_id, negocio_id::text AS negocio_id, metadata
        FROM eventos_pago WHERE negocio_id = ${negocioId} ORDER BY created_at ASC
    `)).rows as Fila[];
}

async function contarPorStripeEvent(stripeEventId: string): Promise<number> {
    const r = (await db.execute(sql`SELECT count(*)::int AS n FROM eventos_pago WHERE stripe_event_id = ${stripeEventId}`)).rows as Array<{ n: number }>;
    return r[0]?.n ?? 0;
}

async function idPagoMembresia(negocioId: string): Promise<string | null> {
    const r = (await db.execute(sql`SELECT id::text FROM pagos_membresia WHERE negocio_id = ${negocioId} ORDER BY created_at DESC LIMIT 1`)).rows as Array<{ id: string }>;
    return r[0]?.id ?? null;
}

async function limpiar(correo: string) {
    const r = (await db.execute(sql`SELECT id::text FROM usuarios WHERE correo = ${correo}`)).rows as Array<{ id: string }>;
    if (r[0]) await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`); // cascade: negocio → eventos_pago
}

async function crearNegocioSinSub(correo: string): Promise<string> {
    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
    const u = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                              estado, modo_activo, tiene_modo_comercial)
        VALUES ('Prueba', 'Bitacora', ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true)
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, metodo_cobro, onboarding_completado, es_borrador,
                              fecha_vencimiento, fecha_proximo_cobro)
        VALUES (${u[0].id}, 'Negocio Bitácora', ${emb[0]?.id ?? null}, 'al_corriente', 'manual', true, false,
                now() + interval '30 days', now() + interval '30 days')
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
    return n[0].id;
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

    await limpiar(CORREO_A);
    await limpiar(CORREO_B);

    // Panel superadmin real (actor de la auditoría / registrado_por / actor del evento).
    const sa = (await db.execute(sql`SELECT id::text FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    if (!sa[0]) { console.error('✗ No hay superadmin en la BD dev.'); process.exit(1); }
    const panelSuper = { usuarioId: sa[0].id, rolEquipo: 'superadmin', regionId: null } as unknown as UsuarioPanel;

    const hasta = new Date(); hasta.setMonth(hasta.getMonth() + 6); hasta.setHours(23, 59, 59, 0);
    const hastaISO = hasta.toISOString();
    const marca = Date.now();
    const evtCobro = `evt_test_cobro_${marca}`;
    const evtFallo = `evt_test_fallo_${marca}`;
    const evtCancel = `evt_test_cancel_${marca}`;
    const evtBad = `evt_test_bad_${marca}`;

    let fallos = 0;
    const reg = (b: boolean) => { if (!b) fallos++; };
    console.log('\n════════ Verificación · Bitácora financiera (módulo Suscripciones) ════════');

    // ── [A] pago_manual end-to-end (marcarPagado, sin Stripe) ─────────────────────
    const negA = await crearNegocioSinSub(CORREO_A);
    const rA = await marcarPagado(panelSuper, negA, { hasta: hastaISO, concepto: 'efectivo', monto: 449, meses: 6 });
    const pagoIdA = await idPagoMembresia(negA);
    let evA = await eventos(negA);
    const manualA = evA.find((e) => e.tipo === 'pago_manual');
    const pA = rA.ok
        && evA.length === 1
        && !!manualA
        && manualA!.origen === 'manual'
        && manualA!.monto === '449.00'
        && manualA!.actor_id === sa[0].id
        && manualA!.referencia_id === pagoIdA   // gemelo en la MISMA transacción
        && manualA!.stripe_event_id === null;
    reg(pA);
    console.log(`\n[A] pago_manual (marcarPagado, misma tx)            ${ok(pA)}`);
    console.log(`    fila: tipo=${manualA?.tipo} origen=${manualA?.origen} monto=${manualA?.monto} ref→pagos_membresia=${manualA?.referencia_id === pagoIdA}`);

    // ── [B] pago_manual cortesía (monto NULL) ─────────────────────────────────────
    const negB = await crearNegocioSinSub(CORREO_B);
    await marcarPagado(panelSuper, negB, { hasta: hastaISO, concepto: 'cortesia' });
    const evB = await eventos(negB);
    const pB = evB.length === 1 && evB[0].tipo === 'pago_manual' && evB[0].monto === null;
    reg(pB);
    console.log(`\n[B] pago_manual cortesía (monto NULL)               ${ok(pB)}`);

    // ── [C] eventos de Stripe vía el helper (lo mismo que invoca el webhook) ──────
    await registrarEventoPago({ negocioId: negA, tipo: 'cobro_exitoso', origen: 'stripe', monto: 449, fechaEvento: new Date().toISOString(), stripeEventId: evtCobro, metadata: { customerId: 'cus_test', finPeriodo: hastaISO } });
    await registrarEventoPago({ negocioId: negA, tipo: 'cobro_fallido', origen: 'stripe', stripeEventId: evtFallo, metadata: { proximoReintento: hastaISO } });
    await registrarEventoPago({ negocioId: negA, tipo: 'cancelacion', origen: 'stripe', stripeEventId: evtCancel, metadata: { motivo: 'cancellation_requested' } });
    evA = await eventos(negA);
    const tieneTipo = (t: string) => evA.some((e) => e.tipo === t && e.origen === 'stripe');
    const cobroRow = evA.find((e) => e.tipo === 'cobro_exitoso');
    const falloRow = evA.find((e) => e.tipo === 'cobro_fallido');
    const pC = evA.length === 4
        && tieneTipo('cobro_exitoso') && cobroRow!.monto === '449.00'
        && tieneTipo('cobro_fallido') && falloRow!.monto === null
        && tieneTipo('cancelacion');
    reg(pC);
    console.log(`\n[C] eventos Stripe (cobro/fallo/cancelación)        ${ok(pC)}  (total negA=${evA.length}, esperado 4)`);

    // ── [D] idempotencia: reenviar el mismo stripe_event_id no duplica ────────────
    await registrarEventoPago({ negocioId: negA, tipo: 'cobro_exitoso', origen: 'stripe', monto: 449, stripeEventId: evtCobro });
    const dup = await contarPorStripeEvent(evtCobro);
    const pD = dup === 1;
    reg(pD);
    console.log(`\n[D] idempotencia (mismo event.id → 1 fila)          ${ok(pD)}  (filas=${dup})`);

    // ── [E] CHECK de tipo inválido ────────────────────────────────────────────────
    let lanzoCheck = false;
    try {
        await db.execute(sql`INSERT INTO eventos_pago (negocio_id, tipo, origen) VALUES (${negA}, 'tipo_invalido', 'stripe')`);
    } catch { lanzoCheck = true; }
    reg(lanzoCheck);
    console.log(`\n[E] CHECK tipo inválido rechazado por la BD         ${ok(lanzoCheck)}`);

    // ── [F] defensividad: FK inválida NO lanza y no inserta ───────────────────────
    let lanzoHelper = false;
    try {
        await registrarEventoPago({ negocioId: '00000000-0000-0000-0000-000000000000', tipo: 'cobro_exitoso', origen: 'stripe', stripeEventId: evtBad });
    } catch { lanzoHelper = true; }
    const badRows = await contarPorStripeEvent(evtBad);
    const pF = !lanzoHelper && badRows === 0;
    reg(pF);
    console.log(`\n[F] helper defensivo (FK inválida → no lanza)       ${ok(pF)}  (lanzó=${lanzoHelper}, filas=${badRows})`);

    // ── [G] LECTURA superadmin: lista + conteos + KPIs ────────────────────────────
    const lista = await listarEventos(panelSuper, { negocioId: negA, pagina: 1, porPagina: 50 });
    const porTipo = Object.fromEntries(lista.conteos.porTipo.map((c) => [c.tipo, c.total]));
    const pG = lista.total === 4
        && lista.items.length === 4
        && porTipo['pago_manual'] === 1 && porTipo['cobro_exitoso'] === 1 && porTipo['cobro_fallido'] === 1 && porTipo['cancelacion'] === 1
        && lista.conteos.ingresos === 898   // 449 (pago_manual) + 449 (cobro_exitoso)
        && lista.conteos.fallidos === 1;
    reg(pG);
    console.log(`\n[G] listarEventos superadmin (lista+KPIs)           ${ok(pG)}`);
    console.log(`    total=${lista.total}  porTipo=${JSON.stringify(porTipo)}  ingresos=${lista.conteos.ingresos} (esperado 898)  fallidos=${lista.conteos.fallidos}`);

    // ── [H] detalle de un evento ──────────────────────────────────────────────────
    const algun = lista.items[0];
    const det = await obtenerDetalleEvento(panelSuper, algun.id);
    const pH = !!det && det.id === algun.id && det.negocioId === negA;
    reg(pH);
    console.log(`\n[H] obtenerDetalleEvento                            ${ok(pH)}`);

    // ── [I] filtro por tipo ───────────────────────────────────────────────────────
    const soloFallos = await listarEventos(panelSuper, { negocioId: negA, tipo: 'cobro_fallido', pagina: 1, porPagina: 50 });
    const pI = soloFallos.total === 1 && soloFallos.items.every((e) => e.tipo === 'cobro_fallido');
    reg(pI);
    console.log(`\n[I] filtro tipo='cobro_fallido' (1 fila)            ${ok(pI)}  (total=${soloFallos.total})`);

    // ── [J] alcance del gerente: NO ve un negocio fuera de su región ──────────────
    const regiones = (await db.execute(sql`SELECT id::text FROM regiones LIMIT 1`)).rows as Array<{ id: string }>;
    if (regiones[0]) {
        const panelGer = { usuarioId: sa[0].id, rolEquipo: 'gerente', regionId: regiones[0].id } as unknown as UsuarioPanel;
        const listaGer = await listarEventos(panelGer, { negocioId: negA, pagina: 1, porPagina: 50 });
        // El negocio de prueba no tiene sucursal MATRIZ con ciudad → ningún gerente lo ve.
        const pJ = listaGer.total === 0;
        reg(pJ);
        console.log(`\n[J] gerente NO ve negocio fuera de su región        ${ok(pJ)}  (total=${listaGer.total}, esperado 0)`);
    } else {
        console.log(`\n[J] gerente — omitido (no hay regiones en dev)`);
    }

    // ── Limpieza ──────────────────────────────────────────────────────────────────
    await limpiar(CORREO_A);
    await limpiar(CORREO_B);
    console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
    console.log('════════════════════════════════════════════════════════════════════════\n');
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-bitacora-eventos:', err); process.exit(1); });
