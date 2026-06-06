/**
 * admin/negocios.service.ts
 * =========================
 * Lógica de la sección Negocios del Panel Admin (Entrega 1 — solo lectura).
 *
 * Tres lecturas:
 *   1. listarNegocios       — tabla paginada (nombre / ciudad / vendedor / estado de pago)
 *   2. obtenerDetalleNegocio — ficha administrativa de un negocio
 *   3. listarVendedoresFiltro — vendedores para poblar el filtro "por vendedor"
 *
 * ALCANCE POR ROL (calcado de la matriz de Panel_Admin.md):
 *   - superadmin → toda la plataforma
 *   - gerente    → solo su región (negocios.region_id = su región)
 *   - vendedor   → solo su cartera (negocios.embajador_id = su embajador)
 *
 * La ciudad NO vive en `negocios`: se toma de la sucursal principal
 * (`negocio_sucursales` con es_principal = true). El vendedor atribuido se
 * resuelve por `embajador_id → embajadores → usuarios`. (Sin categoría: por
 * decisión, la categoría se retoma en la futura sección Métricas.)
 *
 * Solo lectura: este service NO modifica datos. Las acciones (suspender,
 * cancelar, marcar pagado, reasignar) son de la Entrega 2.
 *
 * Ubicación: apps/api/src/services/admin/negocios.service.ts
 */

import { and, eq, ne, ilike, desc, asc, or, isNull, isNotNull, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    negocios,
    negocioSucursales,
    usuarios,
    embajadores,
    regiones,
} from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Estados de pago válidos (= estado_membresia, gobernado por Stripe/cron). */
export const ESTADOS_PAGO = ['al_corriente', 'en_gracia', 'suspendido', 'cancelado'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

/** Opciones de orden de la tabla (el orden corre en servidor por el paginado). */
export const ORDENES = [
    'nombre_az',
    'nombre_za',
    'alta_recientes',
    'alta_antiguos',
    'proximo_cobro',
    'estado',
] as const;
export type OrdenNegocios = (typeof ORDENES)[number];

/** Valor especial de filtro: "sin ciudad" / "sin vendedor asignado". */
export const CIUDAD_SIN = '__none';
export const VENDEDOR_SIN = '__none';
/** Placeholder que pone el onboarding mientras no se configura la ciudad. */
const CIUDAD_PLACEHOLDER = 'Por configurar';

export interface FiltrosNegocios {
    busqueda?: string;       // nombre del negocio (ILIKE)
    estadoPago?: EstadoPago; // estado_membresia
    vendedorId?: string;     // embajador_id
    ciudad?: string;         // ciudad de la sucursal principal ('__none' = sin ciudad)
    orden?: OrdenNegocios;
    pagina: number;          // 1-based
    porPagina: number;
}

/** Conteos por estado de pago para los chips (reflejan los filtros activos
 *  EXCEPTO el de estado, para que cada chip cuadre con lo que se ve en la lista).
 *  Se usa un ARRAY {estado,total} a propósito: el middleware snake→camel del
 *  backend transformaría las keys de un objeto (al_corriente→alCorriente), pero
 *  no toca los VALORES string ni las keys neutras 'estado'/'total'. */
export interface ConteosEstado {
    total: number;
    porEstado: Array<{ estado: string; total: number }>;
}

/** Una fila de la tabla. */
export interface NegocioFila {
    id: string;
    nombre: string;
    ciudad: string | null;
    vendedorId: string | null;
    vendedorNombre: string | null;
    estadoPago: string;
    estadoAdmin: string;
    proximoCobro: string | null;
    alta: string | null;
}

export interface ListaNegocios {
    items: NegocioFila[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosEstado;
}

/** Ficha administrativa completa (sin métricas de actividad). */
export interface NegocioDetalle {
    id: string;
    nombre: string;
    descripcion: string | null;
    logoUrl: string | null;
    sitioWeb: string | null;
    activo: boolean | null;
    esBorrador: boolean | null;
    verificado: boolean | null;
    onboardingCompletado: boolean;
    creadoEn: string | null;
    fechaPrimerPago: string | null;
    mesesGratisRestantes: number;
    // Estado de pago (Stripe/cron)
    estadoPago: string;
    // Estado administrativo (Panel): activo / suspendido / archivado
    estadoAdmin: string;
    fechaVencimiento: string | null;
    fechaProximoCobro: string | null;
    fechaInicioGracia: string | null;
    fechaLimiteGracia: string | null;
    // Dueño de la cuenta
    duenoNombre: string | null;
    duenoCorreo: string | null;
    duenoTelefono: string | null;
    // Vendedor atribuido
    vendedorId: string | null;
    vendedorNombre: string | null;
    vendedorCodigo: string | null;
    // Región
    regionId: string | null;
    regionNombre: string | null;
    // Sucursal principal (ubicación)
    ciudad: string | null;
    estado: string | null;
    direccion: string | null;
    telefono: string | null;
}

export interface VendedorFiltro {
    id: string;
    nombre: string;
    codigoReferido: string;
}

// =============================================================================
// ALCANCE POR ROL
// =============================================================================

/**
 * Resuelve el embajador (vendedor) de un usuario. Devuelve null si la cuenta no
 * tiene embajador asociado.
 */
async function resolverEmbajadorId(usuarioId: string | null): Promise<string | null> {
    if (!usuarioId) return null;
    const [emb] = await db
        .select({ id: embajadores.id })
        .from(embajadores)
        .where(eq(embajadores.usuarioId, usuarioId))
        .limit(1);
    return emb?.id ?? null;
}

/**
 * Devuelve la condición de alcance (WHERE) para el rol, o `'vacio'` si el rol no
 * puede ver nada por configuración incompleta (gerente sin región, vendedor sin
 * embajador). El superadmin no tiene condición (ve todo) → devuelve null.
 */
async function condicionAlcance(panel: UsuarioPanel): Promise<SQL | null | 'vacio'> {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        return eq(negocios.regionId, panel.regionId);
    }

    // vendedor → su cartera
    const embajadorId = await resolverEmbajadorId(panel.usuarioId);
    if (!embajadorId) return 'vacio';
    return eq(negocios.embajadorId, embajadorId);
}

// =============================================================================
// 1. LISTA PAGINADA
// =============================================================================

/** Join a la sucursal principal del negocio (1:1 por el unique parcial). */
const joinPrincipal = and(
    eq(negocioSucursales.negocioId, negocios.id),
    eq(negocioSucursales.esPrincipal, true),
);

/**
 * "Estado efectivo" del negocio para los chips/filtro: el eje ADMINISTRATIVO
 * manda sobre el de pago. archivado→'cancelado', suspendido(admin)→'suspendido';
 * si está activo a nivel admin, vale su estado de pago (estado_membresia). Así un
 * negocio suspendido a mano cuenta en "Suspendido" aunque su pago esté al corriente.
 */
const ESTADO_EFECTIVO = sql<string>`CASE
    WHEN ${negocios.estadoAdmin} = 'archivado' THEN 'cancelado'
    WHEN ${negocios.estadoAdmin} = 'suspendido' THEN 'suspendido'
    ELSE ${negocios.estadoMembresia}
END`;

/** Traduce la opción de orden a expresiones ORDER BY (corre en servidor). */
function ordenarPor(orden?: OrdenNegocios): SQL[] {
    switch (orden) {
        case 'nombre_za':
            return [desc(negocios.nombre)];
        case 'alta_recientes':
            return [desc(negocios.createdAt)];
        case 'alta_antiguos':
            return [asc(negocios.createdAt)];
        case 'proximo_cobro':
            return [sql`${negocios.fechaProximoCobro} ASC NULLS LAST`];
        case 'estado':
            return [
                sql`CASE ${ESTADO_EFECTIVO} WHEN 'al_corriente' THEN 0 WHEN 'en_gracia' THEN 1 WHEN 'suspendido' THEN 2 WHEN 'cancelado' THEN 3 ELSE 4 END`,
                asc(negocios.nombre),
            ];
        case 'nombre_az':
        default:
            return [asc(negocios.nombre)];
    }
}

/** Condición de ciudad sobre la sucursal principal (o undefined si no se filtra). */
function condicionCiudad(ciudad?: string): SQL | undefined {
    if (ciudad === CIUDAD_SIN) {
        return or(
            isNull(negocioSucursales.ciudad),
            eq(negocioSucursales.ciudad, CIUDAD_PLACEHOLDER),
        );
    }
    if (ciudad) return eq(negocioSucursales.ciudad, ciudad);
    return undefined;
}

export async function listarNegocios(
    panel: UsuarioPanel,
    filtros: FiltrosNegocios,
): Promise<ListaNegocios> {
    const alcance = await condicionAlcance(panel);
    const conteosVacios: ConteosEstado = { total: 0, porEstado: [] };

    // Rol sin nada que ver (config incompleta): tabla vacía, sin tocar la BD.
    if (alcance === 'vacio') {
        return { items: [], total: 0, pagina: filtros.pagina, porPagina: filtros.porPagina, conteos: conteosVacios };
    }

    const condCiudad = condicionCiudad(filtros.ciudad);

    // BASE = alcance + búsqueda + vendedor + ciudad (SIN estado). Sobre esta base
    // se calculan los conteos por estado, para que cada chip cuadre con lo filtrado.
    const base: SQL[] = [];
    if (alcance) base.push(alcance);
    if (filtros.busqueda) base.push(ilike(negocios.nombre, `%${filtros.busqueda}%`));
    if (filtros.vendedorId === VENDEDOR_SIN) base.push(isNull(negocios.embajadorId));
    else if (filtros.vendedorId) base.push(eq(negocios.embajadorId, filtros.vendedorId));
    if (condCiudad) base.push(condCiudad);

    // LISTA = base + estado EFECTIVO (lo que realmente se muestra/pagina).
    const condLista = [...base];
    if (filtros.estadoPago) condLista.push(sql`${ESTADO_EFECTIVO} = ${filtros.estadoPago}`);

    const whereBase = base.length ? and(...base) : undefined;
    const whereLista = condLista.length ? and(...condLista) : undefined;

    // Total (con estado, para el paginado). Se incluye el join a la sucursal
    // principal porque el filtro de ciudad vive ahí (1:1, no duplica filas).
    const [{ total }] = await db
        .select({ total: count() })
        .from(negocios)
        .leftJoin(negocioSucursales, joinPrincipal)
        .where(whereLista);

    // Conteos por estado EFECTIVO (SIN el filtro de estado en el WHERE).
    const filasConteo = await db
        .select({ estado: ESTADO_EFECTIVO, n: count() })
        .from(negocios)
        .leftJoin(negocioSucursales, joinPrincipal)
        .where(whereBase)
        .groupBy(ESTADO_EFECTIVO);

    let totalConteo = 0;
    const porEstado = filasConteo.map((f) => {
        const t = Number(f.n);
        totalConteo += t;
        return { estado: f.estado, total: t };
    });
    const conteos: ConteosEstado = { total: totalConteo, porEstado };

    // Página. Joins de presentación: sucursal principal → ciudad; embajador →
    // usuario del vendedor → nombre.
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: negocios.id,
            nombre: negocios.nombre,
            estadoPago: negocios.estadoMembresia,
            estadoAdmin: negocios.estadoAdmin,
            vendedorId: negocios.embajadorId,
            proximoCobro: negocios.fechaProximoCobro,
            alta: negocios.createdAt,
            ciudad: negocioSucursales.ciudad,
            vendedorNombre: usuarios.nombre,
            vendedorApellidos: usuarios.apellidos,
        })
        .from(negocios)
        .leftJoin(negocioSucursales, joinPrincipal)
        .leftJoin(embajadores, eq(embajadores.id, negocios.embajadorId))
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(whereLista)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items: NegocioFila[] = filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        ciudad: f.ciudad ?? null,
        vendedorId: f.vendedorId ?? null,
        vendedorNombre: f.vendedorNombre
            ? `${f.vendedorNombre} ${f.vendedorApellidos ?? ''}`.trim()
            : null,
        estadoPago: f.estadoPago,
        estadoAdmin: f.estadoAdmin,
        proximoCobro: f.proximoCobro ?? null,
        alta: f.alta ?? null,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// 2. DETALLE (FICHA ADMINISTRATIVA)
// =============================================================================

/**
 * Ficha de un negocio respetando el alcance del rol. Devuelve null si no existe
 * o si está fuera del alcance del rol (el controller responde 404).
 */
export async function obtenerDetalleNegocio(
    panel: UsuarioPanel,
    negocioId: string,
): Promise<NegocioDetalle | null> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return null;

    const condiciones: SQL[] = [eq(negocios.id, negocioId)];
    if (alcance) condiciones.push(alcance);

    const [fila] = await db
        .select({
            id: negocios.id,
            nombre: negocios.nombre,
            descripcion: negocios.descripcion,
            logoUrl: negocios.logoUrl,
            sitioWeb: negocios.sitioWeb,
            activo: negocios.activo,
            esBorrador: negocios.esBorrador,
            verificado: negocios.verificado,
            onboardingCompletado: negocios.onboardingCompletado,
            creadoEn: negocios.createdAt,
            fechaPrimerPago: negocios.fechaPrimerPago,
            mesesGratisRestantes: negocios.mesesGratisRestantes,
            estadoPago: negocios.estadoMembresia,
            estadoAdmin: negocios.estadoAdmin,
            fechaVencimiento: negocios.fechaVencimiento,
            fechaProximoCobro: negocios.fechaProximoCobro,
            fechaInicioGracia: negocios.fechaInicioGracia,
            fechaLimiteGracia: negocios.fechaLimiteGracia,
            // Dueño
            duenoNombre: usuarios.nombre,
            duenoApellidos: usuarios.apellidos,
            duenoCorreo: usuarios.correo,
            duenoTelefono: usuarios.telefono,
            // Atribución
            vendedorId: negocios.embajadorId,
            regionId: negocios.regionId,
        })
        .from(negocios)
        .leftJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(and(...condiciones))
        .limit(1);

    if (!fila) return null;

    // Vendedor atribuido (embajador → usuario) — query aparte para no chocar con
    // el join al usuario dueño.
    let vendedorNombre: string | null = null;
    let vendedorCodigo: string | null = null;
    if (fila.vendedorId) {
        const [v] = await db
            .select({
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                codigoReferido: embajadores.codigoReferido,
            })
            .from(embajadores)
            .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
            .where(eq(embajadores.id, fila.vendedorId))
            .limit(1);
        if (v) {
            vendedorNombre = v.nombre ? `${v.nombre} ${v.apellidos ?? ''}`.trim() : null;
            vendedorCodigo = v.codigoReferido ?? null;
        }
    }

    // Región
    let regionNombre: string | null = null;
    if (fila.regionId) {
        const [r] = await db
            .select({ nombre: regiones.nombre, estado: regiones.estado })
            .from(regiones)
            .where(eq(regiones.id, fila.regionId))
            .limit(1);
        regionNombre = r ? `${r.nombre}, ${r.estado}` : null;
    }

    // Sucursal principal (ubicación)
    const [suc] = await db
        .select({
            ciudad: negocioSucursales.ciudad,
            estado: negocioSucursales.estado,
            direccion: negocioSucursales.direccion,
            telefono: negocioSucursales.telefono,
        })
        .from(negocioSucursales)
        .where(
            and(
                eq(negocioSucursales.negocioId, negocioId),
                eq(negocioSucursales.esPrincipal, true),
            ),
        )
        .limit(1);

    return {
        id: fila.id,
        nombre: fila.nombre,
        descripcion: fila.descripcion ?? null,
        logoUrl: fila.logoUrl ?? null,
        sitioWeb: fila.sitioWeb ?? null,
        activo: fila.activo,
        esBorrador: fila.esBorrador,
        verificado: fila.verificado,
        onboardingCompletado: fila.onboardingCompletado,
        creadoEn: fila.creadoEn ?? null,
        fechaPrimerPago: fila.fechaPrimerPago ?? null,
        mesesGratisRestantes: fila.mesesGratisRestantes,
        estadoPago: fila.estadoPago,
        estadoAdmin: fila.estadoAdmin,
        fechaVencimiento: fila.fechaVencimiento ?? null,
        fechaProximoCobro: fila.fechaProximoCobro ?? null,
        fechaInicioGracia: fila.fechaInicioGracia ?? null,
        fechaLimiteGracia: fila.fechaLimiteGracia ?? null,
        duenoNombre: fila.duenoNombre ? `${fila.duenoNombre} ${fila.duenoApellidos ?? ''}`.trim() : null,
        duenoCorreo: fila.duenoCorreo ?? null,
        duenoTelefono: fila.duenoTelefono ?? null,
        vendedorId: fila.vendedorId ?? null,
        vendedorNombre,
        vendedorCodigo,
        regionId: fila.regionId ?? null,
        regionNombre,
        ciudad: suc?.ciudad ?? null,
        estado: suc?.estado ?? null,
        direccion: suc?.direccion ?? null,
        telefono: suc?.telefono ?? null,
    };
}

// =============================================================================
// 3. VENDEDORES PARA EL FILTRO
// =============================================================================

/**
 * Lista de vendedores para poblar el filtro "por vendedor", limitada al alcance:
 *   - superadmin → todos los embajadores
 *   - gerente    → embajadores de su región
 * (El vendedor no usa este filtro — solo ve su propia cartera.)
 */
export async function listarVendedoresFiltro(panel: UsuarioPanel): Promise<VendedorFiltro[]> {
    const condiciones: SQL[] = [];
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return [];
        condiciones.push(eq(embajadores.regionId, panel.regionId));
    }

    const where = condiciones.length ? and(...condiciones) : undefined;

    const filas = await db
        .select({
            id: embajadores.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            codigoReferido: embajadores.codigoReferido,
        })
        .from(embajadores)
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(where)
        .orderBy(usuarios.nombre);

    return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre ? `${f.nombre} ${f.apellidos ?? ''}`.trim() : '(sin nombre)',
        codigoReferido: f.codigoReferido,
    }));
}

// =============================================================================
// 4. CIUDADES PARA EL FILTRO
// =============================================================================

/**
 * Ciudades distintas para poblar el filtro "por ciudad", dentro del alcance del
 * rol. Excluye nulas, vacías y el placeholder del onboarding ('Por configurar')
 * — esos caen en la opción fija "Sin ciudad" del frontend.
 */
export async function listarCiudades(panel: UsuarioPanel): Promise<string[]> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return [];

    const cond: SQL[] = [
        isNotNull(negocioSucursales.ciudad),
        ne(negocioSucursales.ciudad, CIUDAD_PLACEHOLDER),
        ne(negocioSucursales.ciudad, ''),
    ];
    if (alcance) cond.push(alcance);

    const filas = await db
        .selectDistinct({ ciudad: negocioSucursales.ciudad })
        .from(negocios)
        .innerJoin(negocioSucursales, joinPrincipal)
        .where(and(...cond))
        .orderBy(asc(negocioSucursales.ciudad));

    return filas
        .map((f) => f.ciudad)
        .filter((c): c is string => !!c);
}
