/**
 * suscripciones/acciones-stripe.ts
 * ================================
 * Helpers DEFENSIVAS para accionar una suscripción de Stripe desde el Panel Admin
 * (Parada 2 · Negocios). Reusan el cliente singleton de `config/stripe.ts`.
 *
 * Las tres acciones:
 *   - pausarCobroSuscripcion   → pause_collection { behavior: 'void' } (NO genera deuda;
 *                                las facturas durante la pausa se anulan).
 *   - reanudarCobroSuscripcion → pause_collection '' (limpia la pausa; el ciclo sigue de
 *                                ahí en adelante, NO se cobran los ciclos saltados).
 *   - cancelarSuscripcion      → subscriptions.cancel (corte inmediato).
 *
 * Regla (decisión §4.3): la fuente de verdad es NUESTRA BD. Estas helpers NUNCA lanzan:
 * devuelven { ok, aviso? }. Si Stripe falla o la suscripción no existe / ya está
 * cancelada, el caller aplica igual su cambio en BD y propaga `aviso` para que el Panel
 * lo muestre como ADVERTENCIA visible (no como éxito normal).
 *
 * Ubicación: apps/api/src/services/suscripciones/acciones-stripe.ts
 */

import { stripe } from '../../config/stripe.js';

/** Resultado de una acción de Stripe. `aviso` != null ⇒ algo NO se completó en Stripe. */
export interface ResultadoStripe {
    ok: boolean;
    /** Mensaje corto para el admin si la parte de Stripe no se completó. */
    aviso?: string;
}

/** Extrae un mensaje legible de un error desconocido. */
function mensajeError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
}

/**
 * Pausa el cobro automático de la tarjeta SIN generar deuda (behavior 'void').
 * Defensiva: si la suscripción ya está cancelada en Stripe, no hay nada que pausar.
 */
export async function pausarCobroSuscripcion(subscriptionId: string): Promise<ResultadoStripe> {
    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === 'canceled') {
            return { ok: false, aviso: 'La suscripción ya estaba cancelada en Stripe; no se pudo pausar el cobro.' };
        }
        await stripe.subscriptions.update(subscriptionId, {
            pause_collection: { behavior: 'void' },
        });
        return { ok: true };
    } catch (error) {
        console.error('[Stripe] Error pausando cobro de suscripción', subscriptionId, error);
        return { ok: false, aviso: `No se pudo pausar el cobro en Stripe (${mensajeError(error)}).` };
    }
}

/**
 * Reanuda el cobro: limpia pause_collection. Con behavior 'void' previo, el ciclo sigue
 * de ahí en adelante (no se cobran los ciclos saltados durante la pausa).
 */
export async function reanudarCobroSuscripcion(subscriptionId: string): Promise<ResultadoStripe> {
    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === 'canceled') {
            return { ok: false, aviso: 'La suscripción está cancelada en Stripe; no se pudo reanudar el cobro.' };
        }
        await stripe.subscriptions.update(subscriptionId, {
            pause_collection: '', // Emptyable → limpia la pausa
        });
        return { ok: true };
    } catch (error) {
        console.error('[Stripe] Error reanudando cobro de suscripción', subscriptionId, error);
        return { ok: false, aviso: `No se pudo reanudar el cobro en Stripe (${mensajeError(error)}).` };
    }
}

/**
 * Cancela la suscripción de inmediato. Idempotente: si ya está cancelada en Stripe,
 * se considera ok (no es un error que el corte ya esté hecho).
 */
export async function cancelarSuscripcion(subscriptionId: string): Promise<ResultadoStripe> {
    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === 'canceled') {
            return { ok: true }; // ya cortada: nada que hacer
        }
        await stripe.subscriptions.cancel(subscriptionId);
        return { ok: true };
    } catch (error) {
        console.error('[Stripe] Error cancelando suscripción', subscriptionId, error);
        return { ok: false, aviso: `No se pudo cancelar la suscripción en Stripe (${mensajeError(error)}).` };
    }
}

/**
 * Empuja el próximo cobro de la tarjeta a una fecha futura ("Marcar pagado" · Opción A).
 * El comerciante pagó por adelantado (efectivo/transferencia) o se le da cortesía, así que
 * se DIFIERE el cobro N meses CON retoma automática: al llegar `trial_end`, Stripe factura
 * y cobra solo el método guardado (NO es una pausa indefinida; el ciclo retoma por sí mismo).
 *
 * Mecanismo (verificado contra la doc de Stripe):
 *   - `trial_end` ABSOLUTO (unix) → Stripe mueve el billing_cycle_anchor a esa fecha. Mientras
 *     dura, la sub queda `trialing` y no se cobra; al vencer, emite invoice y cobra automático.
 *     Bonus: el `customer.subscription.updated` que dispara trae `current_period_end = trial_end`,
 *     así que `manejarSuscripcionActualizada` escribe la fecha CORRECTA (disuelve el Hallazgo 2).
 *   - `proration_behavior: 'none'` → no prorratea el tramo (no cobra nada ahora).
 *   - `pause_collection: ''` → limpia cualquier pausa residual (p.ej. de una suspensión previa)
 *     para que el cobro SÍ retome al vencer en vez de quedar pausado.
 *
 * Defensiva (§4.3): NUNCA lanza. Si la fecha es inválida, la sub ya está cancelada, o Stripe
 * rechaza la fecha (máx. 2 años desde el ancla), devuelve { ok:false, aviso } y el caller
 * aplica su cambio en BD igual y muestra la advertencia.
 *
 * @param subscriptionId La suscripción del dueño.
 * @param hastaISO       Fecha (ISO) hasta la que queda cubierto = nuevo `trial_end`.
 */
export async function empujarCobroSuscripcion(subscriptionId: string, hastaISO: string): Promise<ResultadoStripe> {
    const trialEndUnix = Math.floor(Date.parse(hastaISO) / 1000);
    if (Number.isNaN(trialEndUnix)) {
        return { ok: false, aviso: 'La fecha para empujar el cobro es inválida.' };
    }
    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === 'canceled') {
            return { ok: false, aviso: 'La suscripción ya estaba cancelada en Stripe; no se pudo empujar el cobro.' };
        }
        await stripe.subscriptions.update(subscriptionId, {
            trial_end: trialEndUnix,            // absoluto: hoy + N meses ya calculado por el caller
            proration_behavior: 'none',         // no prorratea ni cobra nada ahora
            pause_collection: '',               // limpia pausa residual → el cobro retoma al vencer
        });
        return { ok: true };
    } catch (error) {
        console.error('[Stripe] Error empujando cobro de suscripción', subscriptionId, error);
        return { ok: false, aviso: `No se pudo empujar el cobro en Stripe (${mensajeError(error)}).` };
    }
}
