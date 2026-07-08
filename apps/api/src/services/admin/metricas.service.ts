/**
 * admin/metricas.service.ts
 * =========================
 * Lecturas del módulo "Métricas" del Panel Admin — la vista de ANÁLISIS: tendencias, desgloses y
 * series temporales de la actividad medible hoy, scoped por rol. SOLO LECTURA (no muta nada → el
 * carril salta la Fase 2). Donde "Resumen" da el número de HOY, Métricas da la EVOLUCIÓN en el tiempo.
 *
 * Definición y alcance del módulo: docs/arquitectura/Panel_Admin/Metricas_Pendientes.md.
 *
 * PERIODO (Periodo): el rango analizado se resuelve UNA vez (`normalizarPeriodo`) desde la query —
 * preset por meses (`?meses=N`) o rango por fechas (`?desde&?hasta`, YYYY-MM-DD). La GRANULARIDAD es
 * automática: por DÍA si el rango es corto (≤ 62 días, p. ej. "último mes" = 30 días), por MES si es
 * largo. Las series se agrupan y rellenan con `periodo.puntos`; los KPIs comparan el rango actual
 * [desde,hasta) contra el anterior de igual duración [desdeAnterior,desde).
 *
 * ALCANCE POR ROL (matriz de Panel_Admin.md · "Métricas"):
 *   - superadmin → toda la plataforma (o la región del filtro global vía `panelConFiltroRegion`).
 *   - gerente    → su región (deducida: sucursal MATRIZ → ciudad → región).
 *   - vendedor   → su cartera (negocios.embajador_id = su embajador).
 *
 * Para no duplicar el predicado de alcance, se resuelve UNA vez el contexto (`resolverContexto`) y
 * `predicadoNegocio(ctx, colNegocioId)` genera el EXISTS correlacionado sobre la columna `negocio_id`
 * de la tabla que toque (mismo predicado matriz→ciudad→región que Negocios/Suscripciones).
 *
 * Ubicación: apps/api/src/services/admin/metricas.service.ts
 */

import { and, eq, count, gte, lt, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    negocios, eventosPago, pagosMembresia, embajadores, usuarios,
    puntosTransacciones, puntosBilletera,
} from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { contarNegociosActivos, resolverEmbajadorId } from './negocios.service.js';
import { condicionVisibilidad, contarUsuarios, usuariosPorCiudad } from './usuarios.service.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Un KPI con su valor del periodo y el del periodo anterior (el front calcula la variación). */
export interface KpiMetrica {
    valor: number;
    /** Mismo KPI en el periodo anterior equivalente. `null` cuando no aplica (p. ej. un stock como "activos"). */
    anterior: number | null;
}

/** Un punto de serie. `mes` es la etiqueta del eje: 'YYYY-MM' (granularidad mes) o 'YYYY-MM-DD' (día). */
export interface PuntoCrecimiento {
    mes: string;
    altas: number;
    bajas: number;
}

export interface PuntoIngresos {
    mes: string;
    tarjeta: number;
    efectivo: number;
    transferencia: number;
    otro: number;
}

export interface TopVendedor {
    usuarioId: string;
    nombre: string;          // nombre completo
    avatarUrl: string | null;
    region: string | null;   // nombre de la región que cubre
    gerente: string | null;  // nombre del gerente de esa región
    activos: number;
}

export interface MetricasCrecimiento {
    rol: string;
    kpis: {
        negociosActivos: KpiMetrica;
        altas: KpiMetrica;
        churn: KpiMetrica;
        ingresos: KpiMetrica;
    };
    series: {
        crecimiento: PuntoCrecimiento[];
        ingresos: PuntoIngresos[];
    };
    topVendedores: TopVendedor[] | null;
}

// =============================================================================
// PERIODO (preset por meses o rango por fechas · granularidad automática)
// =============================================================================

export type Granularidad = 'dia' | 'mes';

export interface Periodo {
    desde: string;          // ISO (inclusive)
    hasta: string;          // ISO (exclusivo)
    desdeAnterior: string;  // inicio del periodo anterior de igual duración (para la variación)
    granularidad: Granularidad;
    puntos: string[];       // eje: 'YYYY-MM-DD' (día) o 'YYYY-MM' (mes)
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const UMBRAL_DIA_DIAS = 62; // rango ≤ 62 días → granularidad por día
const DIA_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Primer día (00:00 local) del mes que cae `n` meses antes del mes actual. */
function inicioMesHaceN(n: number): Date {
    const a = new Date();
    return new Date(a.getFullYear(), a.getMonth() - n, 1);
}

function listaDias(desdeISO: string, hastaISO: string): string[] {
    const out: string[] = [];
    const d = new Date(desdeISO); d.setHours(0, 0, 0, 0);
    const fin = new Date(hastaISO);
    while (d < fin) { out.push(ymd(d)); d.setDate(d.getDate() + 1); }
    return out;
}

function listaMesesEntre(desdeISO: string, hastaISO: string): string[] {
    const out: string[] = [];
    const d = new Date(desdeISO); d.setDate(1); d.setHours(0, 0, 0, 0);
    const fin = new Date(hastaISO);
    while (d < fin) { out.push(ym(d)); d.setMonth(d.getMonth() + 1); }
    return out;
}

function armarPeriodo(desde: string, hasta: string, granularidad: Granularidad): Periodo {
    const durMs = Date.parse(hasta) - Date.parse(desde);
    const desdeAnterior = new Date(Date.parse(desde) - durMs).toISOString();
    const puntos = granularidad === 'dia' ? listaDias(desde, hasta) : listaMesesEntre(desde, hasta);
    return { desde, hasta, desdeAnterior, granularidad, puntos };
}

/** Normaliza `?meses=` a un entero en [1, 24] (default 12). */
export function normalizarMeses(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 12;
    return Math.min(24, Math.max(1, Math.trunc(n)));
}

/**
 * Resuelve el periodo desde la query: rango por fechas (`desde`+`hasta`, YYYY-MM-DD) si vienen ambos;
 * si no, preset por meses. "Último mes" (meses=1) = últimos 30 días por día; varios meses = por mes.
 */
export function normalizarPeriodo(raw: { meses?: unknown; desde?: unknown; hasta?: unknown }): Periodo {
    // Rango por fechas explícito.
    if (typeof raw.desde === 'string' && RE_FECHA.test(raw.desde) && typeof raw.hasta === 'string' && RE_FECHA.test(raw.hasta)) {
        let [d0, d1] = raw.desde <= raw.hasta ? [raw.desde, raw.hasta] : [raw.hasta, raw.desde];
        const [a0, m0, dd0] = d0.split('-').map(Number);
        const [a1, m1, dd1] = d1.split('-').map(Number);
        const desde = new Date(a0, m0 - 1, dd0).toISOString();
        const hasta = new Date(a1, m1 - 1, dd1 + 1).toISOString(); // exclusivo: día siguiente 00:00
        const durDias = Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA_MS);
        return armarPeriodo(desde, hasta, durDias <= UMBRAL_DIA_DIAS ? 'dia' : 'mes');
    }
    // Preset por meses.
    const meses = normalizarMeses(raw.meses);
    if (meses === 1) {
        const fin = new Date();
        const ini = new Date(); ini.setDate(ini.getDate() - 30);
        return armarPeriodo(ini.toISOString(), fin.toISOString(), 'dia');
    }
    const desde = inicioMesHaceN(meses - 1).toISOString();
    return armarPeriodo(desde, new Date().toISOString(), 'mes');
}

/**
 * Expresiones de truncado por granularidad para una columna de fecha (agrupar + etiquetar). `unidad` y
 * `fmt` se inyectan como LITERALES (sql.raw), no como parámetros: así `date_trunc('day', col)` coincide
 * textualmente entre el SELECT y el GROUP BY y Postgres reconoce la dependencia funcional (con binds $N
 * los trataría como expresiones distintas → "must appear in GROUP BY"). Son valores fijos del código.
 */
function truncado(col: SQL, gran: Granularidad): { group: SQL; label: SQL<string> } {
    const unidad = gran === 'dia' ? `'day'` : `'month'`;
    const fmt = gran === 'dia' ? `'YYYY-MM-DD'` : `'YYYY-MM'`;
    return {
        group: sql`date_trunc(${sql.raw(unidad)}, ${col})`,
        label: sql<string>`to_char(date_trunc(${sql.raw(unidad)}, ${col}), ${sql.raw(fmt)})`,
    };
}

// =============================================================================
// ALCANCE (contexto único + predicado correlacionado por negocio_id)
// =============================================================================

type Contexto =
    | { tipo: 'todo' }
    | { tipo: 'vacio' }
    | { tipo: 'region'; regionId: string }
    | { tipo: 'vendedor'; embajadorId: string };

async function resolverContexto(panel: UsuarioPanel): Promise<Contexto> {
    if (panel.rolEquipo === 'superadmin') return { tipo: 'todo' };
    if (panel.rolEquipo === 'gerente') {
        return panel.regionId ? { tipo: 'region', regionId: panel.regionId } : { tipo: 'vacio' };
    }
    const embajadorId = await resolverEmbajadorId(panel.usuarioId);
    return embajadorId ? { tipo: 'vendedor', embajadorId } : { tipo: 'vacio' };
}

/**
 * Predicado de alcance correlacionado sobre una columna `negocio_id` cualquiera. SIEMPRE excluye
 * los negocios DEMO (maestro + copias): así toda métrica que cuelgue de un negocio (altas, churn,
 * ingresos, negocios-en-app, clientes, transacciones, en riesgo, top vendedores) ignora la
 * actividad simulada del demo — incluidos los clientes sintéticos, cuya billetera/ventas solo
 * cuelgan de negocios `es_demo`. Antes devolvía null para el superadmin ("sin restricción"); ahora
 * devuelve, como mínimo, la exclusión de demos. Nunca es null (los `if (alcance)` de los callers
 * siguen válidos: la condición ahora siempre aplica).
 */
function predicadoNegocio(ctx: Contexto, colNegocioId: SQL): SQL {
    if (ctx.tipo === 'region') {
        return sql`EXISTS (
            SELECT 1 FROM negocio_sucursales ns
            JOIN ciudades c ON c.id = ns.ciudad_id
            JOIN negocios n ON n.id = ns.negocio_id
            WHERE ns.negocio_id = ${colNegocioId} AND ns.es_principal = true
              AND c.region_id = ${ctx.regionId} AND n.es_demo = false
        )`;
    }
    if (ctx.tipo === 'vendedor') {
        return sql`EXISTS (
            SELECT 1 FROM negocios n WHERE n.id = ${colNegocioId} AND n.embajador_id = ${ctx.embajadorId} AND n.es_demo = false
        )`;
    }
    // 'todo' (superadmin, o la lente de región llega ya como 'region'): sin filtro de rol, pero SIN
    // demos. (El caso 'vacio' nunca llega aquí — los callers hacen early-return antes.)
    return sql`EXISTS (SELECT 1 FROM negocios n WHERE n.id = ${colNegocioId} AND n.es_demo = false)`;
}

// =============================================================================
// SECCIÓN ① — CRECIMIENTO Y DINERO
// =============================================================================

export async function metricasCrecimiento(panel: UsuarioPanel, periodo: Periodo): Promise<MetricasCrecimiento> {
    const ctx = await resolverContexto(panel);
    const esVendedor = panel.rolEquipo === 'vendedor';

    if (ctx.tipo === 'vacio') {
        return {
            rol: panel.rolEquipo,
            kpis: {
                negociosActivos: { valor: 0, anterior: null },
                altas: { valor: 0, anterior: 0 },
                churn: { valor: 0, anterior: 0 },
                ingresos: { valor: 0, anterior: 0 },
            },
            series: {
                crecimiento: periodo.puntos.map((mes) => ({ mes, altas: 0, bajas: 0 })),
                ingresos: periodo.puntos.map((mes) => ({ mes, tarjeta: 0, efectivo: 0, transferencia: 0, otro: 0 })),
            },
            topVendedores: esVendedor ? null : [],
        };
    }

    const [negociosActivos, altas, churn, ingresos, serieCrec, serieIng, topVend] = await Promise.all([
        contarNegociosActivos(panel),
        kpiAltas(ctx, periodo),
        kpiChurn(ctx, periodo),
        kpiIngresos(ctx, periodo),
        serieCrecimiento(ctx, periodo),
        serieIngresos(ctx, periodo),
        esVendedor ? Promise.resolve(null) : topVendedores(ctx),
    ]);

    return {
        rol: panel.rolEquipo,
        kpis: { negociosActivos: { valor: negociosActivos, anterior: null }, altas, churn, ingresos },
        series: { crecimiento: serieCrec, ingresos: serieIng },
        topVendedores: topVend,
    };
}

async function kpiAltas(ctx: Contexto, p: Periodo): Promise<KpiMetrica> {
    const alcance = predicadoNegocio(ctx, sql`${negocios.id}`);
    const [fila] = await db
        .select({
            actual: sql<number>`COUNT(*) FILTER (WHERE ${negocios.createdAt} >= ${p.desde} AND ${negocios.createdAt} < ${p.hasta})`,
            anterior: sql<number>`COUNT(*) FILTER (WHERE ${negocios.createdAt} >= ${p.desdeAnterior} AND ${negocios.createdAt} < ${p.desde})`,
        })
        .from(negocios)
        .where(alcance ?? undefined);
    return { valor: Number(fila?.actual ?? 0), anterior: Number(fila?.anterior ?? 0) };
}

async function kpiChurn(ctx: Contexto, p: Periodo): Promise<KpiMetrica> {
    const alcance = predicadoNegocio(ctx, sql`${eventosPago.negocioId}`);
    const cond: SQL[] = [eq(eventosPago.tipo, 'cancelacion')];
    if (alcance) cond.push(alcance);
    const [fila] = await db
        .select({
            actual: sql<number>`COUNT(*) FILTER (WHERE ${eventosPago.fechaEvento} >= ${p.desde} AND ${eventosPago.fechaEvento} < ${p.hasta})`,
            anterior: sql<number>`COUNT(*) FILTER (WHERE ${eventosPago.fechaEvento} >= ${p.desdeAnterior} AND ${eventosPago.fechaEvento} < ${p.desde})`,
        })
        .from(eventosPago)
        .where(and(...cond));
    return { valor: Number(fila?.actual ?? 0), anterior: Number(fila?.anterior ?? 0) };
}

async function kpiIngresos(ctx: Contexto, p: Periodo): Promise<KpiMetrica> {
    // Misma fuente y definición que Resumen/Suscripciones: SUM(monto) de cobro_exitoso + pago_manual.
    const alcance = predicadoNegocio(ctx, sql`${eventosPago.negocioId}`);
    const cond: SQL[] = [sql`${eventosPago.tipo} IN ('cobro_exitoso','pago_manual')`];
    if (alcance) cond.push(alcance);
    const [fila] = await db
        .select({
            actual: sql<string | null>`COALESCE(SUM(${eventosPago.monto}) FILTER (WHERE ${eventosPago.fechaEvento} >= ${p.desde} AND ${eventosPago.fechaEvento} < ${p.hasta}), 0)`,
            anterior: sql<string | null>`COALESCE(SUM(${eventosPago.monto}) FILTER (WHERE ${eventosPago.fechaEvento} >= ${p.desdeAnterior} AND ${eventosPago.fechaEvento} < ${p.desde}), 0)`,
        })
        .from(eventosPago)
        .where(and(...cond));
    return { valor: Number(fila?.actual ?? 0), anterior: Number(fila?.anterior ?? 0) };
}

async function serieCrecimiento(ctx: Contexto, p: Periodo): Promise<PuntoCrecimiento[]> {
    const tNeg = truncado(sql`${negocios.createdAt}`, p.granularidad);
    const condAltas: SQL[] = [gte(negocios.createdAt, p.desde), lt(negocios.createdAt, p.hasta)];
    const aNeg = predicadoNegocio(ctx, sql`${negocios.id}`);
    if (aNeg) condAltas.push(aNeg);

    const tEv = truncado(sql`${eventosPago.fechaEvento}`, p.granularidad);
    const condBajas: SQL[] = [eq(eventosPago.tipo, 'cancelacion'), gte(eventosPago.fechaEvento, p.desde), lt(eventosPago.fechaEvento, p.hasta)];
    const aEv = predicadoNegocio(ctx, sql`${eventosPago.negocioId}`);
    if (aEv) condBajas.push(aEv);

    const [altasFilas, bajasFilas] = await Promise.all([
        db.select({ p: tNeg.label, total: count() }).from(negocios).where(and(...condAltas)).groupBy(tNeg.group),
        db.select({ p: tEv.label, total: count() }).from(eventosPago).where(and(...condBajas)).groupBy(tEv.group),
    ]);

    const altasMap = new Map(altasFilas.map((f) => [f.p, Number(f.total)]));
    const bajasMap = new Map(bajasFilas.map((f) => [f.p, Number(f.total)]));
    return p.puntos.map((mes) => ({ mes, altas: altasMap.get(mes) ?? 0, bajas: bajasMap.get(mes) ?? 0 }));
}

async function serieIngresos(ctx: Contexto, p: Periodo): Promise<PuntoIngresos[]> {
    const t = truncado(sql`${eventosPago.fechaEvento}`, p.granularidad);
    const alcance = predicadoNegocio(ctx, sql`${eventosPago.negocioId}`);
    const cond: SQL[] = [
        sql`${eventosPago.tipo} IN ('cobro_exitoso','pago_manual')`,
        gte(eventosPago.fechaEvento, p.desde),
        lt(eventosPago.fechaEvento, p.hasta),
    ];
    if (alcance) cond.push(alcance);

    const filas = await db
        .select({
            p: t.label,
            categoria: sql<string>`CASE
                WHEN ${eventosPago.tipo} = 'cobro_exitoso' THEN 'tarjeta'
                WHEN ${pagosMembresia.concepto} = 'efectivo' THEN 'efectivo'
                WHEN ${pagosMembresia.concepto} = 'transferencia' THEN 'transferencia'
                WHEN ${pagosMembresia.concepto} = 'tarjeta' THEN 'tarjeta'
                ELSE 'otro'
            END`,
            total: sql<string | null>`COALESCE(SUM(${eventosPago.monto}), 0)`,
        })
        .from(eventosPago)
        .leftJoin(pagosMembresia, eq(pagosMembresia.id, eventosPago.referenciaId))
        .where(and(...cond))
        .groupBy(t.group, sql`2`);

    const base = new Map<string, PuntoIngresos>(
        p.puntos.map((mes) => [mes, { mes, tarjeta: 0, efectivo: 0, transferencia: 0, otro: 0 }]),
    );
    for (const f of filas) {
        const punto = base.get(f.p);
        if (!punto) continue;
        const monto = Number(f.total ?? 0);
        if (f.categoria === 'tarjeta') punto.tarjeta += monto;
        else if (f.categoria === 'efectivo') punto.efectivo += monto;
        else if (f.categoria === 'transferencia') punto.transferencia += monto;
        else punto.otro += monto;
    }
    return [...base.values()];
}

async function topVendedores(ctx: Contexto, limite = 8): Promise<TopVendedor[]> {
    const alcance = predicadoNegocio(ctx, sql`${negocios.id}`);
    const cond: SQL[] = [
        eq(negocios.estadoAdmin, 'activo'),
        sql`${negocios.estadoMembresia} IN ('al_corriente','en_gracia')`,
    ];
    if (alcance) cond.push(alcance);

    // Región del vendedor (sus ciudades son todas de una misma región, garantizado por trigger) y el
    // gerente de esa región. Subconsultas correlacionadas sobre embajadores.id (en el GROUP BY).
    const region = sql<string | null>`(
        SELECT r.nombre FROM embajador_ciudades ec
        JOIN ciudades c ON c.id = ec.ciudad_id JOIN regiones r ON r.id = c.region_id
        WHERE ec.embajador_id = ${embajadores.id} LIMIT 1)`;
    const gerente = sql<string | null>`(
        SELECT TRIM(g.nombre || ' ' || COALESCE(g.apellidos, '')) FROM usuarios g
        WHERE g.rol_equipo = 'gerente' AND g.region_id = (
            SELECT c.region_id FROM embajador_ciudades ec
            JOIN ciudades c ON c.id = ec.ciudad_id WHERE ec.embajador_id = ${embajadores.id} LIMIT 1
        ) LIMIT 1)`;

    const filas = await db
        .select({
            usuarioId: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            avatarUrl: usuarios.avatarUrl,
            region,
            gerente,
            activos: count(),
        })
        .from(negocios)
        .innerJoin(embajadores, eq(embajadores.id, negocios.embajadorId))
        .innerJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(and(...cond))
        .groupBy(usuarios.id, usuarios.nombre, usuarios.apellidos, usuarios.avatarUrl, embajadores.id)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(limite);

    return filas.map((f) => ({
        usuarioId: f.usuarioId,
        nombre: `${f.nombre} ${f.apellidos ?? ''}`.trim(),
        avatarUrl: f.avatarUrl ?? null,
        region: f.region ?? null,
        gerente: f.gerente ?? null,
        activos: Number(f.activos),
    }));
}

// =============================================================================
// SECCIÓN ② — ADOPCIÓN DE LA APP
// =============================================================================

/** Días para considerar "activo" (negocio que usó ScanYA / cliente con actividad). Ventana FIJA. */
const VENTANA_ACTIVO_DIAS = 30;

function haceDias(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

export interface NegocioEnRiesgo {
    negocioId: string;
    nombre: string;
    logoUrl: string | null;
    diasSinUsar: number | null;
    clientes: number;
}

export interface MetricasAdopcion {
    rol: string;
    negocios: {
        activosEnApp: KpiMetrica;
        totalQuePagan: number;
    };
    clientes: {
        total: number;
        activos: KpiMetrica;
        inactivos: number;
    };
    serieClientesActivos: { mes: string; activos: number }[];
    /** `total` = todos los negocios en riesgo (para el badge); `items` = los primeros N (lista con scroll). */
    enRiesgo: { total: number; items: NegocioEnRiesgo[] };
}

export async function metricasAdopcion(panel: UsuarioPanel, periodo: Periodo): Promise<MetricasAdopcion> {
    const ctx = await resolverContexto(panel);
    if (ctx.tipo === 'vacio') {
        return {
            rol: panel.rolEquipo,
            negocios: { activosEnApp: { valor: 0, anterior: 0 }, totalQuePagan: 0 },
            clientes: { total: 0, activos: { valor: 0, anterior: 0 }, inactivos: 0 },
            serieClientesActivos: periodo.puntos.map((mes) => ({ mes, activos: 0 })),
            enRiesgo: { total: 0, items: [] },
        };
    }

    const desde30 = haceDias(VENTANA_ACTIVO_DIAS);
    const desde60 = haceDias(VENTANA_ACTIVO_DIAS * 2);

    const [totalQuePagan, activosEnApp, clientesTotal, clientesActivos, serie, enRiesgo] = await Promise.all([
        contarNegociosActivos(panel),
        negociosEnApp(ctx, desde30, desde60),
        clientesTotales(ctx),
        clientesActivosKpi(ctx, desde30, desde60),
        serieClientesActivos(ctx, periodo),
        listarEnRiesgo(ctx, desde30),
    ]);

    return {
        rol: panel.rolEquipo,
        negocios: { activosEnApp, totalQuePagan },
        clientes: { total: clientesTotal, activos: clientesActivos, inactivos: Math.max(0, clientesTotal - clientesActivos.valor) },
        serieClientesActivos: serie,
        enRiesgo,
    };
}

async function negociosEnApp(ctx: Contexto, desde30: string, desde60: string): Promise<KpiMetrica> {
    const alcance = predicadoNegocio(ctx, sql`${negocios.id}`);
    const cond: SQL[] = [eq(negocios.estadoAdmin, 'activo'), sql`${negocios.estadoMembresia} IN ('al_corriente','en_gracia')`];
    if (alcance) cond.push(alcance);
    const [fila] = await db
        .select({
            actual: sql<number>`COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM puntos_transacciones t WHERE t.negocio_id = ${negocios.id} AND t.estado = 'confirmado' AND t.created_at >= ${desde30}))`,
            anterior: sql<number>`COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM puntos_transacciones t WHERE t.negocio_id = ${negocios.id} AND t.estado = 'confirmado' AND t.created_at >= ${desde60} AND t.created_at < ${desde30}))`,
        })
        .from(negocios)
        .where(and(...cond));
    return { valor: Number(fila?.actual ?? 0), anterior: Number(fila?.anterior ?? 0) };
}

async function clientesTotales(ctx: Contexto): Promise<number> {
    const alcance = predicadoNegocio(ctx, sql`${puntosBilletera.negocioId}`);
    const [fila] = await db
        .select({ total: sql<number>`COUNT(DISTINCT ${puntosBilletera.usuarioId})` })
        .from(puntosBilletera)
        .where(alcance ?? undefined);
    return Number(fila?.total ?? 0);
}

async function clientesActivosKpi(ctx: Contexto, desde30: string, desde60: string): Promise<KpiMetrica> {
    const alcance = predicadoNegocio(ctx, sql`${puntosTransacciones.negocioId}`);
    const cond: SQL[] = [eq(puntosTransacciones.estado, 'confirmado')];
    if (alcance) cond.push(alcance);
    const [fila] = await db
        .select({
            actual: sql<number>`COUNT(DISTINCT ${puntosTransacciones.clienteId}) FILTER (WHERE ${puntosTransacciones.createdAt} >= ${desde30})`,
            anterior: sql<number>`COUNT(DISTINCT ${puntosTransacciones.clienteId}) FILTER (WHERE ${puntosTransacciones.createdAt} >= ${desde60} AND ${puntosTransacciones.createdAt} < ${desde30})`,
        })
        .from(puntosTransacciones)
        .where(and(...cond));
    return { valor: Number(fila?.actual ?? 0), anterior: Number(fila?.anterior ?? 0) };
}

async function serieClientesActivos(ctx: Contexto, p: Periodo): Promise<{ mes: string; activos: number }[]> {
    const t = truncado(sql`${puntosTransacciones.createdAt}`, p.granularidad);
    const alcance = predicadoNegocio(ctx, sql`${puntosTransacciones.negocioId}`);
    const cond: SQL[] = [eq(puntosTransacciones.estado, 'confirmado'), gte(puntosTransacciones.createdAt, p.desde), lt(puntosTransacciones.createdAt, p.hasta)];
    if (alcance) cond.push(alcance);
    const filas = await db
        .select({ p: t.label, activos: sql<number>`COUNT(DISTINCT ${puntosTransacciones.clienteId})` })
        .from(puntosTransacciones)
        .where(and(...cond))
        .groupBy(t.group);
    const porMes = new Map(filas.map((f) => [f.p, Number(f.activos)]));
    return p.puntos.map((mes) => ({ mes, activos: porMes.get(mes) ?? 0 }));
}

async function listarEnRiesgo(ctx: Contexto, desde30: string, limite = 50): Promise<{ total: number; items: NegocioEnRiesgo[] }> {
    const alcance = predicadoNegocio(ctx, sql`${negocios.id}`);
    const ultimaVenta = sql<string | null>`(SELECT MAX(t.created_at) FROM puntos_transacciones t WHERE t.negocio_id = ${negocios.id} AND t.estado = 'confirmado')`;
    const cond: SQL[] = [
        eq(negocios.estadoAdmin, 'activo'),
        sql`${negocios.estadoMembresia} IN ('al_corriente','en_gracia')`,
        sql`NOT EXISTS (SELECT 1 FROM puntos_transacciones t WHERE t.negocio_id = ${negocios.id} AND t.estado = 'confirmado' AND t.created_at >= ${desde30})`,
    ];
    if (alcance) cond.push(alcance);
    const where = and(...cond);

    // total real (para el badge, sin tope) + lista de los primeros `limite` (para mostrar con scroll).
    const [tot, filas] = await Promise.all([
        db.select({ total: count() }).from(negocios).where(where),
        db
            .select({
                negocioId: negocios.id,
                nombre: negocios.nombre,
                logoUrl: negocios.logoUrl,
                ultima: ultimaVenta,
                clientes: sql<number>`(SELECT COUNT(*) FROM puntos_billetera b WHERE b.negocio_id = ${negocios.id})`,
            })
            .from(negocios)
            .where(where)
            .orderBy(sql`(SELECT MAX(t.created_at) FROM puntos_transacciones t WHERE t.negocio_id = ${negocios.id} AND t.estado = 'confirmado') ASC NULLS FIRST`)
            .limit(limite),
    ]);

    const ahora = Date.now();
    const items: NegocioEnRiesgo[] = filas.map((f) => ({
        negocioId: f.negocioId,
        nombre: f.nombre,
        logoUrl: f.logoUrl ?? null,
        diasSinUsar: f.ultima ? Math.floor((ahora - new Date(f.ultima).getTime()) / DIA_MS) : null,
        clientes: Number(f.clientes ?? 0),
    }));
    return { total: Number(tot[0]?.total ?? 0), items };
}

// =============================================================================
// SECCIÓN ③ — USUARIOS Y COMUNIDAD  (super + gerente · el vendedor NO entra)
// =============================================================================

export interface MetricasUsuarios {
    rol: string;
    kpis: {
        total: KpiMetrica;
        nuevos: KpiMetrica;
        activos: KpiMetrica;
        verificadosPct: KpiMetrica;
    };
    serieRegistros: { mes: string; registros: number }[];
    distribucion: { personal: number; comercial: number };
    topCiudades: { ciudad: string; total: number }[];
}

export async function metricasUsuarios(panel: UsuarioPanel, periodo: Periodo): Promise<MetricasUsuarios> {
    if (panel.rolEquipo !== 'superadmin' && panel.rolEquipo !== 'gerente') {
        return vacioUsuarios(panel.rolEquipo, periodo);
    }
    const rol = panel.rolEquipo;
    const region = panel.regionId;
    const vis = condicionVisibilidad(rol, region);
    const desde30 = haceDias(VENTANA_ACTIVO_DIAS);

    const [total, flujo, snapshot, serie, ciudadesTop] = await Promise.all([
        contarUsuarios(rol, region),
        db.select({
            actual: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.createdAt} >= ${periodo.desde} AND ${usuarios.createdAt} < ${periodo.hasta})`,
            anterior: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.createdAt} >= ${periodo.desdeAnterior} AND ${usuarios.createdAt} < ${periodo.desde})`,
        }).from(usuarios).where(vis),
        db.select({
            activos: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.ultimaConexion} >= ${desde30})`,
            verificados: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.correoVerificado} = true)`,
            base: sql<number>`COUNT(*)`,
            personal: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.perfil} = 'personal')`,
            comercial: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.perfil} = 'comercial')`,
        }).from(usuarios).where(vis),
        serieRegistros(vis, periodo),
        usuariosPorCiudad(rol, region),
    ]);

    const f = flujo[0];
    const s = snapshot[0];
    const baseN = Number(s?.base ?? 0);
    const verificadosPct = baseN > 0 ? Math.round((Number(s?.verificados ?? 0) / baseN) * 100) : 0;

    return {
        rol,
        kpis: {
            total: { valor: total, anterior: null },
            nuevos: { valor: Number(f?.actual ?? 0), anterior: Number(f?.anterior ?? 0) },
            activos: { valor: Number(s?.activos ?? 0), anterior: null },
            verificadosPct: { valor: verificadosPct, anterior: null },
        },
        serieRegistros: serie,
        distribucion: { personal: Number(s?.personal ?? 0), comercial: Number(s?.comercial ?? 0) },
        // "Top ciudades" = ranking de ciudades REALES (excluye "Sin ciudad", ausencia de dato). Ya viene desc.
        topCiudades: ciudadesTop.filter((c) => c.ciudadId !== null).slice(0, 8).map((c) => ({ ciudad: c.ciudad, total: c.total })),
    };
}

async function serieRegistros(vis: SQL | undefined, p: Periodo): Promise<{ mes: string; registros: number }[]> {
    const t = truncado(sql`${usuarios.createdAt}`, p.granularidad);
    const cond: SQL[] = [gte(usuarios.createdAt, p.desde), lt(usuarios.createdAt, p.hasta)];
    if (vis) cond.push(vis);
    const filas = await db
        .select({ p: t.label, registros: count() })
        .from(usuarios)
        .where(and(...cond))
        .groupBy(t.group);
    const porMes = new Map(filas.map((fila) => [fila.p, Number(fila.registros)]));
    return p.puntos.map((mes) => ({ mes, registros: porMes.get(mes) ?? 0 }));
}

function vacioUsuarios(rol: string, periodo: Periodo): MetricasUsuarios {
    return {
        rol,
        kpis: {
            total: { valor: 0, anterior: null },
            nuevos: { valor: 0, anterior: 0 },
            activos: { valor: 0, anterior: null },
            verificadosPct: { valor: 0, anterior: null },
        },
        serieRegistros: periodo.puntos.map((mes) => ({ mes, registros: 0 })),
        distribucion: { personal: 0, comercial: 0 },
        topCiudades: [],
    };
}
