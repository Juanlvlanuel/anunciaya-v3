/**
 * probar-equipo-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo "Equipo y accesos"
 * ===================================================================================
 * Verifica las lecturas del módulo Equipo y accesos contra la BD real. SOLO SELECT — no crea,
 * no modifica, no borra nada. Seguro de correr en cualquier ambiente.
 *
 * Cubre los criterios de aceptación de lectura (Equipo_y_accesos_Pendientes.md):
 *   A1 — el superadmin ve a todo el equipo (super/gerentes/vendedores) con rol y alcance.
 *   A2 — el gerente ve SOLO sus vendedores (de su región); nunca super, otros gerentes ni a sí mismo.
 *   A3 — defensa en profundidad: un solicitante 'vendedor'/desconocido no ve nada.
 *   A4 — la lente de región del superadmin acota a esa región (su gerente + sus vendedores).
 *
 * Requiere datos sembrados de equipo (seed-gerentes-dev.ts + seed-vendedor-prueba.ts). Si faltan,
 * el harness lo reporta y omite los casos dependientes.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-equipo-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-equipo-lectura.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import {
    listarEquipo,
    obtenerMiembro,
    contarEquipo,
    ROLES_EQUIPO,
} from '../src/services/admin/equipo.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

interface ActorEquipo { id: string; nombre: string; region_id: string | null }

async function main(): Promise<void> {
    // ─── Actores reales (sin correos fijos: por rol_equipo) ───────────────────────
    const supers = (await db.execute(sql`
        SELECT id::text AS id, (nombre || ' ' || apellidos) AS nombre, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'superadmin' ORDER BY created_at LIMIT 1
    `)).rows as unknown as ActorEquipo[];
    const gerentes = (await db.execute(sql`
        SELECT id::text AS id, (nombre || ' ' || apellidos) AS nombre, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'gerente' ORDER BY created_at
    `)).rows as unknown as ActorEquipo[];

    console.log('\n[0] Actores en la BD');
    verificar('hay al menos un superadmin', supers.length > 0, `supers=${supers.length}`);
    verificar('hay al menos un gerente', gerentes.length > 0, `gerentes=${gerentes.length}`);
    if (supers.length === 0) {
        console.log('\n⚠️  Sin superadmin en la BD — no se puede verificar. Aborta.');
        process.exit(1);
    }

    // ─── [1] SUPERADMIN sin lente: ve a todo el equipo ────────────────────────────
    console.log('\n[1] listarEquipo como SUPERADMIN (sin lente) — A1');
    const sup = await listarEquipo({ pagina: 1, porPagina: 50, rolSolicitante: 'superadmin' });
    verificar('hay equipo en la BD', sup.total > 0, `total=${sup.total}`);
    verificar('conteos.porRol no vacío', sup.conteos.porRol.length > 0, JSON.stringify(sup.conteos.porRol));
    const suma = sup.conteos.porRol.reduce((a, r) => a + r.total, 0);
    verificar('suma de conteos == conteos.total', suma === sup.conteos.total, `suma=${suma}, total=${sup.conteos.total}`);
    verificar('todos los roles de los chips son válidos', sup.conteos.porRol.every((r) => (ROLES_EQUIPO as readonly string[]).includes(r.rol)));
    verificar('cada fila trae nombre, correo y rol', sup.items.every((i) => !!i.nombre && !!i.correo && !!i.rolEquipo));
    const vendedores = sup.items.filter((i) => i.rolEquipo === 'vendedor');
    verificar('hay al menos un vendedor para los casos siguientes', vendedores.length > 0, `vendedores=${vendedores.length}`);

    // ─── [2] Filtro por rol ───────────────────────────────────────────────────────
    console.log('\n[2] Filtro por rol=vendedor (como super)');
    const soloVend = await listarEquipo({ pagina: 1, porPagina: 50, rol: 'vendedor', rolSolicitante: 'superadmin' });
    verificar('todas las filas son vendedor', soloVend.items.every((i) => i.rolEquipo === 'vendedor'));
    const chipVend = sup.conteos.porRol.find((r) => r.rol === 'vendedor')?.total ?? 0;
    verificar("total == chip de 'vendedor'", soloVend.total === chipVend, `total=${soloVend.total}, chip=${chipVend}`);

    // ─── [3] Búsqueda ─────────────────────────────────────────────────────────────
    console.log('\n[3] Búsqueda por correo de un miembro real');
    const muestra = sup.items[0];
    if (muestra) {
        const term = muestra.correo.slice(0, Math.min(6, muestra.correo.length));
        const busq = await listarEquipo({ pagina: 1, porPagina: 50, busqueda: term, rolSolicitante: 'superadmin' });
        verificar(`búsqueda '${term}' encuentra al miembro`, busq.items.some((i) => i.id === muestra.id), `encontrados=${busq.items.length}`);
    }

    // ─── [4] Conteo (badge) == total de la lista sin filtros ──────────────────────
    console.log('\n[4] contarEquipo (badge) como super');
    const conteoSuper = await contarEquipo('superadmin');
    verificar('conteo == total de la lista sin filtros', conteoSuper === sup.total, `conteo=${conteoSuper}, total=${sup.total}`);

    // ─── [5] GERENTE: SOLO sus vendedores ─────────────────────────────────────────
    console.log('\n[5] listarEquipo como GERENTE — A2');
    const gerenteConRegion = gerentes.find((g) => !!g.region_id);
    if (gerenteConRegion) {
        const vistaGte = await listarEquipo({ pagina: 1, porPagina: 50, rolSolicitante: 'gerente', regionSolicitante: gerenteConRegion.region_id });
        verificar('el gerente solo ve vendedores', vistaGte.items.every((i) => i.rolEquipo === 'vendedor'), `roles=${[...new Set(vistaGte.items.map((i) => i.rolEquipo))].join(',') || '∅'}`);
        verificar('el gerente NO se ve a sí mismo', !vistaGte.items.some((i) => i.id === gerenteConRegion.id));
        verificar('el gerente NO ve al superadmin', !vistaGte.items.some((i) => i.id === supers[0].id));
        verificar('lo que ve el gerente ≤ lo que ve el super', vistaGte.total <= sup.total, `gte=${vistaGte.total}, super=${sup.total}`);
        const conteoGte = await contarEquipo('gerente', gerenteConRegion.region_id);
        verificar('contarEquipo(gerente) == su total', conteoGte === vistaGte.total, `conteo=${conteoGte}, total=${vistaGte.total}`);
    } else {
        verificar('hay un gerente con región para probar el alcance', false, 'ningún gerente tiene region_id');
    }

    // ─── [6] Aislamiento entre regiones ───────────────────────────────────────────
    console.log('\n[6] Aislamiento entre regiones (si hay 2 gerentes de regiones distintas)');
    const dosRegiones = gerentes.filter((g) => !!g.region_id);
    const regionA = dosRegiones[0]?.region_id;
    const regionB = dosRegiones.find((g) => g.region_id !== regionA)?.region_id;
    if (regionA && regionB) {
        const vA = await listarEquipo({ pagina: 1, porPagina: 50, rolSolicitante: 'gerente', regionSolicitante: regionA });
        const vB = await listarEquipo({ pagina: 1, porPagina: 50, rolSolicitante: 'gerente', regionSolicitante: regionB });
        const idsB = new Set(vB.items.map((i) => i.id));
        const interseccion = vA.items.filter((i) => idsB.has(i.id));
        verificar('vendedores de región A y B son disjuntos', interseccion.length === 0, `comunes=${interseccion.length}`);
    } else {
        console.log('    (no hay 2 regiones distintas con gerente — se omite)');
    }

    // ─── [7] Defensa en profundidad: vendedor/desconocido no ve nada — A3 ─────────
    console.log('\n[7] Defensa en profundidad (rolSolicitante=vendedor)');
    const comoVendedor = await listarEquipo({ pagina: 1, porPagina: 50, rolSolicitante: 'vendedor' });
    verificar('un vendedor no ve nada (total=0)', comoVendedor.total === 0, `total=${comoVendedor.total}`);

    // ─── [8] Lente de región del super — A4 ───────────────────────────────────────
    console.log('\n[8] Lente de región del SUPERADMIN — A4');
    if (gerenteConRegion) {
        const lente = await listarEquipo({ pagina: 1, porPagina: 50, rolSolicitante: 'superadmin', regionSolicitante: gerenteConRegion.region_id });
        verificar('la lente incluye al gerente de esa región', lente.items.some((i) => i.id === gerenteConRegion.id));
        verificar('la lente solo trae gerentes de esa región o vendedores', lente.items.every((i) => i.rolEquipo === 'vendedor' || (i.rolEquipo === 'gerente' && i.id === gerenteConRegion.id)));
        verificar('la lente NO incluye al superadmin', !lente.items.some((i) => i.id === supers[0].id));
    }

    // ─── [9] Ficha de un VENDEDOR (como super) ────────────────────────────────────
    console.log('\n[9] obtenerMiembro de un vendedor real (como super)');
    const vend = vendedores[0];
    if (vend) {
        const ficha = await obtenerMiembro(vend.id, 'superadmin');
        verificar('ficha existe', ficha !== null);
        if (ficha) {
            verificar('id coincide', ficha.id === vend.id);
            verificar('rol = vendedor', ficha.rolEquipo === 'vendedor');
            verificar('trae región deducida', !!ficha.regionNombre, ficha.regionNombre ?? 'null');
            verificar('trae ciudades de cobertura', !!ficha.ciudades, ficha.ciudades ?? 'null');
            verificar('negociosAtribuidos es número ≥ 0', Number.isInteger(ficha.negociosAtribuidos) && ficha.negociosAtribuidos >= 0, String(ficha.negociosAtribuidos));
            const json = JSON.stringify(ficha);
            verificar('NO expone contraseña (hash)', !/contrasena_?hash/i.test(json));
            verificar('NO expone secretos 2FA', !/_secreto|"secret/i.test(json));
        }
    }

    // ─── [10] Ficha de un GERENTE (como super) ────────────────────────────────────
    console.log('\n[10] obtenerMiembro de un gerente real (como super)');
    if (gerenteConRegion) {
        const fichaG = await obtenerMiembro(gerenteConRegion.id, 'superadmin');
        verificar('ficha del gerente existe', fichaG !== null);
        if (fichaG) {
            verificar('rol = gerente', fichaG.rolEquipo === 'gerente');
            verificar('trae regionId y regionNombre', !!fichaG.regionId && !!fichaG.regionNombre, fichaG.regionNombre ?? 'null');
            verificar('sin datos de vendedor (codigo/ciudades/estadoEmbajador null)', !fichaG.codigoReferido && !fichaG.ciudades && !fichaG.estadoEmbajador);
        }
    }

    // ─── [11] Alcance de la ficha: gerente NO ve a otro gerente ni al super ───────
    console.log('\n[11] Alcance de la ficha (como gerente) — A2');
    if (gerenteConRegion) {
        const reg = gerenteConRegion.region_id;
        const verSuper = await obtenerMiembro(supers[0].id, 'gerente', reg);
        verificar('gerente NO abre la ficha del super → null', verSuper === null);
        const verSiMismo = await obtenerMiembro(gerenteConRegion.id, 'gerente', reg);
        verificar('gerente NO abre su propia ficha aquí → null', verSiMismo === null);
        // Sí puede abrir la ficha de uno de SUS vendedores.
        const susVend = await listarEquipo({ pagina: 1, porPagina: 1, rolSolicitante: 'gerente', regionSolicitante: reg });
        if (susVend.items[0]) {
            const verVend = await obtenerMiembro(susVend.items[0].id, 'gerente', reg);
            verificar('gerente SÍ abre la ficha de su vendedor', verVend !== null);
        }
    }

    // ─── [12] id inexistente → null ───────────────────────────────────────────────
    console.log('\n[12] id inexistente → null');
    const nulo = await obtenerMiembro('00000000-0000-0000-0000-000000000000', 'superadmin');
    verificar('id inexistente → null', nulo === null);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
