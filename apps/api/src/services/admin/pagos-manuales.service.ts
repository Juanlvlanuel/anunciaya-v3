/**
 * admin/pagos-manuales.service.ts
 * ===============================
 * Registro CENTRALIZADO de un pago manual (efectivo/transferencia/cortesía) de la membresía.
 *
 * Un pago manual vive en DOS tablas con propósitos distintos:
 *   - `pagos_membresia` → registro contable detallado (folio del recibo, vigencia, `cobro_previo`
 *     para anular, quién lo registró). Alimenta el historial de la ficha de Negocios y el recibo PDF.
 *   - `eventos_pago`    → el "libro mayor" global (bitácora financiera del módulo Suscripciones),
 *     una fila plana por movimiento. Aquí va el gemelo `tipo='pago_manual'`.
 *
 * Antes este doble INSERT estaba COPIADO en `marcarPagado` y `altaManualNegocio`, y el alta manual
 * se olvidó del gemelo → sus pagos no aparecían en Suscripciones. Centralizar en un solo punto evita
 * que cualquier flujo futuro se desincronice: hay UN lugar que escribe el pago manual.
 *
 * Se llama SIEMPRE dentro de una transacción (recibe el `ejecutor`): el registro contable y el del
 * libro mayor van juntos o no van. (origen='manual' → stripe_event_id NULL.)
 *
 * Ubicación: apps/api/src/services/admin/pagos-manuales.service.ts
 */
import { db } from '../../db/index.js';
import { pagosMembresia, eventosPago } from '../../db/schemas/schema.js';

/** db global o una transacción Drizzle (mismo tipo que negocioManagement.service.ts). */
type EjecutorBD = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Conceptos válidos del pago manual (mismo set que el CHECK de BD y los schemas Zod). */
export type ConceptoPago = 'efectivo' | 'transferencia' | 'cortesia';

export interface DatosPagoManual {
    negocioId: string;
    /** MXN. En cortesía SIEMPRE se fuerza a NULL (CHECK en BD), aunque el caller mande un monto. */
    monto: number | null;
    /** Concepto del pago (CHECK en BD). */
    concepto: ConceptoPago;
    /** N meses cubiertos (modo "por meses"); null en "fecha exacta". */
    meses: number | null;
    /** Vigencia del pago (periodo_hasta), ISO. */
    hasta: string;
    /** Admin que lo registra (= actor del evento de la bitácora). Ambas columnas son nullable. */
    registradoPor: string | null;
    /** Fecha de cobro vigente ANTES de este pago (solo tarjeta, para deshacer al anular); null en alta manual. */
    cobroPrevio?: string | null;
    /** Método de cobro del negocio tras el pago — solo informativo para la metadata del evento. */
    metodoCobro?: 'tarjeta' | 'manual';
    /** Cuándo ocurrió el pago (ISO). Default: ahora. */
    fechaEvento?: string;
    /** Nota descriptiva del pago (p.ej. "Promoción de apertura 3x1"). Se muestra en el historial de
     *  la ficha y se estampa como detalle del concepto en el recibo. Opcional. */
    nota?: string | null;
}

/**
 * Inserta el pago manual en `pagos_membresia` Y su gemelo `pago_manual` en `eventos_pago`,
 * usando el mismo `ejecutor` (transacción) para que sean atómicos. Devuelve el id y el folio
 * del recibo recién creados (para emitir el comprobante).
 */
export async function registrarPagoManual(
    ejecutor: EjecutorBD,
    datos: DatosPagoManual,
): Promise<{ pagoId: string | null; folio: number | null }> {
    // La cortesía nunca lleva monto (CHECK en BD): el helper lo GARANTIZA aquí, sin depender de que
    // cada caller lo recuerde — ese es el sentido de centralizar la escritura del pago manual.
    const montoStr = datos.concepto === 'cortesia' || datos.monto == null ? null : String(datos.monto);
    const fechaEvento = datos.fechaEvento ?? new Date().toISOString();

    // 1) Registro contable. El folio secuencial del recibo lo asigna la BD (default de la secuencia).
    const [pago] = await ejecutor
        .insert(pagosMembresia)
        .values({
            negocioId: datos.negocioId,
            monto: montoStr,
            concepto: datos.concepto,
            mesesCubiertos: datos.meses ?? null,
            periodoHasta: datos.hasta,
            cobroPrevio: datos.cobroPrevio ?? null,
            registradoPor: datos.registradoPor,
            nota: datos.nota?.trim() || null,
        })
        .returning({ id: pagosMembresia.id, folio: pagosMembresia.folio });

    // 2) Gemelo en el libro mayor (bitácora). referencia_id → la fila contable de arriba.
    await ejecutor.insert(eventosPago).values({
        negocioId: datos.negocioId,
        tipo: 'pago_manual',
        origen: 'manual',
        monto: montoStr,
        fechaEvento,
        actorId: datos.registradoPor,
        referenciaId: pago?.id ?? null,
        metadata: {
            concepto: datos.concepto,
            meses: datos.meses ?? null,
            hasta: datos.hasta,
            metodoCobro: datos.metodoCobro ?? 'manual',
        },
    });

    return { pagoId: pago?.id ?? null, folio: pago?.folio ?? null };
}
