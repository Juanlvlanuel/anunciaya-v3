/**
 * admin/comisiones-devengo.service.ts
 * ===================================
 * Motor de DEVENGO de la comisión recurrente (Vendedores y comisiones · Fase 2, pieza B).
 *
 * La comisión recurrente de un vendedor en un mes = (# de sus negocios ACTIVOS) × (monto del escalón
 * donde cae ese número), según la **escalera de comisiones** que se edita en Configuración (módulo 9) y
 * aquí solo se LEE (`comision_escalera`). "Activo" = negocio vivo con membresía al corriente o en gracia.
 *
 *   - devengarPeriodo(periodo)  — por cada vendedor activo: cuenta activos, ubica el escalón, y crea o
 *     actualiza su fila recurrente del periodo. Idempotente (índice único parcial embajador+periodo).
 *     NO toca comisiones ya **pagadas**. Lo usa el cron mensual y el recálculo manual del Panel.
 *
 * El monto fijo (no %) blinda el costo si sube el precio de la membresía (D1). La liquidación (pagar al
 * vendedor) vive en `comisiones-liquidacion.service.ts` (pieza E).
 *
 * Ubicación: apps/api/src/services/admin/comisiones-devengo.service.ts
 */

import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { embajadores, embajadorComisiones, negocios, pagosMembresia, eventosPago } from '../../db/schemas/schema.js';
import { obtenerConfigJson, obtenerConfigNumero } from '../configuracion.service.js';
import { ESCALERA_DEFAULT, type TramoEscalera } from './configuracion.service.js';

export interface ResumenDevengo {
    periodo: string;
    vendedoresProcesados: number;
    creadas: number;
    actualizadas: number;
    omitidasPagadas: number;
    totalDevengado: number;
}

// =============================================================================
// ESCALERA (se lee de Configuración)
// =============================================================================

/** Lee la escalera vigente (de `comision_escalera`); cae al default del catálogo si falta o es inválida. */
export async function escaleraActual(): Promise<TramoEscalera[]> {
    const esc = await obtenerConfigJson<TramoEscalera[]>('comision_escalera', ESCALERA_DEFAULT);
    return Array.isArray(esc) && esc.length > 0 ? esc : ESCALERA_DEFAULT;
}

/** Tramo donde cae un número de activos (o null si la escalera no lo cubre — no debería pasar). */
function tramoDe(activos: number, escalera: TramoEscalera[]): TramoEscalera | null {
    return escalera.find((t) => activos >= t.min && (t.max === null || activos <= t.max)) ?? null;
}

/** Monto por activo del escalón donde cae `activos`. */
export function montoPorActivo(activos: number, escalera: TramoEscalera[]): number {
    return tramoDe(activos, escalera)?.montoPorActivo ?? 0;
}

/** Etiqueta legible del escalón (p.ej. "10-24" o "25+"). */
function etiquetaEscalon(activos: number, escalera: TramoEscalera[]): string {
    const t = tramoDe(activos, escalera);
    if (!t) return '—';
    return t.max === null ? `${t.min}+` : `${t.min}-${t.max}`;
}

// =============================================================================
// CONTEO DE ACTIVOS
// =============================================================================

/**
 * # de negocios ACTIVOS por vendedor (embajador activo). MISMA definición que la cartera (SUB_ACTIVOS):
 * negocio con `estado_admin = 'activo'` Y membresía al corriente o en gracia. (No usar la columna legacy
 * `negocios.activo`, que no coincide con el conteo que ve el Panel.)
 */
async function contarActivosPorVendedor(): Promise<Array<{ embajadorId: string; activos: number }>> {
    const filas = await db
        .select({
            embajadorId: embajadores.id,
            activos: sql<number>`count(${negocios.id})::int`,
        })
        .from(embajadores)
        .leftJoin(
            negocios,
            and(
                eq(negocios.embajadorId, embajadores.id),
                eq(negocios.estadoAdmin, 'activo'),
                inArray(negocios.estadoMembresia, ['al_corriente', 'en_gracia']),
            ),
        )
        .where(eq(embajadores.estado, 'activo'))
        .groupBy(embajadores.id);
    return filas.map((f) => ({ embajadorId: f.embajadorId, activos: Number(f.activos) }));
}

// =============================================================================
// DEVENGO DEL PERIODO
// =============================================================================

/** 'YYYY-MM' del mes en curso (para el cron y el recálculo por defecto). */
export function periodoActual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Genera/actualiza la comisión recurrente de `periodo` para cada vendedor activo. Idempotente: si la fila
 * del periodo ya existe y está PENDIENTE/cancelada se recalcula; si ya está PAGADA no se toca (no se pisa lo
 * liquidado). Las filas en $0 (escalón sin comisión) no se crean.
 */
export async function devengarPeriodo(periodo: string): Promise<ResumenDevengo> {
    const escalera = await escaleraActual();
    const conteos = await contarActivosPorVendedor();
    let creadas = 0;
    let actualizadas = 0;
    let omitidasPagadas = 0;
    let totalDevengado = 0;

    for (const { embajadorId, activos } of conteos) {
        const unitario = montoPorActivo(activos, escalera);
        const monto = activos * unitario;
        const detalle = { activos, montoUnitario: unitario, escalon: etiquetaEscalon(activos, escalera) };

        const [existente] = await db
            .select({ id: embajadorComisiones.id, estado: embajadorComisiones.estado })
            .from(embajadorComisiones)
            .where(
                and(
                    eq(embajadorComisiones.embajadorId, embajadorId),
                    eq(embajadorComisiones.periodo, periodo),
                    eq(embajadorComisiones.tipo, 'recurrente'),
                ),
            )
            .limit(1);

        if (existente) {
            if (existente.estado === 'pagada') {
                omitidasPagadas++;
                continue;
            }
            await db
                .update(embajadorComisiones)
                .set({ montoComision: String(monto), detalle, estado: 'pendiente' })
                .where(eq(embajadorComisiones.id, existente.id));
            actualizadas++;
            totalDevengado += monto;
        } else if (monto > 0) {
            await db.insert(embajadorComisiones).values({
                embajadorId,
                negocioId: null,
                tipo: 'recurrente',
                montoComision: String(monto),
                estado: 'pendiente',
                periodo,
                detalle,
            });
            creadas++;
            totalDevengado += monto;
        }
    }

    return { periodo, vendedoresProcesados: conteos.length, creadas, actualizadas, omitidasPagadas, totalDevengado };
}

/**
 * Recalcula el devengo del MES EN CURSO, best-effort (no lanza). Para llamarse desde las acciones que
 * cambian el # de negocios activos de un vendedor (reasignar / suspender / reactivar / cancelar / marcar
 * pagado), de modo que la comisión se sincronice al instante sin esperar al cron diario.
 */
export async function dispararDevengoMesActual(): Promise<void> {
    try {
        await devengarPeriodo(periodoActual());
    } catch (err) {
        console.error('[Comisiones] No se pudo recalcular el devengo tras un cambio de activos:', err);
    }
}

// =============================================================================
// COMISIÓN DE ALTA (pieza C) — pago único al concretar el primer pago
// =============================================================================

/**
 * Devenga la comisión de ALTA de un negocio (pieza C): pago único al vendedor cuando el negocio concreta su
 * PRIMER pago. Best-effort e **idempotente** (una sola por negocio), así que es seguro llamarla en cada punto
 * de pago (webhook / alta manual / marcar pagado). No hace nada si el negocio no tiene vendedor, no ha pagado
 * aún, **ya tenía pagos previos** (negocio anterior al módulo o renovación → no es alta nueva), ya tiene su
 * comisión de alta, o el monto configurado es 0.
 */
export async function devengarComisionAlta(negocioId: string): Promise<void> {
    try {
        const [neg] = await db
            .select({ embajadorId: negocios.embajadorId, fechaPrimerPago: negocios.fechaPrimerPago })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);
        // Sin vendedor o todavía sin primer pago → no aplica.
        if (!neg?.embajadorId || !neg.fechaPrimerPago) return;

        // La comisión de alta es por la PRIMERA venta concretada. Si el negocio YA tenía pagos antes del
        // actual (negocio anterior al módulo, o una renovación), NO es un alta nueva → no se devenga. Se
        // cuenta en pagos_membresia (manuales) y eventos_pago (Stripe + manuales) y se toma el mayor, para
        // cubrir ambos canales aunque a un manual viejo le falte su gemelo en eventos_pago.
        const [pm] = await db
            .select({ n: sql<number>`COUNT(*)::int` })
            .from(pagosMembresia)
            .where(and(eq(pagosMembresia.negocioId, negocioId), eq(pagosMembresia.anulado, false), ne(pagosMembresia.concepto, 'cortesia')));
        const [ep] = await db
            .select({ n: sql<number>`COUNT(*)::int` })
            .from(eventosPago)
            .where(and(eq(eventosPago.negocioId, negocioId), sql`${eventosPago.tipo} IN ('cobro_exitoso','pago_manual')`));
        const pagosReales = Math.max(Number(pm?.n ?? 0), Number(ep?.n ?? 0));
        if (pagosReales > 1) return; // ya tenía historial de pagos → no es un alta nueva

        // Idempotencia: una sola comisión de alta por negocio.
        const [existe] = await db
            .select({ id: embajadorComisiones.id })
            .from(embajadorComisiones)
            .where(and(eq(embajadorComisiones.negocioId, negocioId), eq(embajadorComisiones.tipo, 'alta')))
            .limit(1);
        if (existe) return;

        const monto = await obtenerConfigNumero('comision_alta_monto', 400);
        if (monto <= 0) return;

        await db.insert(embajadorComisiones).values({
            embajadorId: neg.embajadorId,
            negocioId,
            tipo: 'alta',
            montoComision: String(monto),
            estado: 'pendiente',
            periodo: null,
            detalle: { tipo: 'alta', monto },
        });
    } catch (err) {
        console.error('[Comisiones] No se pudo devengar la comisión de alta:', err);
    }
}
