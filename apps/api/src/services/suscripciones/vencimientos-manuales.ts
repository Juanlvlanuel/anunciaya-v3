/**
 * vencimientos-manuales.ts
 * ========================
 * Expira los negocios de pago MANUAL (sin Stripe) cuya `fecha_vencimiento` ya pasó:
 * `al_corriente` → `en_gracia`. La transición `en_gracia` → `suspendido` la hereda el cron de
 * gracia existente (`suspenderGraciasVencidas`), que NO filtra por método de cobro.
 *
 * En tarjeta, `al_corriente` → `en_gracia` lo dispara el webhook de cobro fallido; los negocios
 * manuales no tienen webhook, así que este cron es su equivalente. Usa la MISMA fórmula y config
 * de gracia que el webhook (`periodo_gracia_cobro_dias`). No toca `fecha_proximo_cobro` (campo de
 * Stripe; en manual no hay cobro automático). No degrada la cuenta del dueño (igual que el impago
 * de tarjeta: solo cambia el estado de la membresía).
 *
 * Ubicación: apps/api/src/services/suscripciones/vencimientos-manuales.ts
 */

import { db } from '../../db/index.js';
import { negocios } from '../../db/schemas/schema.js';
import { and, eq, lt, count } from 'drizzle-orm';
import { obtenerConfigNumero } from '../configuracion.service.js';
import { notificarMembresiaEnGracia } from '../notificaciones.service.js';

/**
 * Pasa a `en_gracia` los negocios manuales vencidos (`al_corriente` con `fecha_vencimiento` < ahora).
 * Fija `fecha_inicio_gracia` y `fecha_limite_gracia` (= ahora + periodo de gracia) y avisa al dueño.
 * @returns cantidad que entró en gracia y de errores.
 */
export async function expirarManualesVencidos(): Promise<{ enGracia: number; errores: number }> {
    try {
        const ahora = new Date();
        const ahoraISO = ahora.toISOString();
        const diasGracia = await obtenerConfigNumero('periodo_gracia_cobro_dias', 14);
        const limiteGracia = new Date(ahora.getTime() + diasGracia * 24 * 60 * 60 * 1000).toISOString();

        const filas = await db
            .update(negocios)
            .set({
                estadoMembresia: 'en_gracia',
                fechaInicioGracia: ahoraISO,
                fechaLimiteGracia: limiteGracia,
                updatedAt: ahoraISO,
            })
            .where(
                and(
                    eq(negocios.metodoCobro, 'manual'),
                    eq(negocios.activo, true),
                    eq(negocios.estadoAdmin, 'activo'),
                    eq(negocios.estadoMembresia, 'al_corriente'),
                    lt(negocios.fechaVencimiento, ahoraISO),
                ),
            )
            .returning({ id: negocios.id });

        // Aviso al dueño: "tu membresía venció, ponte al día" (antes de que lo suspendan).
        // El cron solo procesa la transición al_corriente→en_gracia, así que esto corre UNA vez
        // por negocio (en la corrida donde transiciona); no se repite en corridas siguientes.
        for (const fila of filas) {
            await notificarMembresiaEnGracia(fila.id);
        }

        return { enGracia: filas.length, errores: 0 };
    } catch (error) {
        console.error('[Suscripciones] Error expirando manuales vencidos:', error);
        return { enGracia: 0, errores: 1 };
    }
}

/**
 * Cuenta (sin actuar) los negocios manuales que `expirarManualesVencidos` pasaría a
 * gracia ahora. Misma condición que el UPDATE de arriba — para el preview del cron.
 */
export async function contarManualesVencidos(): Promise<number> {
    const ahoraISO = new Date().toISOString();
    const [r] = await db
        .select({ n: count() })
        .from(negocios)
        .where(
            and(
                eq(negocios.metodoCobro, 'manual'),
                eq(negocios.activo, true),
                eq(negocios.estadoAdmin, 'activo'),
                eq(negocios.estadoMembresia, 'al_corriente'),
                lt(negocios.fechaVencimiento, ahoraISO),
            ),
        );
    return r?.n ?? 0;
}
