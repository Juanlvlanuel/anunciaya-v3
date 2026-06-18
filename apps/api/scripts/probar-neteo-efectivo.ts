/**
 * probar-neteo-efectivo.ts
 * ========================
 * Prueba con datos REALES el neteo de efectivo (Vendedores · pieza D): un cobro en efectivo le crea
 * DEUDA al vendedor y, al registrarle un pago de comisión, se le DESCUENTA esa deuda (compensación).
 * Cubre los dos casos: comisión < deuda (neto 0) y comisión > deuda (neto > 0).
 *
 * Uso (desde la raíz del repo):
 *   pnpm --filter @anunciaya/api exec tsx scripts/probar-neteo-efectivo.ts            → dry-run: verifica tabla + lee saldo
 *   pnpm --filter @anunciaya/api exec tsx scripts/probar-neteo-efectivo.ts --aplicar  → corre el flujo y LIMPIA lo de prueba
 *
 * El modo --aplicar escribe (lo corre Juan): crea 2 comisiones de prueba + 1 cobro, registra 2 pagos y al
 * final BORRA todo lo que creó. No deja basura.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { embajadores, embajadorComisiones, efectivoMovimientos, pagosVendedor, usuarios } from '../src/db/schemas/schema.js';
import { saldoEfectivo, registrarMovimientoManual } from '../src/services/admin/comisiones-efectivo.service.js';
import { registrarPago } from '../src/services/admin/comisiones-liquidacion.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const APLICAR = process.argv.includes('--aplicar');
const peso = (n: number) => `$${n.toLocaleString('es-MX')}`;

let fallos = 0;
function check(etiqueta: string, esperado: number | string | boolean, real: number | string | boolean) {
    const ok = esperado === real;
    if (!ok) fallos++;
    console.log(`  ${ok ? '✅' : '❌'} ${etiqueta}: esperado ${esperado}, real ${real}`);
}

async function main() {
    // 1. Verificar que la tabla existe (confirma la migración).
    const reg = (await db.execute(sql`SELECT to_regclass('public.efectivo_movimientos') AS reg`)).rows[0] as { reg: string | null };
    if (!reg?.reg) {
        console.error('❌ La tabla efectivo_movimientos NO existe. Corre docs/migraciones/2026-06-17-efectivo-movimientos.sql.');
        process.exit(1);
    }
    console.log('✅ Tabla efectivo_movimientos existe.');

    // 2. Tomar un vendedor (embajador + su usuario).
    const [emb] = await db
        .select({ embajadorId: embajadores.id, usuarioId: embajadores.usuarioId, nombre: usuarios.nombre })
        .from(embajadores)
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .limit(1);
    if (!emb?.usuarioId) {
        console.error('❌ No hay embajadores para probar.');
        process.exit(1);
    }
    const S0 = await saldoEfectivo(emb.embajadorId);
    console.log(`Vendedor de prueba: ${emb.nombre ?? '(sin nombre)'} · saldo de efectivo actual: ${peso(S0)}`);

    if (!APLICAR) {
        console.log('\n(dry-run) Tabla y lectura OK. Corre con --aplicar para probar el neteo end-to-end.');
        process.exit(0);
    }

    // 3. Super para actuar (registrarPago / movimiento requieren panel).
    const [sup] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.rolEquipo, 'superadmin')).limit(1);
    if (!sup) {
        console.error('❌ No hay superadmin para actuar.');
        process.exit(1);
    }
    const panel = { usuarioId: sup.id, rolEquipo: 'superadmin', regionId: null } as UsuarioPanel;

    const NOTA_COBRO = 'PRUEBA neteo';
    const NOTA_COMPENSACION = 'Descontado del pago de comisiones';
    const comisionesPrueba: string[] = [];
    const pagosPrueba: string[] = [];

    // Limpia los rastros de prueba (cobro + compensaciones) de cualquier corrida anterior de este script.
    const limpiarPrueba = async () => {
        if (pagosPrueba.length) await db.delete(pagosVendedor).where(inArray(pagosVendedor.id, pagosPrueba));
        await db.delete(efectivoMovimientos).where(and(
            eq(efectivoMovimientos.embajadorId, emb.embajadorId),
            inArray(efectivoMovimientos.nota, [NOTA_COBRO, NOTA_COMPENSACION]),
        ));
        for (const id of comisionesPrueba) await db.delete(embajadorComisiones).where(eq(embajadorComisiones.id, id));
    };
    await limpiarPrueba(); // arranca de cero aunque una corrida previa haya quedado a medias
    const base = await saldoEfectivo(emb.embajadorId); // saldo real DESPUÉS de barrer residuos de prueba

    try {
        // Caso 1: comisión $300 + cobro $500 → bruto 300, compensado 300, neto 0. Saldo: S0+500−300 = S0+200.
        const [c1] = await db.insert(embajadorComisiones).values({
            embajadorId: emb.embajadorId, tipo: 'recurrente', montoComision: '300', estado: 'pendiente', periodo: '2099-11', detalle: { prueba: true },
        }).returning({ id: embajadorComisiones.id });
        comisionesPrueba.push(c1.id);

        await registrarMovimientoManual(panel, emb.usuarioId, { tipo: 'cobro', monto: 500, nota: NOTA_COBRO });
        console.log(`\nCaso 1 — comisión ${peso(300)}, cobro ${peso(500)}:`);

        const r1 = await registrarPago(panel, emb.usuarioId, { metodo: 'efectivo', comisionIds: [c1.id] });
        if (!r1.ok) throw new Error(`registrarPago caso 1 falló: ${r1.mensaje}`);
        check('bruto', 300, r1.bruto ?? -1);
        check('compensado', 300, r1.compensado ?? -1);
        check('neto', 0, r1.neto ?? -1);
        check('sin pago_vendedor (neto 0)', true, r1.pagoId === undefined);
        check('saldo', base + 200, await saldoEfectivo(emb.embajadorId));
        const [e1] = await db.select({ estado: embajadorComisiones.estado }).from(embajadorComisiones).where(eq(embajadorComisiones.id, c1.id));
        check('comisión 1 pagada', 'pagada', e1.estado);

        // Caso 2: comisión $400, deuda restante $200 → bruto 400, compensado 200, neto 200. Saldo → S0.
        const [c2] = await db.insert(embajadorComisiones).values({
            embajadorId: emb.embajadorId, tipo: 'recurrente', montoComision: '400', estado: 'pendiente', periodo: '2099-12', detalle: { prueba: true },
        }).returning({ id: embajadorComisiones.id });
        comisionesPrueba.push(c2.id);
        console.log(`\nCaso 2 — comisión ${peso(400)}, deuda restante ${peso(200)}:`);

        const r2 = await registrarPago(panel, emb.usuarioId, { metodo: 'transferencia', comisionIds: [c2.id] });
        if (!r2.ok) throw new Error(`registrarPago caso 2 falló: ${r2.mensaje}`);
        if (r2.pagoId) pagosPrueba.push(r2.pagoId);
        check('bruto', 400, r2.bruto ?? -1);
        check('compensado', 200, r2.compensado ?? -1);
        check('neto', 200, r2.neto ?? -1);
        check('hay pago_vendedor (neto > 0)', true, r2.pagoId !== undefined);
        check('saldo de vuelta a la base', base, await saldoEfectivo(emb.embajadorId));
        if (r2.pagoId) {
            const [pv] = await db.select({ monto: pagosVendedor.monto }).from(pagosVendedor).where(eq(pagosVendedor.id, r2.pagoId));
            check('pago_vendedor = neto', 200, Number(pv.monto));
        }
    } finally {
        // LIMPIEZA: borra todo lo que creó esta corrida (no deja basura).
        await limpiarPrueba();
        const saldoFinal = await saldoEfectivo(emb.embajadorId);
        console.log(`\n🧹 Limpieza hecha. Saldo: ${peso(saldoFinal)}.`);
    }

    console.log(fallos === 0 ? '\n✅ TODO VERDE — el neteo funciona.' : `\n❌ ${fallos} verificación(es) fallaron.`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error('Error en la prueba:', e);
    process.exit(1);
});
