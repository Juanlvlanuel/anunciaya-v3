/**
 * alertas.cron.ts
 * ================
 * Cron jobs para detección automática de alertas.
 * - Diario (4:00 AM): alertas operativas + engagement
 * - Semanal (lunes 5:00 AM): alertas de rendimiento
 *
 * UBICACIÓN: apps/api/src/cron/alertas.cron.ts
 */

import {
	ejecutarDeteccionDiaria,
	ejecutarDeteccionSemanal,
	obtenerNegociosActivos,
} from '../services/alertas-motor.service.js';

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;

// =============================================================================
// DETECCIÓN DIARIA (operativas + engagement)
// =============================================================================

async function ejecutarCronDiario(): Promise<void> {
	const inicio = Date.now();
	console.log('[Alertas Cron] Iniciando detección diaria...');

	try {
		const negocios = await obtenerNegociosActivos();
		let procesados = 0;
		let errores = 0;

		for (const negocioId of negocios) {
			try {
				await ejecutarDeteccionDiaria(negocioId);
				procesados++;
			} catch {
				errores++;
			}
		}

		const duracion = Date.now() - inicio;
		console.log(`[Alertas Cron] Diario completado: ${procesados}/${negocios.length} negocios (${errores} errores, ${duracion}ms)`);
	} catch (error) {
		console.error('[Alertas Cron] Error en detección diaria:', error);
	}
}

// =============================================================================
// DETECCIÓN SEMANAL (rendimiento)
// =============================================================================

async function ejecutarCronSemanal(): Promise<void> {
	const inicio = Date.now();
	console.log('[Alertas Cron] Iniciando detección semanal...');

	try {
		const negocios = await obtenerNegociosActivos();
		let procesados = 0;
		let errores = 0;

		for (const negocioId of negocios) {
			try {
				await ejecutarDeteccionSemanal(negocioId);
				procesados++;
			} catch {
				errores++;
			}
		}

		const duracion = Date.now() - inicio;
		console.log(`[Alertas Cron] Semanal completado: ${procesados}/${negocios.length} negocios (${errores} errores, ${duracion}ms)`);
	} catch (error) {
		console.error('[Alertas Cron] Error en detección semanal:', error);
	}
}

// =============================================================================
// INICIALIZAR CRONS
// =============================================================================

export function inicializarCronAlertas(): void {
	// --- Cron Diario: 4:00 AM ---
	function msHasta4AM(): number {
		const ahora = new Date();
		const proxima = new Date(ahora);
		proxima.setHours(4, 0, 0, 0);
		if (ahora >= proxima) proxima.setDate(proxima.getDate() + 1);
		return proxima.getTime() - ahora.getTime();
	}

	const msEsperaDiario = msHasta4AM();
	const horasDiario = (msEsperaDiario / (1000 * 60 * 60)).toFixed(1);
	console.log(`[Alertas Cron] Detección diaria en ${horasDiario} horas (4:00 AM)`);

	setTimeout(() => {
		ejecutarCronDiario();
		setInterval(ejecutarCronDiario, MS_24H);
	}, msEsperaDiario);

	// --- Cron Semanal: Lunes 5:00 AM ---
	function msHastaLunes5AM(): number {
		const ahora = new Date();
		const proxLunes = new Date(ahora);
		// Calcular días hasta próximo lunes (1 = lunes)
		const diaActual = ahora.getDay(); // 0=dom, 1=lun, ...
		const diasHastaLunes = diaActual === 0 ? 1 : diaActual === 1 ? 0 : 8 - diaActual;
		proxLunes.setDate(proxLunes.getDate() + diasHastaLunes);
		proxLunes.setHours(5, 0, 0, 0);
		// Si es lunes pero ya pasaron las 5 AM, saltar al siguiente
		if (ahora >= proxLunes) proxLunes.setDate(proxLunes.getDate() + 7);
		return proxLunes.getTime() - ahora.getTime();
	}

	const msEsperaSemanal = msHastaLunes5AM();
	const diasSemanal = (msEsperaSemanal / (1000 * 60 * 60 * 24)).toFixed(1);
	console.log(`[Alertas Cron] Detección semanal en ${diasSemanal} días (lunes 5:00 AM)`);

	setTimeout(() => {
		ejecutarCronSemanal();
		setInterval(ejecutarCronSemanal, MS_7D);
	}, msEsperaSemanal);
}
