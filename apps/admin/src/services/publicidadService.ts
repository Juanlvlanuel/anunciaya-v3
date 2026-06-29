/**
 * publicidadService.ts
 * ====================
 * Llamadas a la API del Panel para la sección Publicidad (módulo 7) — lectura (Fase 1):
 * tabla paginada, ficha y contador. Reusa el axios del Panel (`api`), que adjunta el
 * token y renueva ante 401. El backend ya transforma snake → camel.
 *
 * Endpoints:
 *   GET /admin/publicidad         → tabla paginada (filtros)
 *   GET /admin/publicidad/conteo  → total del alcance (menú)
 *   GET /admin/publicidad/:id     → ficha de una compra (piezas + ciudades + pago)
 *
 * Ubicación: apps/admin/src/services/publicidadService.ts
 */

import { api, type RespuestaAPI } from './api';
import { optimizarImagen } from '../utils/optimizarImagen';

// =============================================================================
// TIPOS (camelCase — espejo del service del backend)
// =============================================================================

export type EstadoPublicidad = 'activa' | 'pausada' | 'expirada' | 'cancelada';
export type Carrusel = 'anuncios' | 'patrocinadores' | 'fundadores';
export type OrigenPublicidad = 'self' | 'manual' | 'cortesia';
export type OrdenPublicidad = 'recientes' | 'antiguos' | 'vencimiento' | 'estado';

export interface ConteosEstado {
  total: number;
  porEstado: Array<{ estado: string; total: number }>;
}

export interface PublicidadFila {
  id: string;
  anuncianteNombre: string;
  anuncianteAvatar: string | null;
  negocioId: string | null;
  negocioNombre: string | null;
  esCombo: boolean;
  carruseles: string[];
  totalCiudades: number;
  clicksTotales: number;
  estado: string;
  origen: string;
  monto: string | null;
  iniciaAt: string | null;
  expiraAt: string | null;
  diasRestantes: number | null;
}

export interface ListaPublicidad {
  items: PublicidadFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

export interface PiezaDetalle {
  carrusel: string;
  imagenUrl: string;
  clicks: number;
  impresiones: number;
}

export interface CiudadDetalle {
  id: string;
  nombre: string;
}

export interface PublicidadDetalle {
  id: string;
  anuncianteId: string;
  anuncianteNombre: string;
  anuncianteCorreo: string | null;
  anuncianteTelefono: string | null;
  anuncianteAvatar: string | null;
  esComercial: boolean;
  negocioId: string | null;
  negocioNombre: string | null;
  esCombo: boolean;
  estado: string;
  origen: string;
  metodoCobro: string | null;
  monto: string | null;
  folio: number | null;
  reciboUrl: string | null;
  stripePaymentIntentId: string | null;
  duracionDias: number;
  iniciaAt: string | null;
  expiraAt: string | null;
  diasRestantes: number | null;
  avisoVencimientoEnviado: boolean;
  registradoPorNombre: string | null;
  creadoEn: string | null;
  piezas: PiezaDetalle[];
  ciudades: CiudadDetalle[];
  clicksTotales: number;
  impresionesTotales: number;
}

export interface ParametrosPublicidad {
  busqueda?: string;
  estado?: EstadoPublicidad;
  carrusel?: Carrusel;
  origen?: OrigenPublicidad;
  orden?: OrdenPublicidad;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarPublicidad(params: ParametrosPublicidad): Promise<ListaPublicidad> {
  const { data } = await api.get<RespuestaAPI<ListaPublicidad>>('/admin/publicidad', { params });
  return data.data ?? { items: [], total: 0, pagina: params.pagina, porPagina: params.porPagina, conteos: { total: 0, porEstado: [] } };
}

export async function obtenerDetallePublicidad(id: string): Promise<PublicidadDetalle | null> {
  const { data } = await api.get<RespuestaAPI<PublicidadDetalle>>(`/admin/publicidad/${id}`);
  return data.data ?? null;
}

export async function contarPublicidad(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/publicidad/conteo');
  return data.data?.total ?? 0;
}

// =============================================================================
// ACCIONES (Fase 2)
// =============================================================================

export async function pausarPublicidad(id: string): Promise<void> {
  await api.post<RespuestaAPI<{ estado: string }>>(`/admin/publicidad/${id}/pausar`);
}

export async function reactivarPublicidad(id: string): Promise<void> {
  await api.post<RespuestaAPI<{ estado: string }>>(`/admin/publicidad/${id}/reactivar`);
}

export async function cancelarPublicidad(id: string, motivo?: string | null): Promise<void> {
  await api.post<RespuestaAPI<{ estado: string }>>(`/admin/publicidad/${id}/cancelar`, { motivo: motivo ?? null });
}

/** Edita un anuncio (ciudades · carruseles · imágenes). El monto cobrado no cambia. */
export async function editarPublicidad(id: string, input: EdicionAnuncioInput): Promise<void> {
  await api.patch<RespuestaAPI<{ estado: string }>>(`/admin/publicidad/${id}`, input);
}

/** KPIs de la cabecera (activos · ingresos · clics · por vencer), en el alcance del rol. */
export async function obtenerKpisPublicidad(): Promise<KpisPublicidad> {
  const { data } = await api.get<RespuestaAPI<KpisPublicidad>>('/admin/publicidad/kpis');
  return data.data ?? { activos: 0, ingresos: 0, clics: 0, porVencer: 0 };
}

// =============================================================================
// ALTA MANUAL (Fase 2)
// =============================================================================

export interface DesglosePrecio {
  base: number;
  factor: number;
  esCombo: boolean;
  descuento: number;        // % del combo
  mensual: number;          // precio de 1 mes
  meses: number;            // meses pagados por adelantado
  descuentoPeriodo: number; // % por el periodo
  total: number;
}

export interface OpcionCarrusel {
  clave: Carrusel;
  precioBase: number;
}

export interface PeriodoPublicidad {
  meses: number;
  descuento: number;
}

export interface OpcionesPublicidad {
  limiteCiudades: number;
  duracionDias: number;
  comboDescuento: number;
  carruseles: OpcionCarrusel[];
  periodos: PeriodoPublicidad[];
}

export interface CiudadOpcion {
  id: string;
  nombre: string;
  estado: string;
}

export interface AltaManualInput {
  correoAnunciante: string;
  carruseles: Carrusel[];
  imagenes: Partial<Record<Carrusel, string>>;
  ciudadIds: string[];
  meses?: number;
  metodoCobro: 'efectivo' | 'transferencia' | 'cortesia';
  monto?: number;
}

/** Edición de un anuncio existente (ciudades · carruseles · imágenes). NO toca el cobro. */
export interface EdicionAnuncioInput {
  carruseles: Carrusel[];
  imagenes: Partial<Record<Carrusel, string>>;
  ciudadIds: string[];
}

/** KPIs de la cabecera de la sección (en el alcance del rol). */
export interface KpisPublicidad {
  activos: number;
  ingresos: number;
  clics: number;
  porVencer: number;
}

const OPCIONES_DEFAULT: OpcionesPublicidad = { limiteCiudades: 10, duracionDias: 30, comboDescuento: 15, carruseles: [], periodos: [{ meses: 1, descuento: 0 }] };

export async function obtenerOpcionesPublicidad(): Promise<OpcionesPublicidad> {
  const { data } = await api.get<RespuestaAPI<OpcionesPublicidad>>('/publicidad/opciones');
  return data.data ?? OPCIONES_DEFAULT;
}

export async function obtenerPrecioPublicidad(carruseles: Carrusel[], ciudades: number, meses = 1): Promise<DesglosePrecio> {
  const { data } = await api.get<RespuestaAPI<DesglosePrecio>>('/publicidad/precio', {
    params: { carruseles: carruseles.join(','), ciudades, meses },
  });
  return data.data ?? { base: 0, factor: 1, esCombo: false, descuento: 0, mensual: 0, meses: 1, descuentoPeriodo: 0, total: 0 };
}

/** Catálogo de ciudades activas para el selector (endpoint público). */
export async function listarCiudadesPublicidad(): Promise<CiudadOpcion[]> {
  const { data } = await api.get<RespuestaAPI<Array<{ id: string; nombre: string; estado: string }>>>('/ciudades');
  return (data.data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, estado: c.estado }));
}

/** Optimiza (redimensiona + WebP en el navegador), pide presigned URL, sube a R2 (PUT) y devuelve la URL pública. */
export async function subirImagenPublicidad(file: File): Promise<string> {
  const optimizada = await optimizarImagen(file);
  const { data } = await api.post<RespuestaAPI<{ uploadUrl: string; publicUrl: string }>>('/publicidad/upload-imagen', {
    nombreArchivo: optimizada.name,
    contentType: optimizada.type,
  });
  const info = data.data;
  if (!info?.uploadUrl) throw new Error('No se pudo preparar la subida.');
  const put = await fetch(info.uploadUrl, { method: 'PUT', body: optimizada, headers: { 'Content-Type': optimizada.type } });
  if (!put.ok) throw new Error('No se pudo subir la imagen a R2.');
  return info.publicUrl;
}

/** Borra de R2 las creatividades subidas pero no guardadas (al cerrar el alta/editar). Best-effort. */
export async function descartarImagenesPublicidad(urls: string[]): Promise<void> {
  const lista = urls.filter(Boolean);
  if (lista.length === 0) return;
  try {
    await api.post('/publicidad/imagenes-descartadas', { urls: lista });
  } catch {
    /* best-effort: no romper el cierre del modal */
  }
}

export async function crearAnuncioManual(input: AltaManualInput): Promise<{ id: string; folio: number | null; monto: number | null }> {
  const { data } = await api.post<RespuestaAPI<{ id: string; folio: number | null; monto: number | null }>>('/admin/publicidad', input);
  if (!data.data) throw new Error(data.message || 'No se pudo registrar el anuncio.');
  return data.data;
}
