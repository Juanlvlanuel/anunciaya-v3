/**
 * puntos-expiracion.cron.ts
 * =========================
 * Cron diario de expiración de puntos CardYA.
 *
 * Hasta ahora la expiración era "on-read": los puntos solo se vencían cuando el
 * cliente volvía a pasar por ScanYA. Este cron los vence PROACTIVAMENTE en fecha,
 * sin depender de que el cliente regrese, y deja rastro en `puntos_expiraciones`.
 *
 * Solo afecta a negocios con expiración activa (`dias_expiracion_puntos IS NOT NULL`);
 * como los negocios nacen sin expiración, la mayoría no se toca.
 *
 * Schedule: 1 vez al día a las 09:00 UTC (03:00 CST México, madrugada).
 * Primera ejecución diferida 60s tras el arranque para no chocar con migraciones.
 *
 * Ubicación: apps/api/src/cron/puntos-expiracion.cron.ts
 */

import { expirarPuntosVencidosMasivo, notificarPuntosPorVencer } from '../services/puntos.service.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const HORA_DIARIA_UTC = 9; // 09:00 UTC = 03:00 CST México (madrugada)

// =============================================================================
// EXPIRACIÓN MASIVA — 1 vez al día
// =============================================================================

export async function ejecutarExpiracionPuntos(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await expirarPuntosVencidosMasivo();
        const dur = Date.now() - inicio;
        registrarEjecucionCron('puntos-expiracion', {
            ok: true,
            duracionMs: dur,
            resultado: `${r.billeterasExpiradas} billeteras, ${r.puntosExpirados} pts expirados`,
        });
        if (r.billeterasExpiradas > 0) {
            console.log(
                `[Puntos Cron] expiración: ${r.billeterasExpiradas} billeteras, ` +
                    `${r.puntosExpirados} pts (${dur}ms)`
            );
        }
    } catch (err) {
        registrarEjecucionCron('puntos-expiracion', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: err instanceof Error ? err.message : String(err),
        });
        console.error('[Puntos Cron] Error en expiración masiva:', err);
    }
}

// =============================================================================
// AVISO PREVIO DE VENCIMIENTO — 1 vez al día
// =============================================================================

export async function ejecutarAvisoPuntosPorVencer(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await notificarPuntosPorVencer();
        const dur = Date.now() - inicio;
        if (r.avisos > 0) {
            console.log(`[Puntos Cron] aviso previo: ${r.avisos} clientes notificados (${dur}ms)`);
        }
    } catch (err) {
        console.error('[Puntos Cron] Error en aviso previo:', err);
    }
}

/**
 * Milisegundos hasta la próxima ejecución diaria a las `horaUtc`:00 UTC.
 * Si ya pasó hoy, agenda para mañana.
 */
function msHastaProximaHoraDiaria(horaUtc: number): number {
    const ahora = new Date();
    const objetivo = new Date();
    objetivo.setUTCHours(horaUtc, 0, 0, 0);
    if (objetivo.getTime() <= ahora.getTime()) {
        objetivo.setUTCDate(objetivo.getUTCDate() + 1);
    }
    return objetivo.getTime() - ahora.getTime();
}

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

export function inicializarCronPuntosExpiracion(): void {
    console.log(`[Puntos Cron] expiración + aviso previo diarios a las ${HORA_DIARIA_UTC}:00 UTC`);

    // Cada día: primero vence lo que toca hoy, luego avisa lo que vence pronto.
    const correrDiario = async () => {
        await ejecutarExpiracionPuntos();
        await ejecutarAvisoPuntosPorVencer();
    };

    const msHasta = msHastaProximaHoraDiaria(HORA_DIARIA_UTC);
    setTimeout(() => {
        correrDiario();
        setInterval(correrDiario, 24 * 60 * 60 * 1000);
    }, msHasta);
}
