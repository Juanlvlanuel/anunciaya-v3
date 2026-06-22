/**
 * publicidad.cron.ts
 * ==================
 * Cron de Publicidad (Fase 2): cada 12h expira los anuncios vencidos y avisa por correo a los que
 * están por vencer (3 días antes, configurable). Calcado de `servicios-expiracion.cron.ts`.
 *
 * Ubicación: apps/api/src/cron/publicidad.cron.ts
 */

import { expirarAnunciosVencidos, limpiarPendientesAbandonados, avisarAnunciosPorVencer } from '../services/publicidad-mantenimiento.service.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const MS_12_H = 12 * 60 * 60 * 1000;
const MS_INICIO = 90 * 1000;

export async function ejecutarMantenimientoPublicidad(): Promise<void> {
    const inicio = Date.now();
    try {
        const exp = await expirarAnunciosVencidos();
        const lim = await limpiarPendientesAbandonados();
        const avi = await avisarAnunciosPorVencer();
        const dur = Date.now() - inicio;
        registrarEjecucionCron('publicidad-mantenimiento', {
            ok: true,
            duracionMs: dur,
            resultado: `${exp.expirados} expirados, ${lim.borrados} pendientes limpiados, ${avi.avisados} avisados, ${avi.errores} errores`,
        });
        if (exp.expirados > 0 || lim.borrados > 0 || avi.avisados > 0 || avi.errores > 0) {
            console.log(`[Publicidad Cron] ${exp.expirados} expirados · ${lim.borrados} pendientes limpiados · ${avi.avisados} avisados · ${avi.errores} errores (${dur}ms)`);
        }
    } catch (err) {
        registrarEjecucionCron('publicidad-mantenimiento', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: err instanceof Error ? err.message : String(err),
        });
        console.error('[Publicidad Cron] Error en mantenimiento:', err);
    }
}

export function inicializarCronPublicidad(): void {
    console.log('[Publicidad Cron] expiración + aviso cada 12h (primera ejecución en 90s)');
    setTimeout(() => {
        ejecutarMantenimientoPublicidad();
        setInterval(ejecutarMantenimientoPublicidad, MS_12_H);
    }, MS_INICIO);
}
