/**
 * servicios-expiracion.cron.ts
 * =============================
 * Cron job de Servicios — auto-pausa publicaciones que llevan 30 días sin
 * interacción.
 *
 * Schedule: cada 6h (primera ejecución 60s después del arranque).
 *
 * Patrón calcado de `marketplace-expiracion.cron.ts`. Las notificaciones
 * al dueño se agregarán en Sprint 7.5+ cuando consolidemos la infra de
 * notificaciones para servicios.
 *
 * Ubicación: apps/api/src/cron/servicios-expiracion.cron.ts
 */

import { autoPausarExpiradosServicios } from '../services/servicios/expiracion.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const MS_6_H = 6 * 60 * 60 * 1000;
const MS_INICIO = 60 * 1000;

export async function ejecutarAutoPausa(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await autoPausarExpiradosServicios();
        const dur = Date.now() - inicio;
        registrarEjecucionCron('servicios-expiracion', {
            ok: true,
            duracionMs: dur,
            resultado: `${r.pausados} pausados, ${r.errores} errores`,
        });
        if (r.pausados > 0 || r.errores > 0) {
            console.log(
                `[Servicios Cron] auto-pausa: ${r.pausados} pausados, ` +
                    `${r.errores} errores (${dur}ms)`,
            );
        }
    } catch (err) {
        registrarEjecucionCron('servicios-expiracion', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: err instanceof Error ? err.message : String(err),
        });
        console.error('[Servicios Cron] Error en auto-pausa:', err);
    }
}

export function inicializarCronServiciosExpiracion(): void {
    console.log(
        '[Servicios Cron] auto-pausa cada 6h (primera ejecución en 60s)',
    );
    setTimeout(() => {
        ejecutarAutoPausa();
        setInterval(ejecutarAutoPausa, MS_6_H);
    }, MS_INICIO);
}
