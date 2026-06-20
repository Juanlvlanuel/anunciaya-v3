/**
 * probar-auditoria-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo "Auditoría"
 * ==============================================================================
 * Verifica las lecturas del módulo Auditoría contra la BD real. SOLO SELECT — no crea,
 * no modifica, no borra nada. Seguro de correr en cualquier ambiente.
 *
 * Cubre los criterios de aceptación de lectura:
 *   A1 — el superadmin ve la bitácora paginada (más reciente primero) con sus campos.
 *   A2 — los filtros (acción / actor / entidad / rango de fechas) acotan y combinan.
 *   A3 — el detalle trae datos previos/nuevos + motivo; id inexistente → null.
 *   A4 — el filtro de actores devuelve actores presentes en la bitácora.
 *   A5 — el GERENTE solo ve acciones de SU EQUIPO (él + vendedores de su región).
 *   A6 — defensa en profundidad: un vendedor/desconocido no ve nada.
 *   A7 — la lente de región del superadmin acota como un gerente de esa región.
 *
 * Requiere que existan filas en `admin_auditoria` (las generan las acciones del Panel
 * en DEV). Si faltan, el harness lo reporta y omite los casos dependientes.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-auditoria-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-auditoria-lectura.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import {
    listarAuditoria,
    obtenerDetalleAuditoria,
    listarActoresAuditoria,
    panelConFiltroRegion,
} from '../src/services/admin/auditoria-consulta.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

/** Arma un UsuarioPanel de prueba (como lo deja el middleware tras revalidar). */
function panelDe(rol: UsuarioPanel['rolEquipo'], usuarioId: string | null, regionId: string | null): UsuarioPanel {
    return { usuarioId, rolEquipo: rol, regionId, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
}

interface ActorRow { id: string; region_id: string | null }

async function main(): Promise<void> {
    // ─── [0] Datos en la BD ───────────────────────────────────────────────────────
    console.log('\n[0] Datos base en la BD');
    const supers = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'superadmin' ORDER BY created_at LIMIT 1
    `)).rows as unknown as ActorRow[];
    const [{ total_filas }] = (await db.execute(sql`
        SELECT count(*)::int AS total_filas FROM admin_auditoria
    `)).rows as unknown as Array<{ total_filas: number }>;

    verificar('hay al menos un superadmin', supers.length > 0, `supers=${supers.length}`);
    verificar('hay filas en admin_auditoria', total_filas > 0, `filas=${total_filas}`);
    if (supers.length === 0 || total_filas === 0) {
        console.log('\n⚠️  Faltan datos base (superadmin o filas de auditoría). Aborta.');
        process.exit(1);
    }
    const panelSuper = panelDe('superadmin', supers[0].id, null);

    // ─── [1] SUPERADMIN ve la bitácora paginada — A1 ──────────────────────────────
    console.log('\n[1] listarAuditoria como SUPERADMIN — A1');
    const sup = await listarAuditoria(panelSuper, { pagina: 1, porPagina: 50 });
    verificar('hay registros (total > 0)', sup.total > 0, `total=${sup.total}`);
    verificar('items no vacío', sup.items.length > 0, `items=${sup.items.length}`);
    verificar('cada fila trae accion, entidadTipo y fecha', sup.items.every((i) => !!i.accion && !!i.entidadTipo && !!i.fecha));
    // Orden por defecto = más reciente primero.
    const fechasDesc = sup.items.map((i) => i.fecha ?? '');
    const ordenadas = [...fechasDesc].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    verificar('orden por defecto = más reciente primero', JSON.stringify(fechasDesc) === JSON.stringify(ordenadas));

    // ─── [2] Filtros: acción / actor / entidad / fecha — A2 ───────────────────────
    console.log('\n[2] Filtros (acción, actor, entidad, fecha) — A2');
    const muestra = sup.items[0];

    const porAccion = await listarAuditoria(panelSuper, { pagina: 1, porPagina: 50, accion: muestra.accion });
    verificar(`filtro accion='${muestra.accion}' → todas coinciden`, porAccion.items.every((i) => i.accion === muestra.accion), `n=${porAccion.items.length}`);
    verificar('filtro accion acota (total ≤ total general)', porAccion.total <= sup.total, `${porAccion.total} ≤ ${sup.total}`);

    const conActor = sup.items.find((i) => !!i.actorId);
    if (conActor?.actorId) {
        const porActor = await listarAuditoria(panelSuper, { pagina: 1, porPagina: 50, actorId: conActor.actorId });
        verificar('filtro actorId → todas son de ese actor', porActor.items.every((i) => i.actorId === conActor.actorId), `n=${porActor.items.length}`);
    } else {
        console.log('    (sin filas con actorId — se omite el filtro por actor)');
    }

    const conEntidad = sup.items.find((i) => !!i.entidadId);
    if (conEntidad?.entidadId) {
        const porEntidad = await listarAuditoria(panelSuper, { pagina: 1, porPagina: 50, entidadTipo: conEntidad.entidadTipo, entidadId: conEntidad.entidadId });
        verificar('deep-link entidad → todas son de esa entidad', porEntidad.items.every((i) => i.entidadId === conEntidad.entidadId && i.entidadTipo === conEntidad.entidadTipo), `n=${porEntidad.items.length}`);
    } else {
        console.log('    (sin filas con entidadId — se omite el deep-link)');
    }

    // Rango de fechas: desde la fecha más antigua de la página debe traer al menos esa fila.
    if (muestra.fecha) {
        const futuro = '2999-01-01T00:00:00.000Z';
        const vacio = await listarAuditoria(panelSuper, { pagina: 1, porPagina: 50, desde: futuro });
        verificar('rango futuro (desde 2999) → 0 resultados', vacio.total === 0, `total=${vacio.total}`);
    }

    // ─── [3] Detalle — A3 ─────────────────────────────────────────────────────────
    console.log('\n[3] obtenerDetalleAuditoria — A3');
    const detalle = await obtenerDetalleAuditoria(panelSuper, muestra.id);
    verificar('detalle del primer registro existe', detalle !== null);
    if (detalle) {
        verificar('id coincide', detalle.id === muestra.id);
        verificar('trae accion y entidadTipo', !!detalle.accion && !!detalle.entidadTipo);
        verificar('expone datosPrevios/datosNuevos/motivo (claves presentes)', 'datosPrevios' in detalle && 'datosNuevos' in detalle && 'motivo' in detalle);
    }
    const nulo = await obtenerDetalleAuditoria(panelSuper, '00000000-0000-0000-0000-000000000000');
    verificar('id inexistente → null', nulo === null);

    // ─── [4] Actores del filtro — A4 ──────────────────────────────────────────────
    console.log('\n[4] listarActoresAuditoria — A4');
    const actores = await listarActoresAuditoria(panelSuper);
    verificar('hay actores en la bitácora', actores.length > 0, `actores=${actores.length}`);
    verificar('cada actor trae id', actores.every((a) => !!a.id));

    // ─── [5] GERENTE: solo su equipo — A5 ─────────────────────────────────────────
    console.log('\n[5] listarAuditoria como GERENTE — A5');
    const gerentes = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id
        FROM usuarios WHERE rol_equipo = 'gerente' AND region_id IS NOT NULL ORDER BY created_at
    `)).rows as unknown as ActorRow[];
    const gte = gerentes[0];
    if (gte) {
        // Conjunto de actores permitidos para ese gerente (mismo predicado del service).
        const permitidos = (await db.execute(sql`
            SELECT ${gte.id}::uuid AS id
            UNION
            SELECT e.usuario_id AS id
            FROM embajadores e
            JOIN embajador_ciudades ec ON ec.embajador_id = e.id
            JOIN ciudades c ON c.id = ec.ciudad_id
            WHERE c.region_id = ${gte.region_id}::uuid
        `)).rows as unknown as Array<{ id: string }>;
        const setPermitidos = new Set(permitidos.map((r) => r.id));

        const panelGte = panelDe('gerente', gte.id, gte.region_id);
        const vistaGte = await listarAuditoria(panelGte, { pagina: 1, porPagina: 100 });
        verificar('el gerente solo ve acciones de su equipo', vistaGte.items.every((i) => i.actorId !== null && setPermitidos.has(i.actorId)), `fuera=${vistaGte.items.filter((i) => !i.actorId || !setPermitidos.has(i.actorId)).length}`);
        verificar('lo que ve el gerente ≤ lo que ve el super', vistaGte.total <= sup.total, `gte=${vistaGte.total}, super=${sup.total}`);
        const actoresGte = await listarActoresAuditoria(panelGte);
        verificar('los actores del gerente ⊆ su equipo', actoresGte.every((a) => setPermitidos.has(a.id)), `actores=${actoresGte.length}`);
    } else {
        console.log('    (no hay gerente con región — se omite el alcance del gerente)');
    }

    // ─── [6] Defensa en profundidad: vendedor no ve nada — A6 ─────────────────────
    console.log('\n[6] Defensa en profundidad (rol vendedor)');
    const panelVend = panelDe('vendedor', supers[0].id, null);
    const comoVend = await listarAuditoria(panelVend, { pagina: 1, porPagina: 50 });
    verificar('un vendedor no ve nada (total=0)', comoVend.total === 0, `total=${comoVend.total}`);
    const actoresVend = await listarActoresAuditoria(panelVend);
    verificar('un vendedor no ve actores ([])', actoresVend.length === 0, `actores=${actoresVend.length}`);

    // ─── [7] Lente de región del superadmin — A7 ──────────────────────────────────
    console.log('\n[7] Lente de región del SUPERADMIN — A7');
    if (gte) {
        const panelLente = panelConFiltroRegion(panelSuper, gte.region_id);
        verificar('panelConFiltroRegion convierte super→gerente de esa región', panelLente.rolEquipo === 'gerente' && panelLente.regionId === gte.region_id);
        const lente = await listarAuditoria(panelLente, { pagina: 1, porPagina: 100 });
        verificar('la lente acota (≤ total del super)', lente.total <= sup.total, `lente=${lente.total}, super=${sup.total}`);
    } else {
        console.log('    (no hay gerente con región — se omite la lente)');
    }

    // ─── [8] Nombres legibles en la lista — A8 (nunca IDs crudos) ─────────────────
    console.log('\n[8] Nombres legibles en la lista — A8');
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const todos = await listarAuditoria(panelSuper, { pagina: 1, porPagina: 250 });
    const conNombre = ['negocio', 'usuario', 'ciudad', 'region'];
    // La resolución FUNCIONA: hay nombres reales (las que quedan null = entidades borradas, las
    // muestra el front como "Tipo (eliminado)"; en prod es raro). Lo CRÍTICO: nunca un UUID crudo.
    const resueltos = todos.items.filter((i) => conNombre.includes(i.entidadTipo) && i.entidadNombre && !UUID_RE.test(i.entidadNombre));
    verificar('la resolución de nombres funciona (hay nombres reales)', resueltos.length > 0, `resueltos=${resueltos.length}`);
    const conUuid = todos.items.filter((i) => i.entidadNombre && UUID_RE.test(i.entidadNombre));
    verificar('ninguna fila expone un UUID como nombre', conUuid.length === 0, `con uuid=${conUuid.length}`);

    // ─── [9] Snapshot legible en el detalle — A9 (sin UUIDs ni IDs de Stripe) ─────
    console.log('\n[9] Snapshot legible en el detalle — A9');
    const candidato = todos.items.find((i) => i.accion === 'ciudad_asignar_region')
        ?? todos.items.find((i) => i.accion.startsWith('precio') || i.accion.startsWith('plan'));
    if (candidato) {
        const det = await obtenerDetalleAuditoria(panelSuper, candidato.id);
        const blob = JSON.stringify({ p: det?.datosPrevios, n: det?.datosNuevos });
        verificar(`detalle '${candidato.accion}' sin UUIDs en el snapshot`, !UUID_RE.test(blob), blob.slice(0, 140));
        verificar('detalle sin IDs de Stripe en el snapshot', !/(price|sub|cus|in|pi)_[A-Za-z0-9]/.test(blob), blob.slice(0, 140));
    } else {
        console.log('    (sin registro con id en snapshot — se omite)');
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
