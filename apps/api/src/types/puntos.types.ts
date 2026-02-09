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
  empleadoTipo: 'empleado' | 'usuario' | null; // empleado, usuario (gerente/dueño), o null
}

// =============================================================================
// PERIODOS (para filtros)
// =============================================================================

export type PeriodoEstadisticas = 'hoy' | 'semana' | 'mes' | '3meses' | 'anio' | 'todo';