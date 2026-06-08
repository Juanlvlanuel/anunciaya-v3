/**
 * gracia.ts
 * =========
 * Suspende los negocios cuyo periodo de gracia ya venció.
 *
 * Un negocio entra en `en_gracia` cuando le falla un cobro de renovación
 * (ver `manejarCobroFallido` en pago.service.ts). Stripe NO avisa cuando se
 * acaba ese plazo — es una fecha nuestra (`fecha_limite_gracia`). Por eso un
 * cron diario revisa y suspende a los que ya pasaron su límite.
 *
 * Regla: `en_gracia` con `fecha_limite_gracia < ahora` → `suspendido`.
 * (Un negocio suspendido deja de contar como activo para comisiones.)
 *
 * Ubicación: apps/api/src/services/suscripciones/gracia.ts
 */

import { db } from '../../db/index.js';
import { negocios } from '../../db/schemas/schema.js';
import { and, eq, lt } from 'drizzle-orm';
import { notificarNegocioFueraDeCirculacion } from '../notificaciones.service.js';

/**
 * Suspende los negocios con periodo de gracia vencido.
 * @returns cantidad de negocios suspendidos y de errores.
 */
export async function suspenderGraciasVencidas(): Promise<{ suspendidos: number; errores: number }> {
    try {
        const ahora = new Date().toISOString();

        const filas = await db
            .update(negocios)
            // `activo=false` saca al negocio de circulación. Casi toda la app filtra
            // visibilidad por `activo`, así que con esto la suspensión por impago se
            // comporta igual que la manual. El MOTIVO sigue en `estado_membresia`.
            // `fechaProximoCobro=null`: ya suspendido, no habrá más intentos de cobro.
            .set({ estadoMembresia: 'suspendido', activo: false, fechaProximoCobro: null, updatedAt: ahora })
            .where(
                and(
                    eq(negocios.estadoMembresia, 'en_gracia'),
                    lt(negocios.fechaLimiteGracia, ahora),
                ),
            )
            .returning({ id: negocios.id });

        // Aviso persistente a cada dueño suspendido (centro de notificaciones, modo personal).
        for (const fila of filas) {
            await notificarNegocioFueraDeCirculacion(fila.id);
        }

        return { suspendidos: filas.length, errores: 0 };
    } catch (error) {
        console.error('[Suscripciones] Error suspendiendo gracias vencidas:', error);
        return { suspendidos: 0, errores: 1 };
    }
}
