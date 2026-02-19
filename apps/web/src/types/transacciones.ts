/**
 * ============================================================================
 * TIPOS - Módulo Transacciones (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/types/transacciones.ts
 *
 * PROPÓSITO:
 * Tipos TypeScript para la página de Transacciones en Business Studio:
 *   - KPIs del header (Tab Ventas)
 *   - KPIs del Tab Canjes
 *   - Vouchers de canje
 *
 * NOTA: TransaccionPuntos y PeriodoEstadisticas siguen en puntos.ts
 *       porque son compartidos por múltiples módulos.
 *
 * Alineado con: apps/api/src/types/puntos.types.ts
 */

// =============================================================================
// KPIs TRANSACCIONES (Tab Ventas - Header de página)
// =============================================================================

/**
 * 4 KPIs retornados por GET /api/transacciones/kpis?periodo=semana
 * Filtrados por periodo y sucursal (automático vía interceptor).
 */
export interface KPIsTransacciones {
  totalVentas: number;
  totalTransacciones: number;
  ticketPromedio: number;
  totalRevocadas: number;
}

// =============================================================================
// KPIs CANJES (Tab Canjes en Transacciones BS)
// =============================================================================

/**
 * 4 KPIs retornados por GET /api/transacciones/canjes/kpis?periodo=semana
 * Filtrados por periodo y sucursal (automático vía interceptor).
 */
export interface KPIsCanjes {
  pendientes: number;
  usados: number;
  vencidos: number;
  totalCanjes: number;
}

// =============================================================================
// VOUCHER CANJE (Tabla + Modal Canjes en Transacciones BS)
// =============================================================================

/**
 * Voucher retornado por GET /api/transacciones/canjes
 * Usado tanto en tabla como en modal de detalle.
 */
export interface VoucherCanje {
  id: string;
  // Cliente
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteAvatarUrl: string | null;
  // Recompensa
  recompensaNombre: string;
  recompensaDescripcion: string | null;
  recompensaImagenUrl: string | null;
  // Puntos y estado
  puntosUsados: number;
  estado: 'pendiente' | 'usado' | 'expirado';
  // Fechas
  expiraAt: string | null;
  createdAt: string | null;
  usadoAt: string | null;
  // Donde se canjeó (null si pendiente)
  sucursalNombre: string | null;
  usadoPorNombre: string | null;
}