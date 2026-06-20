/**
 * desglosar-comision-cartera.ts — DEV (datos de prueba)
 * =====================================================
 * Convierte las comisiones recurrentes AGREGADAS del sistema viejo ("foto mensual": `negocio_id = NULL`,
 * `detalle.activos = N`) de un vendedor en N comisiones POR NEGOCIO (una por cada negocio activo de su
 * cartera), para que el "Historial de comisiones" muestre el desglose real (un negocio por fila) en vez de
 * una sola línea "Cartera". Reparte el `monto_pagado` saldando de la primera en adelante, así los KPIs
 * (Ganado / Pagado / Pendiente) NO cambian. Es para datos de PRUEBA; las comisiones nuevas (Pieza 3) ya
 * nacen por negocio y no necesitan esto.
 *
 * Dry-run por defecto (solo imprime el plan). Aborta en producción.
 *
 * USO:  cd apps/api && pnpm exec tsx scripts/desglosar-comision-cartera.ts <codigoVendedor> [--aplicar]
 *
 * Ubicación: apps/api/scripts/desglosar-comision-cartera.ts
 */

import { config } from 'dotenv';
config();

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { embajadores, embajadorComisiones, negocios } from '../src/db/schemas/schema.js';

const codigo = process.argv[2];
const aplicar = process.argv.includes('--aplicar');

async function main(): Promise<void> {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: este script es solo para DEV (datos de prueba).');
        process.exit(1);
    }
    // 1) Comisiones recurrentes AGREGADAS (sin negocio). De UN vendedor si pasas su código, o de todos.
    const filtros = [eq(embajadorComisiones.tipo, 'recurrente'), isNull(embajadorComisiones.negocioId)];
    if (codigo && !codigo.startsWith('--')) {
        const [emb] = await db.select({ id: embajadores.id }).from(embajadores).where(eq(embajadores.codigoReferido, codigo)).limit(1);
        if (!emb) {
            console.error(`✗ No hay vendedor con código "${codigo}".`);
            process.exit(1);
        }
        filtros.push(eq(embajadorComisiones.embajadorId, emb.id));
    }
    const agregadas = await db.select().from(embajadorComisiones).where(and(...filtros));
    if (agregadas.length === 0) {
        console.log('No hay comisiones agregadas (negocio_id NULL) que desglosar. Nada que hacer.');
        process.exit(0);
    }

    // Negocios activos por embajador (cacheado: cada comisión usa los de SU vendedor).
    const cacheActivos = new Map<string, { id: string; nombre: string }[]>();
    const negociosActivosDe = async (embId: string) => {
        if (!cacheActivos.has(embId)) {
            const negs = await db
                .select({ id: negocios.id, nombre: negocios.nombre })
                .from(negocios)
                .where(
                    and(
                        eq(negocios.embajadorId, embId),
                        eq(negocios.estadoAdmin, 'activo'),
                        inArray(negocios.estadoMembresia, ['al_corriente', 'en_gracia']),
                    ),
                );
            cacheActivos.set(embId, negs);
        }
        return cacheActivos.get(embId)!;
    };

    console.log(`\n${agregadas.length} comisión(es) agregada(s) a desglosar${codigo && !codigo.startsWith('--') ? ` (vendedor "${codigo}")` : ''}\n`);

    for (const c of agregadas) {
        const activos = await negociosActivosDe(c.embajadorId);
        const d = (c.detalle ?? {}) as { activos?: number; montoUnitario?: number; escalon?: string };
        const n = d.activos ?? activos.length;
        const unitario = d.montoUnitario ?? (n > 0 ? Math.round(Number(c.montoComision) / n) : 0);
        const negs = activos.slice(0, n);
        if (negs.length === 0) {
            console.log(`⚠️  Comisión ${c.id}: el vendedor no tiene negocios activos; no se puede desglosar. Se omite.`);
            continue;
        }

        // Reparte el monto_pagado saldando de la 1ª en adelante (conserva el total Pagado del estado de cuenta).
        let restante = Number(c.montoPagado);
        const nuevas = negs.map((neg) => {
            const abona = Math.min(unitario, Math.max(0, restante));
            restante -= abona;
            const estado = abona >= unitario && unitario > 0 ? 'pagada' : 'pendiente';
            return {
                embajadorId: c.embajadorId,
                negocioId: neg.id,
                tipo: 'recurrente' as const,
                montoComision: String(unitario),
                montoPagado: String(abona),
                estado,
                periodo: c.periodo,
                detalle: { meses: 1, montoUnitario: unitario, escalon: d.escalon ?? null, activos: n },
                pagadaAt: estado === 'pagada' ? c.pagadaAt : null,
            };
        });

        console.log(`Comisión ${c.id}: $${c.montoComision} (pagado $${c.montoPagado}) · ${n} × $${unitario} → ${nuevas.length} por negocio:`);
        nuevas.forEach((nv, i) => console.log(`   • ${negs[i].nombre}: $${nv.montoComision} · ${nv.estado}${Number(nv.montoPagado) > 0 && nv.estado !== 'pagada' ? ` (abonado $${nv.montoPagado})` : ''}`));

        if (aplicar) {
            await db.insert(embajadorComisiones).values(nuevas);
            await db.delete(embajadorComisiones).where(eq(embajadorComisiones.id, c.id));
            console.log('   ✓ aplicado (insertadas las por-negocio + borrada la agregada).');
        }
    }

    console.log(aplicar ? '\n✅ Desglose aplicado.' : '\n(DRY-RUN) Vuelve a correrlo con --aplicar para escribir en la BD.');
    process.exit(0);
}

main().catch((e) => {
    console.error('Error en desglosar-comision-cartera:', e);
    process.exit(1);
});
