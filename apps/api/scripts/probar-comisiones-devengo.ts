/**
 * probar-comisiones-devengo.ts — HARNESS (DEV) · Fase 2 · pieza B (devengo)
 * =========================================================================
 * Verifica el motor de devengo de la comisión recurrente contra la BD real. Usa un PERIODO DE PRUEBA
 * ('2099-01') y BORRA sus filas al final, así no contamina los periodos reales.
 *
 * ⚠️ ESCRIBE en embajador_comisiones (y limpia). Lo corre Juan en DEV. Requiere la migración
 *    2026-06-17-vendedores-comisiones-fase2.sql ya aplicada.
 *
 * Cubre: A4 — la comisión del mes se calcula sola por # de activos según la escalera; idempotente.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-comisiones-devengo.ts
 *
 * Ubicación: apps/api/scripts/probar-comisiones-devengo.ts
 */

import { config } from 'dotenv';
config();

import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { embajadorComisiones } from '../src/db/schemas/schema.js';
import { devengarPeriodo, montoPorActivo, escaleraActual } from '../src/services/admin/comisiones-devengo.service.js';
import { ESCALERA_DEFAULT } from '../src/services/admin/configuracion.service.js';

const PERIODO = '2099-01';
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main(): Promise<void> {
    console.log('\n[1] Escalera vigente (de Configuración)');
    const esc = await escaleraActual();
    console.log(`    ${esc.map((t) => `${t.min}${t.max === null ? '+' : '-' + t.max}→$${t.montoPorActivo}`).join('  ')}`);

    console.log('\n[2] montoPorActivo — ubicación de escalón (sobre la escalera por defecto)');
    verificar('5 activos → $0 (tramo 0-9)', montoPorActivo(5, ESCALERA_DEFAULT) === 0);
    verificar('10 activos → $30 (tramo 10-24)', montoPorActivo(10, ESCALERA_DEFAULT) === 30);
    verificar('24 activos → $30 (tope del tramo)', montoPorActivo(24, ESCALERA_DEFAULT) === 30);
    verificar('25 activos → $50 (tramo 25+)', montoPorActivo(25, ESCALERA_DEFAULT) === 50);
    verificar('100 activos → $50 (sin tope)', montoPorActivo(100, ESCALERA_DEFAULT) === 50);

    console.log(`\n[3] Devengar el periodo de prueba ${PERIODO}`);
    const r1 = await devengarPeriodo(PERIODO);
    console.log(`    vendedores=${r1.vendedoresProcesados} · creadas=${r1.creadas} · total devengado=$${r1.totalDevengado}`);
    verificar('procesó a los vendedores activos', r1.vendedoresProcesados >= 0);

    console.log('\n[4] Verificar cada comisión generada (monto = activos × monto del escalón)');
    const filas = await db
        .select({
            embajadorId: embajadorComisiones.embajadorId,
            monto: embajadorComisiones.montoComision,
            detalle: embajadorComisiones.detalle,
            negocioId: embajadorComisiones.negocioId,
        })
        .from(embajadorComisiones)
        .where(and(eq(embajadorComisiones.periodo, PERIODO), eq(embajadorComisiones.tipo, 'recurrente')));

    if (filas.length === 0) {
        console.log('    (ninguna comisión > $0 con la escalera vigente — esperado si los vendedores tienen pocos activos)');
    }
    for (const f of filas) {
        const d = (f.detalle ?? {}) as { activos?: number; montoUnitario?: number; escalon?: string };
        const activos = d.activos ?? 0;
        const unitario = d.montoUnitario ?? 0;
        const monto = Number(f.monto);
        verificar(
            `${activos} activos × $${unitario} (${d.escalon}) = $${monto}`,
            monto === activos * unitario && unitario === montoPorActivo(activos, esc) && f.negocioId === null,
        );
    }

    console.log('\n[5] Idempotencia — devengar de nuevo no duplica');
    const r2 = await devengarPeriodo(PERIODO);
    verificar('2ª corrida: 0 creadas (las existentes se recalculan)', r2.creadas === 0, `creadas=${r2.creadas}, actualizadas=${r2.actualizadas}`);
    const totalFilas = (
        await db.select({ id: embajadorComisiones.id }).from(embajadorComisiones).where(and(eq(embajadorComisiones.periodo, PERIODO), eq(embajadorComisiones.tipo, 'recurrente')))
    ).length;
    verificar('no se duplicaron filas del periodo', totalFilas === filas.length, `filas=${totalFilas}`);

    console.log('\n[6] Limpieza — borrar las comisiones del periodo de prueba');
    await db.delete(embajadorComisiones).where(and(eq(embajadorComisiones.periodo, PERIODO), eq(embajadorComisiones.tipo, 'recurrente')));
    const quedan = (
        await db.select({ id: embajadorComisiones.id }).from(embajadorComisiones).where(eq(embajadorComisiones.periodo, PERIODO))
    ).length;
    verificar('periodo de prueba limpio', quedan === 0);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
