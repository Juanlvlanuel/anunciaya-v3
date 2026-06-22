/**
 * suscripciones-gracia.cron.ts
 * ============================
 * Cron job de Suscripciones — suspende negocios cuyo periodo de gracia venció.
 *
 * Un cobro de renovación fallido deja al negocio en `en_gracia` con una
 * `fecha_limite_gracia`. Stripe no avisa cuando ese plazo se acaba, así que
 * este cron revisa a diario y pasa a `suspendido` los que ya vencieron.
 *
 * Schedule: cada 24h (primera ejecución 60s después del arranque).
 *
 * Patrón calcado de `servicios-expiracion.cron.ts`.
 *
 * Ubicación: apps/api/src/cron/suscripciones-gracia.cron.ts
 */

import { suspenderGraciasVencidas } from '../services/suscripciones/gracia.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const MS_24_H = 24 * 60 * 60 * 1000;
const MS_INICIO = 60 * 1000;

export async function ejecutarSuspension(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await suspenderGraciasVencidas();
        const dur = Date.now() - inicio;
        registrarEjecucionCron('suscripciones-gracia', {
            ok: true,
            duracionMs: dur,
            resultado: `${r.suspendidos} suspendidos, ${r.errores} errores`,
        });
        if (r.suspendidos > 0 || r.errores > 0) {
            console.log(
                `[Suscripciones Cron] suspensión por gracia vencida: ` +
                    `${r.suspendidos} suspendidos, ${r.errores} errores (${dur}ms)`,
            );
        }
    } catch (err) {
        registrarEjecucionCron('suscripciones-gracia', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: err instanceof Error ? err.message : String(err),
        });
        console.error('[Suscripciones Cron] Error en suspensión:', err);
    }
}

export function inicializarCronSuscripcionesGracia(): void {
    console.log(
        '[Suscripciones Cron] suspensión por gracia vencida cada 24h (primera ejecución en 60s)',
    );
    setTimeout(() => {
        ejecutarSuspension();
        setInterval(ejecutarSuspension, MS_24_H);
    }, MS_INICIO);
}
