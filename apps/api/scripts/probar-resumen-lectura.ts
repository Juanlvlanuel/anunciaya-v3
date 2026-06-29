/**
 * probar-resumen-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo "Resumen / inicio"
 * ===================================================================================
 * Verifica el tablero del Resumen (KPIs + cola de pendientes) contra la BD real. SOLO SELECT —
 * no crea, no modifica, no borra nada. Seguro de correr en cualquier ambiente.
 *
 * Cubre los criterios de aceptación (Resumen_Pendientes.md):
 *   - super: KPIs de plataforma (negocios activos, usuarios, ingresos del mes, cobros fallidos).
 *   - gerente: los mismos, acotados a su región (⊆ super). Gerente sin región → todo 0.
 *   - vendedor: lo suyo (cartera activa, comisiones pendientes, efectivo por entregar propio).
 *   - cola: efectivo por entregar (saldo > 0, desc) + negocios en gracia (por urgencia, asc).
 *   - lente de región del super == ver como gerente de esa región.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-resumen-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-resumen-lectura.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { obtenerResumen } from '../src/services/admin/resumen.service.js';
import { contarNegocios, contarNegociosActivos, panelConFiltroRegion } from '../src/services/admin/negocios.service.js';
import { saldoEfectivo } from '../src/services/admin/comisiones-efectivo.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

/** Construye un panel simulado (los harness no pasan por el middleware HTTP). */
function panel(rol: UsuarioPanel['rolEquipo'], opts?: { regionId?: string | null; usuarioId?: string | null }): UsuarioPanel {
    return {
        usuarioId: opts?.usuarioId ?? null,
        rolEquipo: rol,
        regionId: opts?.regionId ?? null,
        viaSecret: false,
        panel2faHabilitado: false,
        panel2faOk: true,
    };
}

const kpi = (r: { kpis: Array<{ clave: string; valor: number }> }, clave: string): number | undefined =>
    r.kpis.find((k) => k.clave === clave)?.valor;

const enteroNoNeg = (n: number | undefined): boolean => n !== undefined && Number.isInteger(n) && n >= 0;
const numNoNeg = (n: number | undefined): boolean => n !== undefined && Number.isFinite(n) && n >= 0;

/** ¿El arreglo está ordenado por la clave numérica? (asc/desc, con null al final). */
function ordenado<T>(arr: T[], val: (x: T) => number | null, dir: 'asc' | 'desc'): boolean {
    for (let i = 1; i < arr.length; i++) {
        const a = val(arr[i - 1]);
        const b = val(arr[i]);
        if (a === null) { if (b !== null) return false; continue; } // null al final
        if (b === null) continue;
        if (dir === 'asc' && a > b) return false;
        if (dir === 'desc' && a < b) return false;
    }
    return true;
}

async function main(): Promise<void> {
    // ─── Actores reales ───────────────────────────────────────────────────────────
    const supers = (await db.execute(sql`
        SELECT id::text AS id FROM usuarios WHERE rol_equipo = 'superadmin' ORDER BY created_at LIMIT 1
    `)).rows as Array<{ id: string }>;
    const gerentes = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'gerente' AND region_id IS NOT NULL ORDER BY created_at
    `)).rows as Array<{ id: string; region_id: string }>;
    const vendedores = (await db.execute(sql`
        SELECT u.id::text AS id, e.id::text AS embajador_id
        FROM embajadores e JOIN usuarios u ON u.id = e.usuario_id ORDER BY u.created_at
    `)).rows as Array<{ id: string; embajador_id: string }>;

    console.log('\n[0] Actores en la BD');
    verificar('hay al menos un superadmin', supers.length > 0, `supers=${supers.length}`);
    if (supers.length === 0) {
        console.log('\n⚠️  No hay superadmin — no se puede verificar. Aborta.');
        process.exit(1);
    }

    // ─── [1] SUPERADMIN: KPIs de plataforma ───────────────────────────────────────
    console.log('\n[1] obtenerResumen como SUPERADMIN — KPIs');
    const sup = await obtenerResumen(panel('superadmin'));
    verificar('rol del payload == superadmin', sup.rol === 'superadmin');
    verificar('trae 4 KPIs', sup.kpis.length === 4, `kpis=${sup.kpis.map((k) => k.clave).join(',')}`);
    const negActivos = kpi(sup, 'negociosActivos');
    verificar('negociosActivos entero ≥ 0', enteroNoNeg(negActivos), String(negActivos));
    verificar('usuarios entero ≥ 0', enteroNoNeg(kpi(sup, 'usuarios')), String(kpi(sup, 'usuarios')));
    verificar('ingresosMes número ≥ 0', numNoNeg(kpi(sup, 'ingresosMes')), String(kpi(sup, 'ingresosMes')));
    verificar('cobrosFallidos entero ≥ 0', enteroNoNeg(kpi(sup, 'cobrosFallidos')), String(kpi(sup, 'cobrosFallidos')));

    const totalNeg = await contarNegocios(panel('superadmin'));
    verificar('negociosActivos ≤ total de negocios (activos ⊆ todos)', (negActivos ?? 0) <= totalNeg, `activos=${negActivos}, total=${totalNeg}`);

    // ─── [2] SUPERADMIN: cola de pendientes ───────────────────────────────────────
    console.log('\n[2] obtenerResumen como SUPERADMIN — pendientes');
    const ef = sup.pendientes.efectivo;
    verificar('efectivo.monto ≥ 0', numNoNeg(ef.monto), String(ef.monto));
    verificar('efectivo.totalVendedores ≥ items mostrados', ef.totalVendedores >= ef.items.length, `total=${ef.totalVendedores}, items=${ef.items.length}`);
    verificar('todos los items de efectivo tienen saldo > 0', ef.items.every((i) => i.saldo > 0));
    verificar('items de efectivo ordenados por saldo desc', ordenado(ef.items, (i) => i.saldo, 'desc'));
    const gr = sup.pendientes.gracia;
    verificar('gracia.total ≥ items mostrados', gr.total >= gr.items.length, `total=${gr.total}, items=${gr.items.length}`);
    verificar('items de gracia ordenados por fecha límite asc', ordenado(gr.items, (i) => (i.fechaLimiteGracia ? new Date(i.fechaLimiteGracia).getTime() : null), 'asc'));
    const sol = sup.pendientes.solicitudes;
    verificar('solicitudes.total entero ≥ 0', enteroNoNeg(sol.total), String(sol.total));
    verificar('solicitudes.total ≥ items mostrados', sol.total >= sol.items.length, `total=${sol.total}, items=${sol.items.length}`);
    const com = sup.pendientes.comisiones;
    verificar('comisiones.monto ≥ 0', numNoNeg(com.monto), String(com.monto));
    verificar('comisiones.totalVendedores ≥ items mostrados', com.totalVendedores >= com.items.length, `total=${com.totalVendedores}, items=${com.items.length}`);
    verificar('todos los items de comisiones tienen monto > 0', com.items.every((i) => i.monto > 0));
    verificar('items de comisiones ordenados por monto desc', ordenado(com.items, (i) => i.monto, 'desc'));
    verificar('contador == efectivo + gracia + solicitudes + comisiones', sup.pendientes.contador === ef.totalVendedores + gr.total + sol.total + com.totalVendedores, `contador=${sup.pendientes.contador}`);
    console.log(`    (super: ${negActivos} negocios activos, ${ef.totalVendedores} deben efectivo, ${gr.total} en gracia, ${sol.total} pagos por verificar, ${com.totalVendedores} comisiones por pagar)`);

    // ─── [3] GERENTE: acotado a su región (⊆ super) ───────────────────────────────
    console.log('\n[3] obtenerResumen como GERENTE — alcance ⊆ super');
    const gte = gerentes[0];
    if (gte) {
        const vistaGte = await obtenerResumen(panel('gerente', { regionId: gte.region_id }));
        verificar('negociosActivos(gerente) ≤ negociosActivos(super)', (kpi(vistaGte, 'negociosActivos') ?? 0) <= (negActivos ?? 0));
        verificar('efectivo vendedores(gerente) ≤ super', vistaGte.pendientes.efectivo.totalVendedores <= ef.totalVendedores);
        verificar('gracia total(gerente) ≤ super', vistaGte.pendientes.gracia.total <= gr.total);
        verificar('solicitudes(gerente) ≤ super', vistaGte.pendientes.solicitudes.total <= sol.total);
        verificar('gerente NO ve comisiones por pagar (solo super)', vistaGte.pendientes.comisiones.totalVendedores === 0);
        verificar(
            'contador(gerente) coherente',
            vistaGte.pendientes.contador ===
                vistaGte.pendientes.efectivo.totalVendedores +
                    vistaGte.pendientes.gracia.total +
                    vistaGte.pendientes.solicitudes.total +
                    vistaGte.pendientes.comisiones.totalVendedores,
        );

        // Lente de región del super == ver como gerente de esa región.
        const lente = await obtenerResumen(panelConFiltroRegion(panel('superadmin'), gte.region_id));
        verificar('lente del super == vista del gerente (negociosActivos)', kpi(lente, 'negociosActivos') === kpi(vistaGte, 'negociosActivos'), `lente=${kpi(lente, 'negociosActivos')}, gte=${kpi(vistaGte, 'negociosActivos')}`);
    } else {
        console.log('    (no hay gerente con región — se omite)');
    }

    // ─── [4] Gerente sin región → todo 0 (defensa) ────────────────────────────────
    console.log('\n[4] Defensa: gerente sin región → 0');
    const gteSin = await obtenerResumen(panel('gerente', { regionId: null }));
    verificar('negociosActivos == 0', kpi(gteSin, 'negociosActivos') === 0);
    verificar('pendientes contador == 0', gteSin.pendientes.contador === 0);

    // ─── [5] VENDEDOR: lo suyo ────────────────────────────────────────────────────
    console.log('\n[5] obtenerResumen como VENDEDOR — lo suyo');
    const v0 = vendedores[0];
    if (v0) {
        const vend = await obtenerResumen(panel('vendedor', { usuarioId: v0.id }));
        verificar('rol del payload == vendedor', vend.rol === 'vendedor');
        verificar('trae 3 KPIs', vend.kpis.length === 3, vend.kpis.map((k) => k.clave).join(','));
        verificar('carteraActiva entero ≥ 0', enteroNoNeg(kpi(vend, 'carteraActiva')), String(kpi(vend, 'carteraActiva')));
        verificar('comisionesPendientes número ≥ 0', numNoNeg(kpi(vend, 'comisionesPendientes')), String(kpi(vend, 'comisionesPendientes')));

        const saldo = await saldoEfectivo(v0.embajador_id);
        verificar('carteraActiva == contarNegociosActivos(vendedor)', kpi(vend, 'carteraActiva') === await contarNegociosActivos(panel('vendedor', { usuarioId: v0.id })));
        verificar('efectivoPorEntregar (KPI) == saldoEfectivo', kpi(vend, 'efectivoPorEntregar') === saldo, `kpi=${kpi(vend, 'efectivoPorEntregar')}, saldo=${saldo}`);
        verificar('pendientes.efectivo.monto == saldo', vend.pendientes.efectivo.monto === saldo);
        verificar('vendedor NO ve la red (efectivo.items vacío)', vend.pendientes.efectivo.items.length === 0);
        verificar('vendedor NO ve pagos por verificar', vend.pendientes.solicitudes.total === 0);
        verificar('vendedor NO ve comisiones por pagar', vend.pendientes.comisiones.totalVendedores === 0);
        verificar('contador == (saldo>0?1:0) + gracia.total', vend.pendientes.contador === (saldo > 0 ? 1 : 0) + vend.pendientes.gracia.total);
    } else {
        console.log('    (no hay vendedores — se omite)');
    }

    // ─── [6] Vendedor sin usuarioId → 0 (defensa) ─────────────────────────────────
    console.log('\n[6] Defensa: vendedor sin usuarioId → 0');
    const vendSin = await obtenerResumen(panel('vendedor', { usuarioId: null }));
    verificar('carteraActiva == 0', kpi(vendSin, 'carteraActiva') === 0);
    verificar('efectivoPorEntregar == 0', kpi(vendSin, 'efectivoPorEntregar') === 0);
    verificar('pendientes contador == 0', vendSin.pendientes.contador === 0);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
