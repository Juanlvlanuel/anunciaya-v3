/**
 * validarCorreo.ts
 * =================
 * Utilidades puras para validación de correos electrónicos:
 * - Formato (regex RFC 5322 simplificada)
 * - Detección de typos de dominios comunes (Levenshtein)
 *
 * Sin dependencias externas.
 *
 * Ubicación: apps/web/src/utils/validarCorreo.ts
 */

// =============================================================================
// FORMATO
// =============================================================================

/**
 * Regex RFC 5322 simplificada. Acepta la mayoría de correos válidos.
 * Rechaza: espacios, caracteres de control, formatos obviamente mal formados.
 */
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Verifica si una cadena tiene formato de correo válido.
 */
export function esFormatoValido(correo: string): boolean {
	if (!correo || typeof correo !== 'string') return false;
	return REGEX_CORREO.test(correo.trim());
}

// =============================================================================
// DETECCIÓN DE TYPOS DE DOMINIO
// =============================================================================

/**
 * Dominios comunes en México. Ampliable según feedback.
 */
const DOMINIOS_COMUNES = [
	'gmail.com',
	'hotmail.com',
	'yahoo.com',
	'outlook.com',
	'icloud.com',
	'live.com',
	'live.com.mx',
	'hotmail.es',
	'hotmail.com.mx',
	'yahoo.com.mx',
	'aol.com',
	'msn.com',
	'protonmail.com',
] as const;

/**
 * Distancia Levenshtein entre dos strings.
 * Implementación iterativa con matriz (~15 líneas).
 */
function distanciaLevenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;

	const matriz: number[][] = Array.from({ length: a.length + 1 }, () => []);
	for (let i = 0; i <= a.length; i++) matriz[i][0] = i;
	for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const costo = a[i - 1] === b[j - 1] ? 0 : 1;
			matriz[i][j] = Math.min(
				matriz[i - 1][j] + 1,       // borrado
				matriz[i][j - 1] + 1,       // inserción
				matriz[i - 1][j - 1] + costo // sustitución
			);
		}
	}
	return matriz[a.length][b.length];
}

/**
 * Detecta typos en el dominio del correo comparando contra una lista de
 * dominios comunes. Si hay un dominio con distancia 1-2, retorna sugerencia.
 *
 * @param correo - Correo a analizar
 * @returns Objeto con el correo corregido, o null si no hay sugerencia
 */
export function detectarTypoDominio(correo: string): { sugerencia: string } | null {
	if (!correo || !correo.includes('@')) return null;

	const partes = correo.trim().toLowerCase().split('@');
	if (partes.length !== 2) return null;

	const [local, dominio] = partes;
	if (!local || !dominio) return null;

	// Si el dominio ya es uno común exacto, no hay typo
	if (DOMINIOS_COMUNES.includes(dominio as typeof DOMINIOS_COMUNES[number])) {
		return null;
	}

	// Buscar el dominio común más cercano (distancia 1-2)
	let mejorDominio: string | null = null;
	let mejorDistancia = Infinity;

	for (const candidato of DOMINIOS_COMUNES) {
		const distancia = distanciaLevenshtein(dominio, candidato);
		if (distancia > 0 && distancia <= 2 && distancia < mejorDistancia) {
			mejorDistancia = distancia;
			mejorDominio = candidato;
		}
	}

	if (!mejorDominio) return null;

	return { sugerencia: `${local}@${mejorDominio}` };
}
