/**
 * suscripcionesService.ts
 * =======================
 * Llamadas a la API del Panel para la sección Suscripciones = la BITÁCORA FINANCIERA
 * global (libro mayor de la membresía). Solo lectura. Reusa el axios del Panel (`api`),
 * que ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/suscripciones      → bitácora paginada (filtros + KPIs)
 *   GET /admin/suscripciones/:id  → detalle de un evento
 *
 * Ubicación: apps/admin/src/services/suscripcionesService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS (camelCase — el backend ya transforma snake → camel)
// =============================================================================

export type TipoEvento = 'cobro_exitoso' | 'cobro_fallido' | 'cancelacion' | 'pago_manual';
export type OrigenEvento = 'stripe' | 'manual';
export type OrdenEvento = 'fecha_recientes' | 'fecha_antiguos' | 'monto_mayor' | 'monto_menor';

/** Conteos por tipo (chips) + KPIs de cabecera. Array {tipo,total} para que el middleware
 *  snake→camel del backend no rompa las keys (cobro_exitoso/pago_manual). */
export interface ConteosEventos {
  total: number;
  porTipo: Array<{ tipo: string; total: number }>;
  /** SUM(monto) de cobro_exitoso + pago_manual, en el alcance + filtros activos. */
  ingresos: number;
  /** COUNT de cobro_fallido. */
  fallidos: number;
}

export interface EventoFila {
  id: string;
  fecha: string | null;
  negocioId: string;
  negocioNombre: string | null;
  logoUrl: string | null;
  ciudad: string | null;
  tipo: string;
  origen: string;
  /** numeric → string; el front formatea en MXN. NULL en fallido/cancelación/cortesía. */
  monto: string | null;
  moneda: string;
  actorNombre: string | null;
  stripeEventId: string | null;
}

export interface ListaEventos {
  items: EventoFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEventos;
}

export interface EventoDetalle {
  id: string;
  fecha: string | null;
  negocioId: string;
  negocioNombre: string | null;
  tipo: string;
  origen: string;
  monto: string | null;
  moneda: string;
  actorId: string | null;
  actorNombre: string | null;
  actorCorreo: string | null;
  stripeEventId: string | null;
  referenciaId: string | null;
  metadata: Record<string, unknown> | null;
  /** created_at: cuándo se REGISTRÓ la fila (≠ fecha del evento). */
  creadoEn: string | null;
}

export interface ParametrosBitacora {
  busqueda?: string;
  tipo?: string;
  origen?: string;
  negocioId?: string;
  desde?: string;
  hasta?: string;
  orden?: OrdenEvento;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarEventos(params: ParametrosBitacora): Promise<ListaEventos> {
  const { data } = await api.get<RespuestaAPI<ListaEventos>>('/admin/suscripciones', { params });
  return (
    data.data ?? {
      items: [],
      total: 0,
      pagina: params.pagina,
      porPagina: params.porPagina,
      conteos: { total: 0, porTipo: [], ingresos: 0, fallidos: 0 },
    }
  );
}

export async function obtenerDetalleEvento(id: string): Promise<EventoDetalle | null> {
  const { data } = await api.get<RespuestaAPI<EventoDetalle>>(`/admin/suscripciones/${id}`);
  return data.data ?? null;
}

/** Borra un movimiento de pago manual anulado (evento + pago). Solo superadmin (backend). */
export async function eliminarEvento(id: string): Promise<void> {
  await api.delete<RespuestaAPI<null>>(`/admin/suscripciones/${id}`);
}

// =============================================================================
// COLA "POR VERIFICAR" (pago manual con comprobante) — lado admin
// =============================================================================

/** Una solicitud de pago manual pendiente de verificar (la sube el dueño en Mi Perfil). */
export interface SolicitudCola {
  id: string;
  negocioId: string;
  negocioNombre: string;
  correoDueno: string | null;
  estadoMembresia: string;
  /** numeric → string; el front formatea en MXN. Monto DECLARADO por el dueño. */
  monto: string;
  mesesDeclarados: number;
  referencia: string | null;
  nota: string | null;
  comprobanteUrl: string;
  creadoAt: string;
}

/** Datos bancarios de depósito (los ve el dueño en Mi Perfil; solo super los edita). */
export interface DatosCobro {
  banco: string;
  titular: string;
  clabe: string;
  cuenta: string;
  tarjeta: string;
  instrucciones: string;
}

/** Lista las solicitudes pendientes de verificar (alcance por rol/región lo aplica el backend). */
export async function listarSolicitudes(): Promise<SolicitudCola[]> {
  const { data } = await api.get<RespuestaAPI<SolicitudCola[]>>('/admin/suscripciones/solicitudes');
  return data.data ?? [];
}

/** Aprueba una solicitud. Si no se pasan monto/meses, el backend usa los DECLARADOS por el dueño. */
export async function aprobarSolicitud(
  solicitudId: string,
  datos?: { monto?: number; meses?: number },
): Promise<void> {
  await api.post<RespuestaAPI<null>>(`/admin/suscripciones/solicitudes/${solicitudId}/aprobar`, datos ?? {});
}

/** Rechaza una solicitud con un motivo obligatorio. */
export async function rechazarSolicitud(solicitudId: string, motivo: string): Promise<void> {
  await api.post<RespuestaAPI<null>>(`/admin/suscripciones/solicitudes/${solicitudId}/rechazar`, { motivo });
}

/** Lee los datos bancarios de depósito. */
export async function obtenerDatosCobro(): Promise<DatosCobro | null> {
  const { data } = await api.get<RespuestaAPI<DatosCobro>>('/admin/suscripciones/datos-cobro');
  return data.data ?? null;
}

/** Guarda los datos bancarios de depósito (solo superadmin; el backend lo blinda). */
export async function guardarDatosCobro(datos: DatosCobro): Promise<void> {
  await api.put<RespuestaAPI<null>>('/admin/suscripciones/datos-cobro', datos);
}
