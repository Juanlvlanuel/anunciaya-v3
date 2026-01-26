/**
 * ============================================================================
 * UTILIDAD: Detección de Zona Horaria para México
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/utils/zonaHoraria.ts
 * 
 * PROPÓSITO:
 * Detectar automáticamente la zona horaria basándose en coordenadas GPS.
 * 
 * ZONAS HORARIAS DE MÉXICO (5 oficiales):
 * 
 * 1. America/Cancun (Quintana Roo)
 *    - UTC-5 permanente (sin DST desde 2015)
 *    - Estados: Quintana Roo completo
 * 
 * 2. America/Tijuana (Zona Noroeste)
 *    - UTC-8 invierno / UTC-7 verano (con DST)
 *    - Estados: Baja California
 * 
 * 3. America/Hermosillo (Sonora)
 *    - UTC-7 permanente (sin DST)
 *    - Estados: Sonora completo
 * 
 * 4. America/Mazatlan (Zona Pacífico)
 *    - UTC-7 invierno / UTC-6 verano (con DST)
 *    - Estados: Baja California Sur, Chihuahua (oeste), Nayarit, Sinaloa
 * 
 * 5. America/Mexico_City (Zona Centro/Sur)
 *    - UTC-6 invierno / UTC-5 verano (con DST)
 *    - Estados: CDMX y mayoría del país
 * 
 * NOTAS:
 * - La detección usa rangos aproximados de coordenadas
 * - Para mayor precisión, considerar usar geo-tz en el backend
 * - Sonora es el único estado sin DST en el continente
 */

/**
 * Detecta la zona horaria de México basándose en coordenadas GPS
 * 
 * @param lat - Latitud (entre -90 y 90)
 * @param lng - Longitud (entre -180 y 180)
 * @returns Zona horaria en formato IANA (ej: "America/Hermosillo")
 * 
 * @example
 * // Puerto Peñasco, Sonora
 * detectarZonaHoraria(31.3122, -113.5465)
 * // Retorna: "America/Hermosillo"
 * 
 * @example
 * // Ciudad de México
 * detectarZonaHoraria(19.4326, -99.1332)
 * // Retorna: "America/Mexico_City"
 */
export function detectarZonaHoraria(lat: number, lng: number): string {
  // 1. Quintana Roo (America/Cancun) - UTC-5 sin DST
  // Extremo sureste de México, península de Yucatán
  if (lat > 18 && lat < 22 && lng > -89) {
    return 'America/Cancun';
  }

  // 2. Baja California (America/Tijuana) - UTC-8/-7 con DST
  // Frontera noroeste con Estados Unidos
  if (lng < -115 && lat > 28) {
    return 'America/Tijuana';
  }

  // 3. Sonora (America/Hermosillo) - UTC-7 sin DST
  // Estado completo, frontera con Arizona
  // Coordenadas aproximadas: 26°N a 33°N, -115°W a -108°W
  if (lat > 26 && lat < 33 && lng > -115 && lng < -108) {
    return 'America/Hermosillo';
  }

  // 4. Zona Pacífico (America/Mazatlan) - UTC-7/-6 con DST
  // Incluye: Baja California Sur, Sinaloa, Nayarit, Chihuahua (oeste)
  // Costa del Pacífico norte
  if (lng < -105 && lat > 21 && lat < 30) {
    return 'America/Mazatlan';
  }

  // 5. Default: Centro/Sur (America/Mexico_City) - UTC-6/-5 con DST
  // Ciudad de México y la mayoría de los estados
  return 'America/Mexico_City';
}