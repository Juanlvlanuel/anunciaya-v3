/**
 * admin/suscripciones.service.ts
 * ==============================
 * Lecturas de la sección Suscripciones del Panel Admin = la BITÁCORA FINANCIERA
 * global (el "libro mayor" de la membresía). Lista los eventos de `eventos_pago`
 * (cobros de Stripe + pagos manuales + cancelaciones), con KPIs de cabecera y detalle.
 *
 * Dos lecturas:
 *   1. listarEventos        — bitácora paginada (fecha / negocio / tipo / origen / monto)
 *   2. obtenerDetalleEvento — detalle de solo lectura de un evento (con ids de Stripe)
 *
 * ALCANCE POR ROL (matriz de Suscripciones_Pendientes.md):
 *   - superadmin → toda la plataforma
 *   - gerente    → solo su región (deducida: negocio → sucursal MATRIZ → ciudad → región)
 *   - vendedor   → FUERA en V1 (las rutas no le dan acceso; defensivo: 'vacio')
 *
 * El predicado del gerente es el MISMO que el de Negocios (matriz → ciudad → región),
 * solo que correlacionado sobre `eventos_pago.negocio_id`. Si tocas uno, revisa el otro.
 *
 * Solo lecturas: este service NO modifica datos. La ESCRITURA de eventos vive en el
 * webhook (pago.service.ts) y en marcarPagado (negocios-acciones.service.ts), vía el
 * helper services/suscripciones/eventos-pago.ts.
 *
 * Ubicación: apps/api/src/services/admin/suscripciones.service.ts
 */

import { and, eq, desc, asc, count, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { eventosPago, negocios, negocioSucursales, usuarios, ciudades } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';

// Reusa el filtro GLOBAL de región del Panel (mismo helper que Negocios): si el
// superadmin manda ?regionId=, consulta como gerente de esa región.
export { panelConFiltroRegion } from './negocios.service.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Tipos de evento del libro mayor. */
export const TIPOS_EVENTO = ['cobro_exitoso', 'cobro_fallido', 'cancelacion', 'pago_manual'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/** Origen del evento. */
export const ORIGENES_EVENTO = ['stripe', 'manual'] as const;
export type OrigenEvento = (typeof ORIGENES_EVENTO)[number];

/** Opciones de orden (corre en servidor por el paginado). */
export const ORDENES_EVENTO = ['fecha_recientes', 'fecha_antiguos', 'monto_mayor', 'monto_menor'] as const;
export type OrdenEvento = (typeof ORDENES_EVENTO)[number];

export interface FiltrosEventos {
    busqueda?: string;     // nombre del negocio (ILIKE)
    tipo?: TipoEvento;
    origen?: OrigenEvento;
    negocioId?: string;    // deep-link: solo los eventos de UN negocio
    desde?: string;        // fecha_evento >= (ISO)
    hasta?: string;        // fecha_evento <= (ISO)
    orden?: OrdenEvento;
    pagina: number;        // 1-based
    porPagina: number;
}

/** Conteos por tipo (chips) + KPIs de cabecera. Se usa un ARRAY {tipo,total} a
 *  propósito: el middleware snake→camel transformaría las KEYS de un objeto, pero
 *  no toca los VALORES string ni las keys neutras 'tipo'/'total'/'ingresos'/'fallidos'. */
export interface ConteosEventos {
    total: number;
    porTipo: Array<{ tipo: string; total: number }>;
    /** KPIs sobre el alcance + filtros activos (SIN el filtro de tipo). */
    ingresos: number;      // SUM(monto) de cobro_exitoso + pago_manual
    fallidos: number;      // COUNT de cobro_fallido
}

/** Una fila de la bitácora. */
export interface EventoFila {
    id: string;
    fecha: string | null;        // fecha_evento
    negocioId: string;
    negocioNombre: string | null;
    logoUrl: string | null;      // logo del negocio (para la tabla)
    ciudad: string | null;       // ciudad de la sucursal principal (2ª línea bajo el nombre)
    tipo: string;
    origen: string;
    monto: string | null;        // numeric → string; el front formatea
    moneda: string;
    actorNombre: string | null;  // admin que lo registró (manual); null en Stripe
    stripeEventId: string | null;
}

export interface ListaEventos {
    items: EventoFila[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosEventos;
}

/** Detalle de solo lectura de un evento. */
export interface EventoDetalle {
    id: string;
    fecha: string | null;
    negocioId: string;
    negocioNombre: string | null;
    tipo: string;
    origen: string;
    monto: string | null;
    moneda: string;
    actorId: string | null;
    actorNombre: string | null;
    actorCorreo: string | null;
    stripeEventId: string | null;
    referenciaId: string | null;
    metadata: unknown;
    creadoEn: string | null;     // created_at (cuándo se REGISTRÓ la fila)
}

// =============================================================================
// ALCANCE POR ROL
// =============================================================================

/**
 * Condición de alcance (WHERE) para el rol, o `'vacio'` si no puede ver nada
 * (gerente sin región). El superadmin no tiene condición (ve todo) → null.
 * El vendedor está FUERA de Suscripciones en V1 → 'vacio' (defensivo; además las
 * rutas no le dan acceso).
 */
async function condicionAlcance(panel: UsuarioPanel): Promise<SQL | null | 'vacio'> {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        // MISMO predicado que Negocios (matriz → ciudad → región), correlacionado sobre
        // el negocio del evento. EXISTS (no duplica filas).
        return sql`EXISTS (
            SELECT 1 FROM negocio_sucursales ns
            JOIN ciudades c ON c.id = ns.ciudad_id
            WHERE ns.negocio_id = ${eventosPago.negocioId} AND ns.es_principal = true AND c.region_id = ${panel.regionId}
        )`;
    }

    // vendedor u otro rol: fuera de Suscripciones en V1.
    return 'vacio';
}

/** Traduce la opción de orden a expresiones ORDER BY. */
function ordenarPor(orden?: OrdenEvento): SQL[] {
    switch (orden) {
        case 'fecha_antiguos':
            return [asc(eventosPago.fechaEvento)];
        case 'monto_mayor':
            return [sql`${eventosPago.monto} DESC NULLS LAST`];
        case 'monto_menor':
            return [sql`${eventosPago.monto} ASC NULLS LAST`];
        case 'fecha_recientes':
        default:
            return [desc(eventosPago.fechaEvento)];
    }
}

/** Búsqueda por nombre de negocio como EXISTS correlacionado (sirve igual en
 *  total, conteos, KPIs y página, sin depender de un JOIN). */
function condicionBusqueda(busqueda?: string): SQL | undefined {
    if (!busqueda) return undefined;
    return sql`EXISTS (
        SELECT 1 FROM negocios n
        WHERE n.id = ${eventosPago.negocioId} AND n.nombre ILIKE ${`%${busqueda}%`}
    )`;
}

// =============================================================================
// 1. LISTA PAGINADA (la bitácora)
// =============================================================================

export async function listarEventos(
    panel: UsuarioPanel,
    filtros: FiltrosEventos,
): Promise<ListaEventos> {
    const alcance = await condicionAlcance(panel);
    const conteosVacios: ConteosEventos = { total: 0, porTipo: [], ingresos: 0, fallidos: 0 };

    // Rol sin nada que ver (config incompleta / fuera de alcance): bitácora vacía.
    if (alcance === 'vacio') {
        return { items: [], total: 0, pagina: filtros.pagina, porPagina: filtros.porPagina, conteos: conteosVacios };
    }

    // BASE = alcance + búsqueda + origen + negocio + rango de fechas (SIN tipo). Sobre
    // esta base se calculan conteos por tipo y KPIs, para que cuadren con lo filtrado.
    const base: SQL[] = [];
    if (alcance) base.push(alcance);
    const condBusqueda = condicionBusqueda(filtros.busqueda);
    if (condBusqueda) base.push(condBusqueda);
    if (filtros.origen) base.push(eq(eventosPago.origen, filtros.origen));
    if (filtros.negocioId) base.push(eq(eventosPago.negocioId, filtros.negocioId));
    if (filtros.desde) base.push(gte(eventosPago.fechaEvento, filtros.desde));
    if (filtros.hasta) base.push(lte(eventosPago.fechaEvento, filtros.hasta));

    // LISTA = base + tipo (lo que realmente se muestra/pagina).
    const condLista = [...base];
    if (filtros.tipo) condLista.push(eq(eventosPago.tipo, filtros.tipo));

    const whereBase = base.length ? and(...base) : undefined;
    const whereLista = condLista.length ? and(...condLista) : undefined;

    // Total (con tipo, para el paginado).
    const [{ total }] = await db
        .select({ total: count() })
        .from(eventosPago)
        .where(whereLista);

    // Conteos por tipo (SIN el filtro de tipo en el WHERE).
    const filasConteo = await db
        .select({ tipo: eventosPago.tipo, n: count() })
        .from(eventosPago)
        .where(whereBase)
        .groupBy(eventosPago.tipo);

    let totalConteo = 0;
    const porTipo = filasConteo.map((f) => {
        const t = Number(f.n);
        totalConteo += t;
        return { tipo: f.tipo, total: t };
    });

    // KPIs de cabecera (sobre BASE): ingresos = SUM(monto) de cobros reales + manuales;
    // fallidos = COUNT de cobro_fallido. FILTER mantiene una sola pasada.
    const [kpis] = await db
        .select({
            ingresos: sql<string | null>`COALESCE(SUM(${eventosPago.monto}) FILTER (WHERE ${eventosPago.tipo} IN ('cobro_exitoso','pago_manual')), 0)`,
            fallidos: sql<number>`COUNT(*) FILTER (WHERE ${eventosPago.tipo} = 'cobro_fallido')`,
        })
        .from(eventosPago)
        .where(whereBase);

    const conteos: ConteosEventos = {
        total: totalConteo,
        porTipo,
        ingresos: Number(kpis?.ingresos ?? 0),
        fallidos: Number(kpis?.fallidos ?? 0),
    };

    // Página. Joins de presentación: negocio (nombre) + actor (usuario que registró el manual).
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: eventosPago.id,
            fecha: eventosPago.fechaEvento,
            negocioId: eventosPago.negocioId,
            negocioNombre: negocios.nombre,
            logoUrl: negocios.logoUrl,
            ciudad: ciudades.nombre,
            tipo: eventosPago.tipo,
            origen: eventosPago.origen,
            monto: eventosPago.monto,
            moneda: eventosPago.moneda,
            actorNombre: usuarios.nombre,
            actorApellidos: usuarios.apellidos,
            stripeEventId: eventosPago.stripeEventId,
        })
        .from(eventosPago)
        .leftJoin(negocios, eq(negocios.id, eventosPago.negocioId))
        .leftJoin(negocioSucursales, and(eq(negocioSucursales.negocioId, negocios.id), eq(negocioSucursales.esPrincipal, true)))
        .leftJoin(ciudades, eq(ciudades.id, negocioSucursales.ciudadId))
        .leftJoin(usuarios, eq(usuarios.id, eventosPago.actorId))
        .where(whereLista)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items: EventoFila[] = filas.map((f) => ({
        id: f.id,
        fecha: f.fecha ?? null,
        negocioId: f.negocioId,
        negocioNombre: f.negocioNombre ?? null,
        logoUrl: f.logoUrl ?? null,
        ciudad: f.ciudad ?? null,
        tipo: f.tipo,
        origen: f.origen,
        monto: f.monto ?? null,
        moneda: f.moneda,
        actorNombre: f.actorNombre ? `${f.actorNombre} ${f.actorApellidos ?? ''}`.trim() : null,
        stripeEventId: f.stripeEventId ?? null,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// 2. DETALLE DE UN EVENTO
// =============================================================================

/**
 * Detalle de un evento respetando el alcance del rol. Devuelve null si no existe o
 * está fuera del alcance (el controller responde 404).
 */
export async function obtenerDetalleEvento(
    panel: UsuarioPanel,
    eventoId: string,
): Promise<EventoDetalle | null> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return null;

    const cond: SQL[] = [eq(eventosPago.id, eventoId)];
    if (alcance) cond.push(alcance);

    const [f] = await db
        .select({
            id: eventosPago.id,
            fecha: eventosPago.fechaEvento,
            negocioId: eventosPago.negocioId,
            negocioNombre: negocios.nombre,
            tipo: eventosPago.tipo,
            origen: eventosPago.origen,
            monto: eventosPago.monto,
            moneda: eventosPago.moneda,
            actorId: eventosPago.actorId,
            actorNombre: usuarios.nombre,
            actorApellidos: usuarios.apellidos,
            actorCorreo: usuarios.correo,
            stripeEventId: eventosPago.stripeEventId,
            referenciaId: eventosPago.referenciaId,
            metadata: eventosPago.metadata,
            creadoEn: eventosPago.createdAt,
        })
        .from(eventosPago)
        .leftJoin(negocios, eq(negocios.id, eventosPago.negocioId))
        .leftJoin(usuarios, eq(usuarios.id, eventosPago.actorId))
        .where(and(...cond))
        .limit(1);

    if (!f) return null;

    return {
        id: f.id,
        fecha: f.fecha ?? null,
        negocioId: f.negocioId,
        negocioNombre: f.negocioNombre ?? null,
        tipo: f.tipo,
        origen: f.origen,
        monto: f.monto ?? null,
        moneda: f.moneda,
        actorId: f.actorId ?? null,
        actorNombre: f.actorNombre ? `${f.actorNombre} ${f.actorApellidos ?? ''}`.trim() : null,
        actorCorreo: f.actorCorreo ?? null,
        stripeEventId: f.stripeEventId ?? null,
        referenciaId: f.referenciaId ?? null,
        metadata: f.metadata ?? null,
        creadoEn: f.creadoEn ?? null,
    };
}

// =============================================================================
// 3. KPIs DE INGRESOS (para el Resumen)
// =============================================================================

export interface ResumenIngresos {
    ingresos: number;   // SUM(monto) de cobro_exitoso + pago_manual
    fallidos: number;   // COUNT de cobro_fallido
}

/**
 * KPIs de ingresos del Resumen en el alcance del rol, desde una fecha (inicio del mes en curso).
 * Reusa el MISMO predicado de alcance que la bitácora (`condicionAlcance`). Una sola pasada con FILTER.
 */
export async function resumenIngresos(panel: UsuarioPanel, desde?: string): Promise<ResumenIngresos> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return { ingresos: 0, fallidos: 0 };

    const cond: SQL[] = [];
    if (alcance) cond.push(alcance);
    if (desde) cond.push(gte(eventosPago.fechaEvento, desde));
    const where = cond.length ? and(...cond) : undefined;

    const [kpis] = await db
        .select({
            ingresos: sql<string | null>`COALESCE(SUM(${eventosPago.monto}) FILTER (WHERE ${eventosPago.tipo} IN ('cobro_exitoso','pago_manual')), 0)`,
            fallidos: sql<number>`COUNT(*) FILTER (WHERE ${eventosPago.tipo} = 'cobro_fallido')`,
        })
        .from(eventosPago)
        .where(where);

    return { ingresos: Number(kpis?.ingresos ?? 0), fallidos: Number(kpis?.fallidos ?? 0) };
}
