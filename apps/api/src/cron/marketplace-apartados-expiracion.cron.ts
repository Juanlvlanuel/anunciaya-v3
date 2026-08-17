/**
 * marketplace-apartados-expiracion.cron.ts
 * ==========================================
 * Cron job que libera artículos de MarketPlace "apartados" (Mi Catálogo)
 * cuyo vendedor nunca respondió (ni Rechazar ni Vendido) dentro del tiempo
 * configurado.
 *
 * Frecuencia: cada 30 minutos (mismo criterio que
 * `dinamicas-expiracion.cron.ts` — TTL corto configurable por vendedor,
 * no los 30 días de expiración normal de un artículo).
 * Inicio: 30s después del arranque del proceso.
 *
 * Lógica en `services/marketplace.service.ts` → `liberarApartadosExpirados()`.
 *
 * UBICACIÓN: apps/api/src/cron/marketplace-apartados-expiracion.cron.ts
 */

import { liberarApartadosExpirados } from '../services/marketplace.service.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const MS_30_MIN = 30 * 60 * 1000;
const MS_INICIO = 30 * 1000;

export async function ejecutarCron(): Promise<void> {
    const inicio = Date.now();
    try {
        const liberados = await liberarApartadosExpirados();
        const duracion = Date.now() - inicio;
        registrarEjecucionCron('marketplace-apartados-expiracion', {
            ok: true,
            duracionMs: duracion,
            resultado: `${liberados} apartados liberados`,
        });
        if (liberados > 0) {
            console.log(`[MarketPlace Cron] ${liberados} apartados liberados por expiración (${duracion}ms)`);
        }
    } catch (error) {
        registrarEjecucionCron('marketplace-apartados-expiracion', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: error instanceof Error ? error.message : String(error),
        });
        console.error('[MarketPlace Cron] Error liberando apartados expirados:', error);
    }
}

export function inicializarCronMarketplaceApartadosExpiracion(): void {
    console.log('[MarketPlace Cron] Liberación de apartados vencidos cada 30 min (primera ejecución en 30s)');
    setTimeout(() => {
        ejecutarCron();
        setInterval(ejecutarCron, MS_30_MIN);
    }, MS_INICIO);
}
