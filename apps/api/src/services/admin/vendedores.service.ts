/**
 * admin/vendedores.service.ts
 * ===========================
 * Lecturas de la sección "Vendedores y comisiones" del Panel Admin — pieza A: la CARTERA.
 *
 * Universo: la tabla `embajadores` (la red de ventas). A diferencia de "Equipo y accesos"
 * (que ve la cuenta como identidad/acceso), aquí se ve la OPERACIÓN del vendedor: su cartera
 * de negocios, cuántos están activos (base de la comisión recurrente), su código y cobertura.
 *
 * Tres lecturas (Fase 1 — VER):
 *   1. listarVendedores — tabla paginada de la red (nombre / código / región / # cartera / # activos),
 *                          con conteos por estado del embajador. Alcance por rol.
 *   2. obtenerVendedor  — ficha de un vendedor (sus datos + métricas resumen de cartera).
 *   3. listarCartera    — los negocios atribuidos a un vendedor (estado de membresía + vencimiento),
 *                          paginados, con conteos por estado efectivo.
 *
 * ALCANCE POR ROL (calcado de la matriz de Panel_Admin.md · "Vendedores y comisiones"):
 *   - superadmin → toda la red (o la región del filtro global vía `panelConFiltroRegion`).
 *   - gerente    → su equipo (vendedores que cubren alguna ciudad de su región).
 *   - vendedor   → SOLO él mismo (su propia cartera).
 * El acceso a la sección lo controla `requierePanel([...])` en la ruta; el alcance fino lo aplica
 * este service (defensa en profundidad).
 *
 * "Activo" (para la comisión recurrente) = membresía AL CORRIENTE o EN GRACIA y el negocio activo a
 * nivel admin (no suspendido/archivado). Coincide con la filosofía de §Comisiones de Panel_Admin.md.
 *
 * Solo lecturas: este service NO modifica datos. El devengo/escalera/liquidación (Fase 2) vivirán en
 * services aparte. La gestión de cobertura (ciudades) avanzada está diferida (ver el doc del módulo).
 *
 * Ubicación: apps/api/src/services/admin/vendedores.service.ts
 */

import { and, eq, asc, desc, ilike, or, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { embajadores, usuarios, negocios, negocioSucursales, embajadorComisiones, pagosVendedor } from '../../db/schemas/schema.js';
import { env } from '../../config/env.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { resolverEmbajadorId } from './negocios.service.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Estado del embajador (= CHECK de embajadores.estado). */
export const ESTADOS_EMBAJADOR = ['activo', 'inactivo', 'suspendido'] as const;
export type EstadoEmbajador = (typeof ESTADOS_EMBAJADOR)[number];

/** Orden de la tabla de vendedores (corre en servidor por el paginado). */
export const ORDENES_VENDEDORES = ['nombre_az', 'nombre_za', 'cartera_desc', 'activos_desc'] as const;
export type OrdenVendedores = (typeof ORDENES_VENDEDORES)[number];

export interface FiltrosVendedores {
    busqueda?: string;        // nombre / apellidos / correo / código (ILIKE)
    estado?: EstadoEmbajador; // estado del embajador
    orden?: OrdenVendedores;
    pagina: number;           // 1-based
    porPagina: number;
}

/** Conteos por estado del embajador para los chips (reflejan alcance + búsqueda, NO el filtro de estado). */
export interface ConteosEstadoEmbajador {
    total: number;
    porEstado: Array<{ estado: string; total: number }>;
}

/** Una fila de la tabla de vendedores. Datos planos (el middleware snake→camel no toca strings). */
export interface VendedorFila {
    id: string;                 // usuarios.id (la persona; consistente con Equipo)
    embajadorId: string;        // embajadores.id (para la cartera/atribución)
    nombre: string;             // nombre + apellidos
    correo: string;
    codigoReferido: string;
    linkReferido: string | null;
    estadoEmbajador: string;    // activo | inactivo | suspendido
    regionNombre: string | null;
    ciudades: string | null;    // "Puerto Peñasco, Sonoyta"
    negociosEnCartera: number;  // todos los atribuidos
    negociosActivos: number;    // al corriente o en gracia (base de la comisión recurrente)
}

export interface ListaVendedores {
    items: VendedorFila[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosEstadoEmbajador;
}

/** Ficha de un vendedor (resumen; las comisiones/liquidación llegan en la Fase 2). */
export interface VendedorDetalle extends VendedorFila {
    nombreSolo: string | null;
    apellidos: string | null;
    telefono: string | null;
    altaEmbajador: string | null;     // embajadores.created_at
    gerenteNombre: string | null;     // gerente de su región (deducido)
    ultimoAccesoPanel: string | null; // usuarios.ultimo_acceso_panel
}

/** Una fila de la cartera de un vendedor (un negocio atribuido). */
export interface NegocioCartera {
    id: string;
    nombre: string;
    logoUrl: string | null;
    ciudad: string | null;
    estadoPago: string;       // estado_membresia
    estadoAdmin: string;      // activo | suspendido | archivado
    metodoCobro: string;      // tarjeta | manual
    proximoCobro: string | null;
    vencimiento: string | null;
    alta: string | null;
    duenoNombre: string | null;
    duenoTelefono: string | null;
}

export interface CarteraVendedor {
    vendedor: VendedorDetalle;
    items: NegocioCartera[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosEstadoEmbajador; // reutiliza la forma {estado,total} con el estado EFECTIVO de pago
}

// =============================================================================
// HELPERS
// =============================================================================

/** Link de registro que el vendedor comparte (el `?ref=` viaja a Stripe → atribución, Camino A). */
function linkDeReferido(codigo: string | null): string | null {
    return codigo ? `${env.FRONTEND_URL}/registro?plan=comercial&ref=${codigo}` : null;
}

function nombreCompleto(nombre: string | null, apellidos: string | null): string {
    return `${nombre ?? ''} ${apellidos ?? ''}`.trim();
}

// Subqueries escalares por fila (correlacionadas con embajadores.id; el FROM exterior es `embajadores`).
const SUB_CIUDADES = sql<string | null>`(
    SELECT string_agg(c.nombre, ', ' ORDER BY c.nombre)
    FROM embajador_ciudades ec
    JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE ec.embajador_id = ${embajadores.id}
)`;
const SUB_REGION = sql<string | null>`(
    SELECT r.nombre
    FROM embajador_ciudades ec
    JOIN ciudades c ON c.id = ec.ciudad_id
    JOIN regiones r ON r.id = c.region_id
    WHERE ec.embajador_id = ${embajadores.id}
    LIMIT 1
)`;
const SUB_CARTERA = sql<number>`(
    SELECT COUNT(*)::int FROM negocios n WHERE n.embajador_id = ${embajadores.id}
)`;
// "Activo" = negocio activo a nivel admin Y membresía al corriente o en gracia (cuenta para la comisión).
const SUB_ACTIVOS = sql<number>`(
    SELECT COUNT(*)::int FROM negocios n
    WHERE n.embajador_id = ${embajadores.id}
      AND n.estado_admin = 'activo'
      AND n.estado_membresia IN ('al_corriente', 'en_gracia')
)`;
// Gerente a cargo: el gerente cuya región (usuarios.region_id) coincide con la región DEDUCIDA del
// vendedor (su primera ciudad → región). Solo para la ficha (subquery escalar por fila).
const GERENTE_REGION = sql<string | null>`(
    SELECT (g.nombre || ' ' || COALESCE(g.apellidos, ''))
    FROM usuarios g
    WHERE g.rol_equipo = 'gerente'
      AND g.region_id = (
        SELECT c.region_id FROM embajador_ciudades ec
        JOIN ciudades c ON c.id = ec.ciudad_id
        WHERE ec.embajador_id = ${embajadores.id} LIMIT 1
      )
    LIMIT 1
)`;

/**
 * Condición de alcance (WHERE sobre `embajadores`) según el rol, o `'vacio'` si el rol no puede ver
 * nada por configuración incompleta (gerente sin región, vendedor sin embajador/usuario). El
 * superadmin no tiene condición (ve toda la red) → devuelve null.
 *   - gerente  → embajadores que cubren alguna ciudad de su región (deducida de `embajador_ciudades`).
 *   - vendedor → solo su propio embajador (embajadores.usuario_id = su usuario).
 * El filtro global de región del superadmin lo aplica el controller vía `panelConFiltroRegion`
 * (lo convierte en "gerente de esa región" para las consultas).
 */
function condicionAlcance(panel: UsuarioPanel): SQL | null | 'vacio' {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        return sql`EXISTS (
            SELECT 1 FROM embajador_ciudades ec
            JOIN ciudades c ON c.id = ec.ciudad_id
            WHERE ec.embajador_id = ${embajadores.id} AND c.region_id = ${panel.regionId}
        )`;
    }

    // vendedor → solo él mismo
    if (panel.rolEquipo === 'vendedor') {
        if (!panel.usuarioId) return 'vacio';
        return eq(embajadores.usuarioId, panel.usuarioId);
    }

    return 'vacio';
}

/** Búsqueda por nombre / apellidos / correo / código (ILIKE OR). */
function condicionBusqueda(busqueda?: string): SQL | undefined {
    if (!busqueda) return undefined;
    const t = `%${busqueda}%`;
    return or(
        ilike(usuarios.nombre, t),
        ilike(usuarios.apellidos, t),
        ilike(usuarios.correo, t),
        ilike(embajadores.codigoReferido, t),
    );
}

/** Traduce la opción de orden a expresiones ORDER BY (corre en servidor). */
function ordenarPor(orden?: OrdenVendedores): SQL[] {
    switch (orden) {
        case 'nombre_za':
            return [desc(usuarios.nombre), asc(usuarios.apellidos)];
        case 'cartera_desc':
            return [sql`${SUB_CARTERA} DESC`, asc(usuarios.nombre)];
        case 'activos_desc':
            return [sql`${SUB_ACTIVOS} DESC`, asc(usuarios.nombre)];
        case 'nombre_az':
        default:
            return [asc(usuarios.nombre), asc(usuarios.apellidos)];
    }
}

/** Arma una fila de vendedor a partir de los campos crudos. */
function aFila(f: {
    id: string; embajadorId: string; nombre: string | null; apellidos: string | null; correo: string;
    codigoReferido: string; estadoEmbajador: string; regionNombre: string | null; ciudades: string | null;
    negociosEnCartera: number; negociosActivos: number;
}): VendedorFila {
    return {
        id: f.id,
        embajadorId: f.embajadorId,
        nombre: nombreCompleto(f.nombre, f.apellidos),
        correo: f.correo,
        codigoReferido: f.codigoReferido,
        linkReferido: linkDeReferido(f.codigoReferido),
        estadoEmbajador: f.estadoEmbajador,
        regionNombre: f.regionNombre ?? null,
        ciudades: f.ciudades ?? null,
        negociosEnCartera: Number(f.negociosEnCartera ?? 0),
        negociosActivos: Number(f.negociosActivos ?? 0),
    };
}

// =============================================================================
// 1. LISTA PAGINADA
// =============================================================================

export async function listarVendedores(panel: UsuarioPanel, filtros: FiltrosVendedores): Promise<ListaVendedores> {
    const alcance = condicionAlcance(panel);
    const vacia: ListaVendedores = {
        items: [], total: 0, pagina: filtros.pagina, porPagina: filtros.porPagina,
        conteos: { total: 0, porEstado: [] },
    };
    if (alcance === 'vacio') return vacia;

    const condBusqueda = condicionBusqueda(filtros.busqueda);

    // BASE = alcance + búsqueda (SIN el filtro de estado). Sobre esta base se cuentan los chips.
    const base: SQL[] = [];
    if (alcance) base.push(alcance);
    if (condBusqueda) base.push(condBusqueda);

    const condLista = [...base];
    if (filtros.estado) condLista.push(eq(embajadores.estado, filtros.estado));

    const whereBase = base.length ? and(...base) : undefined;
    const whereLista = condLista.length ? and(...condLista) : undefined;

    // Total (con el filtro de estado, para el paginado).
    const [{ total }] = await db
        .select({ total: count() })
        .from(embajadores)
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(whereLista);

    // Conteos por estado del embajador (SIN el filtro de estado en el WHERE).
    const filasConteo = await db
        .select({ estado: embajadores.estado, n: count() })
        .from(embajadores)
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(whereBase)
        .groupBy(embajadores.estado);

    let totalConteo = 0;
    const porEstado = filasConteo.map((f) => {
        const t = Number(f.n);
        totalConteo += t;
        return { estado: f.estado, total: t };
    });
    const conteos: ConteosEstadoEmbajador = { total: totalConteo, porEstado };

    // Página.
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: embajadores.usuarioId,
            embajadorId: embajadores.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            correo: usuarios.correo,
            codigoReferido: embajadores.codigoReferido,
            estadoEmbajador: embajadores.estado,
            regionNombre: SUB_REGION,
            ciudades: SUB_CIUDADES,
            negociosEnCartera: SUB_CARTERA,
            negociosActivos: SUB_ACTIVOS,
        })
        .from(embajadores)
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(whereLista)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items = filas.map((f) => aFila({ ...f, correo: f.correo ?? '' }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// CONTEO GENERAL (badge del menú)
// =============================================================================

export async function contarVendedores(panel: UsuarioPanel): Promise<number> {
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') return 0;
    const [fila] = await db
        .select({ total: count() })
        .from(embajadores)
        .where(alcance ?? undefined);
    return Number(fila?.total ?? 0);
}

// =============================================================================
// 2. FICHA DE UN VENDEDOR
// =============================================================================

/** Lee la ficha de un vendedor por su usuarioId, respetando el alcance. null si no existe / fuera de alcance. */
async function leerVendedor(panel: UsuarioPanel, usuarioId: string): Promise<VendedorDetalle | null> {
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') return null;

    const cond: SQL[] = [eq(embajadores.usuarioId, usuarioId)];
    if (alcance) cond.push(alcance);

    const [f] = await db
        .select({
            id: embajadores.usuarioId,
            embajadorId: embajadores.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            codigoReferido: embajadores.codigoReferido,
            estadoEmbajador: embajadores.estado,
            altaEmbajador: embajadores.createdAt,
            ultimoAccesoPanel: usuarios.ultimoAccesoPanel,
            gerenteNombre: GERENTE_REGION,
            regionNombre: SUB_REGION,
            ciudades: SUB_CIUDADES,
            negociosEnCartera: SUB_CARTERA,
            negociosActivos: SUB_ACTIVOS,
        })
        .from(embajadores)
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(and(...cond))
        .limit(1);

    if (!f) return null;

    const fila = aFila({ ...f, correo: f.correo ?? '' });
    return {
        ...fila,
        nombreSolo: f.nombre ?? null,
        apellidos: f.apellidos ?? null,
        telefono: f.telefono ?? null,
        altaEmbajador: f.altaEmbajador ?? null,
        gerenteNombre: (f.gerenteNombre ?? '').trim() || null,
        ultimoAccesoPanel: f.ultimoAccesoPanel ?? null,
    };
}

export async function obtenerVendedor(panel: UsuarioPanel, usuarioId: string): Promise<VendedorDetalle | null> {
    return leerVendedor(panel, usuarioId);
}

// =============================================================================
// 3. CARTERA DE UN VENDEDOR (sus negocios atribuidos)
// =============================================================================

/** Join a la sucursal principal del negocio (1:1 por el unique parcial). */
const joinPrincipal = and(
    eq(negocioSucursales.negocioId, negocios.id),
    eq(negocioSucursales.esPrincipal, true),
);

/** Estado efectivo del negocio (el eje admin manda sobre el de pago). Igual criterio que Negocios. */
const ESTADO_EFECTIVO = sql<string>`CASE
    WHEN ${negocios.estadoAdmin} = 'archivado' THEN 'cancelado'
    WHEN ${negocios.estadoAdmin} = 'suspendido' THEN 'suspendido'
    ELSE ${negocios.estadoMembresia}
END`;

/**
 * Cartera de un vendedor: sus negocios atribuidos (negocios.embajador_id = su embajador), paginados,
 * con conteos por estado efectivo. Respeta el alcance: devuelve null si el vendedor no existe o está
 * fuera del alcance del rol (el controller responde 404). El vendedor solo ve la suya.
 */
export async function listarCartera(
    panel: UsuarioPanel,
    usuarioId: string,
    filtros: { estadoPago?: string; pagina: number; porPagina: number },
): Promise<CarteraVendedor | null> {
    // 1. La ficha valida existencia + alcance en un solo paso.
    const vendedor = await leerVendedor(panel, usuarioId);
    if (!vendedor) return null;

    const embajadorId = vendedor.embajadorId;

    // 2. Base = atribución a este embajador. (El alcance ya quedó garantizado por leerVendedor.)
    const base: SQL[] = [eq(negocios.embajadorId, embajadorId)];
    const condLista = [...base];
    if (filtros.estadoPago) condLista.push(sql`${ESTADO_EFECTIVO} = ${filtros.estadoPago}`);

    const whereBase = and(...base);
    const whereLista = and(...condLista);

    const [{ total }] = await db
        .select({ total: count() })
        .from(negocios)
        .where(whereLista);

    // Conteos por estado efectivo (SIN el filtro de estado).
    const filasConteo = await db
        .select({ estado: ESTADO_EFECTIVO, n: count() })
        .from(negocios)
        .where(whereBase)
        .groupBy(ESTADO_EFECTIVO);

    let totalConteo = 0;
    const porEstado = filasConteo.map((f) => {
        const t = Number(f.n);
        totalConteo += t;
        return { estado: f.estado, total: t };
    });
    const conteos: ConteosEstadoEmbajador = { total: totalConteo, porEstado };

    // Página.
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: negocios.id,
            nombre: negocios.nombre,
            logoUrl: negocios.logoUrl,
            estadoPago: negocios.estadoMembresia,
            estadoAdmin: negocios.estadoAdmin,
            metodoCobro: negocios.metodoCobro,
            proximoCobro: negocios.fechaProximoCobro,
            vencimiento: negocios.fechaVencimiento,
            alta: negocios.createdAt,
            ciudad: negocioSucursales.ciudad,
            duenoNombre: usuarios.nombre,
            duenoApellidos: usuarios.apellidos,
            duenoTelefono: usuarios.telefono,
        })
        .from(negocios)
        .leftJoin(negocioSucursales, joinPrincipal)
        .leftJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(whereLista)
        .orderBy(
            sql`CASE ${ESTADO_EFECTIVO} WHEN 'al_corriente' THEN 0 WHEN 'en_gracia' THEN 1 WHEN 'suspendido' THEN 2 WHEN 'cancelado' THEN 3 ELSE 4 END`,
            asc(negocios.nombre),
        )
        .limit(filtros.porPagina)
        .offset(offset);

    const items: NegocioCartera[] = filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        logoUrl: f.logoUrl ?? null,
        ciudad: f.ciudad ?? null,
        estadoPago: f.estadoPago,
        estadoAdmin: f.estadoAdmin,
        metodoCobro: f.metodoCobro,
        proximoCobro: f.proximoCobro ?? null,
        vencimiento: f.vencimiento ?? null,
        alta: f.alta ?? null,
        duenoNombre: f.duenoNombre ? `${f.duenoNombre} ${f.duenoApellidos ?? ''}`.trim() : null,
        duenoTelefono: f.duenoTelefono ?? null,
    }));

    return { vendedor, items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// 4. ESTADO DE CUENTA DE COMISIONES (Fase 2 · pieza B — lectura)
// =============================================================================

/** Una comisión devengada (fila de embajador_comisiones), con su desglose para la UI. */
export interface ComisionFila {
    id: string;
    periodo: string | null;       // 'YYYY-MM' (recurrente)
    tipo: string;                 // recurrente | alta
    monto: number;
    estado: string;               // pendiente | pagada | cancelada
    activos: number | null;       // del detalle (recurrente)
    montoUnitario: number | null; // monto por activo del escalón
    escalon: string | null;       // p.ej. "10-24"
    pagadaAt: string | null;
    creada: string | null;
}

/** Totales del estado de cuenta: lo devengado (no cancelado), lo ya pagado y lo pendiente. */
export interface ResumenComisiones {
    devengado: number;
    pagado: number;
    pendiente: number;
}

export interface EstadoCuentaComisiones {
    vendedor: VendedorDetalle;
    items: ComisionFila[];
    resumen: ResumenComisiones;
}

/**
 * Estado de cuenta de comisiones de un vendedor: sus comisiones devengadas + los totales. Respeta el
 * alcance (vendedor solo las suyas; gerente su equipo; super todas) reutilizando `leerVendedor`. null si
 * el vendedor no existe o está fuera de alcance (el controller responde 404).
 */
export async function listarComisionesVendedor(
    panel: UsuarioPanel,
    usuarioId: string,
): Promise<EstadoCuentaComisiones | null> {
    const vendedor = await leerVendedor(panel, usuarioId);
    if (!vendedor) return null;

    const filas = await db
        .select({
            id: embajadorComisiones.id,
            periodo: embajadorComisiones.periodo,
            tipo: embajadorComisiones.tipo,
            monto: embajadorComisiones.montoComision,
            estado: embajadorComisiones.estado,
            detalle: embajadorComisiones.detalle,
            pagadaAt: embajadorComisiones.pagadaAt,
            creada: embajadorComisiones.createdAt,
        })
        .from(embajadorComisiones)
        .where(eq(embajadorComisiones.embajadorId, vendedor.embajadorId))
        .orderBy(desc(embajadorComisiones.periodo), desc(embajadorComisiones.createdAt));

    const items: ComisionFila[] = filas.map((f) => {
        const d = (f.detalle ?? {}) as { activos?: number; montoUnitario?: number; escalon?: string };
        return {
            id: f.id,
            periodo: f.periodo ?? null,
            tipo: f.tipo,
            monto: Number(f.monto),
            estado: f.estado,
            activos: typeof d.activos === 'number' ? d.activos : null,
            montoUnitario: typeof d.montoUnitario === 'number' ? d.montoUnitario : null,
            escalon: d.escalon ?? null,
            pagadaAt: f.pagadaAt ?? null,
            creada: f.creada ?? null,
        };
    });

    let devengado = 0;
    let pagado = 0;
    for (const c of items) {
        if (c.estado === 'cancelada') continue;
        devengado += c.monto;
        if (c.estado === 'pagada') pagado += c.monto;
    }
    const resumen: ResumenComisiones = { devengado, pagado, pendiente: devengado - pagado };

    return { vendedor, items, resumen };
}

// =============================================================================
// 5. BITÁCORA DE PAGOS AL VENDEDOR (Fase 2 · pieza E — lectura)
// =============================================================================

/** Un pago realizado al vendedor (egreso). */
export interface PagoFila {
    id: string;
    monto: number;
    metodo: string;
    fechaPago: string | null;
    periodo: string | null;
    nota: string | null;
    comprobanteUrl: string | null;
    creada: string | null;
}

export interface BitacoraPagos {
    vendedor: VendedorDetalle;
    items: PagoFila[];
    totalPagado: number;
}

/** Historial de pagos hechos al vendedor (con alcance por rol). null si no existe / fuera de alcance. */
export async function listarPagosVendedor(panel: UsuarioPanel, usuarioId: string): Promise<BitacoraPagos | null> {
    const vendedor = await leerVendedor(panel, usuarioId);
    if (!vendedor) return null;

    const filas = await db
        .select({
            id: pagosVendedor.id,
            monto: pagosVendedor.monto,
            metodo: pagosVendedor.metodo,
            fechaPago: pagosVendedor.fechaPago,
            periodo: pagosVendedor.periodo,
            nota: pagosVendedor.nota,
            comprobanteUrl: pagosVendedor.comprobanteUrl,
            creada: pagosVendedor.createdAt,
        })
        .from(pagosVendedor)
        .where(eq(pagosVendedor.embajadorId, vendedor.embajadorId))
        .orderBy(desc(pagosVendedor.fechaPago), desc(pagosVendedor.createdAt));

    const items: PagoFila[] = filas.map((f) => ({
        id: f.id,
        monto: Number(f.monto),
        metodo: f.metodo,
        fechaPago: f.fechaPago ?? null,
        periodo: f.periodo ?? null,
        nota: f.nota ?? null,
        comprobanteUrl: f.comprobanteUrl ?? null,
        creada: f.creada ?? null,
    }));
    const totalPagado = items.reduce((s, p) => s + p.monto, 0);

    return { vendedor, items, totalPagado };
}
