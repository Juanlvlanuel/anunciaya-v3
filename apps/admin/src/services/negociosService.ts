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
  porVendedor: Array<{ vendedorId: string | null; total: number }>;
  porCiudad: Array<{ ciudad: string | null; total: number }>;
}

/** Estado administrativo (Panel): visibilidad efectiva la da `activo`. */
export type EstadoAdmin = 'activo' | 'suspendido' | 'archivado';

export interface NegocioFila {
  id: string;
  nombre: string;
  logoUrl: string | null;
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
  esFundador: boolean;
  onboardingCompletado: boolean;
  // Promoción de apertura (snapshot) + nota de contraprestación.
  promoPendiente: boolean;
  promoPaqueteId: string | null;
  promoMesesOtorgados: number | null;
  promoMesesCobrados: number | null;
  contraprestacion: string | null;
  creadoEn: string | null;
  fechaPrimerPago: string | null;
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
  /** true si es el embajador del usuario logueado (para preseleccionarlo — ej. un gerente que también vende). */
  esMio: boolean;
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
      conteos: { total: 0, porEstado: [], porVendedor: [], porCiudad: [] },
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

/** Marca/quita a un negocio como Fundador de su ciudad (regalo de Publicidad). */
export async function marcarDesmarcarFundador(id: string, esFundador: boolean): Promise<void> {
  await api.post(`/admin/negocios/${id}/marcar-fundador`, { esFundador });
}

/** Guarda la nota de contraprestación del negocio (lo que ofrece durante la promo). Vacío = la borra. */
export async function editarContraprestacion(id: string, contraprestacion: string): Promise<void> {
  await api.patch(`/admin/negocios/${id}/contraprestacion`, { contraprestacion });
}

/** Activa la promoción de un negocio dado de alta anticipada (cobra 1 mes, inicia vigencia, publica). */
export async function activarPromocion(id: string, concepto: 'efectivo' | 'transferencia'): Promise<void> {
  await api.post(`/admin/negocios/${id}/activar-promocion`, { concepto });
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

// =============================================================================
// ALTA MANUAL + CATÁLOGO DE CIUDADES + HISTORIAL DE PAGOS (Fase 5)
// =============================================================================

/** Ciudad del catálogo para el selector del alta (el backend ya la acota por región/rol). */
export interface CiudadCatalogo {
  id: string;
  nombre: string;
  estado: string;
}

/** Catálogo de ciudades activas por región para el SELECTOR del alta (≠ filtro de tabla). */
export async function catalogoCiudades(): Promise<CiudadCatalogo[]> {
  const { data } = await api.get<RespuestaAPI<CiudadCatalogo[]>>('/admin/negocios/catalogo-ciudades');
  return data.data ?? [];
}

/** ¿Ya existe una cuenta con ese correo? (aviso temprano del alta; solo booleano, sin datos). */
export async function existeCorreo(correo: string): Promise<boolean> {
  const { data } = await api.get<RespuestaAPI<{ existe: boolean }>>('/admin/negocios/existe-correo', {
    params: { correo },
  });
  return data.data?.existe ?? false;
}

/** Resultado de cambiar el correo del dueño: `correoEnviado` = si el código se reenvió o no. */
export interface ResultadoCambioCorreo {
  correoEnviado: boolean;
}

/** Corrige el correo del dueño (rescate de alta manual) y reenvía el código al correo nuevo. */
export async function cambiarCorreoDueno(id: string, correoNuevo: string): Promise<ResultadoCambioCorreo> {
  const { data } = await api.patch<RespuestaAPI<{ correoEnviado: boolean }>>(
    `/admin/negocios/${id}/correo-dueno`,
    { correoNuevo },
  );
  return { correoEnviado: data.data?.correoEnviado ?? false };
}

/** Concepto del alta manual: ingreso (efectivo/transferencia) o cortesía (sin monto). */
/** Un paquete promocional ACTIVO (para el selector del alta). */
export interface PaquetePromo {
  id: string;
  nombre: string;
  mesesOtorgados: number;
  mesesCobrados: number;
}

/** Paquetes promocionales activos para el selector del alta. */
export async function listarPaquetesPromo(): Promise<PaquetePromo[]> {
  const { data } = await api.get<RespuestaAPI<PaquetePromo[]>>('/admin/negocios/paquetes-promocion');
  return data.data ?? [];
}

export type ConceptoAlta = 'efectivo' | 'transferencia' | 'cortesia';

/** Payload del alta manual de un negocio en efectivo/transferencia (sin Stripe). */
export interface DatosAltaManual {
  nombreNegocio: string;
  ciudadId: string;
  nombre: string;
  apellidos: string;
  correo: string;
  /** Se captura dos veces; el backend revalida la igualdad. */
  confirmarCorreo: string;
  telefono: string;
  concepto: ConceptoAlta;
  /** Monto en MXN; solo efectivo/transferencia (en cortesía va undefined). */
  monto?: number;
  /** Periodo por meses (1–36). Alternativa a `hasta` (fecha exacta). */
  meses?: number;
  /** Fecha exacta de vencimiento (ISO). Alternativa a `meses`. */
  hasta?: string;
  /** Vendedor elegido (gerente/superadmin). El vendedor se auto-atribuye → no lo manda. */
  embajadorId?: string | null;
  /** Paquete promocional aplicado (id del catálogo). El monto/meses ya van calculados. */
  promoPaqueteId?: string;
  /** Nota de contraprestación (lo que el negocio ofrece durante la promo). */
  contraprestacion?: string;
  /** Alta anticipada: crea el negocio sin iniciar la membresía (se activa después). Requiere paquete. */
  altaAnticipada?: boolean;
}

/** Alta manual (superadmin/gerente/vendedor). Devuelve el negocio y dueño creados. */
export async function altaManualNegocio(datos: DatosAltaManual): Promise<{ negocioId: string; usuarioId: string }> {
  const { data } = await api.post<RespuestaAPI<{ negocioId: string; usuarioId: string }>>(
    '/admin/negocios/alta-manual',
    datos,
  );
  if (!data.data) throw new Error(data.message || 'No se pudo registrar el negocio');
  return data.data;
}

/** Una fila del historial de pagos de membresía (ficha del método manual). */
export interface PagoMembresia {
  id: string;
  folio: number | null;
  monto: string | null;
  concepto: string;
  fechaPago: string | null;
  periodoHasta: string | null;
  mesesCubiertos: number | null;
  nota: string | null;
  registradoPorNombre: string | null;
  /** Si el pago fue anulado (borrado lógico). */
  anulado: boolean;
}

/** Historial de pagos de membresía de un negocio (bitácora). `limite` acota a los N más recientes. */
export async function listarPagosNegocio(id: string, limite?: number): Promise<PagoMembresia[]> {
  const { data } = await api.get<RespuestaAPI<PagoMembresia[]>>(`/admin/negocios/${id}/pagos`, {
    params: limite ? { limite } : undefined,
  });
  return data.data ?? [];
}

/** Campos editables de una fila del historial (corrección contable; no toca la vigencia). */
export interface DatosEditarPago {
  concepto: ConceptoPago;
  /** Monto en MXN; solo efectivo/transferencia (en cortesía va undefined). */
  monto?: number;
  /** Meses que cubrió ese pago (1–36). */
  meses: number;
}

/** Corrige una fila del historial de pagos (concepto/monto/meses). Super + gerente (su región). */
export async function editarPagoMembresia(
  negocioId: string,
  pagoId: string,
  datos: DatosEditarPago,
): Promise<void> {
  await api.patch(`/admin/negocios/${negocioId}/pagos/${pagoId}`, datos);
}

/** Reenvía el comprobante de un pago al dueño (regenera el recibo PDF). Super + gerente. */
export async function reenviarRecibo(negocioId: string, pagoId: string): Promise<{ correoEnviado: boolean }> {
  const { data } = await api.post<{ correoEnviado?: boolean }>(
    `/admin/negocios/${negocioId}/pagos/${pagoId}/reenviar-recibo`,
  );
  return { correoEnviado: data.correoEnviado ?? false };
}

/** Anula (borrado lógico) un pago · motivo obligatorio. Super + gerente. En negocios con tarjeta
 *  re-alinea el cobro de Stripe a la vigencia recalculada; `advertenciaStripe` != null si no se pudo. */
export async function anularPago(negocioId: string, pagoId: string, motivo: string): Promise<ResultadoAccionAdmin> {
  const { data } = await api.post<RespuestaAccion>(`/admin/negocios/${negocioId}/pagos/${pagoId}/anular`, { motivo });
  return { advertenciaStripe: data.advertenciaStripe ?? null };
}

/** Total de negocios del alcance del rol (para el contador del menú). */
export async function contarNegocios(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/negocios/conteo');
  return data.data?.total ?? 0;
}
