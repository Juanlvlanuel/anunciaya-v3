/**
 * probar-metricas-usuarios.ts — HARNESS (DEV) · Fase 1 VER del módulo "Métricas" · sección ③ Usuarios
 * ===================================================================================================
 * Verifica la sección "Usuarios y comunidad" (base de usuarios, registros, perfil, ciudades) contra la
 * BD real. SOLO SELECT — no crea, no modifica, no borra nada.
 *
 * Cubre criterios de aceptación (Metricas_Pendientes.md · Fase 1):
 *   - super: KPIs válidos; activos ≤ total; verificadosPct ∈ [0,100]; personal+comercial == total.
 *   - consistencia serie ↔ KPI: Σ registros(serie) == nuevos.valor.
 *   - serie: 12 puntos, 'YYYY-MM', ascendente. topCiudades: ≤8, ordenada desc, Σ ≤ total.
 *   - gerente ⊆ super. Lente del super == gerente. VENDEDOR → vacío (no entra al módulo Usuarios).
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-metricas-usuarios.ts
 *
 * Ubicación: apps/api/scripts/probar-metricas-usuarios.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { metricasUsuarios, normalizarPeriodo, type MetricasUsuarios } from '../src/services/admin/metricas.service.js';
import { contarUsuarios } from '../src/services/admin/usuarios.service.js';
import { panelConFiltroRegion } from '../src/services/admin/negocios.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

function panel(rol: UsuarioPanel['rolEquipo'], opts?: { regionId?: string | null; usuarioId?: string | null }): UsuarioPanel {
    return { usuarioId: opts?.usuarioId ?? null, rolEquipo: rol, regionId: opts?.regionId ?? null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
}

const numNoNeg = (n: number | null | undefined): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const ESPERA_MESES = 12;
const PERIODO12 = normalizarPeriodo({ meses: ESPERA_MESES });
const RE_YM = /^\d{4}-(0[1-9]|1[0-2])$/;
function mesesAscendentes(meses: string[]): boolean {
    for (let i = 1; i < meses.length; i++) if (meses[i - 1] >= meses[i]) return false;
    return true;
}
const sumaRegistros = (m: MetricasUsuarios) => m.serieRegistros.reduce((a, p) => a + p.registros, 0);

async function main(): Promise<void> {
    const supers = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo='superadmin' ORDER BY created_at LIMIT 1`)).rows as Array<{ id: string }>;
    const gerentes = (await db.execute(sql`SELECT id::text AS id, region_id::text AS region_id FROM usuarios WHERE rol_equipo='gerente' AND region_id IS NOT NULL ORDER BY created_at`)).rows as Array<{ id: string; region_id: string }>;
    const vendedores = (await db.execute(sql`SELECT u.id::text AS id FROM embajadores e JOIN usuarios u ON u.id=e.usuario_id ORDER BY u.created_at`)).rows as Array<{ id: string }>;

    console.log('\n[0] Actores');
    verificar('hay superadmin', supers.length > 0, `supers=${supers.length}`);
    if (supers.length === 0) { console.log('\n⚠️  No hay superadmin — aborta.'); process.exit(1); }

    console.log('\n[1] metricasUsuarios como SUPERADMIN');
    const sup = await metricasUsuarios(panel('superadmin'), PERIODO12);
    verificar('rol == superadmin', sup.rol === 'superadmin');
    verificar('KPI total ≥ 0', numNoNeg(sup.kpis.total.valor), String(sup.kpis.total.valor));
    verificar('KPI nuevos valor/anterior ≥ 0', numNoNeg(sup.kpis.nuevos.valor) && numNoNeg(sup.kpis.nuevos.anterior));
    verificar('activos ≤ total', sup.kpis.activos.valor <= sup.kpis.total.valor, `activos=${sup.kpis.activos.valor}, total=${sup.kpis.total.valor}`);
    verificar('verificadosPct ∈ [0,100]', sup.kpis.verificadosPct.valor >= 0 && sup.kpis.verificadosPct.valor <= 100, String(sup.kpis.verificadosPct.valor));
    verificar('personal + comercial == total', sup.distribucion.personal + sup.distribucion.comercial === sup.kpis.total.valor, `${sup.distribucion.personal}+${sup.distribucion.comercial} vs ${sup.kpis.total.valor}`);
    verificar('serie 12 puntos', sup.serieRegistros.length === ESPERA_MESES, `len=${sup.serieRegistros.length}`);
    verificar('serie YYYY-MM ascendente', sup.serieRegistros.every((p) => RE_YM.test(p.mes)) && mesesAscendentes(sup.serieRegistros.map((p) => p.mes)));
    verificar('Σ registros(serie) == nuevos.valor', sumaRegistros(sup) === sup.kpis.nuevos.valor, `serie=${sumaRegistros(sup)}, kpi=${sup.kpis.nuevos.valor}`);
    verificar('topCiudades ≤ 8', sup.topCiudades.length <= 8);
    verificar('topCiudades ordenada desc', sup.topCiudades.every((c, i, a) => i === 0 || a[i - 1].total >= c.total));
    verificar('Σ topCiudades.total ≤ total', sup.topCiudades.reduce((a, c) => a + c.total, 0) <= sup.kpis.total.valor);
    verificar('total == contarUsuarios(super)', sup.kpis.total.valor === await contarUsuarios('superadmin', null));
    console.log(`    (super: ${sup.kpis.total.valor} usuarios · ${sup.kpis.nuevos.valor} nuevos 12m · ${sup.kpis.activos.valor} activos · ${sup.kpis.verificadosPct.valor}% verificados · personal ${sup.distribucion.personal}/comercial ${sup.distribucion.comercial})`);

    console.log('\n[2] GERENTE — alcance ⊆ super + lente');
    const g0 = gerentes[0];
    if (g0) {
        const gte = await metricasUsuarios(panel('gerente', { regionId: g0.region_id }), PERIODO12);
        verificar('total(gerente) ≤ super', gte.kpis.total.valor <= sup.kpis.total.valor);
        verificar('nuevos(gerente) ≤ super', gte.kpis.nuevos.valor <= sup.kpis.nuevos.valor);
        verificar('Σ registros == nuevos (gerente)', sumaRegistros(gte) === gte.kpis.nuevos.valor);
        const lente = await metricasUsuarios(panelConFiltroRegion(panel('superadmin'), g0.region_id), PERIODO12);
        verificar('lente del super == gerente (total)', lente.kpis.total.valor === gte.kpis.total.valor, `lente=${lente.kpis.total.valor}, gte=${gte.kpis.total.valor}`);
    } else { console.log('    (no hay gerente con región — se omite)'); }

    console.log('\n[3] VENDEDOR → vacío (no entra al módulo Usuarios)');
    const v0 = vendedores[0];
    const vend = await metricasUsuarios(panel('vendedor', { usuarioId: v0?.id ?? null }), PERIODO12);
    verificar('total == 0', vend.kpis.total.valor === 0);
    verificar('topCiudades vacío', vend.topCiudades.length === 0);
    verificar('serie en cero', sumaRegistros(vend) === 0);

    console.log('\n[4] Periodo configurable (meses=6)');
    const seis = await metricasUsuarios(panel('superadmin'), normalizarPeriodo({ meses: 6 }));
    verificar('serie con 6 puntos', seis.serieRegistros.length === 6, `len=${seis.serieRegistros.length}`);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
