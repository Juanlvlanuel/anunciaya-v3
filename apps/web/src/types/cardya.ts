/**
 * ============================================================================
 * TIPOS - CardYA (Sistema de Lealtad para Clientes)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/types/cardya.ts
 *
 * ALINEADO CON: apps/api/src/types/cardya.types.ts
 *
 * Todos los tipos reflejan EXACTAMENTE lo que retorna el backend.
 * Los tipos adicionales para UI (unificación de historial, estados visuales)
 * se derivan de los tipos base sin duplicar campos.
 */

// =============================================================================
// NIVELES DE LEALTAD
// =============================================================================

export type NivelLealtad = 'bronce' | 'plata' | 'oro';

// =============================================================================
// PROGRESO DE NIVEL
// =============================================================================

export interface ProgresoNivel {
  puntosActuales: number;
  puntosMinNivel: number;
  puntosMaxNivel: number | null;
  porcentaje: number;
  puntosFaltantes: number | null;
  siguienteNivel: 'plata' | 'oro' | null;
}

// =============================================================================
// BILLETERAS Y PUNTOS
// =============================================================================

/**
 * Billetera del usuario en un negocio específico.
 * Retornado por: GET /api/cardya/mis-puntos
 */
export interface BilleteraNegocio {
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;
  puntosCanjeadosTotal: number;
  nivelActual: NivelLealtad;
  multiplicador: number;
  progreso: ProgresoNivel;
}

/**
 * Resumen de transacción dentro del detalle de negocio.
 */
export interface TransaccionResumen {
  id: string;
  tipo: 'compra' | 'canje';
  monto: number;
  puntos: number;
  createdAt: string;
  descripcion: string | null;
}

/**
 * Detalle completo de la billetera en un negocio.
 * Retornado por: GET /api/cardya/negocio/:negocio_id
 */
export interface DetalleNegocioBilletera extends BilleteraNegocio {
  beneficios: string[];
  ultimasTransacciones: TransaccionResumen[];
  telefonoContacto: string | null;
  whatsappContacto: string | null;
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

/**
 * Recompensa disponible para el usuario.
 * Retornado por: GET /api/cardya/recompensas
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
  stock: number | null;
  tienesPuntosSuficientes: boolean;
  puntosFaltantes: number;
  estaAgotada: boolean;
}

export interface FiltrosRecompensas {
  negocioId?: string;
  soloDisponibles?: boolean;
  ciudad?: string; // Filtrar por ciudad del usuario
}

export interface CanjearRecompensaInput {
  recompensaId: string;
  sucursalId?: string;
}

// =============================================================================
// VOUCHERS
// =============================================================================

/**
 * Estado posible de un voucher.
 */
export type EstadoVoucher = 'pendiente' | 'usado' | 'expirado' | 'cancelado';

/**
 * Voucher de canje.
 * Retornado por:
 *   - POST /api/cardya/canjear (voucher recién generado)
 *   - GET /api/cardya/vouchers (lista de vouchers)
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
  estado: EstadoVoucher;
  expiraAt: string;
  usadoAt: string | null;
  createdAt: string;
}

export interface FiltrosVouchers {
  estado?: EstadoVoucher;
}

// =============================================================================
// HISTORIAL — TIPOS DEL BACKEND
// =============================================================================

/**
 * Transacción de compra (puntos ganados).
 * Retornado por: GET /api/cardya/historial/compras
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
 * Transacción de canje (puntos gastados).
 * Retornado por: GET /api/cardya/historial/canjes
 */
export interface HistorialCanje {
  id: string;
  recompensaId: string;
  recompensaNombre: string;
  recompensaImagen: string | null;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  puntosUsados: number;
  estado: 'usado' | 'cancelado';
  createdAt: string;
  usadoAt: string | null;
  canjeadoPorNombre: string | null;
}

export interface FiltrosHistorialCompras {
  negocioId?: string;
  limit?: number;
  offset?: number;
}

export interface FiltrosHistorialCanjes {
  negocioId?: string;
  estado?: 'usado' | 'cancelado';
  limit?: number;
  offset?: number;
}

// =============================================================================
// HISTORIAL — TIPO UNIFICADO PARA UI
// =============================================================================

/**
 * Tipo de transacción en el historial unificado.
 */
export type TipoTransaccion = 'compra' | 'canje';

/**
 * Transacción unificada para la UI.
 *
 * El store fusiona HistorialCompra + HistorialCanje en este tipo
 * para que TablaHistorialCompras y ModalDetalleTransaccion
 * puedan mostrar ambos tipos en una sola lista.
 */
export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  fecha: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  puntos: number;
  descripcion: string;
  // ── Campos de compra (solo cuando tipo === 'compra') ──
  montoCompra?: number;
  sucursalNombre?: string | null;
  multiplicador?: number;
  empleadoNombre?: string | null;
}

// =============================================================================
// ESTADOS DE UI
// =============================================================================

export type TabCardYA = 'billeteras' | 'recompensas' | 'vouchers' | 'historial';