/**
 * sesionPanelService.ts
 * ======================
 * Identidad del Panel: GET /api/admin/yo. Devuelve el rol de equipo + región +
 * datos básicos del usuario en sesión. Es el guard de acceso del lado servidor:
 * si la cuenta no tiene rol de equipo, el backend responde 403.
 *
 * Ubicación: apps/admin/src/services/sesionPanelService.ts
 */

import api, { RespuestaAPI } from './api';
import type { RolEquipo } from '../stores/useAuthPanelStore';

export interface SesionPanel {
  usuarioId: string | null;
  nombre: string | null;
  apellidos: string | null;
  correo: string | null;
  avatarUrl: string | null;
  rolEquipo: RolEquipo | null;
  regionId: string | null;
  /** true = SuperAdmin con 2FA del Panel prendido cuyo token aún no pasó el TOTP. */
  panel2faPendiente?: boolean;
}

/** Pide la identidad del Panel al backend. */
export async function obtenerYoPanel(): Promise<RespuestaAPI<SesionPanel>> {
  const { data } = await api.get<RespuestaAPI<SesionPanel>>('/admin/yo');
  return data;
}
