/**
 * ============================================================================
 * TIPOS TYPESCRIPT - Ofertas (BACKEND)
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/types/ofertas.types.ts
 * 
 * PROPÓSITO:
 * Definir interfaces y tipos para operaciones con ofertas
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 * ACTUALIZADO: 11 Enero 2026 - Agregado campo imagen
 */

// =============================================================================
// ENUMS Y CONSTANTES
// =============================================================================

/**
 * Tipos de oferta permitidos
 */
export type TipoOferta =
  | 'porcentaje'     // X% de descuento
  | 'monto_fijo'     // $X de descuento
  | '2x1'            // Compra 1 lleva 2
  | '3x2'            // Compra 3 paga 2
  | 'envio_gratis'   // Envío gratis
  | 'otro';          // Otro tipo de promoción

/**
 * Estados de una oferta basados en fechas
 */
export type EstadoOferta =
  | 'proxima'  // Aún no inicia
  | 'activa'   // En vigencia
  | 'vencida'; // Ya terminó

// =============================================================================
// INPUT TYPES (para crear/actualizar)
// =============================================================================

/**
 * Datos para crear una nueva oferta
 */
export interface CrearOfertaInput {
  titulo: string;
  descripcion?: string | null;
  imagen?: string | null;  // ← AGREGADO: URL de imagen en Cloudinary
  tipo: TipoOferta;
  valor?: string | number | null;  // Acepta string (para "otro") o number (para porcentaje/monto_fijo)
  compraMinima?: number;
  fechaInicio: string; // ISO string
  fechaFin: string;    // ISO string
  limiteUsos?: number | null;
  articuloId?: string | null;
  activo?: boolean;
}

/**
 * Datos para actualizar una oferta existente
 * Todos los campos son opcionales
 */
export interface ActualizarOfertaInput {
  titulo?: string;
  descripcion?: string | null;
  imagen?: string | null;  // ← AGREGADO: URL de imagen en Cloudinary
  tipo?: TipoOferta;
  valor?: string | number | null;  // Acepta string (para "otro") o number (para porcentaje/monto_fijo)
  compraMinima?: number;
  fechaInicio?: string;
  fechaFin?: string;
  limiteUsos?: number | null;
  articuloId?: string | null;
  activo?: boolean;
}

/**
 * Datos para duplicar oferta a otras sucursales
 */
export interface DuplicarOfertaInput {
  sucursalesIds: string[];
}

// =============================================================================
// OUTPUT TYPES (respuestas de la API)
// =============================================================================

/**
 * Oferta básica (Business Studio)
 * Respuesta de CRUD interno
 */
export interface OfertaBasica {
  id: string;
  negocioId: string;
  sucursalId: string;
  articuloId: string | null;
  titulo: string;
  descripcion: string | null;
  imagen: string | null;  // ← AGREGADO: URL de imagen en Cloudinary
  tipo: TipoOferta;
  valor: string | null; // NUMERIC viene como string
  compraMinima: string;  // NUMERIC viene como string
  fechaInicio: string;
  fechaFin: string;
  limiteUsos: number | null;
  usosActuales: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Oferta en el feed (vista pública)
 * Incluye datos del negocio y sucursal
 */
export interface OfertaFeedRow {
  // Datos de la oferta
  oferta_id: string;
  titulo: string;
  descripcion: string | null;
  imagen: string | null;  // ← AGREGADO: URL de imagen en Cloudinary
  tipo: TipoOferta;
  valor: string | null;
  compra_minima: string;
  fecha_inicio: string;
  fecha_fin: string;
  limite_usos: number | null;
  usos_actuales: number;
  activo: boolean;

  // Datos del negocio
  negocio_id: string;
  negocio_nombre: string;
  logo_url: string | null;
  acepta_cardya: boolean;
  verificado: boolean;

  // Datos de la sucursal
  sucursal_id: string;
  sucursal_nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  whatsapp: string | null;

  // Coordenadas
  latitud: number;
  longitud: number;

  // Distancia (si hay GPS)
  distancia_km: number | null;

  // Categorías (JSON)
  categorias: Array<{
    id: number;
    nombre: string;
    categoria: {
      id: number;
      nombre: string;
      icono: string;
    };
  }> | null;

  // Métricas
  total_vistas: number;
  total_shares: number;

  // Estado del usuario
  liked: boolean;
  saved: boolean;
}

/**
 * Oferta con artículo (si está vinculada)
 */
export interface OfertaConArticulo extends OfertaBasica {
  articulo?: {
    id: string;
    nombre: string;
    imagenPrincipal: string | null;
    precioBase: string;
  } | null;
}

// =============================================================================
// FILTROS Y QUERIES
// =============================================================================

/**
 * Filtros para el feed de ofertas
 */
export interface FiltrosFeedOfertas {
  sucursalId?: string;
  latitud?: number;
  longitud?: number;
  distanciaMaxKm?: number;
  categoriaId?: number;
  tipo?: TipoOferta;
  busqueda?: string;
  limite?: number;
  offset?: number;
  fechaLocal?: string;  
}

// =============================================================================
// RESPUESTAS DE SERVICIO
// =============================================================================

/**
 * Respuesta estándar de operaciones
 */
export interface RespuestaOferta<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// =============================================================================
// HELPERS DE NEGOCIO
// =============================================================================

/**
 * Determina el estado de una oferta basándose en fechas
 */
export function obtenerEstadoOferta(fechaInicio: string, fechaFin: string): EstadoOferta {
  const ahora = new Date();
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (ahora < inicio) return 'proxima';
  if (ahora > fin) return 'vencida';
  return 'activa';
}

/**
 * Verifica si una oferta está activa
 * (activo = true, dentro de fechas, no ha llegado al límite)
 */
export function estaOfertaActiva(oferta: {
  activo: boolean;
  fechaInicio: string;
  fechaFin: string;
  limiteUsos: number | null;
  usosActuales: number;
}): boolean {
  if (!oferta.activo) return false;

  const estado = obtenerEstadoOferta(oferta.fechaInicio, oferta.fechaFin);
  if (estado !== 'activa') return false;

  // Si tiene límite, verificar que no se haya alcanzado
  if (oferta.limiteUsos !== null && oferta.usosActuales >= oferta.limiteUsos) {
    return false;
  }

  return true;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  obtenerEstadoOferta,
  estaOfertaActiva,
};