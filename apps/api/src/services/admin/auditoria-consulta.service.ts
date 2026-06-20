/**
 * admin/auditoria-consulta.service.ts
 * ===================================
 * Lecturas de la sección Auditoría del Panel Admin = la BITÁCORA DE ACCIONES del
 * equipo (el "quién hizo qué y cuándo"). Lista las filas de `admin_auditoria`
 * (acciones sensibles: suspender, registrar pago, reasignar, cambiar precio, etc.),
 * con detalle de snapshots antes/después + motivo.
 *
 * Tres lecturas:
 *   1. listarAuditoria        — bitácora paginada (fecha / actor / acción / entidad)
 *   2. obtenerDetalleAuditoria — detalle de un registro (datos previos/nuevos + motivo)
 *   3. listarActoresAuditoria  — actores presentes en la bitácora (alimenta el filtro)
 *
 * ALCANCE POR ROL (matriz de Panel_Admin.md → Sistema/Auditoría):
 *   - superadmin → toda la plataforma
 *   - gerente    → SU EQUIPO: las acciones cuyo ACTOR es él mismo o un vendedor de su
 *                  región (deducida: vendedor → embajador_ciudades → ciudad → región).
 *                  Es alcance POR ACTOR (no por entidad): `admin_auditoria` no guarda
 *                  región, y resolverla por cada tipo de entidad sería desproporcionado.
 *                  Cubre el caso de uso "supervisar a mis vendedores". (V2: por entidad.)
 *   - vendedor   → FUERA (las rutas no le dan acceso; defensivo: 'vacio')
 *
 * La ESCRITURA de la bitácora vive en `auditoria.service.ts` (registrarAuditoria),
 * llamada por cada módulo de acciones. Este service NO modifica datos.
 *
 * Ubicación: apps/api/src/services/admin/auditoria-consulta.service.ts
 */

import { and, eq, desc, asc, count, gte, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.js';
import { adminAuditoria, usuarios, negocios, ciudades, regiones, negocioSucursales, embajadores } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';

// Alias de `usuarios` para la ENTIDAD afectada (cuando entidad_tipo='usuario'), distinto del
// JOIN del ACTOR (que también es `usuarios`). Drizzle exige un alias para el auto-join.
const usuarioEntidad = alias(usuarios, 'usuario_entidad');

// Reusa el filtro GLOBAL de región del Panel (mismo helper que Negocios): si el
// superadmin manda ?regionId=, consulta como gerente de esa región.
export { panelConFiltroRegion } from './negocios.service.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Opciones de orden (corre en servidor por el paginado). */
export const ORDENES_AUDITORIA = ['fecha_recientes', 'fecha_antiguos'] as const;
export type OrdenAuditoria = (typeof ORDENES_AUDITORIA)[number];

export interface FiltrosAuditoria {
    actorId?: string;     // filtra por quién hizo la acción
    accion?: string;      // valor técnico exacto (p.ej. 'negocio_suspender')
    entidadTipo?: string; // p.ej. 'negocio' (deep-link)
    entidadId?: string;   // deep-link: solo las acciones sobre UNA entidad
    desde?: string;       // created_at >= (ISO)
    hasta?: string;       // created_at <= (ISO)
    orden?: OrdenAuditoria;
    pagina: number;       // 1-based
    porPagina: number;
}

/** Una fila de la bitácora (vista de tabla). */
export interface AuditoriaFila {
    id: string;
    fecha: string | null;        // created_at
    actorId: string | null;
    actorNombre: string | null;  // nombre + apellidos del actor
    actorRol: string | null;     // rol al momento de la acción (snapshot guardado)
    accion: string;              // valor técnico; el front lo traduce a etiqueta legible
    entidadTipo: string;
    entidadId: string | null;
    entidadNombre: string | null; // nombre del negocio cuando entidad_tipo='negocio'; si no, null
    motivo: string | null;
}

export interface ListaAuditoria {
    items: AuditoriaFila[];
    total: number;
    pagina: number;
    porPagina: number;
}

/** Detalle de solo lectura de un registro. */
export interface AuditoriaDetalle {
    id: string;
    fecha: string | null;
    actorId: string | null;
    actorNombre: string | null;
    actorCorreo: string | null;
    actorRol: string | null;
    accion: string;
    entidadTipo: string;
    entidadId: string | null;
    entidadNombre: string | null;
    datosPrevios: unknown;       // snapshot antes
    datosNuevos: unknown;        // snapshot después
    motivo: string | null;
}

/** Actor presente en la bitácora (para el filtro/dropdown). */
export interface ActorAuditoria {
    id: string;
    nombre: string | null;
    rol: string | null;          // rol de equipo actual del usuario (null si ya no es del equipo)
}

// =============================================================================
// ALCANCE POR ROL
// =============================================================================

/**
 * Condición de alcance (WHERE) para el rol, o `'vacio'` si no puede ver nada
 * (gerente sin región). El superadmin no tiene condición (ve todo) → null.
 *
 * Gerente: alcance POR ACTOR — ve las acciones que hizo SU EQUIPO (él mismo + los
 * vendedores de su región, deducidos por embajador_ciudades → ciudad → región).
 * El vendedor está FUERA (las rutas no le dan acceso) → 'vacio'.
 */
async function condicionAlcance(panel: UsuarioPanel): Promise<SQL | null | 'vacio'> {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId || !panel.usuarioId) return 'vacio';
        // El conjunto de actores permitidos = el gerente + los vendedores de su región.
        // Mismo predicado de "vendedor → región" que `panel.middleware`, invertido (por región).
        return sql`${adminAuditoria.actorId} IN (
            SELECT ${panel.usuarioId}::uuid
            UNION
            SELECT e.usuario_id
            FROM embajadores e
            JOIN embajador_ciudades ec ON ec.embajador_id = e.id
            JOIN ciudades c ON c.id = ec.ciudad_id
            WHERE c.region_id = ${panel.regionId}
        )`;
    }

    // vendedor u otro rol: fuera de Auditoría.
    return 'vacio';
}

/** Traduce la opción de orden a expresiones ORDER BY (por fecha de registro). */
function ordenarPor(orden?: OrdenAuditoria): SQL[] {
    return orden === 'fecha_antiguos'
        ? [asc(adminAuditoria.createdAt)]
        : [desc(adminAuditoria.createdAt)];
}

// =============================================================================
// RESOLUCIÓN DE NOMBRES LEGIBLES (nunca mostrar IDs crudos)
// =============================================================================

/** Campos de nombre resueltos por los JOINs de la entidad (negocio/usuario/ciudad/región). */
interface NombresEntidad {
    entidadTipo: string;
    nomNegocio: string | null;
    nomUsuario: string | null;
    apeUsuario: string | null;
    nomCiudad: string | null;
    nomRegion: string | null;
}

/** Nombre legible de la ENTIDAD afectada según su tipo. Null para los tipos sin id
 *  (embajador/configuracion/comisiones): el front muestra la etiqueta del tipo en su lugar. */
function resolverEntidadNombre(f: NombresEntidad): string | null {
    switch (f.entidadTipo) {
        case 'negocio': return f.nomNegocio ?? null;
        case 'usuario': return f.nomUsuario ? `${f.nomUsuario} ${f.apeUsuario ?? ''}`.trim() : null;
        case 'ciudad': return f.nomCiudad ?? null;
        case 'region': return f.nomRegion ?? null;
        default: return null;
    }
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ES_ID_STRIPE = /^(price|sub|cus|in|pi|seti|prod|txn|re)_/;

/** Claves de snapshot que guardan un UUID → tabla para resolver su nombre + etiqueta legible. */
const CLAVE_RESOLVIBLE: Record<string, { tabla: string; etiqueta: string }> = {
    regionId: { tabla: 'region', etiqueta: 'Región' },
    regionComun: { tabla: 'region', etiqueta: 'Región' },
    ciudadId: { tabla: 'ciudad', etiqueta: 'Ciudad' },
    negocioId: { tabla: 'negocio', etiqueta: 'Negocio' },
    sucursalId: { tabla: 'sucursal', etiqueta: 'Sucursal' },
    usuarioId: { tabla: 'usuario', etiqueta: 'Usuario' },
    duenoId: { tabla: 'usuario', etiqueta: 'Dueño' },
    embajadorId: { tabla: 'embajador', etiqueta: 'Vendedor' },
};

/** Resuelve un UUID a un nombre legible consultando la tabla correspondiente. */
async function resolverNombrePorTabla(tabla: string, id: string): Promise<string | null> {
    switch (tabla) {
        case 'region': { const [r] = await db.select({ n: regiones.nombre }).from(regiones).where(eq(regiones.id, id)).limit(1); return r?.n ?? null; }
        case 'ciudad': { const [r] = await db.select({ n: ciudades.nombre }).from(ciudades).where(eq(ciudades.id, id)).limit(1); return r?.n ?? null; }
        case 'negocio': { const [r] = await db.select({ n: negocios.nombre }).from(negocios).where(eq(negocios.id, id)).limit(1); return r?.n ?? null; }
        case 'sucursal': { const [r] = await db.select({ n: negocioSucursales.nombre }).from(negocioSucursales).where(eq(negocioSucursales.id, id)).limit(1); return r?.n ?? null; }
        case 'usuario': { const [r] = await db.select({ n: usuarios.nombre, a: usuarios.apellidos }).from(usuarios).where(eq(usuarios.id, id)).limit(1); return r ? `${r.n} ${r.a ?? ''}`.trim() : null; }
        case 'embajador': { const [r] = await db.select({ n: usuarios.nombre, a: usuarios.apellidos }).from(embajadores).innerJoin(usuarios, eq(usuarios.id, embajadores.usuarioId)).where(eq(embajadores.id, id)).limit(1); return r ? `${r.n} ${r.a ?? ''}`.trim() : null; }
        default: return null;
    }
}

/**
 * Hace LEGIBLE un snapshot: reemplaza los UUIDs de claves conocidas por el NOMBRE real
 * (regionId → "Sonora Norte") y OCULTA los IDs técnicos de Stripe (price_…, sub_…) que no
 * aportan a un humano. Las claves ya legibles (nombre, valor, montos) pasan tal cual.
 */
async function enriquecerSnapshot(obj: unknown): Promise<Record<string, unknown> | null> {
    if (!obj || typeof obj !== 'object') return null;
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === 'string' && ES_ID_STRIPE.test(v)) continue; // oculta IDs de Stripe
        const meta = CLAVE_RESOLVIBLE[k];
        if (meta) {
            // Renombra SIEMPRE la clave a su etiqueta legible (regionId → "Región"), aunque el valor
            // sea null/vacío, para que previos y nuevos usen la MISMA clave y el diff los una en UNA
            // sola fila ("Región: — → Sonora Norte") en vez de dejar un "Region Id: —" suelto.
            salida[meta.etiqueta] = (typeof v === 'string' && ES_UUID.test(v))
                ? ((await resolverNombrePorTabla(meta.tabla, v)) ?? v)
                : v;
            continue;
        }
        salida[k] = v;
    }
    return salida;
}

// =============================================================================
// 1. LISTA PAGINADA (la bitácora)
// =============================================================================

export async function listarAuditoria(
    panel: UsuarioPanel,
    filtros: FiltrosAuditoria,
): Promise<ListaAuditoria> {
    const alcance = await condicionAlcance(panel);

    // Rol sin nada que ver (config incompleta / fuera de alcance): bitácora vacía.
    if (alcance === 'vacio') {
        return { items: [], total: 0, pagina: filtros.pagina, porPagina: filtros.porPagina };
    }

    const cond: SQL[] = [];
    if (alcance) cond.push(alcance);
    if (filtros.actorId) cond.push(eq(adminAuditoria.actorId, filtros.actorId));
    if (filtros.accion) cond.push(eq(adminAuditoria.accion, filtros.accion));
    if (filtros.entidadTipo) cond.push(eq(adminAuditoria.entidadTipo, filtros.entidadTipo));
    if (filtros.entidadId) cond.push(eq(adminAuditoria.entidadId, filtros.entidadId));
    if (filtros.desde) cond.push(gte(adminAuditoria.createdAt, filtros.desde));
    if (filtros.hasta) cond.push(lte(adminAuditoria.createdAt, filtros.hasta));
    const where = cond.length ? and(...cond) : undefined;

    // Total (para el paginado).
    const [{ total }] = await db
        .select({ total: count() })
        .from(adminAuditoria)
        .where(where);

    // Página. Joins de presentación: actor (usuario) + nombre del negocio (cuando la
    // entidad es un negocio — el caso más frecuente y con nombre claro). Los demás
    // tipos de entidad muestran solo entidad_tipo + id (el detalle trae los snapshots).
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: adminAuditoria.id,
            fecha: adminAuditoria.createdAt,
            actorId: adminAuditoria.actorId,
            actorNombre: usuarios.nombre,
            actorApellidos: usuarios.apellidos,
            actorRol: adminAuditoria.actorRol,
            accion: adminAuditoria.accion,
            entidadTipo: adminAuditoria.entidadTipo,
            entidadId: adminAuditoria.entidadId,
            nomNegocio: negocios.nombre,
            nomUsuario: usuarioEntidad.nombre,
            apeUsuario: usuarioEntidad.apellidos,
            nomCiudad: ciudades.nombre,
            nomRegion: regiones.nombre,
            motivo: adminAuditoria.motivo,
        })
        .from(adminAuditoria)
        .leftJoin(usuarios, eq(usuarios.id, adminAuditoria.actorId))
        .leftJoin(negocios, and(eq(negocios.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'negocio')))
        .leftJoin(usuarioEntidad, and(eq(usuarioEntidad.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'usuario')))
        .leftJoin(ciudades, and(eq(ciudades.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'ciudad')))
        .leftJoin(regiones, and(eq(regiones.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'region')))
        .where(where)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items: AuditoriaFila[] = filas.map((f) => ({
        id: f.id,
        fecha: f.fecha ?? null,
        actorId: f.actorId ?? null,
        actorNombre: f.actorNombre ? `${f.actorNombre} ${f.actorApellidos ?? ''}`.trim() : null,
        actorRol: f.actorRol ?? null,
        accion: f.accion,
        entidadTipo: f.entidadTipo,
        entidadId: f.entidadId ?? null,
        entidadNombre: resolverEntidadNombre(f),
        motivo: f.motivo ?? null,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina };
}

// =============================================================================
// 2. DETALLE DE UN REGISTRO
// =============================================================================

/**
 * Detalle de un registro respetando el alcance del rol. Devuelve null si no existe o
 * está fuera del alcance (el controller responde 404).
 */
export async function obtenerDetalleAuditoria(
    panel: UsuarioPanel,
    registroId: string,
): Promise<AuditoriaDetalle | null> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return null;

    const cond: SQL[] = [eq(adminAuditoria.id, registroId)];
    if (alcance) cond.push(alcance);

    const [f] = await db
        .select({
            id: adminAuditoria.id,
            fecha: adminAuditoria.createdAt,
            actorId: adminAuditoria.actorId,
            actorNombre: usuarios.nombre,
            actorApellidos: usuarios.apellidos,
            actorCorreo: usuarios.correo,
            actorRol: adminAuditoria.actorRol,
            accion: adminAuditoria.accion,
            entidadTipo: adminAuditoria.entidadTipo,
            entidadId: adminAuditoria.entidadId,
            nomNegocio: negocios.nombre,
            nomUsuario: usuarioEntidad.nombre,
            apeUsuario: usuarioEntidad.apellidos,
            nomCiudad: ciudades.nombre,
            nomRegion: regiones.nombre,
            datosPrevios: adminAuditoria.datosPrevios,
            datosNuevos: adminAuditoria.datosNuevos,
            motivo: adminAuditoria.motivo,
        })
        .from(adminAuditoria)
        .leftJoin(usuarios, eq(usuarios.id, adminAuditoria.actorId))
        .leftJoin(negocios, and(eq(negocios.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'negocio')))
        .leftJoin(usuarioEntidad, and(eq(usuarioEntidad.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'usuario')))
        .leftJoin(ciudades, and(eq(ciudades.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'ciudad')))
        .leftJoin(regiones, and(eq(regiones.id, adminAuditoria.entidadId), eq(adminAuditoria.entidadTipo, 'region')))
        .where(and(...cond))
        .limit(1);

    if (!f) return null;

    // Snapshots LEGIBLES: UUIDs conocidos → nombres, IDs de Stripe ocultos.
    const [datosPrevios, datosNuevos] = await Promise.all([
        enriquecerSnapshot(f.datosPrevios),
        enriquecerSnapshot(f.datosNuevos),
    ]);

    return {
        id: f.id,
        fecha: f.fecha ?? null,
        actorId: f.actorId ?? null,
        actorNombre: f.actorNombre ? `${f.actorNombre} ${f.actorApellidos ?? ''}`.trim() : null,
        actorCorreo: f.actorCorreo ?? null,
        actorRol: f.actorRol ?? null,
        accion: f.accion,
        entidadTipo: f.entidadTipo,
        entidadId: f.entidadId ?? null,
        entidadNombre: resolverEntidadNombre(f),
        datosPrevios,
        datosNuevos,
        motivo: f.motivo ?? null,
    };
}

// =============================================================================
// 3. ACTORES PRESENTES (para el filtro)
// =============================================================================

/**
 * Lista los actores DISTINTOS que aparecen en la bitácora dentro del alcance del rol,
 * para poblar el filtro "por persona". Ordenados por nombre.
 */
export async function listarActoresAuditoria(panel: UsuarioPanel): Promise<ActorAuditoria[]> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return [];

    const filas = await db
        .selectDistinct({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            rol: usuarios.rolEquipo,
        })
        .from(adminAuditoria)
        .innerJoin(usuarios, eq(usuarios.id, adminAuditoria.actorId))
        .where(alcance ?? undefined)
        .orderBy(asc(usuarios.nombre));

    return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre ? `${f.nombre} ${f.apellidos ?? ''}`.trim() : null,
        rol: f.rol ?? null,
    }));
}
