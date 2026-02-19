/**
 * ============================================================================
 * TIPOS - Módulo Clientes (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/types/clientes.ts
 *
 * PROPÓSITO:
 * Tipos TypeScript para la página de Clientes en Business Studio:
 *   - KPIs del header
 *   - Lista de clientes (tabla)
 *   - Detalle de cliente (modal)
 *
 * Alineado con: apps/api/src/types/puntos.types.ts
 */

// =============================================================================
// KPIs CLIENTES (Header de página)
// =============================================================================

/**
 * 4 KPIs retornados por GET /api/clientes/kpis
 * Filtrados por sucursal (automático vía interceptor).
 */
export interface KPIsClientes {
  totalClientes: number;
  distribucionNivel: {
    bronce: number;
    plata: number;
    oro: number;
  };
  nuevosEsteMes: number;
  inactivos30Dias: number;
}

// =============================================================================
// CLIENTE COMPLETO (Fila de tabla)
// =============================================================================

/**
 * Datos de un cliente para la lista/tabla.
 * Retornado por GET /api/clientes?busqueda=&nivel=&limit=&offset=
 */
export interface ClienteCompleto {
  id: string;
  nombre: string;
  telefono: string | null;
  avatarUrl: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;
  nivelActual: string;
  ultimaActividad: string | null;
  totalVisitas: number;
}

// =============================================================================
// DETALLE CLIENTE (Modal)
// =============================================================================

/**
 * Datos completos de un cliente para el modal de detalle.
 * Retornado por GET /api/clientes/:id
 */
export interface ClienteDetalle {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  avatarUrl: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;
  puntosCanjeadosTotal: number;
  nivelActual: string;
  clienteDesde: string | null;
  ultimaActividad: string | null;
  totalVisitas: number;
  totalGastado: number;
  promedioCompra: number;
  totalVouchers: number;
  vouchersUsados: number;
  // Configuración de niveles del negocio (para calcular progreso)
  configNiveles: {
    bronceMax: number;
    plataMin: number;
    plataMax: number;
    oroMin: number;
  } | null;
}

// =============================================================================
// FILTROS (para el store)
// =============================================================================

export type NivelCardYA = 'bronce' | 'plata' | 'oro';