/**
 * configuracionPublicaService.ts
 * ==============================
 * Lee los valores PÚBLICOS del negocio que la landing y el registro muestran al visitante (sin auth).
 * Hoy: la duración del trial (días gratis de la cuenta comercial) y el precio mensual de la membresía
 * comercial, que el SuperAdmin ajusta en el Panel.
 *
 * Ubicación: apps/web/src/services/configuracionPublicaService.ts
 */

import { get } from './api';

export interface ConfigPublica {
  trialDias: number;
  /** Precio mensual de la membresía comercial (MXN). */
  precioMembresia: number;
  /** Precio anual de la membresía comercial (MXN) — 10 meses, 2 gratis. */
  precioMembresiaAnual: number;
  /** ¿El plan anual ya está disponible? (true solo si el Price anual existe en Stripe). */
  anualDisponible: boolean;
  /** Número de WhatsApp de contacto (con lada) al que abre el botón flotante del inicio. */
  whatsappNumero: string;
}

/** Default seguro mientras carga / si la API falla (coincide con el default del backend). */
export const CONFIG_PUBLICA_DEFAULT: ConfigPublica = { trialDias: 14, precioMembresia: 849, precioMembresiaAnual: 8490, anualDisponible: false, whatsappNumero: '+52 638 125 9076' };

export async function obtenerConfigPublica(): Promise<ConfigPublica> {
  const res = await get<ConfigPublica>('/configuracion-publica');
  return res.data ?? CONFIG_PUBLICA_DEFAULT;
}
