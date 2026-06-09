/**
 * negociosService.ts
 * ===================
 * Llamadas a la API del Panel para la sección Negocios (Entrega 1 — solo lectura).
 * Reusa el axios del Panel (`api`), que ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/negocios            → tabla paginada
 *   GET /admin/negocios/vendedores → vendedores para el filtro
 *   GET /admin/negocios/:id        → ficha administrativa
 *
 * Ubicación: apps/admin/src/services/negociosService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS (camelCase — el backend ya transforma snake → camel)
// =============================================================================

export type EstadoPago = 'al_corriente' | 'en_gracia' | 'suspendido' | 'cancelado';

export type OrdenNegocios =
  | 'nombre_az'
  | 'nombre_za'
  | 'alta_recientes'
  | 'alta_antiguos'
  | 'proximo_cobro'
  | 'estado';

/** Valor del filtro de ciudad para "sin ciudad". */
export const CIUDAD_SIN = '__none';

/** Conteos por estado de pago. Array {estado,total} para que el middleware
 *  snake→camel del backend no rompa las keys (al_corriente/en_gracia). */
export interface ConteosEstado {
  total: number;
  porEstado: Array<{ estado: string; total: number }>;
}

/** Estado administrativo (Panel): visibilidad efectiva la da `activo`. */
export type EstadoAdmin = 'activo' | 'suspendido' | 'archivado';

export interface NegocioFila {
  id: string;
  nombre: string;
  ciudad: string | null;
  vendedorId: string | null;
  vendedorNombre: string | null;
  estadoPago: string;
  estadoAdmin: string;
  proximoCobro: string | null;
  alta: string | null;
  /** Total de sucursales (incluida la matriz). > 1 ⇒ tiene secundarias. */
  totalSucursales: number;
}

export interface ListaNegocios {
  items: NegocioFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

export interface NegocioDetalle {
  id: string;
  nombre: string;
  descripcion: string | null;
  logoUrl: string | null;
  sitioWeb: string | null;
  activo: boolean | null;
  esBorrador: boolean | null;
  verificado: boolean | null;
  onboardingCompletado: boolean;
  creadoEn: string | null;
  fechaPrimerPago: string | null;
  mesesGratisRestantes: number;
  estadoPago: string;
  estadoAdmin: string;
  /** tarjeta | manual — cómo se cobra hoy la membresía. */
  metodoCobro: string;
  /** El dueño tiene una suscripción de Stripe (para decidir Pausar/Cancelar/Marcar pagado). */
  tieneSuscripcionStripe: boolean;
  fechaVencimiento: string | null;
  fechaProximoCobro: string | null;
  fechaInicioGracia: string | null;
  fechaLimiteGracia: string | null;
  duenoNombre: string | null;
  duenoCorreo: string | null;
  duenoTelefono: string | null;
  vendedorId: string | null;
  vendedorNombre: string | null;
  vendedorCodigo: string | null;
  regionId: string | null;
  regionNombre: string | null;
  ciudad: string | null;
  estado: string | null;
  direccion: string | null;
  telefono: string | null;
}

export interface VendedorFiltro {
  id: string;
  nombre: string;
  codigoReferido: string;
}

/** Una sucursal en la fila expandida de la tabla. */
export interface SucursalFila {
  id: string;
  nombre: string;
  esPrincipal: boolean;
  ciudad: string | null;
  regionNombre: string | null;
  activa: boolean;
}

/** Detalle de una sucursal para el modal (sin membresía ni acciones). */
export interface SucursalDetalle {
  id: string;
  negocioId: string;
  nombre: string;
  esPrincipal: boolean;
  activa: boolean;
  ciudad: string | null;
  estado: string | null;
  regionId: string | null;
  regionNombre: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  creadoEn: string | null;
  gerenteNombre: string | null;
  gerenteCorreo: string | null;
  gerenteTelefono: string | null;
  vendedorId: string | null;
  vendedorNombre: string | null;
  vendedorCodigo: string | null;
}

export interface ParametrosLista {
  busqueda?: string;
  estadoPago?: string;
  vendedorId?: string;
  ciudad?: string;
  orden?: OrdenNegocios;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarNegocios(params: ParametrosLista): Promise<ListaNegocios> {
  const { data } = await api.get<RespuestaAPI<ListaNegocios>>('/admin/negocios', { params });
  return (
    data.data ?? {
      items: [],
      total: 0,
      pagina: params.pagina,
      porPagina: params.porPagina,
      conteos: { total: 0, porEstado: [] },
    }
  );
}

export async function obtenerDetalleNegocio(id: string): Promise<NegocioDetalle | null> {
  const { data } = await api.get<RespuestaAPI<NegocioDetalle>>(`/admin/negocios/${id}`);
  return data.data ?? null;
}

export async function listarVendedoresFiltro(): Promise<VendedorFiltro[]> {
  const { data } = await api.get<RespuestaAPI<VendedorFiltro[]>>('/admin/negocios/vendedores');
  return data.data ?? [];
}

export async function listarCiudades(): Promise<string[]> {
  const { data } = await api.get<RespuestaAPI<string[]>>('/admin/negocios/ciudades');
  return data.data ?? [];
}

/** Sucursales de un negocio (matriz primero) — para expandir la fila. */
export async function listarSucursalesNegocio(id: string): Promise<SucursalFila[]> {
  const { data } = await api.get<RespuestaAPI<SucursalFila[]>>(`/admin/negocios/${id}/sucursales`);
  return data.data ?? [];
}

/** Detalle de una sucursal — para el modal. */
export async function obtenerDetalleSucursal(id: string, sucursalId: string): Promise<SucursalDetalle | null> {
  const { data } = await api.get<RespuestaAPI<SucursalDetalle>>(`/admin/negocios/${id}/sucursales/${sucursalId}`);
  return data.data ?? null;
}

// =============================================================================
// ACCIONES (Entrega 2) — escritura
// =============================================================================

/** Respuesta de las acciones que tocan Stripe. `advertenciaStripe` != null ⇒ el cambio
 *  en BD se aplicó pero la parte de Stripe NO se completó (mostrar como advertencia). */
export interface ResultadoAccionAdmin {
  advertenciaStripe: string | null;
}

/** Respuesta cruda de la API para acciones (data + posible advertenciaStripe). */
type RespuestaAccion = RespuestaAPI<unknown> & { advertenciaStripe?: string | null };

/** Pausa (suspende) — además pausa el cobro en Stripe si hay suscripción. */
export async function suspenderNegocio(id: string, motivo: string): Promise<ResultadoAccionAdmin> {
  const { data } = await api.post<RespuestaAccion>(`/admin/negocios/${id}/suspender`, { motivo });
  return { advertenciaStripe: data.advertenciaStripe ?? null };
}

/** Reactiva (des-pausa) — además reanuda el cobro en Stripe si hay suscripción. */
export async function reactivarNegocio(id: string, motivo?: string): Promise<ResultadoAccionAdmin> {
  const { data } = await api.post<RespuestaAccion>(`/admin/negocios/${id}/reactivar`, { motivo });
  return { advertenciaStripe: data.advertenciaStripe ?? null };
}

/** embajadorId = null → quitar vendedor (sin asignar). Sin Stripe. */
export async function reasignarVendedor(
  id: string,
  embajadorId: string | null,
  motivo?: string,
): Promise<void> {
  await api.post(`/admin/negocios/${id}/reasignar-vendedor`, { embajadorId, motivo });
}

/** Concepto del pago manual: ingreso (efectivo/transferencia) o cortesía (sin monto). */
export type ConceptoPago = 'efectivo' | 'transferencia' | 'cortesia';

export interface DatosMarcarPagado {
  /** Fecha ISO de vencimiento (= trial_end empujado en Stripe si hay suscripción). */
  hasta: string;
  concepto: ConceptoPago;
  /** Monto en MXN; solo efectivo/transferencia (en cortesía va undefined). */
  monto?: number;
  /** N meses elegidos en "Por meses"; undefined en "Fecha exacta" (solo registro). */
  meses?: number;
}

/** Marcar pagado (SOLO superadmin). Con suscripción empuja el próximo cobro a `hasta`. */
export async function marcarPagado(id: string, datos: DatosMarcarPagado): Promise<ResultadoAccionAdmin> {
  const { data } = await api.post<RespuestaAccion>(`/admin/negocios/${id}/marcar-pagado`, datos);
  return { advertenciaStripe: data.advertenciaStripe ?? null };
}

/** Cancelar (SOLO superadmin · motivo obligatorio) — corta Stripe + degrada al dueño. */
export async function cancelarNegocio(id: string, motivo: string): Promise<ResultadoAccionAdmin> {
  const { data } = await api.post<RespuestaAccion>(`/admin/negocios/${id}/cancelar`, { motivo });
  return { advertenciaStripe: data.advertenciaStripe ?? null };
}
