/**
 * configuracionPublicaService.ts
 * ==============================
 * Lee los valores PÚBLICOS del negocio que la landing y el registro muestran al visitante (sin auth).
 * Hoy: la duración del trial (días gratis de la cuenta comercial), que el SuperAdmin ajusta en el Panel.
 *
 * Ubicación: apps/web/src/services/configuracionPublicaService.ts
 */

import { get } from './api';

export interface ConfigPublica {
  trialDias: number;
}

/** Default seguro mientras carga / si la API falla (coincide con el default del backend). */
export const CONFIG_PUBLICA_DEFAULT: ConfigPublica = { trialDias: 14 };

export async function obtenerConfigPublica(): Promise<ConfigPublica> {
  const res = await get<ConfigPublica>('/configuracion-publica');
  return res.data ?? CONFIG_PUBLICA_DEFAULT;
}
