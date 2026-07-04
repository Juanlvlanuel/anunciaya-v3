import { get, post } from './api';
import type { AppAyuda, AudienciaAyuda, CentroAyuda } from '../types/ayuda';

/**
 * Obtiene el Centro de Ayuda (categorías + artículos publicados) de una
 * app + audiencia.
 */
export async function obtenerCentroAyuda(app: AppAyuda, audiencia: AudienciaAyuda) {
  const params = new URLSearchParams({ app, audiencia }).toString();
  return get<CentroAyuda>(`/ayuda?${params}`);
}

/** Registra una vista del tutorial (contador agregado). */
export async function registrarVistaTutorial(articuloId: string) {
  return post<null>(`/ayuda/${articuloId}/vista`);
}

/** Registra el voto "¿Te sirvió?" (👍 = true / 👎 = false). */
export async function enviarFeedbackTutorial(articuloId: string, util: boolean) {
  return post<null>(`/ayuda/${articuloId}/feedback`, { util });
}
