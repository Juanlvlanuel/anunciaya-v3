/**
 * comisiones-devengo.cron.ts — RETIRADO (Pieza 3 del Sprint de Stripe)
 * ====================================================================
 * El devengo de la comisión recurrente dejó de ser una "foto mensual" (este cron) y pasó a ser AL
 * COBRO: cada cobro real devenga por los meses pagados, con el escalón congelado al momento del cobro
 * (ver `services/admin/comisiones-devengo.service.ts` · `devengarComisionRecurrenteAlCobro`). Este cron
 * ya NO se inicializa desde `index.ts`. Se deja el stub para no romper imports residuales; eliminar en
 * una limpieza posterior.
 *
 * Ubicación: apps/api/src/cron/comisiones-devengo.cron.ts
 */

export function inicializarCronComisionesDevengo(): void {
    // No-op: el devengo recurrente ahora ocurre al cobro, no por cron de foto mensual.
}
