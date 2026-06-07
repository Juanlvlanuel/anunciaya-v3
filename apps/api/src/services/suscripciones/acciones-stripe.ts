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
