/**
 * publicidadService.ts
 * ====================
 * Cliente del endpoint público de publicidad: los anuncios vigentes de una ciudad para los
 * carruseles de la columna derecha (solo desktop). Sin auth.
 *
 * Ubicación: apps/web/src/services/publicidadService.ts
 */

import { api, get } from './api';
import { optimizarImagen } from '../utils/optimizarImagen';

export type Carrusel = 'anuncios' | 'patrocinadores' | 'fundadores';

export interface AnuncioPublico {
  piezaId: string;
  imagenUrl: string;
}

export interface PublicidadPublica {
  anuncios: AnuncioPublico[];
  patrocinadores: AnuncioPublico[];
  fundadores: AnuncioPublico[];
}

const VACIO: PublicidadPublica = { anuncios: [], patrocinadores: [], fundadores: [] };

export async function obtenerPublicidadPorCiudad(ciudadId: string): Promise<PublicidadPublica> {
  const res = await get<PublicidadPublica>(`/publicidad?ciudadId=${encodeURIComponent(ciudadId)}`);
  return res.data ?? VACIO;
}

// =============================================================================
// WIZARD SELF-SERVICE (anunciarse desde la columna)
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

export interface PeriodoPublicidad {
  meses: number;
  descuento: number;
}

export interface OpcionesPublicidad {
  limiteCiudades: number;
  duracionDias: number;
  comboDescuento: number;
  carruseles: Array<{ clave: Carrusel; precioBase: number }>;
  periodos: PeriodoPublicidad[];
}

export interface CheckoutInput {
  carruseles: Carrusel[];
  imagenes: Partial<Record<Carrusel, string>>;
  ciudadIds: string[];
  meses?: number;
}

const OPCIONES_DEFAULT: OpcionesPublicidad = { limiteCiudades: 10, duracionDias: 30, comboDescuento: 15, carruseles: [], periodos: [{ meses: 1, descuento: 0 }] };

export async function obtenerOpcionesPublicidad(): Promise<OpcionesPublicidad> {
  const res = await get<OpcionesPublicidad>('/publicidad/opciones');
  return res.data ?? OPCIONES_DEFAULT;
}

export async function obtenerPrecioPublicidad(carruseles: Carrusel[], ciudades: number, meses = 1): Promise<DesglosePrecio> {
  const res = await get<DesglosePrecio>(`/publicidad/precio?carruseles=${carruseles.join(',')}&ciudades=${ciudades}&meses=${meses}`);
  return res.data ?? { base: 0, factor: 1, esCombo: false, descuento: 0, mensual: 0, meses: 1, descuentoPeriodo: 0, total: 0 };
}

/** Optimiza (redimensiona + WebP), pide presigned URL, sube a R2 (PUT) y devuelve la URL pública. Requiere sesión. */
export async function subirImagenPublicidad(file: File): Promise<string> {
  // Optimiza a WebP (máx 1600px) antes de subir; si falla, sube el original.
  let cuerpo: Blob = file;
  let contentType = file.type;
  let nombreArchivo = file.name;
  try {
    cuerpo = await optimizarImagen(file, { maxWidth: 1600, quality: 0.8 });
    contentType = 'image/webp';
    nombreArchivo = file.name.replace(/\.[^.]+$/, '') + '.webp';
  } catch {
    /* sin optimizar: sube el original */
  }
  const { data } = await api.post<{ data?: { uploadUrl: string; publicUrl: string } }>('/publicidad/upload-imagen', {
    nombreArchivo,
    contentType,
  });
  const info = data.data;
  if (!info?.uploadUrl) throw new Error('No se pudo preparar la subida.');
  const put = await fetch(info.uploadUrl, { method: 'PUT', body: cuerpo, headers: { 'Content-Type': contentType } });
  if (!put.ok) throw new Error('No se pudo subir la imagen.');
  return info.publicUrl;
}

/** Borra de R2 las creatividades subidas pero no pagadas/guardadas (al salir del flujo). Best-effort. */
export async function descartarImagenesPublicidad(urls: string[]): Promise<void> {
  const lista = urls.filter(Boolean);
  if (lista.length === 0) return;
  try {
    await api.post('/publicidad/imagenes-descartadas', { urls: lista });
  } catch {
    /* best-effort: no romper la navegación */
  }
}

/** Crea el anuncio pendiente y devuelve la URL de Stripe Checkout. Requiere sesión. */
export async function crearCheckoutPublicidad(input: CheckoutInput): Promise<string> {
  const { data } = await api.post<{ success: boolean; message?: string; data?: { checkoutUrl: string } }>('/publicidad/checkout', input);
  if (!data.data?.checkoutUrl) throw new Error(data.message || 'No se pudo iniciar el pago.');
  return data.data.checkoutUrl;
}

/** Cuenta el "ver grande" de una pieza (best-effort, sin auth). */
export async function registrarClickPublicidad(piezaId: string): Promise<void> {
  try {
    await api.post(`/publicidad/pieza/${piezaId}/click`);
  } catch {
    /* best-effort: no romper la UX si falla */
  }
}
