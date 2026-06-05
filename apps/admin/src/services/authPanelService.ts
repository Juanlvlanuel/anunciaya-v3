/**
 * authPanelService.ts
 * ====================
 * Llamadas de autenticación del Panel. Reusa el endpoint que YA existe en el
 * backend: POST /auth/login (mismo login de la app). El Panel no tiene login
 * propio — el rol de equipo decide el acceso (se valida en /api/admin/yo).
 *
 * Ubicación: apps/admin/src/services/authPanelService.ts
 */

import api, { RespuestaAPI } from './api';
import type { UsuarioPanel } from '../stores/useAuthPanelStore';

/** Respuesta de /auth/login (forma del backend). */
export interface RespuestaAcceso {
  usuario: UsuarioPanel;
  accessToken: string;
  refreshToken: string;
  requiere2FA?: boolean;
  requiereCambioContrasena?: boolean;
  tokenTemporal?: string;
}

/** Inicia sesión con correo + contraseña contra /auth/login. */
export async function acceder(
  correo: string,
  contrasena: string,
): Promise<RespuestaAPI<RespuestaAcceso>> {
  const { data } = await api.post<RespuestaAPI<RespuestaAcceso>>('/auth/login', {
    correo,
    contrasena,
  });
  return data;
}
