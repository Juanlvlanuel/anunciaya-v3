/**
 * ============================================================================
 * TIPOS - Ofertas (Frontend)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/types/ofertas.ts
 * 
 * PROPÓSITO:
 * Definir interfaces TypeScript para ofertas
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

// =============================================================================
// TIPOS DE OFERTAS
// =============================================================================

/**
 * Tipo de oferta
 */
export type TipoOferta =
  | 'porcentaje'
  | 'monto_fijo'
  | '2x1'
  | '3x2'
  | 'envio_gratis'
  | 'regalo'
  | 'otro';

/**
 * Estado de oferta (calculado según fechas)
 */
export type EstadoOferta =
  | 'proxima'
  | 'activa'
  | 'vencida'
  | 'agotada'
  | 'inactiva';

/**
 * Visibilidad de la oferta
 */
export type VisibilidadOferta = 'publico' | 'privado';

/**
 * Oferta completa (Business Studio)
 */
export interface Oferta {
  id: string;
  negocioId: string;
  sucursalId: string;
  articuloId: string | null;
  titulo: string;
  descripcion: string | null;
  imagen: string | null;
  tipo: TipoOferta;
  valor: string | null; // Viene como string desde el backend (NUMERIC)
  compraMinima: string; // Viene como string desde el backend (NUMERIC)
  fechaInicio: string; // ISO string
  fechaFin: string; // ISO string
  limiteUsos: number | null; // NULL = ilimitado
  usosActuales: number;
  activo: boolean;
  visibilidad: VisibilidadOferta;
  limiteUsosPorUsuario: number | null;
  createdAt: string;
  updatedAt: string;
  // Métricas (solo si vienen del backend)
  totalVistas?: number;
  totalShares?: number;
  totalClicks?: number;
  // Estado calculado (solo si viene del backend)
  estado?: EstadoOferta;
}

/**
 * Oferta en el feed público
 */
export interface OfertaFeed {
  // Datos de la oferta
  ofertaId: string;
  titulo: string;
  descripcion: string | null;
  imagen: string | null;
  tipo: TipoOferta;
  valor: string | null;
  compraMinima: string;
  fechaInicio: string;
  fechaFin: string;
  limiteUsos: number | null;
  usosActuales: number;
  activo: boolean;
  /** Timestamp real de creación (para microseñal "Nueva") */
  createdAt: string;

  // Datos del negocio
  negocioId: string;
  /** UUID del usuario dueño del negocio (para iniciar ChatYA desde el feed) */
  negocioUsuarioId: string;
  negocioNombre: string;
  logoUrl: string | null;
  aceptaCardya: boolean;
  verificado: boolean;

  // Datos de la sucursal
  sucursalId: string;
  sucursalNombre: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  whatsapp: string | null;

  // Coordenadas
  latitud: number;
  longitud: number;

  // Distancia (si hay GPS)
  distanciaKm: number | null;

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
  totalVistas: number;
  totalShares: number;

  // Estado del usuario
  liked: boolean;
  saved: boolean;

  /**
   * Cuántas sucursales del mismo negocio tienen esta misma oferta
   * (mismo contenido operativo). Siempre >= 1.
   * Usado para mostrar chip "+N sucursales más" en las cards.
   */
  totalSucursales: number;

  /**
   * Marcado por backend (post-procesado): true para top N cuando
   * `orden=populares` y hay datos de vistas reales. False en cualquier
   * otro caso. Permite al frontend pintar el pill "Popular" honestamente.
   */
  esPopular: boolean;
}

/**
 * Input para crear una oferta
 */
export interface CrearOfertaInput {
  titulo: string;
  descripcion?: string | null;
  imagen?: string | null;
  tipo: TipoOferta;
  valor?: string | number | null; // String para "otro", number para porcentaje/monto_fijo
  compraMinima?: number;
  fechaInicio: string; // ISO string
  fechaFin: string; // ISO string
  limiteUsos?: number | null;
  limiteUsosPorUsuario?: number | null;
  articuloId?: string | null;
  activo?: boolean;
  visibilidad?: VisibilidadOferta;
  usuariosIds?: string[];
  motivoAsignacion?: string;
  duplicarImagen?: boolean;
}

/**
 * Input para actualizar una oferta
 */
export interface ActualizarOfertaInput {
  titulo?: string;
  descripcion?: string | null;
  imagen?: string | null;
  tipo?: TipoOferta;
  valor?: string | number | null;
  compraMinima?: number;
  fechaInicio?: string;
  fechaFin?: string;
  limiteUsos?: number | null;
  limiteUsosPorUsuario?: number | null;
  articuloId?: string | null;
  activo?: boolean;
  visibilidad?: VisibilidadOferta;
}

/**
 * Input para asignar oferta a usuarios
 */
export interface AsignarOfertaInput {
  usuariosIds: string[];
  motivo?: string;
}

/**
 * Input para duplicar oferta a otras sucursales
 */
export interface DuplicarOfertaInput {
  sucursalesIds: string[];
}

/**
 * Respuesta de duplicar oferta
 */
export interface OfertaDuplicada {
  id: string;
  sucursalId: string;
  titulo: string;
}

// =============================================================================
// FILTROS
// =============================================================================

/**
 * Tipos de ordenamiento del feed público
 */
export type OrdenFeedOfertas =
  | 'distancia'
  | 'recientes'
  | 'populares'
  | 'vencen_pronto';

/**
 * Filtros para el feed de ofertas
 */
export interface FiltrosFeedOfertas {
  latitud?: number;
  longitud?: number;
  distanciaMaxKm?: number;
  categoriaId?: number;
  tipo?: TipoOferta;
  busqueda?: string;
  limite?: number;
  offset?: number;
  fechaLocal?: string; // Formato YYYY-MM-DD - fecha local del usuario para filtrar ofertas activas
  /** Orden del feed (default: distancia si hay GPS, sino created_at DESC) */
  orden?: OrdenFeedOfertas;
  /** Filtrar a sólo negocios que participan en CardYA */
  soloCardya?: boolean;
  /** Filtrar a ofertas creadas en las últimas N horas (rango 1–720) */
  creadasUltimasHoras?: number;
}

/**
 * Filtros para Business Studio
 */
export interface FiltrosOfertas {
  busqueda: string;
  tipo: TipoOferta | 'todos';
  estado: EstadoOferta | 'todos';
}