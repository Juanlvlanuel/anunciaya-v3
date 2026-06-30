/**
 * admin/equipo.service.ts
 * =======================
 * Lecturas de la sección "Equipo y accesos" del Panel Admin (las CUENTAS INTERNAS del equipo:
 * superadmin / gerente / vendedor — es el "RR.HH./IT" del Panel).
 *
 * Universo: SOLO cuentas de equipo (`usuarios.rol_equipo IS NOT NULL`). No incluye clientes ni
 * dueños (eso es el módulo Usuarios). La frontera con "Vendedores y comisiones": aquí se VE/ALTA/
 * BAJA al vendedor; la cartera/comisiones/cortes viven allá.
 *
 * Dos lecturas:
 *   1. listarEquipo   — tabla paginada (nombre / correo / rol / alcance / acceso) + conteos por rol.
 *   2. obtenerMiembro — ficha de una cuenta de equipo (identidad + alcance + estado de acceso +
 *                       datos de vendedor: código de referido, ciudades, # negocios atribuidos).
 *
 * ALCANCE (ver `condicionAlcance`):
 *   - superadmin SIN lente → ve a TODO el equipo (super, gerentes, vendedores).
 *   - superadmin CON lente (?regionId) → el gerente de esa región + los vendedores de esa región.
 *   - gerente → SOLO sus vendedores (los de su región, deducida por embajador_ciudades igual que
 *               panel.middleware). Nunca ve superadmin, otros gerentes ni a sí mismo.
 * El acceso a la sección lo controla `requierePanel(['superadmin','gerente'])` en la ruta. La lente
 * ?regionId solo la usa el superadmin; el gerente usa SIEMPRE la región de su token (ignora el query).
 *
 * SEGURIDAD: este service NUNCA expone secretos (contrasena_hash, *_secreto). De la contraseña solo
 * deriva el booleano `tieneContrasena` (modelo C: nace en false hasta el primer ingreso).
 *
 * Este archivo solo tiene las LECTURAS. Las escrituras (alta de vendedor/gerente, editar datos,
 * reasignar región, revocar/reactivar acceso) ya están implementadas en `equipo-acciones.service.ts`.
 * La gestión de ciudades/territorio del vendedor no vive aquí (se difirió a "Vendedores y comisiones");
 * aquí la cobertura solo se asigna como cobertura inicial al dar de alta.
 *
 * Ubicación: apps/api/src/services/admin/equipo.service.ts
 */

import { and, eq, asc, desc, ilike, or, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usuarios, regiones } from '../../db/schemas/schema.js';
import { env } from '../../config/env.js';

/** Link de registro que el vendedor comparte (el `?ref=` viaja a Stripe → atribución, Camino A).
 *  Base por ambiente desde FRONTEND_URL (sitio público), igual que el checkout en pago.service. */
function linkDeReferido(codigo: string | null): string | null {
    return codigo ? `${env.FRONTEND_URL}/registro?plan=comercial&ref=${codigo}` : null;
}

// =============================================================================
// TIPOS
// =============================================================================

/** Los 3 roles de equipo (= CHECK de usuarios.rol_equipo). */
export const ROLES_EQUIPO = ['superadmin', 'gerente', 'vendedor'] as const;
export type RolEquipoFiltro = (typeof ROLES_EQUIPO)[number];

/** Opciones de orden de la tabla (corre en servidor por el paginado). */
export const ORDENES_EQUIPO = [
    'nombre_az',
    'nombre_za',
    'rol',
    'ultimo_acceso',
    'registro_recientes',
] as const;
export type OrdenEquipo = (typeof ORDENES_EQUIPO)[number];

export interface FiltrosEquipo {
    busqueda?: string;     // nombre / apellidos / correo (ILIKE)
    rol?: RolEquipoFiltro; // filtro por rol (lo usa el superadmin; el gerente solo ve vendedores)
    orden?: OrdenEquipo;
    pagina: number;        // 1-based
    porPagina: number;
    rolSolicitante?: string;           // rol del que consulta (para el alcance)
    regionSolicitante?: string | null; // región del que consulta (acota a su región)
}

/** Conteos por rol para los chips (reflejan el alcance + búsqueda, NO el filtro de rol). */
export interface ConteosRol {
    total: number;
    porRol: Array<{ rol: string; total: number }>;
}

/** Una fila de la tabla (datos planos para que el middleware snake→camel no los toque). */
export interface MiembroEquipoFila {
    id: string;
    nombre: string;            // nombre + apellidos
    avatarUrl: string | null;  // foto de perfil (null → iniciales)
    correo: string;
    rolEquipo: string;         // superadmin | gerente | vendedor
    estadoCuenta: string;      // activo | suspendido | inactivo
    accesoActivo: boolean;     // tiene acceso al Panel (rol vigente + activo + con contraseña)
    pendienteActivar: boolean; // !tieneContrasena (modelo C: aún no crea su contraseña)
    revocado: boolean;         // ex-vendedor: rol_equipo NULL pero con embajador (sin acceso al Panel)
    ultimoAccesoPanel: string | null;
    createdAt: string | null;
    // Alcance (resuelto según rol)
    regionNombre: string | null;  // gerente: su región · vendedor: región deducida · super: null
    ciudades: string | null;      // vendedor: "Puerto Peñasco, Sonoyta" · otros: null
    // Datos de vendedor (null si no es vendedor)
    codigoReferido: string | null;
    linkReferido: string | null;    // link de registro completo con el ?ref= (para copiar)
    estadoEmbajador: string | null; // activo | inactivo | suspendido
}

export interface ListaEquipo {
    items: MiembroEquipoFila[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosRol;
}

/** Ficha de una cuenta de equipo (resumen; la cartera/comisiones vive en Vendedores y comisiones). */
export interface MiembroEquipo extends MiembroEquipoFila {
    nombreSolo: string | null;
    apellidos: string | null;
    telefono: string | null;
    correoVerificado: boolean;
    panel2faHabilitado: boolean;
    regionId: string | null;       // gerente: usuarios.region_id
    negociosAtribuidos: number;    // informativo (su cartera detallada vive en Vendedores)
    // Cobertura del vendedor (para el editor "Cambiar ciudades"). Vacío/null si no es vendedor.
    ciudadIds: string[];           // ids de las ciudades que cubre
    regionVendedorId: string | null; // region_id deducida de sus ciudades (preselección del super)
}

// =============================================================================
// HELPERS
// =============================================================================

function nombreCompleto(nombre: string | null, apellidos: string | null): string {
    return `${nombre ?? ''} ${apellidos ?? ''}`.trim();
}

/** Vendedor —activo o REVOCADO— que cubre alguna ciudad de la región dada. No exige rol_equipo:
 *  un vendedor revocado (rol NULL pero con embajador) sigue siendo visible para poder reactivarlo. */
function embajadorEnRegion(region: string): SQL {
    return sql`EXISTS (
        SELECT 1 FROM embajadores e
        JOIN embajador_ciudades ec ON ec.embajador_id = e.id
        JOIN ciudades c ON c.id = ec.ciudad_id
        WHERE e.usuario_id = usuarios.id AND c.region_id = ${region}
    )`;
}

/** ¿La cuenta tiene una fila en embajadores? (vendedor activo o revocado). */
const TIENE_EMBAJADOR = sql`EXISTS (SELECT 1 FROM embajadores e WHERE e.usuario_id = usuarios.id)`;

/** Alcance del listado según QUIÉN consulta. Incluye a los vendedores y gerentes REVOCADOS (con rol
 *  NULL) para que sigan visibles y se puedan reactivar: un ex-vendedor conserva su embajador; un
 *  ex-gerente conserva su `region_id`.
 *  - gerente → sus vendedores (activos e inactivos) de su región. Sin región: no ve nada.
 *  - superadmin CON lente (?regionId) → todo lo de esa región (gerente/ex-gerente + vendedores incl. revocados).
 *  - superadmin SIN lente → todo el equipo + ex-vendedores + ex-gerentes. */
function condicionAlcance(rolSolicitante?: string, regionSolicitante?: string | null): SQL | undefined {
    if (rolSolicitante === 'gerente') {
        if (!regionSolicitante) return sql`false`; // gerente sin región: no ve nada (defensa)
        return embajadorEnRegion(regionSolicitante);
    }
    if (rolSolicitante === 'superadmin') {
        if (regionSolicitante) {
            // Lente de región: el gerente/ex-gerente de esa región + sus vendedores (incl. revocados).
            return or(eq(usuarios.regionId, regionSolicitante), embajadorEnRegion(regionSolicitante));
        }
        // equipo + ex-vendedores (con embajador) + ex-gerentes (con region_id, rol NULL).
        return sql`(${usuarios.rolEquipo} IS NOT NULL OR ${TIENE_EMBAJADOR} OR ${usuarios.regionId} IS NOT NULL)`;
    }
    // Cualquier otro rol (vendedor / desconocido): defensa en profundidad → no ve nada.
    // La ruta ya bloquea al vendedor con 403; esto cubre una llamada mal hecha al service.
    return sql`false`;
}

/** Rol EFECTIVO: el de equipo, o —si está revocado (rol NULL)— se deduce de lo que conserva:
 *  embajador ⇒ 'vendedor', region_id ⇒ 'gerente'. Así un revocado mantiene su rol en la lista. */
const ROL_EFECTIVO = sql<string>`COALESCE(${usuarios.rolEquipo}, CASE
    WHEN ${TIENE_EMBAJADOR} THEN 'vendedor'
    WHEN ${usuarios.regionId} IS NOT NULL THEN 'gerente'
    ELSE '' END)`;

/** Predicado del filtro "rol" (sobre el rol efectivo: 'vendedor'/'gerente' incluyen a los revocados). */
function condicionRol(rol?: RolEquipoFiltro): SQL | undefined {
    if (!rol) return undefined;
    if (rol === 'superadmin') return eq(usuarios.rolEquipo, 'superadmin');
    return sql`${ROL_EFECTIVO} = ${rol}`;
}

/** Búsqueda por nombre / apellidos / correo (ILIKE OR). */
function condicionBusqueda(busqueda?: string): SQL | undefined {
    if (!busqueda) return undefined;
    const t = `%${busqueda}%`;
    return or(ilike(usuarios.nombre, t), ilike(usuarios.apellidos, t), ilike(usuarios.correo, t));
}

/** Traduce la opción de orden a expresiones ORDER BY (corre en servidor). */
function ordenarPor(orden?: OrdenEquipo): SQL[] {
    switch (orden) {
        case 'nombre_za':
            return [desc(usuarios.nombre), asc(usuarios.apellidos)];
        case 'rol':
            return [
                sql`CASE ${usuarios.rolEquipo} WHEN 'superadmin' THEN 0 WHEN 'gerente' THEN 1 WHEN 'vendedor' THEN 2 ELSE 3 END`,
                asc(usuarios.nombre),
            ];
        case 'ultimo_acceso':
            return [sql`${usuarios.ultimoAccesoPanel} DESC NULLS LAST`];
        case 'registro_recientes':
            return [desc(usuarios.createdAt)];
        case 'nombre_az':
        default:
            return [asc(usuarios.nombre), asc(usuarios.apellidos)];
    }
}

// Subqueries escalares de vendedor (por fila). `usuarios.id` literal: la query exterior es FROM usuarios.
const SUB_CIUDADES = sql<string | null>`(
    SELECT string_agg(c.nombre, ', ' ORDER BY c.nombre)
    FROM embajadores e
    JOIN embajador_ciudades ec ON ec.embajador_id = e.id
    JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE e.usuario_id = usuarios.id
)`;
const SUB_REGION_VENDEDOR = sql<string | null>`(
    SELECT r.nombre
    FROM embajadores e
    JOIN embajador_ciudades ec ON ec.embajador_id = e.id
    JOIN ciudades c ON c.id = ec.ciudad_id
    JOIN regiones r ON r.id = c.region_id
    WHERE e.usuario_id = usuarios.id
    LIMIT 1
)`;
const SUB_CODIGO = sql<string | null>`(SELECT e.codigo_referido FROM embajadores e WHERE e.usuario_id = usuarios.id LIMIT 1)`;
// IDs de las ciudades que cubre el vendedor (para precargar el editor de cobertura) + su region_id deducida.
const SUB_CIUDAD_IDS = sql<string[]>`(
    SELECT COALESCE(array_agg(ec.ciudad_id::text), '{}')
    FROM embajadores e
    JOIN embajador_ciudades ec ON ec.embajador_id = e.id
    WHERE e.usuario_id = usuarios.id
)`;
const SUB_REGION_VENDEDOR_ID = sql<string | null>`(
    SELECT c.region_id::text
    FROM embajadores e
    JOIN embajador_ciudades ec ON ec.embajador_id = e.id
    JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE e.usuario_id = usuarios.id LIMIT 1
)`;
const SUB_ESTADO_EMB = sql<string | null>`(SELECT e.estado FROM embajadores e WHERE e.usuario_id = usuarios.id LIMIT 1)`;

/** Arma la fila a partir de los campos crudos (resuelve región y datos de vendedor según el rol). */
function aFila(f: {
    id: string; nombre: string | null; apellidos: string | null; avatarUrl: string | null; correo: string;
    rolEquipo: string | null; estado: string; ultimoAccesoPanel: string | null; createdAt: string | null;
    tieneContrasena: boolean; regionGerente: string | null; regionVendedor: string | null;
    ciudades: string | null; codigoReferido: string | null; estadoEmbajador: string | null;
}): MiembroEquipoFila {
    const rolReal = f.rolEquipo ?? null;
    const revocado = rolReal === null;     // universo: rol NULL ⟹ revocado (ex-vendedor o ex-gerente)
    // Rol efectivo: si está revocado, se deduce de lo que conserva (embajador ⇒ vendedor; región ⇒ gerente).
    const rol = rolReal ?? (f.estadoEmbajador ? 'vendedor' : f.regionGerente ? 'gerente' : '');
    const esVend = rol === 'vendedor';
    const tiene = !!f.tieneContrasena;
    const codigo = esVend ? (f.codigoReferido ?? null) : null;
    return {
        id: f.id,
        nombre: nombreCompleto(f.nombre, f.apellidos),
        avatarUrl: f.avatarUrl ?? null,
        correo: f.correo,
        rolEquipo: rol,
        estadoCuenta: f.estado,
        accesoActivo: !revocado && f.estado === 'activo' && tiene,
        pendienteActivar: !revocado && !tiene,
        revocado,
        ultimoAccesoPanel: f.ultimoAccesoPanel ?? null,
        createdAt: f.createdAt ?? null,
        regionNombre: rol === 'gerente' ? (f.regionGerente ?? null) : esVend ? (f.regionVendedor ?? null) : null,
        ciudades: esVend ? (f.ciudades ?? null) : null,
        codigoReferido: codigo,
        linkReferido: linkDeReferido(codigo),
        estadoEmbajador: esVend ? (f.estadoEmbajador ?? null) : null,
    };
}

// =============================================================================
// 1. LISTA PAGINADA
// =============================================================================

export async function listarEquipo(filtros: FiltrosEquipo): Promise<ListaEquipo> {
    const condAlcance = condicionAlcance(filtros.rolSolicitante, filtros.regionSolicitante);
    const condBusqueda = condicionBusqueda(filtros.busqueda);
    const condRol = condicionRol(filtros.rol);

    // BASE = alcance + búsqueda (SIN el filtro de rol). Sobre esta base se cuentan los chips por rol.
    const base: SQL[] = [];
    if (condAlcance) base.push(condAlcance);
    if (condBusqueda) base.push(condBusqueda);

    const condLista = [...base];
    if (condRol) condLista.push(condRol);

    const whereBase = base.length ? and(...base) : undefined;
    const whereLista = condLista.length ? and(...condLista) : undefined;

    // Total (con el filtro de rol, para el paginado).
    const [{ total }] = await db.select({ total: count() }).from(usuarios).where(whereLista);

    // Conteos por rol (SIN el filtro de rol en el WHERE).
    const filasConteo = await db
        .select({ rol: ROL_EFECTIVO, n: count() })
        .from(usuarios)
        .where(whereBase)
        .groupBy(ROL_EFECTIVO);

    let totalConteo = 0;
    const porRol = filasConteo.map((f) => {
        const t = Number(f.n);
        totalConteo += t;
        return { rol: f.rol ?? '', total: t };
    });
    const conteos: ConteosRol = { total: totalConteo, porRol };

    // Página.
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            avatarUrl: usuarios.avatarUrl,
            correo: usuarios.correo,
            rolEquipo: usuarios.rolEquipo,
            estado: usuarios.estado,
            ultimoAccesoPanel: usuarios.ultimoAccesoPanel,
            createdAt: usuarios.createdAt,
            tieneContrasena: sql<boolean>`(${usuarios.contrasenaHash} IS NOT NULL)`,
            regionGerente: regiones.nombre,
            regionVendedor: SUB_REGION_VENDEDOR,
            ciudades: SUB_CIUDADES,
            codigoReferido: SUB_CODIGO,
            estadoEmbajador: SUB_ESTADO_EMB,
        })
        .from(usuarios)
        .leftJoin(regiones, eq(regiones.id, usuarios.regionId))
        .where(whereLista)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items = filas.map(aFila);

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// CONTEO GENERAL (badge del menú) — total de cuentas de equipo visibles
// =============================================================================

export async function contarEquipo(rolSolicitante?: string, regionSolicitante?: string | null): Promise<number> {
    const [{ total }] = await db
        .select({ total: count() })
        .from(usuarios)
        .where(condicionAlcance(rolSolicitante, regionSolicitante));
    return Number(total);
}

// =============================================================================
// CATÁLOGO DE CIUDADES (selector del wizard de alta / cambiar ciudades)
// =============================================================================

export interface CiudadCatalogo {
    id: string;
    nombre: string;
    estado: string;
    regionId: string | null;
}

/** Ciudades ACTIVAS para el selector del alta. El gerente usa SIEMPRE su región (ignora el param);
 *  el superadmin filtra por la región que elija en el wizard (regionIdParam) o ve todas si no manda. */
export async function listarCiudadesEquipo(
    rolSolicitante?: string,
    regionSolicitante?: string | null,
    regionIdParam?: string,
): Promise<CiudadCatalogo[]> {
    if (rolSolicitante === 'gerente' && !regionSolicitante) return []; // gerente sin región: nada
    const region = rolSolicitante === 'gerente' ? regionSolicitante : (regionIdParam || null);
    const filtro = region ? sql` AND region_id = ${region}` : sql``;
    const filas = (await db.execute(sql`
        SELECT id::text AS id, nombre, estado, region_id::text AS region_id
        FROM ciudades
        WHERE activa = true${filtro}
        ORDER BY importancia DESC, nombre ASC
    `)).rows as Array<{ id: string; nombre: string; estado: string; region_id: string | null }>;
    return filas.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, regionId: f.region_id }));
}

// =============================================================================
// BUSCAR CUENTA (typeahead del alta: autocompletar al promover una cuenta existente)
// =============================================================================

export interface CuentaSugerida {
    id: string;
    nombre: string;          // nombre + apellidos (para mostrar)
    nombreSolo: string | null;
    apellidos: string | null;
    correo: string;
    telefono: string | null;
    rolEquipo: string | null; // si no es null, ya es del equipo → no se puede promover
}

/** Busca cuentas cuyo correo contenga el texto (para el typeahead del alta). Requiere ≥3 caracteres;
 *  devuelve hasta 6. Solo lo usa el alta (super/gerente) para detectar y autocompletar una cuenta
 *  existente que se va a PROMOVER. Expone solo lo necesario (nombre, correo, teléfono, rol). */
export async function buscarCuentasPorCorreo(q: string): Promise<CuentaSugerida[]> {
    const termino = q.trim();
    if (termino.length < 3) return [];
    const filas = await db
        .select({
            id: usuarios.id,
            nombreSolo: usuarios.nombre,
            apellidos: usuarios.apellidos,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            rolEquipo: usuarios.rolEquipo,
        })
        .from(usuarios)
        .where(ilike(usuarios.correo, `%${termino}%`))
        .orderBy(asc(usuarios.correo))
        .limit(6);
    return filas.map((f) => ({
        id: f.id,
        nombre: nombreCompleto(f.nombreSolo, f.apellidos),
        nombreSolo: f.nombreSolo ?? null,
        apellidos: f.apellidos ?? null,
        correo: f.correo,
        telefono: f.telefono ?? null,
        rolEquipo: f.rolEquipo ?? null,
    }));
}

// =============================================================================
// 2. FICHA DE UN MIEMBRO
// =============================================================================

export async function obtenerMiembro(
    miembroId: string,
    rolSolicitante?: string,
    regionSolicitante?: string | null,
): Promise<MiembroEquipo | null> {
    const [u] = await db
        .select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            avatarUrl: usuarios.avatarUrl,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            rolEquipo: usuarios.rolEquipo,
            estado: usuarios.estado,
            regionId: usuarios.regionId,
            correoVerificado: usuarios.correoVerificado,
            panel2faHabilitado: usuarios.panel2faHabilitado,
            ultimoAccesoPanel: usuarios.ultimoAccesoPanel,
            createdAt: usuarios.createdAt,
            tieneContrasena: sql<boolean>`(${usuarios.contrasenaHash} IS NOT NULL)`,
            regionGerente: regiones.nombre,
            regionVendedor: SUB_REGION_VENDEDOR,
            ciudades: SUB_CIUDADES,
            ciudadIds: SUB_CIUDAD_IDS,
            regionVendedorId: SUB_REGION_VENDEDOR_ID,
            codigoReferido: SUB_CODIGO,
            estadoEmbajador: SUB_ESTADO_EMB,
            negociosAtribuidos: sql<number>`(
                SELECT COUNT(*)::int FROM negocios n
                JOIN embajadores e ON e.id = n.embajador_id
                WHERE e.usuario_id = usuarios.id
            )`,
        })
        .from(usuarios)
        .leftJoin(regiones, eq(regiones.id, usuarios.regionId))
        .where(and(eq(usuarios.id, miembroId), condicionAlcance(rolSolicitante, regionSolicitante)))
        .limit(1);

    // Sin fila = no existe O el solicitante no tiene permiso de verlo. Respondemos 404 en ambos casos.
    if (!u) return null;

    const fila = aFila(u);
    return {
        ...fila,
        nombreSolo: u.nombre ?? null,
        apellidos: u.apellidos ?? null,
        telefono: u.telefono ?? null,
        correoVerificado: !!u.correoVerificado,
        panel2faHabilitado: !!u.panel2faHabilitado,
        regionId: u.regionId ?? null,
        negociosAtribuidos: Number(u.negociosAtribuidos ?? 0),
        ciudadIds: Array.isArray(u.ciudadIds) ? u.ciudadIds : [],
        regionVendedorId: u.regionVendedorId ?? null,
    };
}
