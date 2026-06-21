/**
 * probar-metricas-crecimiento.ts — HARNESS (DEV) · Fase 1 VER del módulo "Métricas" · sección ① Crecimiento
 * ========================================================================================================
 * Verifica la sección "Crecimiento y dinero" (KPIs + series de altas/bajas e ingresos + top vendedores)
 * contra la BD real. SOLO SELECT — no crea, no modifica, no borra nada.
 *
 * Cubre criterios de aceptación (Metricas_Pendientes.md · Fase 1):
 *   - super: KPIs y series de plataforma (valores válidos).
 *   - consistencia serie ↔ KPI: Σ altas(serie) == altas.valor; Σ bajas == churn.valor; Σ ingresos == ingresos.valor.
 *   - gerente: alcance ⊆ super. Gerente sin región → todo 0 + series en cero.
 *   - vendedor: lo suyo (topVendedores == null).
 *   - lente de región del super == ver como gerente de esa región.
 *   - series con longitud == meses, en orden ascendente y formato 'YYYY-MM'.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-metricas-crecimiento.ts
 *
 * Ubicación: apps/api/scripts/probar-metricas-crecimiento.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { metricasCrecimiento, normalizarPeriodo, type MetricasCrecimiento } from '../src/services/admin/metricas.service.js';
import { contarNegociosActivos, panelConFiltroRegion } from '../src/services/admin/negocios.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

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

const numNoNeg = (n: number | null | undefined): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const ESPERA_MESES = 12;
const PERIODO12 = normalizarPeriodo({ meses: ESPERA_MESES });
const RE_YM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** ¿Los 'YYYY-MM' están en orden ascendente estricto? */
function mesesAscendentes(meses: string[]): boolean {
    for (let i = 1; i < meses.length; i++) if (meses[i - 1] >= meses[i]) return false;
    return true;
}

function sumaAltas(m: MetricasCrecimiento): number {
    return m.series.crecimiento.reduce((a, p) => a + p.altas, 0);
}
function sumaBajas(m: MetricasCrecimiento): number {
    return m.series.crecimiento.reduce((a, p) => a + p.bajas, 0);
}
function sumaIngresos(m: MetricasCrecimiento): number {
    return m.series.ingresos.reduce((a, p) => a + p.tarjeta + p.efectivo + p.transferencia + p.otro, 0);
}
const casi = (a: number, b: number) => Math.abs(a - b) < 0.01;

async function main(): Promise<void> {
    const supers = (await db.execute(sql`
        SELECT id::text AS id FROM usuarios WHERE rol_equipo = 'superadmin' ORDER BY created_at LIMIT 1
    `)).rows as Array<{ id: string }>;
    const gerentes = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'gerente' AND region_id IS NOT NULL ORDER BY created_at
    `)).rows as Array<{ id: string; region_id: string }>;
    const vendedores = (await db.execute(sql`
        SELECT u.id::text AS id FROM embajadores e JOIN usuarios u ON u.id = e.usuario_id ORDER BY u.created_at
    `)).rows as Array<{ id: string }>;

    console.log('\n[0] Actores en la BD');
    verificar('hay al menos un superadmin', supers.length > 0, `supers=${supers.length}`);
    if (supers.length === 0) {
        console.log('\n⚠️  No hay superadmin — aborta.');
        process.exit(1);
    }

    // ─── [1] SUPERADMIN: estructura, KPIs y series ────────────────────────────────
    console.log('\n[1] metricasCrecimiento como SUPERADMIN');
    const sup = await metricasCrecimiento(panel('superadmin'), PERIODO12);
    verificar('rol == superadmin', sup.rol === 'superadmin');
    verificar('serie crecimiento tiene 12 puntos', sup.series.crecimiento.length === ESPERA_MESES, `len=${sup.series.crecimiento.length}`);
    verificar('serie ingresos tiene 12 puntos', sup.series.ingresos.length === ESPERA_MESES, `len=${sup.series.ingresos.length}`);
    verificar('meses crecimiento en formato YYYY-MM', sup.series.crecimiento.every((p) => RE_YM.test(p.mes)));
    verificar('meses crecimiento ascendentes', mesesAscendentes(sup.series.crecimiento.map((p) => p.mes)));
    verificar('meses ingresos == meses crecimiento', JSON.stringify(sup.series.ingresos.map((p) => p.mes)) === JSON.stringify(sup.series.crecimiento.map((p) => p.mes)));

    verificar('KPI negociosActivos ≥ 0', numNoNeg(sup.kpis.negociosActivos.valor), String(sup.kpis.negociosActivos.valor));
    verificar('KPI negociosActivos.anterior == null (es stock)', sup.kpis.negociosActivos.anterior === null);
    verificar('KPI altas valor/anterior ≥ 0', numNoNeg(sup.kpis.altas.valor) && numNoNeg(sup.kpis.altas.anterior));
    verificar('KPI churn valor/anterior ≥ 0', numNoNeg(sup.kpis.churn.valor) && numNoNeg(sup.kpis.churn.anterior));
    verificar('KPI ingresos valor/anterior ≥ 0', numNoNeg(sup.kpis.ingresos.valor) && numNoNeg(sup.kpis.ingresos.anterior));

    // Consistencia serie ↔ KPI (mismo rango = los 12 meses).
    verificar('Σ altas(serie) == altas.valor', sumaAltas(sup) === sup.kpis.altas.valor, `serie=${sumaAltas(sup)}, kpi=${sup.kpis.altas.valor}`);
    verificar('Σ bajas(serie) == churn.valor', sumaBajas(sup) === sup.kpis.churn.valor, `serie=${sumaBajas(sup)}, kpi=${sup.kpis.churn.valor}`);
    verificar('Σ ingresos(serie) == ingresos.valor', casi(sumaIngresos(sup), sup.kpis.ingresos.valor), `serie=${sumaIngresos(sup).toFixed(2)}, kpi=${sup.kpis.ingresos.valor.toFixed(2)}`);

    // negociosActivos == la función de dominio reusada.
    const activosDominio = await contarNegociosActivos(panel('superadmin'));
    verificar('negociosActivos == contarNegociosActivos', sup.kpis.negociosActivos.valor === activosDominio, `metricas=${sup.kpis.negociosActivos.valor}, dominio=${activosDominio}`);

    // Top vendedores (super): array, cada uno ≤ total y suma ≤ activos.
    verificar('topVendedores es array (no null) para super', Array.isArray(sup.topVendedores));
    if (sup.topVendedores) {
        verificar('cada top vendedor activos ≥ 0', sup.topVendedores.every((v) => numNoNeg(v.activos)));
        const sumaTop = sup.topVendedores.reduce((a, v) => a + v.activos, 0);
        verificar('Σ activos(topVendedores) ≤ negociosActivos', sumaTop <= sup.kpis.negociosActivos.valor, `top=${sumaTop}, activos=${sup.kpis.negociosActivos.valor}`);
        verificar('topVendedores ordenado desc por activos', sup.topVendedores.every((v, i, a) => i === 0 || a[i - 1].activos >= v.activos));
    }
    console.log(`    (super: ${sup.kpis.negociosActivos.valor} activos · altas 12m=${sup.kpis.altas.valor} · churn 12m=${sup.kpis.churn.valor} · ingresos 12m=${sup.kpis.ingresos.valor.toFixed(2)})`);

    // ─── [2] GERENTE: alcance ⊆ super + lente del super ───────────────────────────
    console.log('\n[2] metricasCrecimiento como GERENTE — alcance ⊆ super');
    const g0 = gerentes[0];
    if (g0) {
        const gte = await metricasCrecimiento(panel('gerente', { regionId: g0.region_id }), PERIODO12);
        verificar('negociosActivos(gerente) ≤ super', gte.kpis.negociosActivos.valor <= sup.kpis.negociosActivos.valor);
        verificar('altas(gerente) ≤ super', gte.kpis.altas.valor <= sup.kpis.altas.valor);
        verificar('ingresos(gerente) ≤ super', gte.kpis.ingresos.valor <= sup.kpis.ingresos.valor + 0.01);
        verificar('Σ altas(serie gerente) == altas.valor', sumaAltas(gte) === gte.kpis.altas.valor);

        const lente = await metricasCrecimiento(panelConFiltroRegion(panel('superadmin'), g0.region_id), PERIODO12);
        verificar('lente del super == gerente (negociosActivos)', lente.kpis.negociosActivos.valor === gte.kpis.negociosActivos.valor, `lente=${lente.kpis.negociosActivos.valor}, gte=${gte.kpis.negociosActivos.valor}`);
        verificar('lente del super == gerente (altas)', lente.kpis.altas.valor === gte.kpis.altas.valor);
        verificar('lente del super == gerente (ingresos)', casi(lente.kpis.ingresos.valor, gte.kpis.ingresos.valor));
    } else {
        console.log('    (no hay gerente con región — se omite)');
    }

    // ─── [3] Gerente sin región → todo 0 + series en cero ─────────────────────────
    console.log('\n[3] Defensa: gerente sin región → 0');
    const gteSin = await metricasCrecimiento(panel('gerente', { regionId: null }), PERIODO12);
    verificar('negociosActivos == 0', gteSin.kpis.negociosActivos.valor === 0);
    verificar('altas == 0', gteSin.kpis.altas.valor === 0);
    verificar('ingresos == 0', gteSin.kpis.ingresos.valor === 0);
    verificar('series en cero', sumaAltas(gteSin) === 0 && sumaBajas(gteSin) === 0 && sumaIngresos(gteSin) === 0);
    verificar('series siguen con 12 puntos (eje completo)', gteSin.series.crecimiento.length === ESPERA_MESES);

    // ─── [4] VENDEDOR: lo suyo (topVendedores null) ───────────────────────────────
    console.log('\n[4] metricasCrecimiento como VENDEDOR — lo suyo');
    const v0 = vendedores[0];
    if (v0) {
        const vend = await metricasCrecimiento(panel('vendedor', { usuarioId: v0.id }), PERIODO12);
        verificar('rol == vendedor', vend.rol === 'vendedor');
        verificar('topVendedores == null para vendedor', vend.topVendedores === null);
        verificar('negociosActivos(vendedor) ≤ super', vend.kpis.negociosActivos.valor <= sup.kpis.negociosActivos.valor);
        verificar('negociosActivos == contarNegociosActivos(vendedor)', vend.kpis.negociosActivos.valor === await contarNegociosActivos(panel('vendedor', { usuarioId: v0.id })));
        verificar('Σ altas(serie vendedor) == altas.valor', sumaAltas(vend) === vend.kpis.altas.valor);
    } else {
        console.log('    (no hay vendedores — se omite)');
    }

    // ─── [5] Vendedor sin usuarioId → 0 (defensa) ─────────────────────────────────
    console.log('\n[5] Defensa: vendedor sin usuarioId → 0');
    const vendSin = await metricasCrecimiento(panel('vendedor', { usuarioId: null }), PERIODO12);
    verificar('negociosActivos == 0', vendSin.kpis.negociosActivos.valor === 0);
    verificar('topVendedores == null', vendSin.topVendedores === null);

    // ─── [6] Periodo configurable (meses=6) ───────────────────────────────────────
    console.log('\n[6] Periodo configurable (meses=6)');
    const seis = await metricasCrecimiento(panel('superadmin'), normalizarPeriodo({ meses: 6 }));
    verificar('serie con 6 puntos', seis.series.crecimiento.length === 6, `len=${seis.series.crecimiento.length}`);

    // ─── [7] Granularidad DIARIA (último mes + rango por fechas) ───────────────────
    console.log('\n[7] Granularidad diaria (último mes / rango por fechas)');
    const ultimoMes = normalizarPeriodo({ meses: 1 });
    verificar('último mes → granularidad día', ultimoMes.granularidad === 'dia', ultimoMes.granularidad);
    verificar('último mes → ~30 puntos diarios', ultimoMes.puntos.length >= 30 && ultimoMes.puntos.length <= 31, `len=${ultimoMes.puntos.length}`);
    verificar('puntos en formato YYYY-MM-DD', ultimoMes.puntos.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)));
    const um = await metricasCrecimiento(panel('superadmin'), ultimoMes);
    verificar('serie día == # puntos del periodo', um.series.crecimiento.length === ultimoMes.puntos.length, `serie=${um.series.crecimiento.length}, puntos=${ultimoMes.puntos.length}`);
    verificar('Σ altas(serie día) == altas.valor', sumaAltas(um) === um.kpis.altas.valor, `serie=${sumaAltas(um)}, kpi=${um.kpis.altas.valor}`);
    verificar('Σ ingresos(serie día) == ingresos.valor', casi(sumaIngresos(um), um.kpis.ingresos.valor));

    const rangoCorto = normalizarPeriodo({ desde: '2026-06-01', hasta: '2026-06-20' });
    verificar('rango 20 días → granularidad día', rangoCorto.granularidad === 'dia', `${rangoCorto.granularidad}, puntos=${rangoCorto.puntos.length}`);
    const rangoLargo = normalizarPeriodo({ desde: '2025-01-01', hasta: '2026-06-20' });
    verificar('rango >2 meses → granularidad mes', rangoLargo.granularidad === 'mes', `${rangoLargo.granularidad}, puntos=${rangoLargo.puntos.length}`);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
