/**
 * probar-abonos.ts
 * ================
 * Prueba con datos REALES la Liquidación v2 (abonos): pago PARCIAL de una comisión, abono DIVIDIDO
 * (transferencia + efectivo) y el NETEO del efectivo, aplicado FIFO sobre `monto_pagado`.
 *
 * AÍSLA la prueba: como el abono es FIFO sobre TODAS las comisiones del vendedor, primero esconde sus
 * comisiones reales pendientes (las cancela temporalmente) para que la prueba opere solo sobre las suyas,
 * y al final las restaura. Por seguridad, NO corre si el vendedor tiene pagos reales.
 *
 * Uso (desde la raíz del repo):
 *   pnpm --filter @anunciaya/api exec tsx scripts/probar-abonos.ts            → dry-run (verifica columna + lee)
 *   pnpm --filter @anunciaya/api exec tsx scripts/probar-abonos.ts --aplicar  → corre el flujo, LIMPIA y RESTAURA
 */

import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { embajadores, embajadorComisiones, efectivoMovimientos, pagosVendedor, usuarios } from '../src/db/schemas/schema.js';
import { saldoEfectivo, registrarMovimientoManual } from '../src/services/admin/comisiones-efectivo.service.js';
import { registrarPago } from '../src/services/admin/comisiones-liquidacion.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const APLICAR = process.argv.includes('--aplicar');
const peso = (n: number) => `$${n.toLocaleString('es-MX')}`;
const NOTA = 'PRUEBA abono';

let fallos = 0;
function check(etiqueta: string, esperado: number | string | boolean, real: number | string | boolean) {
    const ok = esperado === real;
    if (!ok) fallos++;
    console.log(`  ${ok ? '✅' : '❌'} ${etiqueta}: esperado ${esperado}, real ${real}`);
}

async function estadoComision(id: string): Promise<{ estado: string; pagado: number }> {
    const [c] = await db.select({ estado: embajadorComisiones.estado, pagado: embajadorComisiones.montoPagado })
        .from(embajadorComisiones).where(eq(embajadorComisiones.id, id)).limit(1);
    return { estado: c?.estado ?? '—', pagado: Number(c?.pagado ?? 0) };
}

async function main() {
    // 1. Verificar columna monto_pagado.
    const col = (await db.execute(sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'embajador_comisiones' AND column_name = 'monto_pagado'
    `)).rows;
    if (col.length === 0) {
        console.error('❌ Falta la columna monto_pagado. Corre docs/migraciones/2026-06-17-comision-monto-pagado.sql.');
        process.exit(1);
    }
    console.log('✅ Columna embajador_comisiones.monto_pagado existe.');

    const [emb] = await db
        .select({ embajadorId: embajadores.id, usuarioId: embajadores.usuarioId, nombre: usuarios.nombre })
        .from(embajadores).leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId)).limit(1);
    if (!emb?.usuarioId) { console.error('❌ No hay embajadores para probar.'); process.exit(1); }
    console.log(`Vendedor de prueba: ${emb.nombre ?? '(sin nombre)'} · saldo efectivo: ${peso(await saldoEfectivo(emb.embajadorId))}`);

    if (!APLICAR) {
        console.log('\n(dry-run) Columna y lectura OK. Corre con --aplicar para probar los abonos end-to-end.');
        process.exit(0);
    }

    // Seguridad: no corro sobre un vendedor con pagos reales (la prueba toca su saldo de comisiones).
    const [pr] = await db.select({ n: sql<number>`COUNT(*)::int` }).from(pagosVendedor)
        .where(and(eq(pagosVendedor.embajadorId, emb.embajadorId), ne(pagosVendedor.nota, NOTA)));
    if (Number(pr.n) > 0) {
        console.error('❌ El vendedor tiene pagos reales; no corro el test para no corromper datos. Usa un vendedor de prueba sin pagos.');
        process.exit(1);
    }

    const [sup] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.rolEquipo, 'superadmin')).limit(1);
    if (!sup) { console.error('❌ No hay superadmin para actuar.'); process.exit(1); }
    const panel = { usuarioId: sup.id, rolEquipo: 'superadmin', regionId: null } as UsuarioPanel;

    const comisiones: string[] = [];
    let realesEscondidas: string[] = [];
    const limpiar = async () => {
        await db.delete(pagosVendedor).where(and(eq(pagosVendedor.embajadorId, emb.embajadorId), eq(pagosVendedor.nota, NOTA)));
        await db.delete(efectivoMovimientos).where(and(
            eq(efectivoMovimientos.embajadorId, emb.embajadorId),
            inArray(efectivoMovimientos.nota, [NOTA, 'Descontado del pago de comisiones']),
        ));
        for (const id of comisiones) await db.delete(embajadorComisiones).where(eq(embajadorComisiones.id, id));
    };
    await limpiar();

    // Como el vendedor no tiene pagos reales, sus comisiones deben estar pendientes/0. Repara cualquier
    // contaminación de pruebas anteriores (deja un estado base limpio).
    await db.update(embajadorComisiones)
        .set({ estado: 'pendiente', montoPagado: '0', pagadaAt: null })
        .where(and(eq(embajadorComisiones.embajadorId, emb.embajadorId), ne(embajadorComisiones.estado, 'cancelada')));

    try {
        // Esconder las comisiones reales pendientes para AISLAR la prueba (FIFO global no las tocará).
        realesEscondidas = (await db.select({ id: embajadorComisiones.id }).from(embajadorComisiones)
            .where(and(eq(embajadorComisiones.embajadorId, emb.embajadorId), eq(embajadorComisiones.estado, 'pendiente')))).map((r) => r.id);
        if (realesEscondidas.length) {
            await db.update(embajadorComisiones).set({ estado: 'cancelada' }).where(inArray(embajadorComisiones.id, realesEscondidas));
        }
        console.log(`(aisladas ${realesEscondidas.length} comisión(es) real(es) durante la prueba)`);

        // ---- CASO 1 + 2: comisión $1,500, abono parcial $1,000 y luego $300 transf + $200 efectivo ----
        const [c1] = await db.insert(embajadorComisiones).values({
            embajadorId: emb.embajadorId, tipo: 'recurrente', montoComision: '1500', estado: 'pendiente', periodo: '2099-11', detalle: { prueba: true },
        }).returning({ id: embajadorComisiones.id });
        comisiones.push(c1.id);

        console.log('\nCaso 1 — abono PARCIAL $1,000 (transferencia) sobre comisión $1,500:');
        const r1 = await registrarPago(panel, emb.usuarioId, { montoTransferencia: 1000, montoEfectivo: 0, nota: NOTA });
        if (!r1.ok) throw new Error(`registrarPago caso 1: ${r1.mensaje}`);
        check('abonado', 1000, r1.abonado ?? -1);
        check('saldo restante', 500, r1.saldoRestante ?? -1);
        const e1 = await estadoComision(c1.id);
        check('comisión pendiente (parcial)', 'pendiente', e1.estado);
        check('monto_pagado', 1000, e1.pagado);

        console.log('\nCaso 2 — abono DIVIDIDO $300 transferencia + $200 efectivo (completa la comisión):');
        const r2 = await registrarPago(panel, emb.usuarioId, { montoTransferencia: 300, montoEfectivo: 200, nota: NOTA });
        if (!r2.ok) throw new Error(`registrarPago caso 2: ${r2.mensaje}`);
        check('abonado', 500, r2.abonado ?? -1);
        check('saldo restante', 0, r2.saldoRestante ?? -1);
        const e2 = await estadoComision(c1.id);
        check('comisión pagada', 'pagada', e2.estado);
        check('monto_pagado completo', 1500, e2.pagado);
        const [filasPago] = await db.select({ n: sql<number>`COUNT(*)::int` }).from(pagosVendedor)
            .where(and(eq(pagosVendedor.embajadorId, emb.embajadorId), eq(pagosVendedor.nota, NOTA)));
        check('registros de pago (3: 1000 + 300 + 200)', 3, Number(filasPago.n));

        // ---- CASO 3: neteo — comisión $400, el vendedor debe $150 de efectivo ----
        const [c2] = await db.insert(embajadorComisiones).values({
            embajadorId: emb.embajadorId, tipo: 'recurrente', montoComision: '400', estado: 'pendiente', periodo: '2099-12', detalle: { prueba: true },
        }).returning({ id: embajadorComisiones.id });
        comisiones.push(c2.id);
        await registrarMovimientoManual(panel, emb.usuarioId, { tipo: 'cobro', monto: 150, nota: NOTA });

        console.log('\nCaso 3 — NETEO: comisión $400, debe $150 → saldo $250; se abona $250:');
        const r3 = await registrarPago(panel, emb.usuarioId, { montoTransferencia: 250, montoEfectivo: 0, nota: NOTA });
        if (!r3.ok) throw new Error(`registrarPago caso 3: ${r3.mensaje}`);
        check('compensado', 150, r3.compensado ?? -1);
        check('abonado', 250, r3.abonado ?? -1);
        check('saldo restante', 0, r3.saldoRestante ?? -1);
        const e3 = await estadoComision(c2.id);
        check('comisión pagada (250 abono + 150 compensación)', 'pagada', e3.estado);
        check('monto_pagado', 400, e3.pagado);
        check('deuda de efectivo saldada', 0, await saldoEfectivo(emb.embajadorId));

        // ---- Validación: no se puede abonar de más ----
        const [c3] = await db.insert(embajadorComisiones).values({
            embajadorId: emb.embajadorId, tipo: 'recurrente', montoComision: '100', estado: 'pendiente', periodo: '2099-10', detalle: { prueba: true },
        }).returning({ id: embajadorComisiones.id });
        comisiones.push(c3.id);
        console.log('\nValidación — abonar más que el saldo ($999 sobre saldo $100) debe RECHAZARSE:');
        const r4 = await registrarPago(panel, emb.usuarioId, { montoTransferencia: 999, montoEfectivo: 0, nota: NOTA });
        check('rechazado (ok=false)', false, r4.ok);
    } finally {
        await limpiar();
        if (realesEscondidas.length) {
            await db.update(embajadorComisiones).set({ estado: 'pendiente' }).where(inArray(embajadorComisiones.id, realesEscondidas));
        }
        console.log(`\n🧹 Limpieza + restauración hechas. Saldo efectivo: ${peso(await saldoEfectivo(emb.embajadorId))}.`);
    }

    console.log(fallos === 0 ? '\n✅ TODO VERDE — abonos parciales + divididos + neteo funcionan.' : `\n❌ ${fallos} verificación(es) fallaron.`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Error en la prueba:', e); process.exit(1); });
