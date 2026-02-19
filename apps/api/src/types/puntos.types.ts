/**
 * puntos.types.ts
 * ================
 * Tipos TypeScript compartidos para el módulo de Puntos
 * 
 * Ubicación: apps/api/src/types/puntos.types.ts
 */

// =============================================================================
// RESPUESTA GENÉRICA DE SERVICIOS
// =============================================================================

export interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: number;
}

// =============================================================================
// CONFIGURACIÓN DE PUNTOS
// =============================================================================

export interface ConfigPuntosCompleta {
  puntosPorPeso: number;
  pesosOriginales?: number;      // Valor exacto que escribió el usuario (ej: 250)
  puntosOriginales?: number;     // Valor exacto que escribió el usuario (ej: 35)
  diasExpiracionPuntos: number | null;
  diasExpiracionVoucher: number;
  activo: boolean;
  nivelesActivos: boolean;
  nivelBronce: {
    min: number;
    max: number;
    multiplicador: number;
  };
  nivelPlata: {
    min: number;
    max: number;
    multiplicador: number;
  };
  nivelOro: {
    min: number;
    multiplicador: number;
  };
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

export interface Recompensa {
  id: string;
  negocioId: string;
  nombre: string;
  descripcion: string | null;
  puntosRequeridos: number;
  imagenUrl: string | null;
  stock: number | null; // NULL = ilimitado
  requiereAprobacion: boolean;
  activa: boolean;
  orden: number;
  createdAt: string | null;
  updatedAt: string | null;
}

// =============================================================================
// ESTADÍSTICAS
// =============================================================================

export interface ClienteConPuntos {
  usuarioId: string;
  nombre: string;
  avatarUrl: string | null;
  puntosDisponibles: number;
}

export interface EstadisticasPuntos {
  puntosOtorgados: number;
  puntosCanjeados: number;
  puntosActivos: number;
  clientesConPuntos: number;
}

// =============================================================================
// TRANSACCIONES
// =============================================================================

export interface TransaccionPuntos {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteAvatarUrl: string | null; // Avatar del cliente (Cloudinary)
  montoCompra: number;
  puntosOtorgados: number;
  multiplicadorAplicado: number;
  estado: string;
  concepto: string | null;
  createdAt: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  empleadoId: string | null;
  empleadoNombre: string | null;
  empleadoTipo: 'empleado' | 'usuario' | null;
  montoEfectivo: number;
  montoTarjeta: number;
  montoTransferencia: number;
  fotoTicketUrl: string | null;
  nota: string | null;
  numeroOrden: string | null;
  motivoRevocacion: string | null;
}

// =============================================================================
// PERIODOS (para filtros)
// =============================================================================

export type PeriodoEstadisticas = 'hoy' | 'semana' | 'mes' | '3meses' | 'anio' | 'todo';

// =============================================================================
// KPIs TRANSACCIONES (Página Transacciones BS)
// =============================================================================

export interface KPIsTransacciones {
  totalVentas: number;
  totalTransacciones: number;
  ticketPromedio: number;
  totalRevocadas: number;
}

// =============================================================================
// KPIs CLIENTES (Página Clientes BS)
// =============================================================================

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
// CLIENTE COMPLETO (Lista de clientes BS)
// =============================================================================

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
// DETALLE CLIENTE (Modal detalle BS)
// =============================================================================

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
// KPIs CANJES (Tab Canjes en Transacciones BS)
// =============================================================================

export interface KPIsCanjes {
  pendientes: number;
  usados: number;
  vencidos: number;
  totalCanjes: number;
}

// =============================================================================
// VOUCHER CANJE (Tabla + Modal Canjes en Transacciones BS)
// =============================================================================

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