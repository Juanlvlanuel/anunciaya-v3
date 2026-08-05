/**
 * dinamicas-expiracion.cron.ts
 * =============================
 * Cron job que libera boletos de Dinámicas reservados y nunca pagados.
 *
 * Frecuencia: cada 30 minutos (mismo criterio que `scanya.cron.ts` — TTL
 * corto de 24h, no los 30 días de MarketPlace).
 * Inicio: 30s después del arranque del proceso.
 *
 * Lógica en `services/dinamicas.service.ts` → `liberarBoletosExpirados()`.
 *
 * UBICACIÓN: apps/api/src/cron/dinamicas-expiracion.cron.ts
 */

import { liberarBoletosExpirados } from '../services/dinamicas.service.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const MS_30_MIN = 30 * 60 * 1000;
const MS_INICIO = 30 * 1000;

export async function ejecutarCron(): Promise<void> {
    const inicio = Date.now();
    try {
        const liberados = await liberarBoletosExpirados();
        const duracion = Date.now() - inicio;
        registrarEjecucionCron('dinamicas-expiracion', {
            ok: true,
            duracionMs: duracion,
            resultado: `${liberados} boletos liberados`,
        });
        if (liberados > 0) {
            console.log(`[Dinámicas Cron] ${liberados} boletos reservados liberados por expiración (${duracion}ms)`);
        }
    } catch (error) {
        registrarEjecucionCron('dinamicas-expiracion', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: error instanceof Error ? error.message : String(error),
        });
        console.error('[Dinámicas Cron] Error liberando boletos expirados:', error);
    }
}

export function inicializarCronDinamicasExpiracion(): void {
    console.log('[Dinámicas Cron] Liberación de boletos reservados cada 30 min (primera ejecución en 30s)');
    setTimeout(() => {
        ejecutarCron();
        setInterval(ejecutarCron, MS_30_MIN);
    }, MS_INICIO);
}
