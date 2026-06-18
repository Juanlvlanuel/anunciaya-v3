/**
 * configuracionPublicaService.ts
 * ==============================
 * Lee los valores PÚBLICOS del negocio (precio de membresía, trial) desde el endpoint sin auth
 * `/configuracion-publica` — el MISMO que consume apps/web. El Panel lo usa para que los montos
 * sugeridos en los diálogos de pago manual reflejen el precio configurado, sin hardcodearlo.
 *
 * Ubicación: apps/admin/src/services/configuracionPublicaService.ts
 */

import { api, type RespuestaAPI } from './api';

export interface ConfigPublica {
  trialDias: number;
  /** Precio mensual de la membresía comercial (MXN). */
  precioMembresia: number;
  /** Precio anual de la membresía comercial (MXN) — 10 meses, 2 gratis. */
  precioMembresiaAnual: number;
  /** ¿El plan anual ya está disponible? (true solo si el Price anual existe en Stripe). */
  anualDisponible: boolean;
}

/** Default seguro mientras carga / si la API falla (coincide con el default del backend). */
export const CONFIG_PUBLICA_DEFAULT: ConfigPublica = { trialDias: 14, precioMembresia: 849, precioMembresiaAnual: 8490, anualDisponible: false };

export async function obtenerConfigPublica(): Promise<ConfigPublica> {
  const { data } = await api.get<RespuestaAPI<ConfigPublica>>('/configuracion-publica');
  return data.data ?? CONFIG_PUBLICA_DEFAULT;
}
