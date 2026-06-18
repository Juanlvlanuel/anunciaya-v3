/**
 * vendedoresService.ts
 * ====================
 * Llamadas a la API del Panel para la sección "Vendedores y comisiones" — pieza A: la CARTERA
 * (Fase 1 · VER). Reusa el axios del Panel (`api`), que ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/vendedores            → tabla paginada de la red + conteos por estado del embajador
 *   GET /admin/vendedores/conteo     → total del alcance (badge del menú)
 *   GET /admin/vendedores/:id        → ficha de un vendedor (:id = usuarios.id)
 *   GET /admin/vendedores/:id/cartera → negocios atribuidos al vendedor (con estado de membresía)
 *
 * Tipos camelCase — el backend ya transforma snake → camel.
 *
 * Ubicación: apps/admin/src/services/vendedoresService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS
// =============================================================================

export type EstadoEmbajador = 'activo' | 'inactivo' | 'suspendido';
export type OrdenVendedores = 'nombre_az' | 'nombre_za' | 'cartera_desc' | 'activos_desc';

/** Conteos por estado. Array {estado,total} para que el middleware snake→camel no rompa keys. */
export interface ConteosEstado {
  total: number;
  porEstado: Array<{ estado: string; total: number }>;
}

export interface VendedorFila {
  id: string;                // usuarios.id (la persona)
  embajadorId: string;
  nombre: string;
  correo: string;
  codigoReferido: string;
  linkReferido: string | null;
  estadoEmbajador: string;   // activo | inactivo | suspendido
  regionNombre: string | null;
  ciudades: string | null;
  negociosEnCartera: number;
  negociosActivos: number;
}

export interface ListaVendedores {
  items: VendedorFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

export interface VendedorDetalle extends VendedorFila {
  nombreSolo: string | null;
  apellidos: string | null;
  telefono: string | null;
  altaEmbajador: string | null;
  gerenteNombre: string | null;
  ultimoAccesoPanel: string | null;
}

export interface NegocioCartera {
  id: string;
  nombre: string;
  logoUrl: string | null;
  ciudad: string | null;
  estadoPago: string;        // estado_membresia
  estadoAdmin: string;       // activo | suspendido | archivado
  metodoCobro: string;       // tarjeta | manual
  proximoCobro: string | null;
  vencimiento: string | null;
  alta: string | null;
  duenoNombre: string | null;
  duenoTelefono: string | null;
}

export interface CarteraVendedor {
  vendedor: VendedorDetalle;
  items: NegocioCartera[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

export interface ParametrosVendedores {
  busqueda?: string;
  estado?: string;
  orden?: OrdenVendedores;
  pagina: number;
  porPagina: number;
}

export interface ParametrosCartera {
  estadoPago?: string;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarVendedores(params: ParametrosVendedores): Promise<ListaVendedores> {
  const { data } = await api.get<RespuestaAPI<ListaVendedores>>('/admin/vendedores', { params });
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

/** Total de vendedores del alcance (badge del menú). */
export async function contarVendedores(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/vendedores/conteo');
  return data.data?.total ?? 0;
}

export async function obtenerVendedor(id: string): Promise<VendedorDetalle | null> {
  const { data } = await api.get<RespuestaAPI<VendedorDetalle>>(`/admin/vendedores/${id}`);
  return data.data ?? null;
}

export async function listarCartera(id: string, params: ParametrosCartera): Promise<CarteraVendedor | null> {
  const { data } = await api.get<RespuestaAPI<CarteraVendedor>>(`/admin/vendedores/${id}/cartera`, { params });
  return data.data ?? null;
}

// =============================================================================
// COMISIONES (Fase 2 · pieza B)
// =============================================================================

/** Una comisión devengada, con su desglose para la UI. */
export interface ComisionFila {
  id: string;
  periodo: string | null;        // 'YYYY-MM' (recurrente)
  tipo: string;                  // recurrente | alta
  monto: number;
  montoPagado: number;           // abonado acumulado (parciales)
  estado: string;                // pendiente | parcial | pagada | cancelada
  activos: number | null;
  montoUnitario: number | null;
  escalon: string | null;
  pagadaAt: string | null;
  creada: string | null;
}

export interface ResumenComisiones {
  devengado: number;
  pagado: number;
  pendiente: number;
}

export interface EstadoCuentaComisiones {
  vendedor: VendedorDetalle;
  items: ComisionFila[];
  resumen: ResumenComisiones;
}

/** Resumen que devuelve el recálculo del periodo. */
export interface ResumenDevengo {
  periodo: string;
  vendedoresProcesados: number;
  creadas: number;
  actualizadas: number;
  omitidasPagadas: number;
  totalDevengado: number;
}

/** Estado de cuenta de comisiones de un vendedor (devengado / pagado / pendiente). */
export async function listarComisiones(id: string): Promise<EstadoCuentaComisiones | null> {
  const { data } = await api.get<RespuestaAPI<EstadoCuentaComisiones>>(`/admin/vendedores/${id}/comisiones`);
  return data.data ?? null;
}

/** Recalcula/devenga las comisiones del periodo (solo super). Sin periodo → el mes en curso. */
export async function recalcularComisiones(periodo?: string): Promise<ResumenDevengo | null> {
  const { data } = await api.post<RespuestaAPI<ResumenDevengo>>(
    '/admin/vendedores/comisiones/recalcular',
    periodo ? { periodo } : {},
  );
  return data.data ?? null;
}

// =============================================================================
// LIQUIDACIÓN (Fase 2 · pieza E)
// =============================================================================

/** Un pago realizado al vendedor (egreso). */
export interface PagoFila {
  id: string;
  monto: number;
  metodo: string;
  fechaPago: string | null;
  periodo: string | null;
  nota: string | null;
  comprobanteUrl: string | null;
  creada: string | null;
}

export interface BitacoraPagos {
  vendedor: VendedorDetalle;
  items: PagoFila[];
  totalPagado: number;
}

export interface DatosCobro {
  metodo: string;
  banco: string | null;
  clabe: string | null;
  titular: string | null;
  nota: string | null;
  actualizadoEn: string | null;
}

export interface RegistrarPagoInput {
  montoTransferencia: number;  // ≥ 0
  montoEfectivo: number;       // ≥ 0
  fechaPago?: string;
  nota?: string | null;
  comprobanteUrl?: string | null;
}

/** Lo que devuelve registrarPago (un abono). */
export interface ResultadoPago {
  compensado?: number;    // efectivo descontado (neteo)
  abonado?: number;       // lo abonado en este pago
  saldoRestante?: number; // saldo que aún se le debe tras el abono
}

export interface DatosCobroInput {
  metodo: string;
  banco?: string | null;
  clabe?: string | null;
  titular?: string | null;
  nota?: string | null;
}

/** Bitácora de pagos hechos al vendedor. */
export async function listarPagos(id: string): Promise<BitacoraPagos | null> {
  const { data } = await api.get<RespuestaAPI<BitacoraPagos>>(`/admin/vendedores/${id}/pagos`);
  return data.data ?? null;
}

/** Registra un pago al vendedor (solo super). El backend netea el efectivo que el vendedor debe. */
export async function registrarPago(id: string, datos: RegistrarPagoInput): Promise<ResultadoPago> {
  const { data } = await api.post<RespuestaAPI<ResultadoPago>>(`/admin/vendedores/${id}/pagos`, datos);
  return data.data ?? {};
}

/** Datos de cobro del vendedor (super + el propio vendedor). */
export async function obtenerDatosCobro(id: string): Promise<DatosCobro | null> {
  const { data } = await api.get<RespuestaAPI<DatosCobro | null>>(`/admin/vendedores/${id}/datos-cobro`);
  return data.data ?? null;
}

/** Guarda/edita los datos de cobro del vendedor. */
export async function guardarDatosCobro(id: string, datos: DatosCobroInput): Promise<void> {
  await api.put(`/admin/vendedores/${id}/datos-cobro`, datos);
}

/**
 * Sube la foto-comprobante a R2 (presigned): pide la URL al backend, hace PUT directo a R2 y
 * devuelve la URL pública. Devuelve null si algo falla.
 */
export async function subirComprobante(file: File): Promise<string | null> {
  const { data } = await api.post<RespuestaAPI<{ uploadUrl: string; publicUrl: string }>>(
    '/admin/vendedores/comprobante/upload',
    { nombreArchivo: file.name, contentType: file.type },
  );
  const info = data.data;
  if (!info?.uploadUrl || !info?.publicUrl) return null;
  const r = await fetch(info.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  if (!r.ok) return null;
  return info.publicUrl;
}

// =============================================================================
// EFECTIVO POR ENTREGAR (Fase 2 · pieza D)
// =============================================================================

/** Un movimiento del libro de efectivo del vendedor. */
export interface MovimientoEfectivoFila {
  id: string;
  tipo: string;                  // cobro | entrega | compensacion
  monto: number;
  negocioNombre: string | null;  // en 'cobro'
  fecha: string | null;
  nota: string | null;
  creada: string | null;
}

/** Corte de caja: cobrado − (entregas + compensaciones) = saldo que el vendedor te debe. */
export interface CorteEfectivo {
  vendedor: VendedorDetalle;
  items: MovimientoEfectivoFila[];
  cobrado: number;
  entregado: number;
  compensado: number;
  saldo: number;
}

export interface MovimientoEfectivoInput {
  tipo: 'cobro' | 'entrega';
  monto: number;
  fecha?: string;
  nota?: string | null;
}

/** Corte de efectivo de un vendedor (super + gerente + el propio vendedor). */
export async function obtenerEfectivo(id: string): Promise<CorteEfectivo | null> {
  const { data } = await api.get<RespuestaAPI<CorteEfectivo>>(`/admin/vendedores/${id}/efectivo`);
  return data.data ?? null;
}

/** Registra a mano un cobro (sube la deuda) o una entrega (la baja) — super + gerente. */
export async function registrarMovimientoEfectivo(id: string, datos: MovimientoEfectivoInput): Promise<void> {
  await api.post(`/admin/vendedores/${id}/efectivo`, datos);
}
