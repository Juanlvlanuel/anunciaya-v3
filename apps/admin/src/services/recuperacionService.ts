/**
 * recuperacionService.ts
 * =======================
 * Recuperación de contraseña del Panel. Reusa los endpoints que YA existen en el
 * backend (los mismos de AnunciaYA): código de 6 dígitos por correo.
 *
 *   1) /auth/olvide-contrasena  → envía el código al correo
 *   2) /auth/restablecer-contrasena → valida código + fija la nueva contraseña
 *
 * Ubicación: apps/admin/src/services/recuperacionService.ts
 */

import api, { RespuestaAPI } from './api';

/** Solicita el código de recuperación al correo (respuesta genérica por seguridad). */
export async function solicitarCodigo(
  correo: string,
): Promise<RespuestaAPI<{ correoRegistrado?: boolean; esOAuth?: boolean }>> {
  const { data } = await api.post<RespuestaAPI<{ correoRegistrado?: boolean; esOAuth?: boolean }>>(
    '/auth/olvide-contrasena',
    { correo },
  );
  return data;
}

/** Establece la nueva contraseña usando el código recibido por correo. */
export async function restablecerConCodigo(
  correo: string,
  codigo: string,
  nuevaContrasena: string,
): Promise<RespuestaAPI> {
  const { data } = await api.post<RespuestaAPI>('/auth/restablecer-contrasena', {
    correo,
    codigo,
    nuevaContrasena,
  });
  return data;
}
