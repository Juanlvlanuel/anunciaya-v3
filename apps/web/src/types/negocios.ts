/**
 * ============================================================================
 * TIPOS DE NEGOCIOS - Frontend
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/types/negocios.ts
 * 
 * PROPÓSITO:
 * Definir las interfaces TypeScript para datos de negocios y sucursales
 * Compatibles con las respuestas del backend (camelCase)
 * 
 * NOTA IMPORTANTE:
 * Estos tipos coinciden EXACTAMENTE con lo que devuelve el backend
 * después de aplicar los mappers en negocios.service.ts
 */

// =============================================================================
// TIPOS PARA LISTA DE NEGOCIOS
// =============================================================================

/**
 * Categoría con información de la categoría padre
 * Usado en tarjetas de negocios para mostrar badges
 */
export interface CategoriaAsignada {
  id: number;
  nombre: string;
  categoria: {
    id: number;
    nombre: string;
    icono: string;
  };
}

/**
 * Resumen de negocio para mostrar en tarjetas de lista
 * Incluye datos básicos + distancia + estado liked/followed
 * 
 * USO: Lista principal de negocios, resultados de búsqueda
 */
export interface NegocioResumen {
  // Datos del negocio
  negocioId: string;
  negocioNombre: string;
  galeria: ImagenGaleria[];
  logoUrl: string | null;
  aceptaCardya: boolean;
  verificado: boolean;

  // Datos de la sucursal
  sucursalId: string;
  sucursalNombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  whatsapp: string | null;
  tieneEnvioDomicilio: boolean;
  tieneServicioDomicilio: boolean;
  calificacionPromedio: string;
  totalCalificaciones: number;
  totalLikes: number;
  totalVisitas: number;
  activa: boolean;

  // Coordenadas de la sucursal
  latitud: number | null;
  longitud: number | null;

  // Distancia calculada (solo si se proporcionó lat/lng)
  distanciaKm: number | null;

  // Arrays anidados
  categorias: CategoriaAsignada[];
  metodosPago: string[];

  // Estado del usuario autenticado
  liked: boolean;
  followed: boolean;
  estaAbierto: boolean | null;
}

/**
 * Respuesta paginada de la lista de negocios
 */
export interface RespuestaListaNegocios {
  success: boolean;
  data: NegocioResumen[];
}

// =============================================================================
// TIPOS PARA PERFIL COMPLETO
// =============================================================================

/**
 * Horario de un día específico
 */
export interface Horario {
  diaSemana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  abierto: boolean;
  horaApertura: string; // "09:00:00"
  horaCierre: string;   // "21:00:00"
  tieneHorarioComida?: boolean;
  comidaInicio?: string | null;
  comidaFin?: string | null;
}

/**
 * Método de pago disponible
 */
export interface MetodoPago {
  tipo: string; // "efectivo", "tarjeta_debito", etc.
  activo: boolean;
}

/**
 * Redes sociales del negocio
 */
export interface RedesSociales {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

/**
 * Imagen de la galería del negocio
 */
export interface ImagenGaleria {
  id: number;
  url: string;
  titulo: string | null;
  orden: number;
}

/**
 * Métricas completas de la sucursal
 */
export interface Metricas {
  totalLikes: number;
  totalFollows: number;
  totalViews: number;
  totalShares: number;
  totalClicks: number;
  totalMessages: number;
}

/**
 * Perfil completo de una sucursal
 * Incluye TODA la información para mostrar en la página de detalle
 * 
 * USO: Página de perfil del negocio, vista detallada
 */
export interface NegocioCompleto {
  // Datos del negocio
  negocioId: string;
  negocioNombre: string;
  negocioDescripcion: string | null;
  logoUrl: string | null;
  portadaUrl: string | null;
  sitioWeb: string | null;
  redesSociales: RedesSociales | null;
  aceptaCardya: boolean;
  verificado: boolean;

  // Datos de la sucursal
  sucursalId: string;
  sucursalNombre: string;
  esPrincipal: boolean;
  direccion: string;
  ciudad: string;
  telefono: string;
  whatsapp: string | null;
  correo: string | null;
  tieneEnvioDomicilio: boolean;
  tieneServicioDomicilio: boolean;
  latitud: number;
  longitud: number;
  calificacionPromedio: string;
  totalCalificaciones: number;
  totalLikes: number;
  totalVisitas: number;
  activa: boolean;
  zonaHoraria: string;

  // Arrays anidados
  categorias: CategoriaAsignada[];
  horarios: Horario[];
  metodosPago: MetodoPago[];
  galeria: ImagenGaleria[];
  metricas: Metricas;

  // Estado del usuario
  liked: boolean;
  followed: boolean;

  // Conteo de sucursales
  totalSucursales: number;
}

/**
 * Respuesta del endpoint de perfil completo
 */
export interface RespuestaPerfilNegocio {
  success: boolean;
  data: NegocioCompleto;
}

// =============================================================================
// TIPOS PARA FILTROS
// =============================================================================

/**
 * Parámetros de filtrado para la lista de negocios
 * Todos los campos son opcionales
 */
export interface FiltrosNegocios {
  // Geolocalización
  latitud?: number;
  longitud?: number;
  distanciaMaxKm?: number; // default: 50

  // Categorías
  categoriaId?: number;
  subcategoriaIds?: number[];

  // Métodos de pago
  metodosPago?: string[];

  // Características
  aceptaCardYA?: boolean;
  tieneEnvio?: boolean;
  tieneServicio?: boolean;

  // Búsqueda
  busqueda?: string;

  // Paginación
  limite?: number;  // default: 20
  offset?: number;  // default: 0
}

// =============================================================================
// TIPOS DE UTILIDAD
// =============================================================================

/**
 * Días de la semana para los horarios
 */
export enum DiaSemana {
  Domingo = 0,
  Lunes = 1,
  Martes = 2,
  Miércoles = 3,
  Jueves = 4,
  Viernes = 5,
  Sábado = 6,
}

/**
 * Métodos de pago soportados
 */
export type MetodoPagoTipo =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'paypal'
  | 'mercado_pago';

/**
 * Entity type para sistema de votos
 */
export type EntityType = 'sucursal' | 'articulo' | 'publicacion' | 'oferta';

/**
 * Tipo de acción de voto
 */
export type TipoAccion = 'like' | 'follow';