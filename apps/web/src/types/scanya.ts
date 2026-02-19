/**
 * scanya.ts
 * ==========
 * Tipos TypeScript para ScanYA (sistema de punto de venta).
 *
 * IMPORTANTE:
 * - Estos tipos estÃ¡n en camelCase (frontend)
 * - El backend los envÃ­a en snake_case
 * - El middleware de transformaciÃ³n automÃ¡tica los convierte
 * - Por tanto, estos tipos coinciden EXACTAMENTE con lo que llega al frontend
 *
 * UbicaciÃ³n: apps/web/src/types/scanya.ts
 */

// =============================================================================
// ENUMS Y TIPOS BÃSICOS
// =============================================================================

/**
 * Tipo de usuario en ScanYA
 */
export type TipoUsuarioScanYA = 'dueno' | 'gerente' | 'empleado';

/**
 * Rol del usuario (basado en la tabla usuarios)
 */
export type RolScanYA = 'dueno' | 'gerente' | 'empleado';

/**
 * Opciones para foto de ticket
 */
export type OpcionFotoTicket = 'nunca' | 'opcional' | 'obligatoria';

/**
 * Estado de un recordatorio
 */
export type EstadoRecordatorio = 'pendiente' | 'procesado' | 'descartado';

// =============================================================================
// TIPOS DE USUARIO SCANYA
// =============================================================================

/**
 * Usuario autenticado en ScanYA
 * Puede ser: DueÃ±o, Gerente o Empleado
 */
export interface UsuarioScanYA {
  // IdentificaciÃ³n
  tipo: TipoUsuarioScanYA;
  usuarioId: string;

  // Datos del negocio
  negocioId: string;
  nombreNegocio: string;
  logoNegocio: string | null;

  // Sucursal
  sucursalId: string;
  nombreSucursal: string;

  // Usuario
  nombreUsuario: string;

  // Permisos administrativos
  puedeElegirSucursal: boolean;
  puedeConfigurarNegocio: boolean;

  // Permisos operativos
  permisos: PermisosEmpleado;
}

/**
 * Permisos granulares del empleado
 */
export interface PermisosEmpleado {
  registrarVentas: boolean;
  procesarCanjes: boolean;
  verHistorial: boolean;
  responderChat: boolean;
  responderResenas: boolean;
}

// =============================================================================
// INPUTS (LO QUE ENVIAMOS AL BACKEND)
// =============================================================================

/**
 * Input para login de dueÃ±o/gerente
 */
export interface LoginDuenoInput {
  correo: string;
  contrasena: string;
  sucursalId?: string; // Opcional: si no se envÃ­a, usa sucursal principal
}

/**
 * Input para login de empleado
 */
export interface LoginEmpleadoInput {
  nick: string;
  pin: string; // 4 dÃ­gitos
}

/**
 * Input para identificar cliente
 */
export interface IdentificarClienteInput {
  telefono: string;
}

/**
 * Input para validar cupÃ³n
 */
export interface ValidarCuponInput {
  codigo: string;
  clienteId: string;
}

/**
 * Input para otorgar puntos
 */
export interface OtorgarPuntosInput {
  clienteId: string;
  montoTotal: number;
  montoEfectivo?: number;
  montoTarjeta?: number;
  montoTransferencia?: number;
  cuponId?: string;
  fotoTicketUrl?: string;
  numeroOrden?: string;
  nota?: string;
  concepto?: string;
  recordatorioId?: string;
}

/**
 * Input para crear recordatorio
 */
export interface CrearRecordatorioInput {
  telefonoOAlias: string;
  monto: number;
  montoEfectivo?: number;
  montoTarjeta?: number;
  montoTransferencia?: number;
  nota?: string;
  concepto?: string;
}

/**
 * Input para buscar cliente con vouchers
 */
export interface BuscarClienteConVouchersInput {
  telefono: string;
}

/**
 * Input para canjear voucher
 * Puede ser con QR (voucherId + usuarioId) o código manual
 */
export interface CanjearVoucherInput {
  voucherId?: string;
  usuarioId?: string;
  codigo?: string;
}

/**
 * Input para actualizar configuraciÃ³n ScanYA
 */
export interface ActualizarConfigScanYAInput {
  fotoTicket?: OpcionFotoTicket;
  alertaMontoAlto?: number | null;
  alertaTransaccionesHora?: number | null;
  requiereNumeroOrden?: boolean;
}

// =============================================================================
// RESPUESTAS (LO QUE RECIBIMOS DEL BACKEND - YA EN CAMELCASE)
// =============================================================================

/**
 * Respuesta de login exitoso (dueÃ±o o empleado)
 * NOTA: El backend devuelve todo mezclado en data (usuario + tokens)
 */
export interface RespuestaLoginScanYA extends UsuarioScanYA {
  accessToken: string;
  refreshToken: string;
}

/**
 * Respuesta de refresh token
 */
export interface RespuestaRefreshScanYA {
  accessToken: string;
  refreshToken: string;
}

/**
 * Turno activo en ScanYA
 */
export interface TurnoScanYA {
  id: string;
  negocioId: string;
  sucursalId: string;
  empleadoId: string | null;
  usuarioId: string | null;
  horaInicio: string; // ISO timestamp
  horaFin: string | null;
  puntosOtorgados: number;
  transacciones: number;
  cerradoPor: string | null;
  notasCierre: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Respuesta de obtener turno actual
 * El backend encapsula el turno en { turno: {...} }
 */
export interface RespuestaTurnoActual {
  turno: TurnoScanYA;
}

/**
 * Cliente identificado
 */
export interface ClienteScanYA {
  cliente: {
    id: string;
    nombre: string;
    apellidos: string | null;
    telefono: string;
    avatarUrl: string | null;
  };
  billetera: {
    puntosDisponibles: number;
    puntosAcumuladosTotal: number;
    nivelActual: string;
  } | null;
  esNuevoEnNegocio: boolean;
}

/**
 * CupÃ³n disponible del cliente
 */
export interface CuponDisponible {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  descuento: number;
  esDescuentoPorcentaje: boolean;
  validoHasta: string; // ISO date
  usado: boolean;
}

/**
 * CupÃ³n validado
 */
export interface CuponValidado {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  descuento: number;
  esDescuentoPorcentaje: boolean;
  validoHasta: string;

  // Info del cliente
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;

  // Estado
  valido: boolean;
  mensajeError?: string;
}

/**
 * Resultado de otorgar puntos
 */
export interface ResultadoOtorgarPuntos {
  transaccionId: string;
  puntosOtorgados: number;
  multiplicadorAplicado: number;
  nuevoTotalPuntos: number;
  nuevoNivel: string;

  // Info del cupÃ³n si se aplicÃ³
  cuponAplicado?: {
    codigo: string;
    descuento: number;
  };
}

/**
 * TransacciÃ³n en el historial (Fase 12 - Completa)
 */
export interface TransaccionScanYA {
  id: string;
  // Estado
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'rechazado';
  // Cliente
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteAvatarUrl: string | null;
  clienteNivel: string;
  // Montos
  montoTotal: number;
  montoEfectivo: number;
  montoTarjeta: number;
  montoTransferencia: number;
  // Puntos
  puntosOtorgados: number;
  multiplicadorAplicado: number;
  // QuiÃ©n registrÃ³
  registradoPor: string;
  registradoPorTipo: 'empleado' | 'dueno' | 'gerente';
  // Sucursal
  sucursalNombre: string;
  // Negocio
  negocioNombre: string;
  // Extras
  concepto: string | null;
  fotoTicketUrl: string | null;
  numeroOrden: string | null;
  nota: string | null;
  // CupÃ³n
  cuponCodigo: string | null;
  cuponDescuento: number | null;
  // Fecha
  createdAt: string;
}

/**
 * Voucher pendiente de canje (sin código visible)
 */
export interface VoucherPendiente {
  id: string;
  puntosUsados: number;
  expiraAt: string;
  recompensaNombre: string;
  recompensaDescripcion: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  clienteAvatarUrl: string | null;
}

/**
 * Voucher completo (para gestión)
 */
export interface VoucherCompleto {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioTelefono: string;
  usuarioAvatarUrl: string | null;
  recompensaId: string;
  recompensaNombre: string;
  recompensaDescripcion: string | null;
  puntosUsados: number;
  estado: 'pendiente' | 'usado' | 'vencido' | 'cancelado';
  expiraAt: string;
  usadoAt: string | null;
  usadoPorEmpleadoNombre: string | null;
  sucursalNombre: string;
}

/**
 * Filtros para obtener vouchers
 */
export interface FiltrosVouchers {
  estado?: 'pendiente' | 'usado' | 'expirado' | 'cancelado' | 'todos';
  sucursalId?: string;
  empleadoId?: string;
  pagina?: number;
  limite?: number;
}



/**
 * Cliente con sus vouchers pendientes
 * Respuesta de: POST /api/scanya/buscar-cliente-vouchers
 */
export interface ClienteConVouchers {
  cliente: {
    id: string;
    nombre: string;
    telefono: string;
    avatarUrl: string | null;
    nivel: string;
    puntosDisponibles: number;
  };
  vouchers: Array<{
    id: string;
    recompensaId: string;
    recompensaNombre: string;
    recompensaDescripcion: string | null;
    puntosUsados: number;
    expiraAt: string;
  }>;
}

/**
 * Recordatorio offline
 */
export interface RecordatorioScanYA {
  id: string;
  negocioId: string;
  sucursalId: string;
  empleadoId: string | null;
  telefonoOAlias: string;
  monto: number;
  montoEfectivo: number;
  montoTarjeta: number;
  montoTransferencia: number;
  nota: string | null;
  estado: EstadoRecordatorio;
  procesadoAt: string | null;
  procesadoPor: string | null;
  transaccionId: string | null;
  createdAt: string;
  // Campos opcionales del servidor (para mostrar en UI)
  empleadoNombre?: string;
  sucursalNombre?: string;
}

/**
 * ConfiguraciÃ³n de ScanYA
 */
export interface ConfiguracionScanYA {
  // Config ScanYA (operaciÃ³n PWA)
  fotoTicket: OpcionFotoTicket;
  alertaMontoAlto: number | null;
  alertaTransaccionesHora: number | null;
  requiereNumeroOrden: boolean;
  // Config Puntos (cÃ¡lculo de puntos)
  puntosPorPeso: number;
  minimoCompra: number;
  nivelesActivos: boolean;
  multiplicadores: {
    bronce: number;
    plata: number;
    oro: number;
  };
}

/**
 * ConfiguraciÃ³n de puntos (desde puntos_configuracion)
 */
export interface ConfiguracionPuntos {
  id: string;
  negocioId: string;
  valorPunto: number;
  porcentajePuntos: number;
  puntosMinimoCanje: number;
  diasValidezPuntos: number | null;
  nivelesActivos: boolean;

  // Nivel Bronce
  nivelBronceMin: number;
  nivelBronceMax: number;
  nivelBronceMultiplicador: number;
  nivelBronceNombre: string;

  // Nivel Plata
  nivelPlataMin: number;
  nivelPlataMax: number;
  nivelPlataMultiplicador: number;
  nivelPlataNombre: string;

  // Nivel Oro
  nivelOroMin: number;
  nivelOroMultiplicador: number;
  nivelOroNombre: string;
}

// =============================================================================
// RESEÑAS DEL NEGOCIO (para ScanYA / Business Studio)
// =============================================================================

/**
 * Reseña vista desde perspectiva del negocio.
 * Incluye datos del autor (cliente) y la respuesta del negocio si existe.
 */
export interface ResenaNegocio {
  id: string;
  rating: number | null;
  texto: string | null;
  createdAt: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  autor: {
    id: string;
    nombre: string;
    avatarUrl: string | null;
  };
  respuesta: {
    id: string;
    texto: string | null;
    createdAt: string | null;
  } | null;
}

// =============================================================================
// RESPUESTA ESTÃNDAR DEL BACKEND
// =============================================================================

/**
 * Estructura de respuesta estÃ¡ndar del backend
 */
export interface RespuestaAPI<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

// =============================================================================
// TIPOS PARA EL STORE
// =============================================================================

/**
 * RazÃ³n por la que se cerrÃ³ la sesiÃ³n
 */
export type RazonLogoutScanYA = 'manual' | 'inactividad' | 'sesion_expirada' | 'error';

/**
 * Estado del store de ScanYA
 */
export interface ScanYAState {
  // Usuario y tokens
  usuario: UsuarioScanYA | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Turno activo
  turnoActivo: TurnoScanYA | null;

  // UI
  cargando: boolean;
  hidratado: boolean;

  // Computed
  isAuthenticated: boolean;
  tienePermisoOtorgarPuntos: boolean;
  tienePermisoValidarCupones: boolean;

  // Acciones
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUsuario: (usuario: UsuarioScanYA) => void;
  loginExitoso: (usuario: UsuarioScanYA, accessToken: string, refreshToken: string) => Promise<void>;
  logout: (razon?: RazonLogoutScanYA) => void;
  hidratarAuth: () => Promise<void>;
  setTurnoActivo: (turno: TurnoScanYA | null) => void;
}