/**
 * recibosService.ts
 * =================
 * Llamadas a la API del Panel para el módulo "Recibos": lista de recibos de membresía (con alcance
 * por rol en el backend), descarga del PDF y reenvío del comprobante por correo. Reusa el axios `api`.
 *
 * Endpoints:
 *   GET  /admin/recibos              → lista paginada (busca por folio o negocio)
 *   GET  /admin/recibos/:id/pdf      → genera/regenera el PDF y devuelve su URL en R2
 *   POST /admin/recibos/:id/reenviar → envía el comprobante a 1+ correos
 *
 * Ubicación: apps/admin/src/services/recibosService.ts
 */

import { api, type RespuestaAPI } from './api';

export type OrdenRecibo = 'folio_desc' | 'folio_asc' | 'fecha_recientes' | 'fecha_antiguos';
export type OrigenRecibo = 'membresia' | 'publicidad';

/** Una fila de la lista de recibos. */
export interface ReciboFila {
  id: string;
  origen: OrigenRecibo;
  folio: number | null;
  negocioId: string | null;
  negocioNombre: string | null;
  logoUrl: string | null;
  ciudad: string | null;
  concepto: string; // efectivo / transferencia / cortesia / tarjeta
  monto: string | null;
  fechaPago: string | null;
  periodoHasta: string | null;
  correoDueno: string | null;
  registradoPorNombre: string | null;
  anulado: boolean;
}

export interface ConteosRecibos {
  total: number;
  membresia: number;
  publicidad: number;
}

export interface ListaRecibos {
  items: ReciboFila[];
  total: number;
  conteos: ConteosRecibos;
  pagina: number;
  porPagina: number;
}

export interface ParametrosRecibos {
  busqueda?: string;
  negocioId?: string;
  desde?: string;
  hasta?: string;
  origen?: OrigenRecibo;        // solo membresía o solo publicidad (undefined = ambos)
  orden?: OrdenRecibo;
  pagina: number;
  porPagina: number;
}

export async function listarRecibos(params: ParametrosRecibos): Promise<ListaRecibos> {
  const { data } = await api.get<RespuestaAPI<ListaRecibos>>('/admin/recibos', { params });
  return data.data ?? { items: [], total: 0, conteos: { total: 0, membresia: 0, publicidad: 0 }, pagina: params.pagina, porPagina: params.porPagina };
}

/** Total de recibos del alcance (badge del menú). */
export async function contarRecibos(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/recibos/conteo');
  return data.data?.total ?? 0;
}

/** Genera/regenera el PDF del recibo y devuelve su URL en R2. */
export async function descargarRecibo(id: string, origen: OrigenRecibo): Promise<string> {
  const { data } = await api.get<RespuestaAPI<{ reciboUrl: string }>>(`/admin/recibos/${id}/pdf`, { params: { origen } });
  if (!data.data?.reciboUrl) throw new Error(data.message || 'No se pudo generar el recibo');
  return data.data.reciboUrl;
}

/** Reenvía el comprobante a la lista de correos. Devuelve cuántos se enviaron. */
export async function reenviarRecibo(id: string, correos: string[], origen: OrigenRecibo): Promise<number> {
  const { data } = await api.post<RespuestaAPI<{ enviados: number }>>(`/admin/recibos/${id}/reenviar`, { correos }, { params: { origen } });
  return data.data?.enviados ?? 0;
}
