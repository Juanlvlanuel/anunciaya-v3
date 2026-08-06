/**
 * tokenUtils.ts
 * =============
 * Utilidades para manejo de tokens JWT
 * 
 * Ubicación: apps/web/src/utils/tokenUtils.ts
 */

/**
 * Decodifica el payload de un JWT.
 *
 * Los JWT usan base64**url** (alfabeto con `-` y `_`, sin padding), que `atob`
 * rechaza con `InvalidCharacterError`. Como este módulo trata cualquier error de
 * decodificación como "token expirado", pasar el payload crudo a `atob` expulsaba
 * al usuario con el modal "Sesión expirada" justo después de un login correcto.
 *
 * Caso real: el token de ScanYA lleva `nombreNegocio` en el payload, y el negocio
 * "I KE Rollo? Sushi&Wings" no podía entrar NUNCA. El `?` es 0x3F = 63, el valor
 * que base64url codifica como `_`. Afecta a cualquier contenido cuyos bytes caigan
 * alineados en 62/63 (`?`, `>`, `~`, acentos, emojis, etc. según su posición), así
 * que parecía intermitente aunque es determinista por cuenta.
 */
function decodificarPayload(token: string): { exp?: number } {
  const payloadUrl = token.split('.')[1];
  const padding = '='.repeat((4 - (payloadUrl.length % 4)) % 4);
  const base64 = (payloadUrl + padding).replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

/**
 * Verifica si un JWT está expirado
 * @param token - Token JWT a verificar
 * @returns true si el token está expirado o es inválido, false si aún es válido
 */
export function esTokenExpirado(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = decodificarPayload(token);

    // El campo 'exp' viene en segundos desde epoch
    const exp = (payload.exp ?? 0) * 1000; // Convertir a milisegundos
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
    const payload = decodificarPayload(token);
    const exp = (payload.exp ?? 0) * 1000;
    const ahora = Date.now();
    const restante = Math.max(0, Math.floor((exp - ahora) / 1000));

    return restante;
  } catch {
    return 0;
  }
}