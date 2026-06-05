/**
 * seguridad2faService.ts
 * =======================
 * 2FA del Panel (solo SuperAdmin). Pega a los endpoints /api/admin/2fa/*.
 *
 *  - estado2fa     → ¿está prendido?
 *  - generar2fa    → QR + secreto (setup)
 *  - activar2fa    → confirma el primer código y prende (devuelve tokens marcados)
 *  - desactivar2fa → apaga
 *  - verificar2fa  → en la puerta: valida TOTP y devuelve tokens marcados
 *
 * Ubicación: apps/admin/src/services/seguridad2faService.ts
 */

import api, { RespuestaAPI } from './api';

export interface TokensMarcados {
  accessToken: string;
  refreshToken: string;
}

export async function estado2fa(): Promise<RespuestaAPI<{ habilitado: boolean }>> {
  const { data } = await api.get<RespuestaAPI<{ habilitado: boolean }>>('/admin/2fa/estado');
  return data;
}

export async function generar2fa(): Promise<RespuestaAPI<{ qrCode: string; secreto: string }>> {
  const { data } = await api.post<RespuestaAPI<{ qrCode: string; secreto: string }>>('/admin/2fa/generar');
  return data;
}

export async function activar2fa(codigo: string): Promise<RespuestaAPI<TokensMarcados>> {
  const { data } = await api.post<RespuestaAPI<TokensMarcados>>('/admin/2fa/activar', { codigo });
  return data;
}

export async function desactivar2fa(): Promise<RespuestaAPI> {
  const { data } = await api.post<RespuestaAPI>('/admin/2fa/desactivar');
  return data;
}

export async function verificar2fa(codigo: string): Promise<RespuestaAPI<TokensMarcados>> {
  const { data } = await api.post<RespuestaAPI<TokensMarcados>>('/admin/2fa/verificar', { codigo });
  return data;
}
