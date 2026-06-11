/**
 * admin/negocios.service.ts
 * =========================
 * Lecturas de la sección Negocios del Panel Admin (tabla, ficha, sucursales, pagos, filtros).
 *
 * Tres lecturas:
 *   1. listarNegocios       — tabla paginada (nombre / ciudad / vendedor / estado de pago)
 *   2. obtenerDetalleNegocio — ficha administrativa de un negocio
 *   3. listarVendedoresFiltro — vendedores para poblar el filtro "por vendedor"
 *
 * ALCANCE POR ROL (calcado de la matriz de Panel_Admin.md):
 *   - superadmin → toda la plataforma
 *   - gerente    → solo su región (deducida: sucursal MATRIZ → ciudad → región)
 *   - vendedor   → solo su cartera (negocios.embajador_id = su embajador)
 *
 * La ciudad NO vive en `negocios`: se toma de la sucursal principal
 * (`negocio_sucursales` con es_principal = true). El vendedor atribuido se
 * resuelve por `embajador_id → embajadores → usuarios`. (Sin categoría: por
 * decisión, la categoría se retoma en la futura sección Métricas.)
 *
 * Solo lecturas: este service NO modifica datos. Las escrituras viven en
 * `negocios-acciones.service.ts` (suspender/reactivar/reasignar/marcar pagado/
 * cancelar/editar correo) y `altaManualNegocio.service.ts` (alta en efectivo).
 *
 * Ubicación: apps/api/src/services/admin/negocios.service.ts
 */

import { and, eq, ne, ilike, desc, asc, isNull, isNotNull, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    negocios,
    negocioSucursales,
    usuarios,
    embajadores,
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
    logoUrl: string | null;
    ciudad: string | null;
    vendedorId: string | null;
    vendedorNombre: string | null;
    estadoPago: string;
    estadoAdmin: string;
    proximoCobro: string | null;
    alta: string | null;
    /** Total de sucursales (incluida la matriz). > 1 ⇒ tiene secundarias. */
    totalSucursales: number;
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
    // Método de cobro (tarjeta / manual) y si el dueño tiene suscripción de Stripe
    // (para que el SuperAdmin sepa qué hará Marcar pagado / Cancelar / Pausar).
    metodoCobro: string;
    tieneSuscripcionStripe: boolean;
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
export async function resolverEmbajadorId(usuarioId: string | null): Promise<string | null> {
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
        // VISIBILIDAD = MANDO: el negocio tiene su sucursal MATRIZ (es_principal) en una
        // ciudad de mi región (EXISTS correlacionado, NO duplica filas). Deduce la región
        // desde la ciudad; ya no lee `negocios.region_id` (se eliminó en el Paso 10).
        // ⚠️ DEBE COINCIDIR con el MANDO de `cargarNegocioConAlcance` en
        // negocios-acciones.service.ts (mismo predicado matriz → ciudad → región). Si tocas
        // uno, toca el otro.
        return sql`EXISTS (
            SELECT 1 FROM negocio_sucursales ns
            JOIN ciudades c ON c.id = ns.ciudad_id
            WHERE ns.negocio_id = ${negocios.id} AND ns.es_principal = true AND c.region_id = ${panel.regionId}
        )`;
    }

    // vendedor → su cartera
    const embajadorId = await resolverEmbajadorId(panel.usuarioId);
    if (!embajadorId) return 'vacio';
    return eq(negocios.embajadorId, embajadorId);
}

/**
 * Alcance de LECTURA con el filtro GLOBAL de región del Panel (solo superadmin).
 * Si el superadmin manda `?regionId=`, devuelve un panel que actúa como GERENTE de
 * esa región para las CONSULTAS (lista, conteos, ciudades, vendedores, ficha) — es
 * "ver el Panel como el gerente de esa región" (lente de visibilidad). El superadmin
 * CONSERVA todas sus acciones: las mutaciones usan el panel ORIGINAL, no este.
 * Gerente/vendedor IGNORAN el query → su alcance es siempre su token (seguridad).
 */
export function panelConFiltroRegion(panel: UsuarioPanel, regionIdRaw: unknown): UsuarioPanel {
    if (panel.rolEquipo !== 'superadmin') return panel;
    const regionId = typeof regionIdRaw === 'string' && regionIdRaw.trim() ? regionIdRaw.trim() : null;
    if (!regionId) return panel; // superadmin sin filtro = ve todo
    return { ...panel, rolEquipo: 'gerente', regionId };
}

/**
 * Total de negocios en el ALCANCE del rol (para el contador del menú). Sin filtros: el conteo
 * "bruto" de lo que el rol ve (super = todos o la región del filtro global; gerente = su región;
 * vendedor = su cartera). Usa el MISMO predicado de alcance que la lista (`condicionAlcance`); el
 * filtro de región del superadmin lo aplica el controller vía `panelConFiltroRegion`.
 */
export async function contarNegocios(panel: UsuarioPanel): Promise<number> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return 0;
    const [fila] = await db
        .select({ total: count() })
        .from(negocios)
        .where(alcance ?? undefined);
    return Number(fila?.total ?? 0);
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

/** Condición de ciudad (D3): "negocios con ALGUNA sucursal en esa ciudad" (EXISTS por
 *  cualquier sucursal, no solo la principal; no duplica). */
function condicionCiudad(ciudad?: string): SQL | undefined {
    if (ciudad === CIUDAD_SIN) {
        return sql`EXISTS (
            SELECT 1 FROM negocio_sucursales ns
            WHERE ns.negocio_id = ${negocios.id}
              AND (ns.ciudad IS NULL OR ns.ciudad = ${CIUDAD_PLACEHOLDER})
        )`;
    }
    if (ciudad) {
        return sql`EXISTS (
            SELECT 1 FROM negocio_sucursales ns
            WHERE ns.negocio_id = ${negocios.id} AND ns.ciudad = ${ciudad}
        )`;
    }
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
            logoUrl: negocios.logoUrl,
            estadoPago: negocios.estadoMembresia,
            estadoAdmin: negocios.estadoAdmin,
            vendedorId: negocios.embajadorId,
            proximoCobro: negocios.fechaProximoCobro,
            alta: negocios.createdAt,
            ciudad: negocioSucursales.ciudad,
            vendedorNombre: usuarios.nombre,
            vendedorApellidos: usuarios.apellidos,
            // Conteo de sucursales SIN multiplicar filas (subquery escalar, no JOIN).
            totalSucursales: sql<number>`(SELECT COUNT(*) FROM negocio_sucursales ns WHERE ns.negocio_id = ${negocios.id})`,
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
        logoUrl: f.logoUrl ?? null,
        ciudad: f.ciudad ?? null,
        vendedorId: f.vendedorId ?? null,
        vendedorNombre: f.vendedorNombre
            ? `${f.vendedorNombre} ${f.vendedorApellidos ?? ''}`.trim()
            : null,
        estadoPago: f.estadoPago,
        estadoAdmin: f.estadoAdmin,
        proximoCobro: f.proximoCobro ?? null,
        alta: f.alta ?? null,
        totalSucursales: Number(f.totalSucursales),
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
            metodoCobro: negocios.metodoCobro,
            fechaVencimiento: negocios.fechaVencimiento,
            fechaProximoCobro: negocios.fechaProximoCobro,
            fechaInicioGracia: negocios.fechaInicioGracia,
            fechaLimiteGracia: negocios.fechaLimiteGracia,
            // Dueño
            duenoNombre: usuarios.nombre,
            duenoApellidos: usuarios.apellidos,
            duenoCorreo: usuarios.correo,
            duenoTelefono: usuarios.telefono,
            duenoStripeSubId: usuarios.stripeSubscriptionId,
            // Atribución
            vendedorId: negocios.embajadorId,
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

    // Región DEDUCIDA de la sucursal MATRIZ (es_principal → ciudad → región).
    // Ya no se lee `negocios.region_id` (se eliminó en el Paso 10).
    let regionId: string | null = null;
    let regionNombre: string | null = null;
    const filasRegion = (await db.execute(sql`
        SELECT r.id::text AS region_id, r.nombre AS region_nombre
        FROM negocio_sucursales ns
        JOIN ciudades c ON c.id = ns.ciudad_id
        JOIN regiones r ON r.id = c.region_id
        WHERE ns.negocio_id = ${negocioId} AND ns.es_principal = true
        LIMIT 1
    `)).rows as Array<{ region_id: string; region_nombre: string }>;
    if (filasRegion[0]) {
        regionId = filasRegion[0].region_id;
        regionNombre = filasRegion[0].region_nombre;
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
        metodoCobro: fila.metodoCobro,
        tieneSuscripcionStripe: !!fila.duenoStripeSubId,
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
        regionId,
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
        // Vendedores que cubren al menos una ciudad de la región del gerente (la región del
        // vendedor se deduce de `embajador_ciudades`, ya no de embajadores.region_id).
        condiciones.push(sql`EXISTS (
            SELECT 1 FROM embajador_ciudades ec
            JOIN ciudades c ON c.id = ec.ciudad_id
            WHERE ec.embajador_id = ${embajadores.id} AND c.region_id = ${panel.regionId}
        )`);
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
    // GERENTE: SOLO las ciudades de SU región (ciudades.region_id = panel.regionId) que
    // sean SEDE de al menos una sucursal MATRIZ (es_principal). Mismo criterio que la
    // VISIBILIDAD de la tabla (condicionAlcance): así el filtro no ofrece ciudades donde el
    // gerente no ve ningún negocio (ni ciudades de sucursales secundarias de otra región).
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return [];
        const filasGer = (await db.execute(sql`
            SELECT DISTINCT s.ciudad
            FROM negocio_sucursales s
            JOIN ciudades c ON c.id = s.ciudad_id
            WHERE c.region_id = ${panel.regionId}
              AND s.es_principal = true
              AND s.ciudad IS NOT NULL AND s.ciudad <> ${CIUDAD_PLACEHOLDER} AND s.ciudad <> ''
            ORDER BY s.ciudad
        `)).rows as Array<{ ciudad: string }>;
        return filasGer.map((f) => f.ciudad).filter((c): c is string => !!c);
    }

    // SUPERADMIN / VENDEDOR: ciudades de las sucursales dentro de su alcance
    // (superadmin = todas; vendedor = las de su cartera por embajador_id).
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
        .innerJoin(negocioSucursales, eq(negocioSucursales.negocioId, negocios.id))
        .where(and(...cond))
        .orderBy(asc(negocioSucursales.ciudad));

    return filas
        .map((f) => f.ciudad)
        .filter((c): c is string => !!c);
}

// =============================================================================
// 5. SUCURSALES (lista por negocio + detalle de una sucursal)
// =============================================================================

export interface SucursalFila {
    id: string;
    nombre: string;
    esPrincipal: boolean;
    ciudad: string | null;
    regionNombre: string | null;
    activa: boolean;
}

export interface SucursalDetalle {
    id: string;
    negocioId: string;
    nombre: string;
    esPrincipal: boolean;
    activa: boolean;
    // Ubicación de la sucursal
    ciudad: string | null;
    estado: string | null;
    regionId: string | null;
    regionNombre: string | null;
    direccion: string | null;
    telefono: string | null;
    whatsapp: string | null;
    correo: string | null;
    creadoEn: string | null;
    // Gerente asignado (usuarios.sucursal_asignada = sucursal). 0 o 1.
    gerenteNombre: string | null;
    gerenteCorreo: string | null;
    gerenteTelefono: string | null;
    // Vendedor del NEGOCIO (informativo; el mismo para todas las sucursales).
    vendedorId: string | null;
    vendedorNombre: string | null;
    vendedorCodigo: string | null;
}

/** ¿El negocio es visible para el panel? (respeta el alcance del rol). */
async function negocioVisibleParaPanel(panel: UsuarioPanel, negocioId: string): Promise<boolean> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return false;
    const cond: SQL[] = [eq(negocios.id, negocioId)];
    if (alcance) cond.push(alcance);
    const [row] = await db.select({ id: negocios.id }).from(negocios).where(and(...cond)).limit(1);
    return !!row;
}

/**
 * Sucursales de un negocio (matriz primero), respetando el alcance del rol. Si el
 * negocio no está en el alcance del panel devuelve [] (no filtra a medias).
 */
export async function listarSucursalesNegocio(panel: UsuarioPanel, negocioId: string): Promise<SucursalFila[]> {
    if (!(await negocioVisibleParaPanel(panel, negocioId))) return [];
    const filas = (await db.execute(sql`
        SELECT s.id::text AS id, s.nombre, s.es_principal, s.ciudad, s.activa, r.nombre AS region_nombre
        FROM negocio_sucursales s
        LEFT JOIN ciudades c ON c.id = s.ciudad_id
        LEFT JOIN regiones r ON r.id = c.region_id
        WHERE s.negocio_id = ${negocioId}
        ORDER BY s.es_principal DESC, s.ciudad
    `)).rows as Array<{
        id: string; nombre: string; es_principal: boolean; ciudad: string | null;
        activa: boolean; region_nombre: string | null;
    }>;
    return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        esPrincipal: f.es_principal,
        ciudad: f.ciudad ?? null,
        regionNombre: f.region_nombre ?? null,
        activa: f.activa,
    }));
}

/** Una fila del historial de pagos de membresía (bitácora de pagos_membresia). */
export interface PagoMembresiaFila {
    id: string;
    monto: string | null;
    concepto: string;
    fechaPago: string | null;
    periodoHasta: string | null;
    mesesCubiertos: number | null;
    nota: string | null;
    /** Nombre de quién registró el pago (usuarios.registrado_por); null si la cuenta se borró. */
    registradoPorNombre: string | null;
}

/**
 * Historial de pagos de membresía de un negocio (bitácora pagos_membresia), respetando el
 * alcance del rol. Cada fila trae concepto (efectivo/transferencia/cortesía), monto y quién lo
 * registró. Útil para la ficha del método MANUAL. [] si el negocio no está en el alcance.
 */
export async function listarPagosNegocio(panel: UsuarioPanel, negocioId: string, limite?: number): Promise<PagoMembresiaFila[]> {
    if (!(await negocioVisibleParaPanel(panel, negocioId))) return [];
    // `limite` acota a los N más recientes (para el "ver todos" de la ficha); sin él, todos.
    const limitSql = limite && limite > 0 ? sql` LIMIT ${limite}` : sql``;
    const filas = (await db.execute(sql`
        SELECT pm.id::text AS id, pm.monto::text AS monto, pm.concepto,
               pm.fecha_pago::text AS fecha_pago, pm.periodo_hasta::text AS periodo_hasta,
               pm.meses_cubiertos AS meses_cubiertos, pm.nota,
               u.nombre AS u_nombre, u.apellidos AS u_apellidos
        FROM pagos_membresia pm
        LEFT JOIN usuarios u ON u.id = pm.registrado_por
        WHERE pm.negocio_id = ${negocioId}
        ORDER BY pm.created_at DESC${limitSql}
    `)).rows as Array<{
        id: string; monto: string | null; concepto: string;
        fecha_pago: string | null; periodo_hasta: string | null;
        meses_cubiertos: number | null; nota: string | null;
        u_nombre: string | null; u_apellidos: string | null;
    }>;
    return filas.map((f) => ({
        id: f.id,
        monto: f.monto ?? null,
        concepto: f.concepto,
        fechaPago: f.fecha_pago ?? null,
        periodoHasta: f.periodo_hasta ?? null,
        mesesCubiertos: f.meses_cubiertos ?? null,
        nota: f.nota ?? null,
        registradoPorNombre: f.u_nombre ? `${f.u_nombre} ${f.u_apellidos ?? ''}`.trim() : null,
    }));
}

/**
 * Detalle de UNA sucursal de un negocio (modal del Panel): datos de la sucursal +
 * región + gerente asignado (usuarios.sucursal_asignada) + vendedor del negocio
 * (informativo). Respeta el alcance del rol. null si no existe / fuera de alcance.
 */
export async function obtenerDetalleSucursal(
    panel: UsuarioPanel,
    negocioId: string,
    sucursalId: string,
): Promise<SucursalDetalle | null> {
    if (!(await negocioVisibleParaPanel(panel, negocioId))) return null;

    const filas = (await db.execute(sql`
        SELECT s.id::text AS id, s.negocio_id::text AS negocio_id, s.nombre, s.es_principal, s.activa,
               s.ciudad, s.estado, s.direccion, s.telefono, s.whatsapp, s.correo, s.created_at,
               r.id::text AS region_id, r.nombre AS region_nombre,
               g.nombre AS g_nombre, g.apellidos AS g_apellidos, g.correo AS g_correo, g.telefono AS g_telefono
        FROM negocio_sucursales s
        LEFT JOIN ciudades c ON c.id = s.ciudad_id
        LEFT JOIN regiones r ON r.id = c.region_id
        LEFT JOIN usuarios g ON g.sucursal_asignada = s.id
        WHERE s.id = ${sucursalId} AND s.negocio_id = ${negocioId}
        LIMIT 1
    `)).rows as Array<{
        id: string; negocio_id: string; nombre: string; es_principal: boolean; activa: boolean;
        ciudad: string | null; estado: string | null; direccion: string | null; telefono: string | null;
        whatsapp: string | null; correo: string | null; created_at: string | null;
        region_id: string | null; region_nombre: string | null;
        g_nombre: string | null; g_apellidos: string | null; g_correo: string | null; g_telefono: string | null;
    }>;
    const f = filas[0];
    if (!f) return null;

    // Vendedor del negocio (el mismo para todas las sucursales).
    const vend = (await db.execute(sql`
        SELECT e.id::text AS vendedor_id, u.nombre AS v_nombre, u.apellidos AS v_apellidos, e.codigo_referido AS v_codigo
        FROM negocios n
        LEFT JOIN embajadores e ON e.id = n.embajador_id
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE n.id = ${negocioId}
        LIMIT 1
    `)).rows as Array<{ vendedor_id: string | null; v_nombre: string | null; v_apellidos: string | null; v_codigo: string | null }>;
    const v = vend[0];

    const gerenteNombre = f.g_nombre ? `${f.g_nombre} ${f.g_apellidos ?? ''}`.trim() : null;
    const vendedorNombre = v?.v_nombre ? `${v.v_nombre} ${v.v_apellidos ?? ''}`.trim() : null;

    return {
        id: f.id,
        negocioId: f.negocio_id,
        nombre: f.nombre,
        esPrincipal: f.es_principal,
        activa: f.activa,
        ciudad: f.ciudad ?? null,
        estado: f.estado ?? null,
        regionId: f.region_id ?? null,
        regionNombre: f.region_nombre ?? null,
        direccion: f.direccion ?? null,
        telefono: f.telefono ?? null,
        whatsapp: f.whatsapp ?? null,
        correo: f.correo ?? null,
        creadoEn: f.created_at ?? null,
        gerenteNombre,
        gerenteCorreo: f.g_correo ?? null,
        gerenteTelefono: f.g_telefono ?? null,
        vendedorId: v?.vendedor_id ?? null,
        vendedorNombre,
        vendedorCodigo: v?.v_codigo ?? null,
    };
}
