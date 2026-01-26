/**
 * tokenUtils.ts
 * =============
 * Utilidades para manejo de tokens JWT
 * 
 * Ubicación: apps/web/src/utils/tokenUtils.ts
 */

/**
 * Verifica si un JWT está expirado
 * @param token - Token JWT a verificar
 * @returns true si el token está expirado o es inválido, false si aún es válido
 */
export function esTokenExpirado(token: string | null): boolean {
  if (!token) return true;

  try {
    // Decodificar el payload del JWT (segunda parte entre los puntos)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // El campo 'exp' viene en segundos desde epoch
    const exp = payload.exp * 1000; // Convertir a milisegundos
    const ahora = Date.now();
    
    // Retornar true si el tiempo actual es mayor o igual a la expiración
    return ahora >= exp;
  } catch (error) {
    // Si hay cualquier error al decodificar, considerar el token como expirado
    console.error('Error al verificar expiración del token:', error);
    return true;
  }
}

/**
 * Obtiene el tiempo restante hasta que expire el token (en segundos)
 * @param token - Token JWT
 * @returns Segundos hasta expiración, o 0 si ya expiró
 */
export function tiempoRestanteToken(token: string | null): number {
  if (!token) return 0;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    const ahora = Date.now();
    const restante = Math.max(0, Math.floor((exp - ahora) / 1000));
    
    return restante;
  } catch (error) {
    return 0;
  }
}