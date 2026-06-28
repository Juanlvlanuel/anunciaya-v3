/**
 * eventos-pago.ts
 * ===============
 * Helper para registrar filas en la BITÁCORA FINANCIERA global (`eventos_pago`), el
 * "libro mayor" de la membresía que alimenta el módulo Suscripciones del Panel Admin.
 *
 * Lo usa el WEBHOOK de Stripe (pago.service.ts) para persistir, de forma DEFENSIVA, los
 * eventos automáticos que antes se perdían: cobro_exitoso / cobro_fallido / cancelacion.
 * El pago_manual (origen='manual') NO pasa por aquí: lo inserta `marcarPagado` dentro de
 * su propia transacción (gemelo de la fila contable en `pagos_membresia`).
 *
 * Ver docs/arquitectura/Panel_Admin/Suscripciones_Pendientes.md y Pagos_Suscripciones.md §12.
 */
import { db } from '../../db/index.js';
import { eventosPago } from '../../db/schemas/schema.js';

export type TipoEventoPago = 'cobro_exitoso' | 'cobro_fallido' | 'cancelacion' | 'pago_manual';

export interface DatosEventoPago {
    negocioId: string;
    tipo: TipoEventoPago;
    origen: 'stripe' | 'manual';
    /** MXN del movimiento. NULL si no aplica (fallido/cancelación/cortesía). */
    monto?: number | null;
    moneda?: string;
    /** Cuándo OCURRIÓ el movimiento (ISO). Si se omite, la BD pone now(). */
    fechaEvento?: string;
    /** Admin que lo registró; NULL en eventos automáticos de Stripe. */
    actorId?: string | null;
    /** event.id de Stripe → idempotencia (UNIQUE). NULL en manual. */
    stripeEventId?: string | null;
    /** FK suave → pagos_membresia.id (en pago_manual). */
    referenciaId?: string | null;
    metadata?: Record<string, unknown> | null;
}

/**
 * Inserta una fila en `eventos_pago`. DEFENSIVO: nunca lanza. Pensado para el webhook,
 * donde un fallo NO debe romper el ciclo de cobro ni provocar un reintento de Stripe.
 * Idempotente: `onConflictDoNothing` sobre stripe_event_id (un event.id reentregado no
 * duplica fila). Si el INSERT falla por cualquier motivo, solo loguea — la bitácora es
 * secundaria respecto al estado del negocio, que es la fuente de verdad.
 *
 * DEVUELVE `true` solo si esta llamada INSERTÓ realmente la fila (ganó el candado). Devuelve
 * `false` si ya existía ese `stripe_event_id` (otro proceso/reintento lo registró) o si el
 * INSERT falló. Esto permite usar el INSERT como CANDADO ATÓMICO de idempotencia: el primero
 * que inserta es el único que debe ejecutar el trabajo asociado (comisión, recibo). Resuelve
 * la race entre checkout.session.completed e invoice.payment_succeeded (mismo invoice → 2
 * recibos). Para filas con stripe_event_id NULL (manual) siempre inserta → devuelve `true`.
 */
export async function registrarEventoPago(datos: DatosEventoPago): Promise<boolean> {
    try {
        const filas = await db
            .insert(eventosPago)
            .values({
                negocioId: datos.negocioId,
                tipo: datos.tipo,
                origen: datos.origen,
                monto: datos.monto != null ? String(datos.monto) : null,
                moneda: datos.moneda ?? 'MXN',
                ...(datos.fechaEvento ? { fechaEvento: datos.fechaEvento } : {}),
                actorId: datos.actorId ?? null,
                stripeEventId: datos.stripeEventId ?? null,
                referenciaId: datos.referenciaId ?? null,
                metadata: datos.metadata ?? null,
            })
            .onConflictDoNothing({ target: eventosPago.stripeEventId })
            .returning({ id: eventosPago.id });
        return filas.length > 0;
    } catch (error) {
        console.error('❌ Error registrando evento en la bitácora financiera (no crítico):', error);
        return false;
    }
}
