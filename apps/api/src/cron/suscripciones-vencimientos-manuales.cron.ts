/**
 * suscripciones-vencimientos-manuales.cron.ts
 * ===========================================
 * Cron job — expira los negocios de pago MANUAL vencidos (`al_corriente` → `en_gracia`).
 *
 * Los negocios manuales (efectivo/transferencia/cortesía) no tienen webhook de Stripe que los
 * pase a gracia al vencer su `fecha_vencimiento`; este cron lo hace. La suspensión posterior
 * (`en_gracia` → `suspendido`) la hereda el cron de gracia existente (`suscripciones-gracia.cron`).
 *
 * Schedule: cada 24h (primera ejecución 90s después del arranque, tras el de gracia).
 * Patrón calcado de `suscripciones-gracia.cron.ts`.
 *
 * Ubicación: apps/api/src/cron/suscripciones-vencimientos-manuales.cron.ts
 */

import { expirarManualesVencidos } from '../services/suscripciones/vencimientos-manuales.js';
import { registrarEjecucionCron } from '../utils/cronRegistry.js';

const MS_24_H = 24 * 60 * 60 * 1000;
const MS_INICIO = 90 * 1000;

export async function ejecutarExpiracionManuales(): Promise<void> {
    const inicio = Date.now();
    try {
        const r = await expirarManualesVencidos();
        const dur = Date.now() - inicio;
        registrarEjecucionCron('vencimientos-manuales', {
            ok: true,
            duracionMs: dur,
            resultado: `${r.enGracia} en gracia, ${r.errores} errores`,
        });
        if (r.enGracia > 0 || r.errores > 0) {
            console.log(
                `[Suscripciones Cron] expiración de manuales: ` +
                    `${r.enGracia} en gracia, ${r.errores} errores (${dur}ms)`,
            );
        }
    } catch (err) {
        registrarEjecucionCron('vencimientos-manuales', {
            ok: false,
            duracionMs: Date.now() - inicio,
            resultado: err instanceof Error ? err.message : String(err),
        });
        console.error('[Suscripciones Cron] Error en expiración de manuales:', err);
    }
}

export function inicializarCronVencimientosManuales(): void {
    console.log(
        '[Suscripciones Cron] expiración de manuales vencidos cada 24h (primera ejecución en 90s)',
    );
    setTimeout(() => {
        ejecutarExpiracionManuales();
        setInterval(ejecutarExpiracionManuales, MS_24_H);
    }, MS_INICIO);
}
