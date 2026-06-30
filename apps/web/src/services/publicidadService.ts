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
import { useAuthStore } from '../stores/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
  base: number;             // suma de precios EFECTIVOS (lo que se cobra)
  baseLista: number;        // suma de precios de LISTA (para tachar si hay lanzamiento)
  hayLanzamiento: boolean;  // algún carrusel elegido tiene precio de lanzamiento activo
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
  // precioLanzamiento = 0 si no hay oferta; si > 0 es el precio que se cobra y precioBase se tacha.
  carruseles: Array<{ clave: Carrusel; precioBase: number; precioLanzamiento: number }>;
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
  return res.data ?? { base: 0, baseLista: 0, hayLanzamiento: false, factor: 1, esCombo: false, descuento: 0, mensual: 0, meses: 1, descuentoPeriodo: 0, total: 0 };
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

/**
 * Variante de `descartarImagenesPublicidad` para el evento `pagehide` (refrescar / cerrar la pestaña /
 * navegar a una URL externa): usa `fetch` con `keepalive` para que la petición sobreviva a la descarga
 * de la página. Incluye el token en el header (por eso no se usa `navigator.sendBeacon`, que no permite
 * headers). Best-effort: el reference count del backend + el recolector R2 son la red de seguridad final.
 */
export function descartarImagenesPublicidadBeacon(urls: string[]): void {
  const lista = urls.filter(Boolean);
  if (lista.length === 0) return;
  try {
    const token = useAuthStore.getState().accessToken;
    void fetch(`${API_BASE}/publicidad/imagenes-descartadas`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ urls: lista }),
    });
  } catch {
    /* best-effort: no romper la descarga de la página */
  }
}

/** Crea el anuncio pendiente y devuelve la URL de Stripe Checkout. Requiere sesión. */
export async function crearCheckoutPublicidad(input: CheckoutInput): Promise<string> {
  const { data } = await api.post<{ success: boolean; message?: string; data?: { checkoutUrl: string } }>('/publicidad/checkout', input);
  if (!data.data?.checkoutUrl) throw new Error(data.message || 'No se pudo iniciar el pago.');
  return data.data.checkoutUrl;
}

// =============================================================================
// RENOVACIÓN (extender un anuncio existente desde Mi Perfil)
// =============================================================================

export interface AnuncioRenovable {
  id: string;
  carruseles: Carrusel[];
  imagenes: Partial<Record<Carrusel, string>>;
  ciudadIds: string[];
  expiraAt: string | null;
  estado: string;
}

/** Datos del anuncio del usuario para precargar el wizard en modo renovación. Requiere sesión. */
export async function obtenerAnuncioRenovable(compraId: string): Promise<AnuncioRenovable | null> {
  const res = await get<AnuncioRenovable>(`/publicidad/mio/${encodeURIComponent(compraId)}`);
  return res.data ?? null;
}

/** Renueva/extiende un anuncio: crea el pago de renovación y devuelve la URL de Stripe. Requiere sesión. */
export async function renovarPublicidad(compraId: string, input: CheckoutInput): Promise<string> {
  const { data } = await api.post<{ success: boolean; message?: string; data?: { checkoutUrl: string } }>(`/publicidad/renovar/${encodeURIComponent(compraId)}`, input);
  if (!data.data?.checkoutUrl) throw new Error(data.message || 'No se pudo iniciar la renovación.');
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
