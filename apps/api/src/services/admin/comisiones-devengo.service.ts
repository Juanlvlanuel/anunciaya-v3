/**
 * admin/comisiones-devengo.service.ts
 * ===================================
 * Motor de DEVENGO de la comisión recurrente (Vendedores y comisiones · Fase 2, pieza B).
 *
 * La comisión recurrente se devenga AL COBRO (Pieza 3 · Sprint Stripe): en cada cobro real de un negocio
 * (webhook de tarjeta / alta manual / "Registrar pago") se devenga, por ESE negocio, `meses pagados ×
 * monto del escalón`, con el escalón congelado al # de activos del momento y un marcador
 * `negocios.comision_devengada_hasta` que evita re-devengar la cobertura (anti-doble-pago del prepago).
 *
 *   - devengarComisionRecurrenteAlCobro(negocioId, coberturaHasta, montoPagado) — el motor (pieza B).
 *   - devengarComisionAlta(negocioId) — pago único al primer cobro real (pieza C).
 *
 * La "foto mensual" (cron `devengarPeriodo`) se retiró. El monto fijo (no %) blinda el costo si sube el
 * precio de la membresía (D1). La liquidación (pagar al vendedor) vive en `comisiones-liquidacion.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/comisiones-devengo.service.ts
 */

import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { embajadores, embajadorComisiones, negocios, pagosMembresia, eventosPago } from '../../db/schemas/schema.js';
import { obtenerConfigJson, obtenerConfigNumero } from '../configuracion.service.js';
import { ESCALERA_DEFAULT, type TramoEscalera } from './configuracion.service.js';

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
// PERIODO
// =============================================================================

/** 'YYYY-MM' del mes en curso (etiqueta del periodo del cobro). */
export function periodoActual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Retirado (Pieza 3): la comisión recurrente se devenga AL COBRO, no por "foto mensual". No-op; lo siguen
 * llamando algunas acciones de Negocios (reasignar/suspender/reactivar/cancelar), pero ya no hace nada —
 * cambiar el # de activos solo afecta el escalón de FUTUROS cobros, no re-devenga lo ya pagado.
 */
export async function dispararDevengoMesActual(): Promise<void> {
    // Pieza 3 (devengo al COBRO): RETIRADO. Antes recalculaba la "foto mensual" al cambiar el # de activos;
    // ahora la comisión recurrente se devenga en cada COBRO (no por foto) y el escalón se congela en ese
    // momento. Cambiar activos (suspender/reactivar/reasignar) afecta el escalón de FUTUROS cobros, no
    // re-devenga lo ya pagado. Se deja como no-op para no tocar sus llamadores; eliminar en una limpieza.
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

// =============================================================================
// DEVENGO RECURRENTE "AL COBRO" (pieza B · Pieza 3 del Sprint de Stripe)
// =============================================================================

/** # de negocios ACTIVOS de UN vendedor (misma definición que la cartera / SUB_ACTIVOS). */
async function contarActivosDeVendedor(embajadorId: string): Promise<number> {
    const [fila] = await db
        .select({ activos: sql<number>`count(${negocios.id})::int` })
        .from(negocios)
        .where(
            and(
                eq(negocios.embajadorId, embajadorId),
                eq(negocios.estadoAdmin, 'activo'),
                inArray(negocios.estadoMembresia, ['al_corriente', 'en_gracia']),
            ),
        );
    return Number(fila?.activos ?? 0);
}

/**
 * Devenga la comisión recurrente de un negocio AL MOMENTO DEL COBRO (Pieza 3 · D16/D16.1).
 *
 * En cada cobro real (renovación de tarjeta, alta manual, "Registrar pago") devenga, por ESE negocio
 * y de golpe: `mesesDevengables × monto del escalón vigente`, donde
 *   - mesesDevengables = dinero pagado ÷ precio mensual (un anual de 10× → 10; un mes → 1), y
 *   - el escalón se CONGELA al # de activos del vendedor en este instante.
 * El marcador `negocios.comision_devengada_hasta` avanza a `coberturaHasta` (fin del periodo PAGADO):
 * impide volver a devengar esa cobertura (idempotencia + anti-doble-pago del prepago) aunque el
 * negocio siga contando como activo para el escalón. Best-effort: nunca rompe el cobro.
 *
 * @param coberturaHasta  fin del periodo que el dinero cubrió (ISO). Para el anual, +12 meses.
 * @param montoPagado     MXN realmente cobrados en este pago (define los mesesDevengables).
 */
export async function devengarComisionRecurrenteAlCobro(
    negocioId: string,
    coberturaHasta: string,
    montoPagado: number,
): Promise<void> {
    try {
        const [neg] = await db
            .select({ embajadorId: negocios.embajadorId, devengadaHasta: negocios.comisionDevengadaHasta })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);
        if (!neg?.embajadorId) return;                  // sin vendedor → no hay comisión
        if (!coberturaHasta || montoPagado <= 0) return;

        // Idempotencia + anti-doble-pago: si la cobertura ya está dentro de lo devengado, no repetir.
        if (neg.devengadaHasta && new Date(coberturaHasta).getTime() <= new Date(neg.devengadaHasta).getTime()) {
            return;
        }

        const precioMensual = await obtenerConfigNumero('precio_membresia_mxn', 849);
        const mesesDevengables = precioMensual > 0 ? Math.round(montoPagado / precioMensual) : 0;

        // El marcador avanza SIEMPRE a la nueva cobertura (aunque el escalón sea $0), para no re-evaluar.
        await db.update(negocios).set({ comisionDevengadaHasta: coberturaHasta }).where(eq(negocios.id, negocioId));

        if (mesesDevengables <= 0) return;

        const escalera = await escaleraActual();
        const activos = await contarActivosDeVendedor(neg.embajadorId);
        const unitario = montoPorActivo(activos, escalera);    // escalón CONGELADO a este instante
        const monto = mesesDevengables * unitario;
        if (monto <= 0) return;                                 // escalón $0 → nada que devengar

        await db.insert(embajadorComisiones).values({
            embajadorId: neg.embajadorId,
            negocioId,
            tipo: 'recurrente',
            montoComision: String(monto),
            estado: 'pendiente',
            periodo: periodoActual(),                            // mes del cobro (para agrupar/reporting)
            detalle: {
                meses: mesesDevengables,
                montoUnitario: unitario,
                escalon: etiquetaEscalon(activos, escalera),
                activos,
                hasta: coberturaHasta,
            },
        });
    } catch (err) {
        console.error('[Comisiones] No se pudo devengar la comisión recurrente al cobro:', err);
    }
}
