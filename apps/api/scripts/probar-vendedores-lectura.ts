/**
 * probar-vendedores-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo "Vendedores y comisiones"
 * =============================================================================================
 * Verifica las lecturas de la pieza A (CARTERA) contra la BD real. SOLO SELECT — no crea, no
 * modifica, no borra nada. Seguro de correr en cualquier ambiente.
 *
 * Cubre los criterios de aceptación de lectura (Vendedores_y_comisiones_Pendientes.md):
 *   A1 — super ve toda la red; gerente solo su equipo (su región); vendedor solo a sí mismo.
 *   A2 — cada vendedor trae su estado de cuenta: # cartera, # activos, código, región, ciudades.
 *   A3 — el vendedor ve su propia cartera; una llamada fuera de alcance → null (404).
 *
 * Requiere datos sembrados (seed-gerentes-dev.ts + seed-vendedor-prueba.ts). Si faltan, el harness
 * lo reporta y omite los casos dependientes.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-vendedores-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-vendedores-lectura.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import {
    listarVendedores,
    contarVendedores,
    obtenerVendedor,
    listarCartera,
    ESTADOS_EMBAJADOR,
} from '../src/services/admin/vendedores.service.js';
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

interface ActorVend { id: string; nombre: string; embajador_id: string; region_id: string | null }

async function main(): Promise<void> {
    // ─── Actores reales ───────────────────────────────────────────────────────────
    const supers = (await db.execute(sql`
        SELECT id::text AS id FROM usuarios WHERE rol_equipo = 'superadmin' ORDER BY created_at LIMIT 1
    `)).rows as Array<{ id: string }>;
    const gerentes = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'gerente' AND region_id IS NOT NULL ORDER BY created_at
    `)).rows as Array<{ id: string; region_id: string }>;
    // Vendedores = embajadores, con su región DEDUCIDA de embajador_ciudades.
    const vendedores = (await db.execute(sql`
        SELECT u.id::text AS id, (u.nombre || ' ' || COALESCE(u.apellidos,'')) AS nombre, e.id::text AS embajador_id,
               (SELECT c.region_id::text FROM embajador_ciudades ec JOIN ciudades c ON c.id = ec.ciudad_id
                WHERE ec.embajador_id = e.id LIMIT 1) AS region_id
        FROM embajadores e JOIN usuarios u ON u.id = e.usuario_id
        ORDER BY u.created_at
    `)).rows as unknown as ActorVend[];

    console.log('\n[0] Actores en la BD');
    verificar('hay al menos un superadmin', supers.length > 0, `supers=${supers.length}`);
    verificar('hay al menos un vendedor (embajador)', vendedores.length > 0, `vendedores=${vendedores.length}`);
    if (supers.length === 0 || vendedores.length === 0) {
        console.log('\n⚠️  Faltan actores (superadmin / vendedor) — no se puede verificar. Aborta.');
        process.exit(1);
    }
    const superId = supers[0].id;

    // ─── [1] SUPERADMIN: ve toda la red — A1 ──────────────────────────────────────
    console.log('\n[1] listarVendedores como SUPERADMIN — A1');
    const sup = await listarVendedores(panel('superadmin'), { pagina: 1, porPagina: 50 });
    verificar('hay red de ventas en la BD', sup.total > 0, `total=${sup.total}`);
    verificar('total == # de embajadores', sup.total === vendedores.length, `lista=${sup.total}, embajadores=${vendedores.length}`);
    verificar('cada fila trae nombre, correo, código y embajadorId', sup.items.every((i) => !!i.nombre && !!i.correo && !!i.codigoReferido && !!i.embajadorId));
    verificar('estados de los chips son válidos', sup.conteos.porEstado.every((e) => (ESTADOS_EMBAJADOR as readonly string[]).includes(e.estado)));
    const suma = sup.conteos.porEstado.reduce((a, e) => a + e.total, 0);
    verificar('suma de conteos == conteos.total', suma === sup.conteos.total, `suma=${suma}, total=${sup.conteos.total}`);

    // ─── [2] Métricas de cartera coherentes — A2 ──────────────────────────────────
    console.log('\n[2] Métricas de cada vendedor — A2');
    verificar('cartera y activos son enteros ≥ 0', sup.items.every((i) => Number.isInteger(i.negociosEnCartera) && i.negociosEnCartera >= 0 && Number.isInteger(i.negociosActivos) && i.negociosActivos >= 0));
    verificar('activos ≤ cartera (los activos son subconjunto)', sup.items.every((i) => i.negociosActivos <= i.negociosEnCartera));
    verificar('link de referido bien formado', sup.items.every((i) => !i.codigoReferido || (i.linkReferido?.includes(`ref=${i.codigoReferido}`) ?? false)));

    // ─── [3] Filtro por estado del embajador ──────────────────────────────────────
    console.log('\n[3] Filtro por estado=activo (como super)');
    const soloActivos = await listarVendedores(panel('superadmin'), { pagina: 1, porPagina: 50, estado: 'activo' });
    verificar('todas las filas son estado activo', soloActivos.items.every((i) => i.estadoEmbajador === 'activo'));
    const chipActivo = sup.conteos.porEstado.find((e) => e.estado === 'activo')?.total ?? 0;
    verificar("total == chip de 'activo'", soloActivos.total === chipActivo, `total=${soloActivos.total}, chip=${chipActivo}`);

    // ─── [4] Búsqueda por código ──────────────────────────────────────────────────
    console.log('\n[4] Búsqueda por código de un vendedor real');
    const muestra = sup.items[0];
    const term = muestra.codigoReferido.slice(0, Math.min(4, muestra.codigoReferido.length));
    const busq = await listarVendedores(panel('superadmin'), { pagina: 1, porPagina: 50, busqueda: term });
    verificar(`búsqueda '${term}' encuentra al vendedor`, busq.items.some((i) => i.id === muestra.id), `encontrados=${busq.items.length}`);

    // ─── [5] Conteo (badge) == total sin filtros ──────────────────────────────────
    console.log('\n[5] contarVendedores (badge) como super');
    const conteoSuper = await contarVendedores(panel('superadmin'));
    verificar('conteo == total de la lista sin filtros', conteoSuper === sup.total, `conteo=${conteoSuper}, total=${sup.total}`);

    // ─── [6] GERENTE: solo su equipo — A1 ─────────────────────────────────────────
    console.log('\n[6] listarVendedores como GERENTE — A1');
    const gte = gerentes[0];
    if (gte) {
        const vistaGte = await listarVendedores(panel('gerente', { regionId: gte.region_id }), { pagina: 1, porPagina: 50 });
        verificar('lo que ve el gerente ≤ lo que ve el super', vistaGte.total <= sup.total, `gte=${vistaGte.total}, super=${sup.total}`);
        const todosDeSuRegion = vistaGte.items.every((i) => vendedores.find((v) => v.id === i.id)?.region_id === gte.region_id);
        verificar('todos los vendedores que ve son de su región', todosDeSuRegion);
        const conteoGte = await contarVendedores(panel('gerente', { regionId: gte.region_id }));
        verificar('contarVendedores(gerente) == su total', conteoGte === vistaGte.total, `conteo=${conteoGte}, total=${vistaGte.total}`);
    } else {
        console.log('    (no hay gerente con región — se omite)');
    }

    // ─── [7] Gerente sin región no ve nada (defensa) ──────────────────────────────
    console.log('\n[7] Defensa: gerente sin región → 0');
    const gteSinRegion = await listarVendedores(panel('gerente', { regionId: null }), { pagina: 1, porPagina: 50 });
    verificar('gerente sin región ve total=0', gteSinRegion.total === 0, `total=${gteSinRegion.total}`);

    // ─── [8] Lente de región del super — A1 ───────────────────────────────────────
    console.log('\n[8] Lente de región del SUPERADMIN');
    if (gte) {
        // panelConFiltroRegion lo aplica el controller; aquí simulamos la lente = gerente de esa región.
        const lente = await listarVendedores(panel('gerente', { regionId: gte.region_id }), { pagina: 1, porPagina: 50 });
        verificar('la lente acota a los vendedores de esa región', lente.items.every((i) => vendedores.find((v) => v.id === i.id)?.region_id === gte.region_id));
    }

    // ─── [9] VENDEDOR: solo se ve a sí mismo — A1 ─────────────────────────────────
    console.log('\n[9] listarVendedores como VENDEDOR — A1');
    const v0 = vendedores[0];
    const comoVend = await listarVendedores(panel('vendedor', { usuarioId: v0.id }), { pagina: 1, porPagina: 50 });
    verificar('el vendedor solo se ve a sí mismo (total=1)', comoVend.total === 1, `total=${comoVend.total}`);
    verificar('la única fila es él mismo', comoVend.items.length === 1 && comoVend.items[0].id === v0.id);
    const vendSinId = await listarVendedores(panel('vendedor', { usuarioId: null }), { pagina: 1, porPagina: 50 });
    verificar('vendedor sin usuarioId ve total=0 (defensa)', vendSinId.total === 0, `total=${vendSinId.total}`);

    // ─── [10] Ficha de un vendedor (como super) — A2 ──────────────────────────────
    console.log('\n[10] obtenerVendedor de un vendedor real (como super)');
    const ficha = await obtenerVendedor(panel('superadmin'), v0.id);
    verificar('ficha existe', ficha !== null);
    if (ficha) {
        verificar('id coincide', ficha.id === v0.id);
        verificar('embajadorId coincide', ficha.embajadorId === v0.embajador_id);
        verificar('trae código de referido', !!ficha.codigoReferido, ficha.codigoReferido);
        verificar('trae región deducida o ciudades', !!ficha.regionNombre || !!ficha.ciudades, `${ficha.regionNombre ?? '—'} / ${ficha.ciudades ?? '—'}`);
        verificar('métricas son enteros ≥ 0', Number.isInteger(ficha.negociosEnCartera) && Number.isInteger(ficha.negociosActivos));
        verificar('NO expone contraseña (hash)', !/contrasena_?hash/i.test(JSON.stringify(ficha)));
    }

    // ─── [11] Cartera de un vendedor (como super) — A3 ────────────────────────────
    console.log('\n[11] listarCartera de un vendedor real (como super)');
    const cartera = await listarCartera(panel('superadmin'), v0.id, { pagina: 1, porPagina: 50 });
    verificar('cartera existe', cartera !== null);
    if (cartera) {
        verificar('el vendedor embebido coincide', cartera.vendedor.id === v0.id);
        verificar('total de cartera == métrica de la ficha', cartera.total === cartera.vendedor.negociosEnCartera, `cartera=${cartera.total}, ficha=${cartera.vendedor.negociosEnCartera}`);
        const sumaCart = cartera.conteos.porEstado.reduce((a, e) => a + e.total, 0);
        verificar('suma de conteos de cartera == total', sumaCart === cartera.total, `suma=${sumaCart}, total=${cartera.total}`);
        verificar('cada negocio trae nombre y estado de pago', cartera.items.every((n) => !!n.nombre && !!n.estadoPago));
        console.log(`    (cartera de ${cartera.vendedor.nombre}: ${cartera.total} negocio(s), ${cartera.vendedor.negociosActivos} activo(s))`);
    }

    // ─── [12] Alcance de la cartera (vendedor) — A3 ───────────────────────────────
    console.log('\n[12] Alcance de la cartera (como vendedor) — A3');
    const miCartera = await listarCartera(panel('vendedor', { usuarioId: v0.id }), v0.id, { pagina: 1, porPagina: 50 });
    verificar('el vendedor SÍ abre su propia cartera', miCartera !== null);
    const otro = vendedores.find((v) => v.id !== v0.id);
    if (otro) {
        const ajena = await listarCartera(panel('vendedor', { usuarioId: v0.id }), otro.id, { pagina: 1, porPagina: 50 });
        verificar('el vendedor NO abre la cartera de otro → null', ajena === null);
    } else {
        console.log('    (solo hay un vendedor — se omite el caso de cartera ajena)');
    }

    // ─── [13] Alcance de la ficha: gerente fuera de región → null ─────────────────
    console.log('\n[13] Alcance: gerente NO abre vendedor de otra región — A1');
    if (gte) {
        const vendOtraRegion = vendedores.find((v) => v.region_id && v.region_id !== gte.region_id);
        if (vendOtraRegion) {
            const fuera = await obtenerVendedor(panel('gerente', { regionId: gte.region_id }), vendOtraRegion.id);
            verificar('gerente NO abre la ficha de un vendedor de otra región → null', fuera === null);
            const carteraFuera = await listarCartera(panel('gerente', { regionId: gte.region_id }), vendOtraRegion.id, { pagina: 1, porPagina: 50 });
            verificar('gerente NO abre la cartera de un vendedor de otra región → null', carteraFuera === null);
        } else {
            console.log('    (no hay vendedor de otra región — se omite)');
        }
    }

    // ─── [14] id inexistente → null ───────────────────────────────────────────────
    console.log('\n[14] id inexistente → null');
    const nulo = await obtenerVendedor(panel('superadmin'), '00000000-0000-0000-0000-000000000000');
    verificar('id inexistente → null', nulo === null);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
