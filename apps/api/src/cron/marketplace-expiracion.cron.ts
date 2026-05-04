/**
 * marketplace-expiracion.cron.ts
 * ===============================
 * Cron jobs del MarketPlace (Sprint 7).
 *
 * Schedules:
 *  1. Auto-pausar expirados — cada 6h (primera ejecución 60s después del
 *     arranque para no interferir con migraciones manuales).
 *  2. Notificar próxima expiración — 1 vez al día a las 09:00 UTC
 *     (mañana en México).
 *
 * Frecuencia 6h (no 1h) porque el TTL es de 30 días — 6h da actualidad
 * suficiente sin presión innecesaria a la BD.
 *
 * Ambos jobs son idempotentes a nivel de notificaciones (verifican que no
 * exista ya una del mismo tipo+articulo antes de insertar). Ver
 * `services/marketplace/expiracion.ts`.
 *
 * Ubicación: apps/api/src/cron/marketplace-expiracion.cron.ts
 */

import {
    autoPausarExpirados,
    notificarProximaExpiracion,
} from '../services/marketplace/expiracion.js';

const MS_6_H = 6 * 60 * 60 * 1000;
const MS_INICIO = 60 * 1000;
const HORA_DIARIA_UTC = 9; // 09:00 UTC = 03:00 CST México (madrugada del usuario)

// =============================================================================
// 1. AUTO-PAUSA cada 6 horas
// =============================================================================

async function ejecutarAutoPausa(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await autoPausarExpirados();
        const dur = Date.now() - inicio;
        if (r.pausados > 0 || r.errores > 0) {
            console.log(
                `[Marketplace Cron] auto-pausa: ${r.pausados} pausados, ` +
                    `${r.notificacionesCreadas} nuevas, ${r.notificacionesSkipped} skip, ` +
                    `${r.errores} errores (${dur}ms)`
            );
        }
    } catch (err) {
        console.error('[Marketplace Cron] Error en auto-pausa:', err);
    }
}

// =============================================================================
// 2. NOTIFICAR PRÓXIMA EXPIRACIÓN — 1 vez al día
// =============================================================================

async function ejecutarNotificacionProxima(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await notificarProximaExpiracion();
        const dur = Date.now() - inicio;
        if (r.candidatos > 0 || r.errores > 0) {
            console.log(
                `[Marketplace Cron] próxima exp: ${r.candidatos} candidatos, ` +
                    `${r.notificacionesCreadas} nuevas, ${r.notificacionesSkipped} skip, ` +
                    `${r.errores} errores (${dur}ms)`
            );
        }
    } catch (err) {
        console.error('[Marketplace Cron] Error en notif próxima exp:', err);
    }
}

/**
 * Calcula los milisegundos hasta la próxima ejecución diaria a las
 * `HORA_DIARIA_UTC`:00 UTC. Si ya pasó hoy, agenda para mañana.
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

function programarNotificacionDiaria(): void {
    const msHasta = msHastaProximaHoraDiaria(HORA_DIARIA_UTC);
    setTimeout(async () => {
        await ejecutarNotificacionProxima();
        // Re-programar para el día siguiente
        setInterval(ejecutarNotificacionProxima, 24 * 60 * 60 * 1000);
    }, msHasta);
}

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

export function inicializarCronMarketplaceExpiracion(): void {
    console.log(
        '[Marketplace Cron] auto-pausa cada 6h (primera ejecución en 60s) + ' +
            `notif próxima exp diaria a las ${HORA_DIARIA_UTC}:00 UTC`
    );

    // 1. Auto-pausa: 60s + cada 6h
    setTimeout(() => {
        ejecutarAutoPausa();
        setInterval(ejecutarAutoPausa, MS_6_H);
    }, MS_INICIO);

    // 2. Notif próxima exp: agenda diaria a las HORA_DIARIA_UTC:00
    programarNotificacionDiaria();
}
