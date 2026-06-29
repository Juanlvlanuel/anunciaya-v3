/**
 * admin/publicidad.service.ts
 * ===========================
 * Lecturas de la sección Publicidad del Panel Admin (módulo 7): tabla paginada de
 * compras de publicidad, ficha de una compra, y contador del menú.
 *
 * ALCANCE POR ROL (matriz de Panel_Admin.md §7):
 *   - superadmin → toda la plataforma (con lente de región del filtro global)
 *   - gerente    → anuncios con ≥1 ciudad en SU región (EXISTS sobre las ciudades
 *                  del anuncio; es "dónde se muestra", no de quién es el negocio,
 *                  porque el anunciante puede ser una persona sin negocio/región)
 *   - vendedor   → sin acceso (las rutas no se lo permiten; 'vacio' por defensa)
 *
 * Un anuncio (`publicidad_compras`) tiene 1..3 PIEZAS (una por carrusel) y se muestra
 * en 1..X CIUDADES (`publicidad_compra_ciudades`). El anunciante es un usuario
 * (personal o comercial); si es comercial, `negocio_id` trae su negocio.
 *
 * Solo lecturas: este service NO modifica datos. Las escrituras (alta manual, cortesía,
 * pausar/editar/cancelar) vivirán en `publicidad-acciones.service.ts` (Fase 2).
 *
 * Ubicación: apps/api/src/services/admin/publicidad.service.ts
 */

import { and, eq, asc, desc, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    publicidadCompras,
    publicidadPiezas,
    publicidadCompraCiudades,
    usuarios,
    negocios,
    ciudades,
} from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';

// =============================================================================
// TIPOS
// =============================================================================

export const ESTADOS_PUBLICIDAD = ['pendiente', 'activa', 'pausada', 'expirada', 'cancelada'] as const;
export type EstadoPublicidad = (typeof ESTADOS_PUBLICIDAD)[number];

export const CARRUSELES = ['anuncios', 'patrocinadores', 'fundadores'] as const;
export type Carrusel = (typeof CARRUSELES)[number];

export const ORIGENES_PUBLICIDAD = ['self', 'manual', 'cortesia'] as const;
export type OrigenPublicidad = (typeof ORIGENES_PUBLICIDAD)[number];

export const ORDENES_PUBLICIDAD = ['recientes', 'antiguos', 'vencimiento', 'estado'] as const;
export type OrdenPublicidad = (typeof ORDENES_PUBLICIDAD)[number];

export interface FiltrosPublicidad {
    busqueda?: string;          // nombre del anunciante o de su negocio (ILIKE)
    estado?: EstadoPublicidad;
    carrusel?: Carrusel;        // anuncios que incluyan ese carrusel
    origen?: OrigenPublicidad;  // self | manual | cortesia
    orden?: OrdenPublicidad;
    pagina: number;             // 1-based
    porPagina: number;
}

/** Conteos por estado para los chips (mismo criterio que Negocios: un ARRAY a
 *  propósito, para que el middleware snake→camel no transforme las keys de estado). */
export interface ConteosEstado {
    total: number;
    porEstado: Array<{ estado: string; total: number }>;
}

/** Una fila de la tabla. */
export interface PublicidadFila {
    id: string;
    anuncianteNombre: string;
    anuncianteAvatar: string | null;
    negocioId: string | null;
    negocioNombre: string | null;
    esCombo: boolean;
    carruseles: string[];       // los carruseles comprados (de las piezas)
    totalCiudades: number;
    clicksTotales: number;      // suma de clicks de todas las piezas del anuncio
    estado: string;
    origen: string;
    monto: string | null;       // numeric → string; NULL en cortesía
    iniciaAt: string | null;
    expiraAt: string | null;
    diasRestantes: number | null;
}

export interface ListaPublicidad {
    items: PublicidadFila[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosEstado;
}

export interface PiezaDetalle {
    carrusel: string;
    imagenUrl: string;
    clicks: number;
    impresiones: number;
}

export interface CiudadDetalle {
    id: string;
    nombre: string;
}

/** Ficha completa de una compra de publicidad. */
export interface PublicidadDetalle {
    id: string;
    // Anunciante
    anuncianteId: string;
    anuncianteNombre: string;
    anuncianteCorreo: string | null;
    anuncianteTelefono: string | null;
    anuncianteAvatar: string | null;
    esComercial: boolean;
    negocioId: string | null;
    negocioNombre: string | null;
    // Campaña
    esCombo: boolean;
    estado: string;
    origen: string;
    metodoCobro: string | null;
    monto: string | null;
    folio: number | null;
    reciboUrl: string | null;
    stripePaymentIntentId: string | null;
    duracionDias: number;
    iniciaAt: string | null;
    expiraAt: string | null;
    diasRestantes: number | null;
    avisoVencimientoEnviado: boolean;
    registradoPorNombre: string | null;
    creadoEn: string | null;
    // Piezas + ciudades + métricas
    piezas: PiezaDetalle[];
    ciudades: CiudadDetalle[];
    clicksTotales: number;
    impresionesTotales: number;
}

// =============================================================================
// ALCANCE POR ROL
// =============================================================================

/**
 * Condición de alcance (WHERE) para el rol, o `'vacio'` si no puede ver nada
 * (gerente sin región / vendedor). El superadmin ve todo → null.
 */
function condicionAlcance(panel: UsuarioPanel): SQL | null | 'vacio' {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        // El anuncio se muestra en AL MENOS una ciudad de mi región (EXISTS correlacionado;
        // no duplica filas). El control sigue a dónde se muestra, no al negocio.
        return sql`EXISTS (
            SELECT 1 FROM publicidad_compra_ciudades pcc
            JOIN ciudades c ON c.id = pcc.ciudad_id
            WHERE pcc.compra_id = ${publicidadCompras.id} AND c.region_id = ${panel.regionId}
        )`;
    }

    // vendedor → no entra a Publicidad
    return 'vacio';
}

/**
 * Filtro GLOBAL de región del Panel (solo superadmin): si manda `?regionId=`, el
 * superadmin ve las consultas como GERENTE de esa región (lente de visibilidad).
 * Gerente/vendedor lo ignoran (su alcance es siempre su token). Mismo helper que
 * el resto del Panel — duplicado aquí en mínimo para que el módulo sea autocontenido.
 */
export function panelConFiltroRegion(panel: UsuarioPanel, regionIdRaw: unknown): UsuarioPanel {
    if (panel.rolEquipo !== 'superadmin') return panel;
    const regionId = typeof regionIdRaw === 'string' && regionIdRaw.trim() ? regionIdRaw.trim() : null;
    if (!regionId) return panel;
    return { ...panel, rolEquipo: 'gerente', regionId };
}

/** Traduce la opción de orden a expresiones ORDER BY (corre en servidor). */
function ordenarPor(orden?: OrdenPublicidad): SQL[] {
    switch (orden) {
        case 'antiguos':
            return [asc(publicidadCompras.createdAt)];
        case 'vencimiento':
            return [sql`${publicidadCompras.expiraAt} ASC NULLS LAST`];
        case 'estado':
            return [asc(publicidadCompras.estado), desc(publicidadCompras.createdAt)];
        case 'recientes':
        default:
            return [desc(publicidadCompras.createdAt)];
    }
}

/** Días hasta el vencimiento (ceil). 0 = vence hoy; negativo = ya pasó. */
function diasRestantes(expiraAt: string | null, ahora: number): number | null {
    if (!expiraAt) return null;
    return Math.ceil((new Date(expiraAt).getTime() - ahora) / 86400000);
}

// =============================================================================
// 1. LISTA PAGINADA
// =============================================================================

export async function listarPublicidad(
    panel: UsuarioPanel,
    filtros: FiltrosPublicidad,
): Promise<ListaPublicidad> {
    const { pagina, porPagina } = filtros;
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') {
        return { items: [], total: 0, pagina, porPagina, conteos: { total: 0, porEstado: [] } };
    }

    // WHERE base (alcance + búsqueda + carrusel + origen) — SIN el filtro de estado,
    // para que los chips de estado cuadren con lo que se ve.
    const condBase: SQL[] = [];
    if (alcance) condBase.push(alcance);
    // Los 'pendiente' (checkout self-service iniciado, aún sin pagar) NO son anuncios gestionables: se
    // ocultan del Panel. Se activan al pagar (webhook) o los borra el cron si se abandonan.
    condBase.push(sql`${publicidadCompras.estado} <> 'pendiente'`);
    if (filtros.busqueda) {
        const q = `%${filtros.busqueda}%`;
        condBase.push(sql`(${usuarios.nombre} ILIKE ${q} OR ${usuarios.apellidos} ILIKE ${q} OR ${negocios.nombre} ILIKE ${q})`);
    }
    if (filtros.carrusel) {
        condBase.push(sql`EXISTS (SELECT 1 FROM publicidad_piezas pp WHERE pp.compra_id = ${publicidadCompras.id} AND pp.carrusel = ${filtros.carrusel})`);
    }
    if (filtros.origen) {
        condBase.push(eq(publicidadCompras.origen, filtros.origen));
    }
    const whereBase = condBase.length ? and(...condBase) : undefined;

    // Conteos por estado (sobre el WHERE base, agrupado).
    const filasConteo = await db
        .select({ estado: publicidadCompras.estado, total: count() })
        .from(publicidadCompras)
        .leftJoin(usuarios, eq(usuarios.id, publicidadCompras.usuarioId))
        .leftJoin(negocios, eq(negocios.id, publicidadCompras.negocioId))
        .where(whereBase)
        .groupBy(publicidadCompras.estado);
    const conteos: ConteosEstado = {
        total: filasConteo.reduce((s, f) => s + Number(f.total), 0),
        porEstado: filasConteo.map((f) => ({ estado: f.estado, total: Number(f.total) })),
    };

    // WHERE final (con el filtro de estado).
    const condFinal = [...condBase];
    if (filtros.estado) condFinal.push(eq(publicidadCompras.estado, filtros.estado));
    const whereFinal = condFinal.length ? and(...condFinal) : undefined;

    const [tot] = await db
        .select({ total: count() })
        .from(publicidadCompras)
        .leftJoin(usuarios, eq(usuarios.id, publicidadCompras.usuarioId))
        .leftJoin(negocios, eq(negocios.id, publicidadCompras.negocioId))
        .where(whereFinal);
    const total = Number(tot?.total ?? 0);

    const offset = (pagina - 1) * porPagina;
    const filas = await db
        .select({
            id: publicidadCompras.id,
            anuncianteNombre: usuarios.nombre,
            anuncianteApellidos: usuarios.apellidos,
            anuncianteAvatar: usuarios.avatarUrl,
            negocioId: publicidadCompras.negocioId,
            negocioNombre: negocios.nombre,
            esCombo: publicidadCompras.esCombo,
            estado: publicidadCompras.estado,
            origen: publicidadCompras.origen,
            monto: publicidadCompras.monto,
            iniciaAt: publicidadCompras.iniciaAt,
            expiraAt: publicidadCompras.expiraAt,
            carruseles: sql<string[]>`COALESCE((SELECT array_agg(pp.carrusel ORDER BY pp.carrusel) FROM publicidad_piezas pp WHERE pp.compra_id = ${publicidadCompras.id}), ARRAY[]::varchar[])`,
            totalCiudades: sql<number>`(SELECT count(*) FROM publicidad_compra_ciudades pcc WHERE pcc.compra_id = ${publicidadCompras.id})`,
            clicksTotales: sql<number>`COALESCE((SELECT SUM(pp.clicks) FROM publicidad_piezas pp WHERE pp.compra_id = ${publicidadCompras.id}), 0)`,
        })
        .from(publicidadCompras)
        .leftJoin(usuarios, eq(usuarios.id, publicidadCompras.usuarioId))
        .leftJoin(negocios, eq(negocios.id, publicidadCompras.negocioId))
        .where(whereFinal)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(porPagina)
        .offset(offset);

    const ahora = Date.now();
    const items: PublicidadFila[] = filas.map((f) => ({
        id: f.id,
        anuncianteNombre: `${f.anuncianteNombre ?? ''} ${f.anuncianteApellidos ?? ''}`.trim() || '—',
        anuncianteAvatar: f.anuncianteAvatar ?? null,
        negocioId: f.negocioId ?? null,
        negocioNombre: f.negocioNombre ?? null,
        esCombo: f.esCombo,
        carruseles: f.carruseles ?? [],
        totalCiudades: Number(f.totalCiudades ?? 0),
        clicksTotales: Number(f.clicksTotales ?? 0),
        estado: f.estado,
        origen: f.origen,
        monto: f.monto ?? null,
        iniciaAt: f.iniciaAt ?? null,
        expiraAt: f.expiraAt ?? null,
        diasRestantes: diasRestantes(f.expiraAt ?? null, ahora),
    }));

    return { items, total, pagina, porPagina, conteos };
}

// =============================================================================
// 2. FICHA (detalle)
// =============================================================================

export async function obtenerDetallePublicidad(
    panel: UsuarioPanel,
    id: string,
): Promise<PublicidadDetalle | null> {
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') return null;

    const cond: SQL[] = [eq(publicidadCompras.id, id)];
    if (alcance) cond.push(alcance);

    const [c] = await db
        .select({
            id: publicidadCompras.id,
            usuarioId: publicidadCompras.usuarioId,
            anuncianteNombre: usuarios.nombre,
            anuncianteApellidos: usuarios.apellidos,
            anuncianteCorreo: usuarios.correo,
            anuncianteTelefono: usuarios.telefono,
            anuncianteAvatar: usuarios.avatarUrl,
            perfil: usuarios.perfil,
            negocioId: publicidadCompras.negocioId,
            negocioNombre: negocios.nombre,
            esCombo: publicidadCompras.esCombo,
            estado: publicidadCompras.estado,
            origen: publicidadCompras.origen,
            metodoCobro: publicidadCompras.metodoCobro,
            monto: publicidadCompras.monto,
            folio: publicidadCompras.folio,
            reciboUrl: publicidadCompras.reciboUrl,
            stripePaymentIntentId: publicidadCompras.stripePaymentIntentId,
            duracionDias: publicidadCompras.duracionDias,
            iniciaAt: publicidadCompras.iniciaAt,
            expiraAt: publicidadCompras.expiraAt,
            avisoVencimientoEnviado: publicidadCompras.avisoVencimientoEnviado,
            registradoPor: publicidadCompras.registradoPor,
            creadoEn: publicidadCompras.createdAt,
        })
        .from(publicidadCompras)
        .leftJoin(usuarios, eq(usuarios.id, publicidadCompras.usuarioId))
        .leftJoin(negocios, eq(negocios.id, publicidadCompras.negocioId))
        .where(and(...cond))
        .limit(1);

    if (!c) return null;

    // Nombre de quien lo dio de alta manual (si aplica).
    let registradoPorNombre: string | null = null;
    if (c.registradoPor) {
        const [r] = await db
            .select({ nombre: usuarios.nombre, apellidos: usuarios.apellidos })
            .from(usuarios)
            .where(eq(usuarios.id, c.registradoPor))
            .limit(1);
        registradoPorNombre = r ? `${r.nombre} ${r.apellidos ?? ''}`.trim() : null;
    }

    const piezasFilas = await db
        .select({
            carrusel: publicidadPiezas.carrusel,
            imagenUrl: publicidadPiezas.imagenUrl,
            clicks: publicidadPiezas.clicks,
            impresiones: publicidadPiezas.impresiones,
        })
        .from(publicidadPiezas)
        .where(eq(publicidadPiezas.compraId, id))
        // Orden por tamaño (como en la columna): Grande (patrocinadores) → Chico (anuncios) → Fundadores.
        .orderBy(sql`CASE ${publicidadPiezas.carrusel} WHEN 'patrocinadores' THEN 1 WHEN 'anuncios' THEN 2 WHEN 'fundadores' THEN 3 ELSE 4 END`);

    const ciudadesFilas = await db
        .select({ id: ciudades.id, nombre: ciudades.nombre })
        .from(publicidadCompraCiudades)
        .innerJoin(ciudades, eq(ciudades.id, publicidadCompraCiudades.ciudadId))
        .where(eq(publicidadCompraCiudades.compraId, id))
        .orderBy(asc(ciudades.nombre));

    const piezas: PiezaDetalle[] = piezasFilas.map((p) => ({
        carrusel: p.carrusel,
        imagenUrl: p.imagenUrl,
        clicks: p.clicks,
        impresiones: p.impresiones,
    }));

    return {
        id: c.id,
        anuncianteId: c.usuarioId,
        anuncianteNombre: `${c.anuncianteNombre ?? ''} ${c.anuncianteApellidos ?? ''}`.trim() || '—',
        anuncianteCorreo: c.anuncianteCorreo ?? null,
        anuncianteTelefono: c.anuncianteTelefono ?? null,
        anuncianteAvatar: c.anuncianteAvatar ?? null,
        esComercial: c.perfil === 'comercial',
        negocioId: c.negocioId ?? null,
        negocioNombre: c.negocioNombre ?? null,
        esCombo: c.esCombo,
        estado: c.estado,
        origen: c.origen,
        metodoCobro: c.metodoCobro ?? null,
        monto: c.monto ?? null,
        folio: c.folio ?? null,
        reciboUrl: c.reciboUrl ?? null,
        stripePaymentIntentId: c.stripePaymentIntentId ?? null,
        duracionDias: c.duracionDias,
        iniciaAt: c.iniciaAt ?? null,
        expiraAt: c.expiraAt ?? null,
        diasRestantes: diasRestantes(c.expiraAt ?? null, Date.now()),
        avisoVencimientoEnviado: c.avisoVencimientoEnviado,
        registradoPorNombre,
        creadoEn: c.creadoEn ?? null,
        piezas,
        ciudades: ciudadesFilas.map((cc) => ({ id: cc.id, nombre: cc.nombre })),
        clicksTotales: piezas.reduce((s, p) => s + p.clicks, 0),
        impresionesTotales: piezas.reduce((s, p) => s + p.impresiones, 0),
    };
}

// =============================================================================
// 3. CONTADOR (menú)
// =============================================================================

export async function contarPublicidad(panel: UsuarioPanel): Promise<number> {
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') return 0;
    // Mismo criterio que el listado: los 'pendiente' (sin pagar) no cuentan.
    const cond: SQL[] = [sql`${publicidadCompras.estado} <> 'pendiente'`];
    if (alcance) cond.push(alcance);
    const [fila] = await db
        .select({ total: count() })
        .from(publicidadCompras)
        .where(and(...cond));
    return Number(fila?.total ?? 0);
}

// =============================================================================
// 4. KPIs (cabecera de la sección) — respetan el alcance por rol
// =============================================================================

export interface KpisPublicidad {
    activos: number;   // anuncios vigentes (activa + no expirado)
    ingresos: number;  // suma de lo cobrado (excluye cortesía y pendiente)
    clics: number;     // total de "ver grande" de las piezas
    porVencer: number; // activos que expiran en ≤ 7 días
}

export async function obtenerKpisPublicidad(panel: UsuarioPanel): Promise<KpisPublicidad> {
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') return { activos: 0, ingresos: 0, clics: 0, porVencer: 0 };

    // Agregados sobre las compras (en el alcance del rol).
    const [agg] = await db
        .select({
            activos: sql<number>`COUNT(*) FILTER (WHERE ${publicidadCompras.estado} = 'activa' AND ${publicidadCompras.expiraAt} > now())`,
            porVencer: sql<number>`COUNT(*) FILTER (WHERE ${publicidadCompras.estado} = 'activa' AND ${publicidadCompras.expiraAt} > now() AND ${publicidadCompras.expiraAt} <= now() + INTERVAL '7 days')`,
            ingresos: sql<string>`COALESCE(SUM(${publicidadCompras.monto}) FILTER (WHERE ${publicidadCompras.estado} <> 'pendiente' AND ${publicidadCompras.monto} IS NOT NULL), 0)`,
        })
        .from(publicidadCompras)
        .where(alcance ?? undefined);

    // Clics acumulados: suma sobre las piezas de las compras en el alcance (sin pendientes).
    const condClics: SQL[] = [sql`${publicidadCompras.estado} <> 'pendiente'`];
    if (alcance) condClics.push(alcance);
    const [clk] = await db
        .select({ clics: sql<number>`COALESCE(SUM(${publicidadPiezas.clicks}), 0)` })
        .from(publicidadPiezas)
        .innerJoin(publicidadCompras, eq(publicidadCompras.id, publicidadPiezas.compraId))
        .where(and(...condClics));

    return {
        activos: Number(agg?.activos ?? 0),
        porVencer: Number(agg?.porVencer ?? 0),
        ingresos: Number(agg?.ingresos ?? 0),
        clics: Number(clk?.clics ?? 0),
    };
}
