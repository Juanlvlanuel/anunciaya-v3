/**
 * scanya.cron.ts
 * ===============
 * Cron job que cierra turnos de ScanYA dejados abiertos.
 *
 * Frecuencia: cada 30 minutos.
 * Inicio: 30s después del arranque del proceso (para no interferir con
 *         el arranque ni con migraciones manuales).
 *
 * Lógica del cierre vive en `services/scanya-cierre-auto.service.ts`.
 *
 * UBICACIÓN: apps/api/src/cron/scanya.cron.ts
 */

import { ejecutarCierreAutoTurnos } from '../services/scanya-cierre-auto.service.js';

const MS_30_MIN = 30 * 60 * 1000;
const MS_INICIO = 30 * 1000;

async function ejecutarCron(): Promise<void> {
	const inicio = Date.now();
	try {
		const r = await ejecutarCierreAutoTurnos();
		const duracion = Date.now() - inicio;
		if (r.cerrados > 0 || r.errores > 0) {
			console.log(
				`[ScanYA Cron] Cierre auto: ${r.cerrados} cerrados, ${r.errores} errores ` +
				`de ${r.revisados} revisados (${duracion}ms)`
			);
		}
	} catch (error) {
		console.error('[ScanYA Cron] Error en cierre auto de turnos:', error);
	}
}

export function inicializarCronScanYA(): void {
	console.log(`[ScanYA Cron] Cierre auto de turnos cada 30 min (primera ejecución en 30s)`);
	setTimeout(() => {
		ejecutarCron();
		setInterval(ejecutarCron, MS_30_MIN);
	}, MS_INICIO);
}
