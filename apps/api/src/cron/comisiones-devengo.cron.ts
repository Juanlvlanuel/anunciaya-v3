/**
 * comisiones-devengo.cron.ts
 * ==========================
 * Cron job de Vendedores y comisiones — devenga la comisión recurrente del mes en curso.
 *
 * Corre a diario y recalcula la fila recurrente del periodo actual por vendedor (idempotente: no duplica
 * ni pisa comisiones ya pagadas). Así la comisión del mes refleja los activos del día, y al cambiar de mes
 * genera la nueva. El SuperAdmin puede forzar un recálculo manual desde el Panel.
 *
 * Schedule: cada 24h (primera ejecución 60s después del arranque).
 *
 * Patrón calcado de `suscripciones-gracia.cron.ts`.
 *
 * Ubicación: apps/api/src/cron/comisiones-devengo.cron.ts
 */

import { devengarPeriodo, periodoActual } from '../services/admin/comisiones-devengo.service.js';

const MS_24_H = 24 * 60 * 60 * 1000;
const MS_INICIO = 60 * 1000;

async function ejecutarDevengo(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await devengarPeriodo(periodoActual());
        const dur = Date.now() - inicio;
        if (r.creadas > 0 || r.actualizadas > 0) {
            console.log(
                `[Comisiones Cron] devengo ${r.periodo}: ${r.creadas} creadas, ${r.actualizadas} actualizadas, ` +
                    `${r.omitidasPagadas} ya pagadas · total devengado $${r.totalDevengado} (${dur}ms)`,
            );
        }
    } catch (err) {
        console.error('[Comisiones Cron] Error en devengo:', err);
    }
}

export function inicializarCronComisionesDevengo(): void {
    console.log('[Comisiones Cron] devengo recurrente cada 24h (primera ejecución en 60s)');
    setTimeout(() => {
        ejecutarDevengo();
        setInterval(ejecutarDevengo, MS_24_H);
    }, MS_INICIO);
}
