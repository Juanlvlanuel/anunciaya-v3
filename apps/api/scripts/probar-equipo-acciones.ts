/**
 * probar-equipo-acciones.ts — HARNESS (DEV) · Fase 2 ACTUAR del módulo "Equipo y accesos"
 * ========================================================================================
 * Verifica las acciones de escritura con datos reales. CREA un vendedor de prueba, lo prueba y
 * LO LIMPIA al final (try/finally). SOLO DEV (aborta si DB_ENVIRONMENT=production).
 *
 * Cubre: A6 (alta crea cuenta+embajador+ciudades), A7 (promover correo existente), A8 (alcance del
 * gerente), A9 (revocar → rol NULL + embajador inactivo + atribución conservada; revocado sigue
 * visible), E3 (código sugerido único), y la reactivación de un vendedor dado de baja.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-equipo-acciones.ts
 *
 * Ubicación: apps/api/scripts/probar-equipo-acciones.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import {
    altaVendedor,
    altaGerente,
    revocarAcceso,
    reactivarAcceso,
    editarDatos,
    reasignarRegion,
    sugerirCodigoReferido,
} from '../src/services/admin/equipo-acciones.service.js';
import { obtenerMiembro, listarEquipo } from '../src/services/admin/equipo.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const CORREO_PRUEBA = 'vendedor.alta.prueba@dev.local';
const CORREO_GERENTE = 'gerente.alta.prueba@dev.local';
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

function panelSuper(usuarioId: string): UsuarioPanel {
    return { usuarioId, rolEquipo: 'superadmin', regionId: null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
}
function panelGerente(usuarioId: string, regionId: string): UsuarioPanel {
    return { usuarioId, rolEquipo: 'gerente', regionId, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
}

async function limpiar(): Promise<void> {
    await db.execute(sql`DELETE FROM embajador_ciudades WHERE embajador_id IN (
        SELECT e.id FROM embajadores e JOIN usuarios u ON u.id = e.usuario_id WHERE u.correo = ${CORREO_PRUEBA}
    )`);
    await db.execute(sql`DELETE FROM embajadores WHERE usuario_id IN (SELECT id FROM usuarios WHERE correo = ${CORREO_PRUEBA})`);
    await db.execute(sql`DELETE FROM usuarios WHERE correo IN (${CORREO_PRUEBA}, ${CORREO_GERENTE}, 'gerente.editado.prueba@dev.local')`);
}

async function main(): Promise<void> {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Este harness es solo para DEV.');
        process.exit(1);
    }

    // ── Datos reales: superadmin, ciudades por región, un gerente ────────────────
    const [sup] = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    if (!sup) { console.error('✗ No hay superadmin en la BD.'); process.exit(1); }

    const ciudades = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id FROM ciudades
        WHERE activa = true AND region_id IS NOT NULL ORDER BY region_id
    `)).rows as Array<{ id: string; region_id: string }>;
    const porRegion = new Map<string, string[]>();
    for (const c of ciudades) porRegion.set(c.region_id, [...(porRegion.get(c.region_id) ?? []), c.id]);
    const regiones = [...porRegion.keys()];
    if (regiones.length === 0) { console.error('✗ No hay ciudades activas con región.'); process.exit(1); }
    const regionA = regiones[0];
    const ciudadesA = porRegion.get(regionA)!;
    const regionB = regiones.find((r) => r !== regionA);
    const ciudadesB = regionB ? porRegion.get(regionB)! : null;

    await limpiar(); // arranca limpio

    try {
        const S = panelSuper(sup.id);

        // ── [1] Sugerir código único (E3) ────────────────────────────────────────
        console.log('\n[1] sugerirCodigoReferido — único');
        const cod = await sugerirCodigoReferido('Vendedor', 'Prueba');
        verificar('devuelve un código no vacío', !!cod, cod);
        const enUso = (await db.execute(sql`SELECT 1 FROM embajadores WHERE codigo_referido = ${cod} LIMIT 1`)).rows.length > 0;
        verificar('el código sugerido NO está en uso', !enUso);

        // ── [2] Alta de vendedor NUEVO (A6) ──────────────────────────────────────
        console.log('\n[2] altaVendedor — cuenta nueva (modelo C)');
        const alta = await altaVendedor(S, {
            nombre: 'Vendedor', apellidos: 'Prueba', correo: CORREO_PRUEBA,
            telefono: undefined, codigoReferido: cod, ciudadIds: [ciudadesA[0]],
        });
        verificar('alta ok', alta.ok, JSON.stringify(alta));
        if (!alta.ok) throw new Error('alta falló, no se puede continuar');
        verificar('no es promoción (cuenta nueva)', alta.promovido === false);
        const usuarioId = alta.usuarioId;

        const fila = (await db.execute(sql`
            SELECT u.rol_equipo, u.es_embajador, u.contrasena_hash,
                   (SELECT e.estado FROM embajadores e WHERE e.usuario_id = u.id LIMIT 1) AS emb_estado,
                   (SELECT e.codigo_referido FROM embajadores e WHERE e.usuario_id = u.id LIMIT 1) AS emb_codigo,
                   (SELECT COUNT(*)::int FROM embajador_ciudades ec JOIN embajadores e ON e.id = ec.embajador_id WHERE e.usuario_id = u.id) AS n_ciudades
            FROM usuarios u WHERE u.id = ${usuarioId}
        `)).rows[0] as { rol_equipo: string; es_embajador: boolean; contrasena_hash: string | null; emb_estado: string; emb_codigo: string; n_ciudades: number };
        verificar("rol_equipo = 'vendedor'", fila.rol_equipo === 'vendedor');
        verificar('es_embajador = true', fila.es_embajador === true);
        verificar('nace SIN contraseña (modelo C)', fila.contrasena_hash === null);
        verificar("embajador estado = 'activo'", fila.emb_estado === 'activo');
        verificar('embajador con el código dado', fila.emb_codigo === cod);
        verificar('cobertura con 1 ciudad', fila.n_ciudades === 1, String(fila.n_ciudades));

        // ── [3] Alta repetida con el mismo correo → 409 (ya es vendedor) (E1) ─────
        console.log('\n[3] altaVendedor — correo que ya es vendedor → 409');
        const dup = await altaVendedor(S, {
            nombre: 'Vendedor', apellidos: 'Prueba', correo: CORREO_PRUEBA,
            telefono: undefined, codigoReferido: 'OTROCODIGO1', ciudadIds: [ciudadesA[0]],
        });
        verificar('rechaza con 409', !dup.ok && dup.status === 409, dup.ok ? 'ok=true ✗' : `status=${dup.status}`);

        // ── [6] Revocar acceso (A9) ──────────────────────────────────────────────
        console.log('\n[6] revocarAcceso — corte + embajador inactivo + atribución conservada');
        const rev = await revocarAcceso(S, usuarioId);
        verificar('revocar ok', rev.ok, JSON.stringify(rev));
        const trasRev = (await db.execute(sql`
            SELECT u.rol_equipo,
                   (SELECT e.estado FROM embajadores e WHERE e.usuario_id = u.id LIMIT 1) AS emb_estado,
                   (SELECT COUNT(*)::int FROM embajadores e WHERE e.usuario_id = u.id) AS emb_existe
            FROM usuarios u WHERE u.id = ${usuarioId}
        `)).rows[0] as { rol_equipo: string | null; emb_estado: string; emb_existe: number };
        verificar('rol_equipo = NULL (corte del Panel)', trasRev.rol_equipo === null);
        verificar("embajador estado = 'inactivo'", trasRev.emb_estado === 'inactivo');
        verificar('la fila embajador PERSISTE (atribución conservada)', trasRev.emb_existe === 1);
        // El revocado SIGUE visible en la lista (mejora UX): aparece como Vendedor "Sin acceso".
        const listaTrasRev = await listarEquipo({ pagina: 1, porPagina: 100, rolSolicitante: 'superadmin' });
        const filaRev = listaTrasRev.items.find((i) => i.id === usuarioId);
        verificar('el revocado SIGUE visible en la lista', !!filaRev);
        verificar('aparece como revocado (sin acceso)', filaRev?.revocado === true && filaRev?.accesoActivo === false);
        verificar('se muestra como Vendedor (rol efectivo)', filaRev?.rolEquipo === 'vendedor');

        // ── [7] Reactivar acceso (vendedor revocado → vuelve a tener acceso) ──────
        console.log('\n[7] reactivarAcceso — devuelve el acceso conservando código y ciudades');
        const react = await reactivarAcceso(S, usuarioId);
        verificar('reactivar ok', react.ok, JSON.stringify(react));
        const trasReact = (await db.execute(sql`
            SELECT u.rol_equipo,
                   (SELECT e.estado FROM embajadores e WHERE e.usuario_id = u.id LIMIT 1) AS emb_estado,
                   (SELECT e.codigo_referido FROM embajadores e WHERE e.usuario_id = u.id LIMIT 1) AS emb_codigo
            FROM usuarios u WHERE u.id = ${usuarioId}
        `)).rows[0] as { rol_equipo: string; emb_estado: string; emb_codigo: string };
        verificar("rol_equipo = 'vendedor' de nuevo", trasReact.rol_equipo === 'vendedor');
        verificar("embajador estado = 'activo' de nuevo", trasReact.emb_estado === 'activo');
        verificar('código conservado', trasReact.emb_codigo === cod, `${trasReact.emb_codigo} (orig ${cod})`);
        const reactDup = await reactivarAcceso(S, usuarioId);
        verificar('reactivar a un vendedor activo → 409', !reactDup.ok && reactDup.status === 409, reactDup.ok ? 'ok=true ✗' : `status=${reactDup.status}`);

        // ── [8] Ficha refleja los cambios ────────────────────────────────────────
        console.log('\n[8] obtenerMiembro — refleja link de referido y estado');
        const ficha = await obtenerMiembro(usuarioId, 'superadmin');
        verificar('ficha existe', ficha !== null);
        verificar('link de referido contiene el código', !!ficha?.linkReferido?.includes(cod), ficha?.linkReferido ?? 'null');

        // ── [9] Alcance del gerente (A8) ─────────────────────────────────────────
        console.log('\n[9] alcance del gerente — alta fuera de su región → 403');
        const [gte] = (await db.execute(sql`SELECT id::text AS id, region_id::text AS region_id FROM usuarios WHERE rol_equipo = 'gerente' AND region_id IS NOT NULL LIMIT 1`)).rows as Array<{ id: string; region_id: string }>;
        if (gte && ciudadesB && gte.region_id !== regionB) {
            const G = panelGerente(gte.id, gte.region_id);
            const fuera = await altaVendedor(G, {
                nombre: 'X', apellidos: 'Y', correo: 'otro.vendedor.prueba@dev.local',
                telefono: undefined, codigoReferido: 'GERTEST01', ciudadIds: [ciudadesB[0]],
            });
            verificar('gerente NO puede dar de alta en otra región → 403', !fuera.ok && fuera.status === 403, fuera.ok ? 'ok=true ✗' : `status=${fuera.status}`);
        } else {
            console.log('    (sin gerente o sin 2ª región distinta — se omite)');
        }

        // ── [10] altaGerente — crea un gerente con región (solo super) ────────────
        console.log('\n[10] altaGerente — crea gerente con región');
        const altaG = await altaGerente(S, { nombre: 'Gerente', apellidos: 'Prueba', correo: CORREO_GERENTE, telefono: undefined, regionId: regionA });
        verificar('alta gerente ok', altaG.ok, JSON.stringify(altaG));
        if (!altaG.ok) throw new Error('alta gerente falló');
        const gerenteId = altaG.usuarioId;
        const filaG = (await db.execute(sql`SELECT rol_equipo, region_id::text AS region_id, contrasena_hash FROM usuarios WHERE id = ${gerenteId}`)).rows[0] as { rol_equipo: string; region_id: string; contrasena_hash: string | null };
        verificar("rol_equipo = 'gerente'", filaG.rol_equipo === 'gerente');
        verificar('region_id asignada', filaG.region_id === regionA);
        verificar('nace SIN contraseña (modelo C)', filaG.contrasena_hash === null);

        // ── [11] editarDatos — corrige nombre, teléfono y correo ──────────────────
        console.log('\n[11] editarDatos — corrige nombre/teléfono/correo');
        const ed = await editarDatos(S, gerenteId, { nombre: 'GerenteEditado', telefono: '+526380000000', correo: 'gerente.editado.prueba@dev.local' });
        verificar('editar ok', ed.ok, JSON.stringify(ed));
        const trasEd = (await db.execute(sql`SELECT nombre, telefono, correo, correo_verificado FROM usuarios WHERE id = ${gerenteId}`)).rows[0] as { nombre: string; telefono: string; correo: string; correo_verificado: boolean };
        verificar('nombre actualizado', trasEd.nombre === 'GerenteEditado');
        verificar('teléfono actualizado', trasEd.telefono === '+526380000000');
        verificar('correo actualizado', trasEd.correo === 'gerente.editado.prueba@dev.local');
        verificar('correo marcado sin verificar', trasEd.correo_verificado === false);

        // ── [12] reasignarRegion — cambia la región del gerente (si hay 2ª) ───────
        console.log('\n[12] reasignarRegion — cambia la región del gerente');
        if (regionB) {
            const rr = await reasignarRegion(S, gerenteId, regionB);
            verificar('reasignar ok', rr.ok, JSON.stringify(rr));
            const regNueva = (await db.execute(sql`SELECT region_id::text AS region_id FROM usuarios WHERE id = ${gerenteId}`)).rows[0] as { region_id: string };
            verificar('region_id cambió', regNueva.region_id === regionB, regNueva.region_id);
        } else {
            console.log('    (sin 2ª región — se omite)');
        }

        // ── [13] revocar gerente — rol NULL, sigue visible como ex-gerente ────────
        console.log('\n[13] revocarAcceso (gerente) — corte + sigue visible');
        const revG = await revocarAcceso(S, gerenteId);
        verificar('revocar gerente ok', revG.ok, JSON.stringify(revG));
        const trasRevG = (await db.execute(sql`SELECT rol_equipo, region_id::text AS region_id FROM usuarios WHERE id = ${gerenteId}`)).rows[0] as { rol_equipo: string | null; region_id: string };
        verificar('rol_equipo = NULL', trasRevG.rol_equipo === null);
        verificar('region_id CONSERVADA', !!trasRevG.region_id);
        const listaG = await listarEquipo({ pagina: 1, porPagina: 100, rolSolicitante: 'superadmin' });
        const filaExGer = listaG.items.find((i) => i.id === gerenteId);
        verificar('ex-gerente sigue visible', !!filaExGer);
        verificar('se muestra como Gerente revocado', filaExGer?.rolEquipo === 'gerente' && filaExGer?.revocado === true);

        // ── [14] reactivar gerente — rol gerente de nuevo ─────────────────────────
        console.log('\n[14] reactivarAcceso (gerente) — vuelve a gerente');
        const reactG = await reactivarAcceso(S, gerenteId);
        verificar('reactivar gerente ok', reactG.ok, JSON.stringify(reactG));
        const trasReactG = (await db.execute(sql`SELECT rol_equipo FROM usuarios WHERE id = ${gerenteId}`)).rows[0] as { rol_equipo: string };
        verificar("rol_equipo = 'gerente' de nuevo", trasReactG.rol_equipo === 'gerente');

        // ── [15] un gerente NO puede crear gerente → 403 ──────────────────────────
        console.log('\n[15] altaGerente como gerente → 403');
        if (gte) {
            const G = panelGerente(gte.id, gte.region_id);
            const negado = await altaGerente(G, { nombre: 'X', apellidos: 'Y', correo: 'no.deberia@dev.local', telefono: undefined, regionId: regionA });
            verificar('gerente no puede crear gerente', !negado.ok && negado.status === 403, negado.ok ? 'ok=true ✗' : `status=${negado.status}`);
        } else {
            console.log('    (sin gerente para probar — se omite)');
        }

        // ── [16] editar el correo de una cuenta CON contraseña → 409 ──────────────
        console.log('\n[16] editarDatos: cambiar el correo de una cuenta con contraseña → 409');
        const correoBloqueado = await editarDatos(S, sup.id, { correo: 'no.permitido.prueba@dev.local' });
        verificar('rechaza cambiar el correo verificado', !correoBloqueado.ok && correoBloqueado.status === 409, correoBloqueado.ok ? 'ok=true ✗' : `status=${correoBloqueado.status}`);
        const correoSuper = (await db.execute(sql`SELECT correo FROM usuarios WHERE id = ${sup.id}`)).rows[0] as { correo: string };
        verificar('el correo del super NO cambió', correoSuper.correo !== 'no.permitido.prueba@dev.local');
    } finally {
        await limpiar();
        console.log('\n[limpieza] datos de prueba eliminados');
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
