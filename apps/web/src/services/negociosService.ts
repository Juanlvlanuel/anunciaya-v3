/**
 * negociosService.ts
 * ===================
 * Servicio para llamadas API relacionadas con negocios y sucursales
 * 
 * UBICACIÓN: apps/web/src/services/negociosService.ts
 * 
 * ENDPOINTS:
 * - GET /api/negocios/:negocioId/sucursales
 * - GET /api/negocios/:id
 * - GET /api/negocios/:id/galeria
 * - DELETE /api/negocios/:id/logo
 * - DELETE /api/negocios/:sucursalId/portada
 * - DELETE /api/negocios/:negocioId/galeria/:imageId
 */

import { get, del } from './api';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Sucursal básica (para selector)
 */
export interface Sucursal {
  id: string;
  nombre: string;
  esPrincipal: boolean;
  direccion: string;
  ciudad: string;
  telefono: string;
  activa: boolean;
}

/**
 * Datos básicos del negocio
 */
export interface NegocioBasico {
  id: string;
  nombre: string;
  logoUrl: string | null;
  portadaUrl: string | null;  // Viene de sucursal principal
  descripcion: string | null;
  sitioWeb: string | null;
  sucursalId: string;  // ← AGREGAR ESTA LÍNEA (UUID de sucursal principal)
}

/**
 * Imagen de galería
 */
export interface ImagenGaleria {
  id: number;
  url: string;
  titulo: string | null;
  orden: number;
}

// =============================================================================
// FUNCIONES
// =============================================================================

/**
 * Obtiene todas las sucursales de un negocio
 * Usado para: preview en Business Studio, selector de sucursales
 */
export async function obtenerSucursalesNegocio(negocioId: string) {
  return get<Sucursal[]>(`/negocios/${negocioId}/sucursales`);
}

/**
 * ✅ NUEVA: Obtiene la sucursal principal de un negocio
 * Útil para cargar la sucursal activa al hacer login
 */
export async function obtenerSucursalPrincipal(negocioId: string) {
  const respuesta = await obtenerSucursalesNegocio(negocioId);

  if (respuesta.success && respuesta.data) {
    // Buscar la sucursal principal
    const sucursalPrincipal = respuesta.data.find(s => s.esPrincipal);

    if (sucursalPrincipal) {
      return {
        success: true,
        data: sucursalPrincipal,
      };
    }

    // Si no hay principal, retornar la primera activa
    const primeraActiva = respuesta.data.find(s => s.activa);
    if (primeraActiva) {
      return {
        success: true,
        data: primeraActiva,
      };
    }

    // Si no hay ninguna activa, retornar la primera
    if (respuesta.data.length > 0) {
      return {
        success: true,
        data: respuesta.data[0],
      };
    }
  }

  return {
    success: false,
    message: 'No se encontró sucursal principal',
  };
}

/**
 * Obtiene información básica de un negocio
 */
export async function obtenerNegocio(negocioId: string) {
  return get<NegocioBasico>(`/negocios/${negocioId}`);
}

/**
 * Obtiene todas las imágenes de la galería de un negocio
 */
export async function obtenerGaleriaNegocio(negocioId: string) {
  return get<ImagenGaleria[]>(`/negocios/${negocioId}/galeria`);
}

/**
 * Elimina el logo del negocio
 */
export async function eliminarLogo(negocioId: string) {
  return del(`/negocios/${negocioId}/logo`);
}

/**
 * Elimina la portada de la sucursal
 */
export async function eliminarPortada(sucursalId: string) {
  return del(`/negocios/${sucursalId}/portada`);
}

/**
 * Elimina una imagen de la galería
 */
export async function eliminarImagenGaleria(negocioId: string, imageId: number) {
  return del(`/negocios/${negocioId}/galeria/${imageId}`);
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  obtenerSucursalesNegocio,
  obtenerSucursalPrincipal,
  obtenerNegocio,
  obtenerGaleriaNegocio,
  eliminarLogo,
  eliminarPortada,
  eliminarImagenGaleria,
};