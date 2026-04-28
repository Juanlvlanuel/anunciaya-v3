/**
 * zonaHoraria.ts
 * ================
 * Determina la zona horaria IANA de una sucursal a partir de su estado mexicano.
 *
 * México usa 5 zonas horarias:
 * - America/Tijuana   (UTC-8, con DST): Baja California
 * - America/Hermosillo (UTC-7, SIN DST): Sonora
 * - America/Mazatlan  (UTC-7, con DST): Baja California Sur, Sinaloa, Nayarit, Chihuahua
 * - America/Cancun    (UTC-5, SIN DST): Quintana Roo
 * - America/Mexico_City (UTC-6, con DST): resto del país
 *
 * Referencia: https://www.iana.org/time-zones
 *
 * Ubicación: apps/api/src/utils/zonaHoraria.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export type ZonaHorariaMx =
	| 'America/Mexico_City'
	| 'America/Hermosillo'
	| 'America/Tijuana'
	| 'America/Cancun'
	| 'America/Mazatlan';

/**
 * Normaliza el nombre del estado: minúsculas, sin tildes, sin espacios extras.
 */
function normalizarEstado(estado: string): string {
	return estado
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, ''); // elimina diacríticos
}

/**
 * Mapa de estados mexicanos → zona horaria IANA.
 * Las claves están normalizadas (lowercase sin tildes).
 */
const ESTADO_A_ZONA: Record<string, ZonaHorariaMx> = {
	// Zona Pacífico (UTC-8 con DST)
	'baja california': 'America/Tijuana',

	// Zona Sonora (UTC-7 sin DST)
	'sonora': 'America/Hermosillo',

	// Zona Montaña (UTC-7 con DST)
	'baja california sur': 'America/Mazatlan',
	'sinaloa': 'America/Mazatlan',
	'nayarit': 'America/Mazatlan',
	'chihuahua': 'America/Mazatlan',

	// Zona Sureste (UTC-5 sin DST)
	'quintana roo': 'America/Cancun',

	// Zona Central (UTC-6 con DST) — resto del país
	'aguascalientes': 'America/Mexico_City',
	'campeche': 'America/Mexico_City',
	'chiapas': 'America/Mexico_City',
	'ciudad de mexico': 'America/Mexico_City',
	'cdmx': 'America/Mexico_City',
	'coahuila': 'America/Mexico_City',
	'colima': 'America/Mexico_City',
	'durango': 'America/Mexico_City',
	'estado de mexico': 'America/Mexico_City',
	'guanajuato': 'America/Mexico_City',
	'guerrero': 'America/Mexico_City',
	'hidalgo': 'America/Mexico_City',
	'jalisco': 'America/Mexico_City',
	'mexico': 'America/Mexico_City',
	'michoacan': 'America/Mexico_City',
	'morelos': 'America/Mexico_City',
	'nuevo leon': 'America/Mexico_City',
	'oaxaca': 'America/Mexico_City',
	'puebla': 'America/Mexico_City',
	'queretaro': 'America/Mexico_City',
	'san luis potosi': 'America/Mexico_City',
	'tabasco': 'America/Mexico_City',
	'tamaulipas': 'America/Mexico_City',
	'tlaxcala': 'America/Mexico_City',
	'veracruz': 'America/Mexico_City',
	'yucatan': 'America/Mexico_City',
	'zacatecas': 'America/Mexico_City',
};

/**
 * Devuelve la zona horaria IANA correspondiente al estado dado.
 *
 * Si el estado no se reconoce, devuelve 'America/Mexico_City' como fallback
 * seguro (zona central, cubre la mayoría del país).
 *
 * @param estado Nombre del estado mexicano (tolera mayúsculas/tildes).
 * @returns Zona horaria IANA válida para México.
 */
export function getZonaHorariaPorEstado(estado: string | null | undefined): ZonaHorariaMx {
	if (!estado) return 'America/Mexico_City';
	const clave = normalizarEstado(estado);
	return ESTADO_A_ZONA[clave] ?? 'America/Mexico_City';
}

/**
 * Obtiene la zona horaria de una sucursal desde la BD.
 *
 * - Si `sucursalId` está dado, devuelve la zona de esa sucursal.
 * - Si no, devuelve la zona de la Matriz del negocio.
 * - Si la consulta falla o no hay registro, devuelve 'America/Mexico_City'.
 *
 * Usado por queries SQL con `AT TIME ZONE` para que los buckets de hora/día
 * reflejen la hora local de la sucursal donde realmente se hizo la venta.
 */
export async function obtenerZonaHorariaSucursal(
	negocioId: string,
	sucursalId?: string | null
): Promise<string> {
	try {
		const sucursalIdParam = sucursalId ?? null;
		const resultado = await db.execute(sql`
			SELECT zona_horaria
			FROM negocio_sucursales
			WHERE negocio_id = ${negocioId}
			AND (
				(${sucursalIdParam}::uuid IS NOT NULL AND id = ${sucursalIdParam}::uuid)
				OR (${sucursalIdParam}::uuid IS NULL AND es_principal = true)
			)
			LIMIT 1
		`);

		const row = resultado.rows[0] as { zona_horaria: string } | undefined;
		return row?.zona_horaria ?? 'America/Mexico_City';
	} catch (error) {
		console.error('Error obteniendo zona horaria de sucursal:', error);
		return 'America/Mexico_City';
	}
}
