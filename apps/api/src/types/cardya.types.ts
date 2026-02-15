/**
 * cardya.types.ts
 * ===============
 * Tipos TypeScript para el módulo CardYA (Cliente)
 * 
 * Ubicación: apps/api/src/types/cardya.types.ts
 * 
 * PROPÓSITO:
 * Definir interfaces para el sistema de lealtad desde la perspectiva del cliente:
 *   - Billeteras y puntos por negocio
 *   - Recompensas disponibles
 *   - Vouchers de canje
 *   - Historial de transacciones
 */

// =============================================================================
// RESPUESTA GENÉRICA
// =============================================================================

export interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: number;
}

// =============================================================================
// BILLETERA Y PUNTOS
// =============================================================================

/**
 * Progreso del usuario hacia el siguiente nivel en un negocio
 */
export interface ProgresoNivel {
  puntosActuales: number;
  puntosMinNivel: number;
  puntosMaxNivel: number | null; // null = nivel máximo (Oro)
  porcentaje: number; // 0-100
  puntosFaltantes: number | null; // null si ya está en nivel máximo
  siguienteNivel: 'plata' | 'oro' | null; // null si ya está en Oro
}

/**
 * Billetera del usuario en un negocio específico
 * Incluye puntos, nivel y progreso
 */
export interface BilleteraNegocio {
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;
  puntosCanjeadosTotal: number;
  nivelActual: 'bronce' | 'plata' | 'oro';
  multiplicador: number;
  progreso: ProgresoNivel;
}

/**
 * Detalle completo de la billetera en un negocio
 * Incluye últimas transacciones y datos de contacto
 */
export interface DetalleNegocioBilletera extends BilleteraNegocio {
  beneficios: string[]; // ["Multiplicador x1.5", "Puntos dobles sábados"]
  ultimasTransacciones: TransaccionResumen[];
  telefonoContacto: string | null;
  whatsappContacto: string | null;
}

/**
 * Resumen de transacción para mostrar en detalle de negocio
 */
export interface TransaccionResumen {
  id: string;
  tipo: 'compra' | 'canje';
  monto: number; // Pesos si es compra, puntos si es canje
  puntos: number; // Positivo si ganó, negativo si canjeó
  createdAt: string;
  descripcion: string | null; // Nombre de recompensa si es canje
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

/**
 * Recompensa disponible para el usuario
 * Incluye validación de puntos y stock
 */
export interface RecompensaDisponible {
  id: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  puntosRequeridos: number;
  stock: number | null; // null = ilimitado
  tienesPuntosSuficientes: boolean;
  puntosFaltantes: number; // 0 si tiene suficientes
  estaAgotada: boolean; // stock === 0
}

// =============================================================================
// VOUCHERS
// =============================================================================

/**
 * Voucher de canje generado
 */
export interface Voucher {
  id: string;
  codigo: string;
  qrData: string | null;
  recompensaId: string;
  recompensaNombre: string;
  recompensaImagen: string | null;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  canjeadoPorNombre: string | null;
  puntosUsados: number;
  estado: 'pendiente' | 'usado' | 'expirado' | 'cancelado';
  expiraAt: string;
  usadoAt: string | null;
  createdAt: string;
}

// =============================================================================
// HISTORIAL
// =============================================================================

/**
 * Transacción de compra (puntos ganados)
 */
export interface HistorialCompra {
  id: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  montoCompra: number;
  puntosOtorgados: number;
  multiplicadorAplicado: number;
  concepto: string | null;
  empleadoNombre: string | null;
  createdAt: string;
}

/**
 * Transacción de canje (puntos gastados)
 */
export interface HistorialCanje {
  id: string; // voucher_id
  recompensaId: string;
  recompensaNombre: string;
  recompensaImagen: string | null;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  puntosUsados: number;
  canjeadoPorNombre: string | null;
  estado: 'usado' | 'cancelado';
  createdAt: string;
  usadoAt: string | null;
}

// =============================================================================
// FILTROS
// =============================================================================

/**
 * Filtros para historial de compras
 */
export interface FiltrosHistorialCompras {
  negocioId?: string; // Filtrar por negocio específico
  limit?: number;
  offset?: number;
}

/**
 * Filtros para historial de canjes
 */
export interface FiltrosHistorialCanjes {
  negocioId?: string; // Filtrar por negocio específico
  estado?: 'usado' | 'cancelado'; // Filtrar por estado
  limit?: number;
  offset?: number;
}

/**
 * Filtros para recompensas
 */
export interface FiltrosRecompensas {
  negocioId?: string; // Filtrar por negocio específico
  soloDisponibles?: boolean; // Solo las que el usuario puede canjear (tiene puntos y stock)
  ciudad?: string;
}

/**
 * Filtros para vouchers
 */
export interface FiltrosVouchers {
  estado?: 'pendiente' | 'usado' | 'expirado' | 'cancelado';
}