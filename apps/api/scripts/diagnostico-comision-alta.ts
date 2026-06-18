/**
 * diagnostico-comision-alta.ts (solo LECTURA)
 * ===========================================
 * Diagnostica el bug de la comisión de alta indebida: negocios que ya existían y pagaban antes del módulo,
 * cuyo primer pago POST-módulo selló `fecha_primer_pago` y disparó una comisión de alta como si fueran nuevos.
 *
 *   pnpm --filter @anunciaya/api exec tsx scripts/diagnostico-comision-alta.ts
 */

import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { negocios, pagosMembresia, eventosPago, embajadorComisiones } from '../src/db/schemas/schema.js';

async function pagosReales(negocioId: string): Promise<{ membresia: number; eventos: number; primero: string | null }> {
    const [pm] = await db
        .select({ n: sql<number>`COUNT(*)::int`, min: sql<string | null>`MIN(${pagosMembresia.fechaPago})` })
        .from(pagosMembresia)
        .where(and(eq(pagosMembresia.negocioId, negocioId), eq(pagosMembresia.anulado, false), ne(pagosMembresia.concepto, 'cortesia')));
    const [ep] = await db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(eventosPago)
        .where(and(eq(eventosPago.negocioId, negocioId), sql`${eventosPago.tipo} IN ('cobro_exitoso','pago_manual')`));
    return { membresia: Number(pm?.n ?? 0), eventos: Number(ep?.n ?? 0), primero: pm?.min ?? null };
}

async function main() {
    // 1. Comisiones de ALTA existentes.
    const altas = await db
        .select({
            id: embajadorComisiones.id,
            negocioId: embajadorComisiones.negocioId,
            monto: embajadorComisiones.montoComision,
            estado: embajadorComisiones.estado,
            creada: embajadorComisiones.createdAt,
        })
        .from(embajadorComisiones)
        .where(eq(embajadorComisiones.tipo, 'alta'));

    console.log(`\n=== Comisiones de ALTA existentes: ${altas.length} ===`);
    let indebidas = 0;
    for (const a of altas) {
        if (!a.negocioId) { console.log(`- (comisión ${a.id} sin negocio_id)`); continue; }
        const [neg] = await db
            .select({ nombre: negocios.nombre, fpp: negocios.fechaPrimerPago, creado: negocios.createdAt })
            .from(negocios).where(eq(negocios.id, a.negocioId)).limit(1);
        const p = await pagosReales(a.negocioId);
        const sospechosa = p.membresia > 1 || p.eventos > 1; // ya tenía pagos antes del actual
        if (sospechosa) indebidas++;
        console.log(`\n- ${neg?.nombre ?? a.negocioId} · comisión $${a.monto} (${a.estado})${sospechosa ? '  ⚠️ INDEBIDA' : ''}`);
        console.log(`    negocio creado: ${(neg?.creado ?? '').slice(0, 10) || '—'} · fecha_primer_pago: ${neg?.fpp ?? 'NULL'}`);
        console.log(`    pagos reales → pagos_membresia: ${p.membresia} · eventos_pago: ${p.eventos} · primer pago: ${(p.primero ?? '').slice(0, 10) || '—'}`);
    }

    // 2. Negocios EN RIESGO: con vendedor, ya con pagos reales, SIN comisión de alta aún
    //    (dispararían una indebida en su próximo pago si fecha_primer_pago sigue NULL o se vuelve a sellar).
    const conVendedor = await db
        .select({ id: negocios.id, nombre: negocios.nombre, fpp: negocios.fechaPrimerPago })
        .from(negocios)
        .where(sql`${negocios.embajadorId} IS NOT NULL`);

    let enRiesgo = 0;
    const detalle: string[] = [];
    for (const n of conVendedor) {
        const [tieneAlta] = await db
            .select({ id: embajadorComisiones.id })
            .from(embajadorComisiones)
            .where(and(eq(embajadorComisiones.negocioId, n.id), eq(embajadorComisiones.tipo, 'alta')))
            .limit(1);
        if (tieneAlta) continue;
        const p = await pagosReales(n.id);
        if (p.membresia >= 1 || p.eventos >= 1) {
            enRiesgo++;
            detalle.push(`    - ${n.nombre} · fecha_primer_pago: ${n.fpp ?? 'NULL'} · pagos: ${Math.max(p.membresia, p.eventos)}`);
        }
    }
    console.log(`\n=== Negocios con vendedor, con pagos, SIN comisión de alta aún: ${enRiesgo} ===`);
    if (detalle.length) console.log(detalle.join('\n'));

    console.log(`\n--- Resumen: ${indebidas} comisión(es) de alta INDEBIDA(s) · ${enRiesgo} negocio(s) en riesgo a futuro ---`);
    process.exit(0);
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
