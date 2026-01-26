/**
 * ============================================================================
 * TIPOS - Artículos (Frontend)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/types/articulos.ts
 * 
 * PROPÓSITO:
 * Definir interfaces TypeScript para artículos del catálogo
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD Frontend
 */

// =============================================================================
// TIPOS DE ARTÍCULOS
// =============================================================================

/**
 * Tipo de artículo
 */
export type TipoArticulo = 'producto' | 'servicio';

/**
 * Artículo del catálogo (lista completa)
 */
export interface Articulo {
  id: string;
  negocioId: string;
  tipo: TipoArticulo;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precioBase: string; // Viene como string desde el backend (NUMERIC)
  precioDesde: boolean;
  imagenPrincipal: string | null;
  disponible: boolean;
  destacado: boolean;
  orden: number;
  totalVentas: number;
  totalVistas: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input para crear un artículo
 */
export interface CrearArticuloInput {
  tipo: TipoArticulo;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precioBase: number; // Frontend envía como number
  precioDesde?: boolean;
  imagenPrincipal?: string | null;
  disponible?: boolean;
  destacado?: boolean;
}

/**
 * Input para actualizar un artículo
 */
export interface ActualizarArticuloInput {
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  precioBase?: number;
  precioDesde?: boolean;
  imagenPrincipal?: string | null;
  disponible?: boolean;
  destacado?: boolean;
  orden?: number;
  imagenAEliminar?: string;
}

/**
 * Input para duplicar artículo a otras sucursales
 */
export interface DuplicarArticuloInput {
  sucursalesIds: string[];
}

/**
 * Respuesta de duplicar artículo
 */
export interface ArticuloDuplicado {
  id: string;
  sucursalId: string;
  nombre: string;
}

// =============================================================================
// FILTROS
// =============================================================================

/**
 * Filtros para la lista de artículos
 */
export interface FiltrosArticulos {
  busqueda: string;
  tipo: TipoArticulo | 'todos';
  categoria: string;
  disponible: boolean | 'todos';
}

