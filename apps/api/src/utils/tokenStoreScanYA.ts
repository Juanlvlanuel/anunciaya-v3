/**
 * tokenStoreScanYA.ts
 * ====================
 * Gestión de revocación de sesiones ScanYA en Redis.
 *
 * Enfoque: almacena un timestamp de revocación por empleadoId.
 * Cualquier token emitido ANTES de ese timestamp es inválido.
 * Esto evita mantener una blacklist individual por token.
 *
 * Ubicación: apps/api/src/utils/tokenStoreScanYA.ts
 */

import { redis } from '../db/redis.js';

const PREFIJO = 'scanya_revocado:';
const TTL_REVOCACION = 60 * 60 * 13; // 13 horas (> access token de 12h)

/**
 * Revocar todas las sesiones de un empleado.
 * Guarda timestamp actual — cualquier token emitido antes es inválido.
 */
export async function revocarSesionesEmpleado(empleadoId: string): Promise<void> {
	const ahora = Math.floor(Date.now() / 1000);
	await redis.set(`${PREFIJO}${empleadoId}`, String(ahora), 'EX', TTL_REVOCACION);
}

/**
 * Verificar si un token de empleado fue revocado.
 * Compara el `iat` (issued at) del token con el timestamp de revocación.
 * Si el token fue emitido ANTES de la revocación → está revocado.
 */
export async function estaTokenRevocado(empleadoId: string, iat: number): Promise<boolean> {
	const revocadoAt = await redis.get(`${PREFIJO}${empleadoId}`);
	if (!revocadoAt) return false;
	return iat < parseInt(revocadoAt, 10);
}

/**
 * Limpiar la revocación de un empleado (ej: si se reactiva).
 */
export async function limpiarRevocacion(empleadoId: string): Promise<void> {
	await redis.del(`${PREFIJO}${empleadoId}`);
}
