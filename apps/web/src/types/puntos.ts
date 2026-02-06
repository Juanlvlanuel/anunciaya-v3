/**
 * ============================================================================
 * TIPOS - Sistema de Lealtad (Puntos)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/types/puntos.ts
 *
 * PROPÓSITO:
 * Tipos TypeScript compartidos por los 3 módulos del sistema de lealtad:
 *   - Puntos        → Configuración, Recompensas, Estadísticas
 *   - Transacciones → Historial, Revocar
 *   - Clientes      → Top Clientes
 *
 * Alineado exactamente con:
 *   - apps/api/src/types/puntos.types.ts (interfaces de datos)
 *   - apps/api/src/services/puntos.service.ts (estructuras de retorno)
 */

// =============================================================================
// PERIODO (compartido por Estadísticas y Transacciones)
// =============================================================================

/**
 * Periodos disponibles para filtros temporales.
 * Mismo tipo que el backend en puntos.types.ts → PeriodoEstadisticas
 */
export type PeriodoEstadisticas =
  | 'hoy'
  | 'semana'
  | 'mes'
  | '3meses'
  | 'anio'
  | 'todo';

// =============================================================================
// RESPUESTAS DE LA API
// =============================================================================

/**
 * Estructura base que retorna TODOS los endpoints del módulo.
 * El backend siempre envuelve en: { success, message, data?, code? }
 */
export interface RespuestaBase {
  success: boolean;
  message: string;
  code?: number;
}

/**
 * Respuesta genérica con datos tipados.
 * Uso: RespuestaConDatos<ConfigPuntosCompleta>, RespuestaConDatos<Recompensa[]>, etc.
 */
export interface RespuestaConDatos<T> extends RespuestaBase {
  data: T;
}

/**
 * Respuesta de estadísticas: el controller agrega `periodo` al nivel raíz.
 * Ej: { success: true, message: '...', data: {...}, periodo: 'semana' }
 */
export interface RespuestaEstadisticas extends RespuestaConDatos<EstadisticasPuntos> {
  periodo: PeriodoEstadisticas;
}

// =============================================================================
// CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * Configuración completa del sistema de puntos por negocio.
 * Retornada por GET /api/puntos/configuracion
 * Estructura anidada con niveles (bronce/plata/oro).
 */
export interface ConfigPuntosCompleta {
  puntosPorPeso: number;
  pesosOriginales?: number;      // Valor exacto que escribió el usuario (ej: 250)
  puntosOriginales?: number;     // Valor exacto que escribió el usuario (ej: 35)
  diasExpiracionPuntos: number | null; // null = no expiran
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
    min: number; // Sin max → es el nivel máximo
    multiplicador: number;
  };
}

/**
 * Input para PUT /api/puntos/configuracion
 * Estructura FLAT (no anidada). Todos los campos opcionales.
 * El backend mapea nivelBronceMin → nivel_bronce_min en BD.
 */
export interface ActualizarConfigPuntosInput {
  puntosPorPeso?: number;         // Propiedad calculada (puntosGanados / pesosPor)
  pesosPor?: number;              // Valor original que escribió el usuario (ej: 250)
  puntosGanados?: number;         // Valor original que escribió el usuario (ej: 35)
  diasExpiracionPuntos?: number | null;
  diasExpiracionVoucher?: number;
  activo?: boolean;
  nivelesActivos?: boolean;
  // Nivel Bronce
  nivelBronceMin?: number;
  nivelBronceMax?: number;
  nivelBronceMultiplicador?: number;
  // Nivel Plata
  nivelPlataMin?: number;
  nivelPlataMax?: number;
  nivelPlataMultiplicador?: number;
  // Nivel Oro
  nivelOroMin?: number;
  nivelOroMultiplicador?: number;
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

/**
 * Recompensa completa (retornada por el backend).
 * stock: null = cantidad ilimitada.
 */
export interface Recompensa {
  id: string;
  negocioId: string;
  nombre: string;
  descripcion: string | null;
  puntosRequeridos: number;
  imagenUrl: string | null;
  stock: number | null;
  requiereAprobacion: boolean;
  activa: boolean;
  orden: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Input para POST /api/puntos/recompensas
 * La imagen se sube primero a Cloudinary desde el frontend,
 * y se envía solo la URL resultante en imagenUrl.
 */
export interface CrearRecompensaInput {
  nombre: string;
  descripcion?: string | null;
  puntosRequeridos: number;
  imagenUrl?: string | null;
  stock?: number | null; // null = ilimitado
  requiereAprobacion?: boolean;
  activa?: boolean;
  orden?: number;
}

/**
 * Input para PUT /api/puntos/recompensas/:id
 * Todos los campos opcionales.
 * eliminarImagen: true → backend elimina imagen de Cloudinary y pone null.
 * Si imagenUrl viene con valor nuevo → backend elimina la anterior automáticamente.
 */
export interface ActualizarRecompensaInput {
  nombre?: string;
  descripcion?: string | null;
  puntosRequeridos?: number;
  imagenUrl?: string | null;
  eliminarImagen?: boolean;
  stock?: number | null;
  requiereAprobacion?: boolean;
  activa?: boolean;
  orden?: number;
}

// =============================================================================
// ESTADÍSTICAS (KPIs)
// =============================================================================

/**
 * 4 KPIs retornados por GET /api/puntos/estadisticas
 * Filtrados por periodo y sucursal (según contexto del usuario).
 */
export interface EstadisticasPuntos {
  puntosOtorgados: number;
  puntosCanjeados: number;
  puntosActivos: number;
  clientesConPuntos: number;
}

// =============================================================================
// TRANSACCIONES
// =============================================================================

/**
 * Transacción de puntos con datos JOIN del cliente, sucursal y empleado.
 * empleadoTipo distingue si fue registrada por un empleado o por gerente/dueño.
 */
export interface TransaccionPuntos {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteAvatarUrl: string | null;
  montoCompra: number;
  puntosOtorgados: number;
  multiplicadorAplicado: number;
  estado: 'confirmado' | 'pendiente' | 'cancelado';
  createdAt: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  empleadoId: string | null;
  empleadoNombre: string | null;
  empleadoTipo: 'empleado' | 'usuario' | null;
}

// =============================================================================
// CLIENTES
// =============================================================================

/**
 * Cliente con sus puntos disponibles (retornado por GET /api/clientes/top).
 * nombre es CONCAT(nombre, apellidos) hecho en el backend con SQL.
 */
export interface ClienteConPuntos {
  usuarioId: string;
  nombre: string;
  avatarUrl: string | null;
  puntosDisponibles: number;
}

// =============================================================================
// ESTADOS DE UI (para los stores Zustand)
// =============================================================================

/**
 * Filtros del historial de transacciones.
 * Periodo controla el rango temporal, limit/offset la paginación.
 */
export interface FiltrosHistorial {
  periodo: PeriodoEstadisticas;
  limit: number;
  offset: number;
}

/**
 * Estado de carga genérico reutilizable en los 3 stores.
 */
export type EstadoCarga = 'inactivo' | 'cargando' | 'completado' | 'error';