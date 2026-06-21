/**
 * probar-metricas-adopcion.ts — HARNESS (DEV) · Fase 1 VER del módulo "Métricas" · sección ② Adopción
 * ===================================================================================================
 * Verifica la sección "Adopción de la app" (¿usan la app los negocios y los clientes?) contra la BD
 * real. SOLO SELECT — no crea, no modifica, no borra nada. Robusto aunque haya poca actividad ScanYA.
 *
 * Cubre criterios de aceptación (Metricas_Pendientes.md · Fase 1):
 *   - super: estructura; X (activos en app) ≤ Y (que pagan); clientes activos ≤ total; inactivos = total−activos.
 *   - lista en-riesgo: cada negocio paga y NO usó la app en 30d → su tamaño == min(15, Y − X).
 *   - serie de clientes activos: 12 puntos, formato 'YYYY-MM', ascendente.
 *   - gerente ⊆ super. Gerente sin región → 0. Lente del super == gerente. Vendedor sin cuenta → 0.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-metricas-adopcion.ts
 *
 * Ubicación: apps/api/scripts/probar-metricas-adopcion.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { metricasAdopcion, normalizarPeriodo, type MetricasAdopcion } from '../src/services/admin/metricas.service.js';
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

/** Invariantes de estructura comunes a cualquier rol. */
function verificarEstructura(etiqueta: string, m: MetricasAdopcion): void {
    verificar(`${etiqueta}: activos en app ≤ que pagan`, m.negocios.activosEnApp.valor <= m.negocios.totalQuePagan, `${m.negocios.activosEnApp.valor}/${m.negocios.totalQuePagan}`);
    verificar(`${etiqueta}: activosEnApp valor/anterior ≥ 0`, numNoNeg(m.negocios.activosEnApp.valor) && numNoNeg(m.negocios.activosEnApp.anterior));
    verificar(`${etiqueta}: clientes activos ≤ total`, m.clientes.activos.valor <= m.clientes.total, `${m.clientes.activos.valor}/${m.clientes.total}`);
    verificar(`${etiqueta}: inactivos == total − activos`, m.clientes.inactivos === Math.max(0, m.clientes.total - m.clientes.activos.valor));
    verificar(`${etiqueta}: serie tiene 12 puntos`, m.serieClientesActivos.length === ESPERA_MESES, `len=${m.serieClientesActivos.length}`);
    verificar(`${etiqueta}: serie YYYY-MM ascendente`, m.serieClientesActivos.every((p) => RE_YM.test(p.mes)) && mesesAscendentes(m.serieClientesActivos.map((p) => p.mes)));
    // en-riesgo: negocios que pagan sin uso en 30d. `total` = real (badge); `items` = tope 50 (lista con scroll).
    const sinUso = Math.max(0, m.negocios.totalQuePagan - m.negocios.activosEnApp.valor);
    verificar(`${etiqueta}: enRiesgo.total == que pagan − activos`, m.enRiesgo.total === sinUso, `total=${m.enRiesgo.total}, sinUso=${sinUso}`);
    verificar(`${etiqueta}: |items| == min(50, total)`, m.enRiesgo.items.length === Math.min(50, m.enRiesgo.total), `items=${m.enRiesgo.items.length}, total=${m.enRiesgo.total}`);
    verificar(`${etiqueta}: items clientes ≥ 0 y diasSinUsar null|≥0`, m.enRiesgo.items.every((n) => numNoNeg(n.clientes) && (n.diasSinUsar === null || n.diasSinUsar >= 0)));
}

async function main(): Promise<void> {
    const supers = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo='superadmin' ORDER BY created_at LIMIT 1`)).rows as Array<{ id: string }>;
    const gerentes = (await db.execute(sql`SELECT id::text AS id, region_id::text AS region_id FROM usuarios WHERE rol_equipo='gerente' AND region_id IS NOT NULL ORDER BY created_at`)).rows as Array<{ id: string; region_id: string }>;
    const vendedores = (await db.execute(sql`SELECT u.id::text AS id FROM embajadores e JOIN usuarios u ON u.id=e.usuario_id ORDER BY u.created_at`)).rows as Array<{ id: string }>;

    console.log('\n[0] Actores');
    verificar('hay superadmin', supers.length > 0, `supers=${supers.length}`);
    if (supers.length === 0) { console.log('\n⚠️  No hay superadmin — aborta.'); process.exit(1); }

    console.log('\n[1] metricasAdopcion como SUPERADMIN');
    const sup = await metricasAdopcion(panel('superadmin'), PERIODO12);
    verificar('rol == superadmin', sup.rol === 'superadmin');
    verificarEstructura('super', sup);
    console.log(`    (super: ${sup.negocios.activosEnApp.valor}/${sup.negocios.totalQuePagan} usan la app · clientes ${sup.clientes.activos.valor} activos / ${sup.clientes.inactivos} inactivos de ${sup.clientes.total} · en riesgo: ${sup.enRiesgo.length})`);

    console.log('\n[2] GERENTE — alcance ⊆ super + lente');
    const g0 = gerentes[0];
    if (g0) {
        const gte = await metricasAdopcion(panel('gerente', { regionId: g0.region_id }), PERIODO12);
        verificarEstructura('gerente', gte);
        verificar('totalQuePagan(gerente) ≤ super', gte.negocios.totalQuePagan <= sup.negocios.totalQuePagan);
        verificar('clientes total(gerente) ≤ super', gte.clientes.total <= sup.clientes.total);
        const lente = await metricasAdopcion(panelConFiltroRegion(panel('superadmin'), g0.region_id), PERIODO12);
        verificar('lente del super == gerente (activos en app)', lente.negocios.activosEnApp.valor === gte.negocios.activosEnApp.valor);
        verificar('lente del super == gerente (clientes total)', lente.clientes.total === gte.clientes.total);
    } else { console.log('    (no hay gerente con región — se omite)'); }

    console.log('\n[3] Defensa: gerente sin región → 0');
    const gteSin = await metricasAdopcion(panel('gerente', { regionId: null }), PERIODO12);
    verificar('totalQuePagan == 0', gteSin.negocios.totalQuePagan === 0);
    verificar('clientes total == 0', gteSin.clientes.total === 0);
    verificar('enRiesgo vacío', gteSin.enRiesgo.total === 0 && gteSin.enRiesgo.items.length === 0);
    verificar('serie sigue con 12 puntos', gteSin.serieClientesActivos.length === ESPERA_MESES);

    console.log('\n[4] VENDEDOR — lo suyo');
    const v0 = vendedores[0];
    if (v0) {
        const vend = await metricasAdopcion(panel('vendedor', { usuarioId: v0.id }), PERIODO12);
        verificarEstructura('vendedor', vend);
        verificar('totalQuePagan(vendedor) ≤ super', vend.negocios.totalQuePagan <= sup.negocios.totalQuePagan);
    } else { console.log('    (no hay vendedores — se omite)'); }

    console.log('\n[5] Defensa: vendedor sin usuarioId → 0');
    const vendSin = await metricasAdopcion(panel('vendedor', { usuarioId: null }), PERIODO12);
    verificar('totalQuePagan == 0', vendSin.negocios.totalQuePagan === 0);
    verificar('clientes total == 0', vendSin.clientes.total === 0);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
