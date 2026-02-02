/**
 * scanyaService.ts
 * =================
 * Servicio para llamar a los endpoints de ScanYA.
 *
 * IMPORTANTE:
 * - Todas las respuestas ya vienen en camelCase (gracias al middleware)
 * - No necesitamos mappers manuales
 * - Los tipos coinciden exactamente con lo que llega
 *
 * Ubicación: apps/web/src/services/scanyaService.ts
 */

import { api, RespuestaAPI } from './api';
import type { AxiosError } from 'axios';
import type {
  LoginDuenoInput,
  LoginEmpleadoInput,
  IdentificarClienteInput,
  ValidarCuponInput,
  OtorgarPuntosInput,
  CrearRecordatorioInput,
  ActualizarConfigScanYAInput,
  BuscarClienteConVouchersInput,
  CanjearVoucherInput,
  FiltrosVouchers,
  RespuestaLoginScanYA,
  RespuestaRefreshScanYA,
  UsuarioScanYA,
  TurnoScanYA,
  ClienteScanYA,
  ClienteConVouchers,
  CuponValidado,
  ResultadoOtorgarPuntos,
  TransaccionScanYA,
  VoucherPendiente,
  VoucherCompleto,
  RecordatorioScanYA,
  ConfiguracionScanYA,
  ConfiguracionPuntos,
} from '../types/scanya';

// =============================================================================
// BASE URL
// =============================================================================

const BASE = '/scanya';

// =============================================================================
// AUTENTICACIÓN
// =============================================================================

/**
 * Login de dueño/gerente
 * POST /api/scanya/login-dueno
 */
export async function loginDueno(datos: LoginDuenoInput): Promise<RespuestaAPI<RespuestaLoginScanYA>> {
  const response = await api.post<RespuestaAPI<RespuestaLoginScanYA>>(`${BASE}/login-dueno`, datos);
  return response.data;
}

/**
 * Login de empleado
 * POST /api/scanya/login-empleado
 */
export async function loginEmpleado(datos: LoginEmpleadoInput): Promise<RespuestaAPI<RespuestaLoginScanYA>> {
  const response = await api.post<RespuestaAPI<RespuestaLoginScanYA>>(`${BASE}/login-empleado`, datos);
  return response.data;
}

/**
 * Renovar tokens
 * POST /api/scanya/refresh
 */
export async function refresh(refreshToken: string): Promise<RespuestaAPI<RespuestaRefreshScanYA>> {
  const response = await api.post<RespuestaAPI<RespuestaRefreshScanYA>>(`${BASE}/refresh`, { refreshToken });
  return response.data;
}

/**
 * Obtener usuario actual
 * GET /api/scanya/yo
 */
export async function obtenerYo(): Promise<RespuestaAPI<UsuarioScanYA>> {
  const response = await api.get<RespuestaAPI<UsuarioScanYA>>(`${BASE}/yo`);
  return response.data;
}

/**
 * Cerrar sesión
 * POST /api/scanya/logout
 */
export async function logout(): Promise<RespuestaAPI> {
  const response = await api.post<RespuestaAPI>(`${BASE}/logout`);
  return response.data;
}

// =============================================================================
// TURNOS (FASE 4)
// =============================================================================

/**
 * Abrir turno
 * POST /api/scanya/turno/abrir
 */
export async function abrirTurno(): Promise<RespuestaAPI<TurnoScanYA>> {
  const response = await api.post<RespuestaAPI<TurnoScanYA>>(`${BASE}/turno/abrir`);
  return response.data;
}

/**
 * Obtener turno actual
 * GET /api/scanya/turno/actual
 */
export async function obtenerTurnoActual(): Promise<RespuestaAPI<TurnoScanYA>> {
  const response = await api.get<RespuestaAPI<TurnoScanYA>>(`${BASE}/turno/actual`);
  return response.data;
}

/**
 * Cerrar turno
 * POST /api/scanya/turno/cerrar
 */
export async function cerrarTurno(turnoId: string, notasCierre?: string): Promise<RespuestaAPI<TurnoScanYA>> {
  const response = await api.post<RespuestaAPI<TurnoScanYA>>(`${BASE}/turno/cerrar`, {
    turnoId,
    notasCierre,
  });
  return response.data;
}

// =============================================================================
// CLIENTES Y PUNTOS (FASE 5)
// =============================================================================

/**
 * Identificar cliente por teléfono
 * POST /api/scanya/identificar-cliente
 */
export async function identificarCliente(datos: IdentificarClienteInput): Promise<RespuestaAPI<ClienteScanYA>> {
  const response = await api.post<RespuestaAPI<ClienteScanYA>>(`${BASE}/identificar-cliente`, datos);
  return response.data;
}

/**
 * Validar cupón
 * POST /api/scanya/validar-cupon
 */
export async function validarCupon(datos: ValidarCuponInput): Promise<RespuestaAPI<CuponValidado>> {
  const response = await api.post<RespuestaAPI<CuponValidado>>(`${BASE}/validar-cupon`, datos);
  return response.data;
}

/**
 * Otorgar puntos (registrar venta)
 * POST /api/scanya/otorgar-puntos
 */
export async function otorgarPuntos(datos: OtorgarPuntosInput): Promise<RespuestaAPI<ResultadoOtorgarPuntos>> {
  try {
    const response = await api.post<RespuestaAPI<ResultadoOtorgarPuntos>>(`${BASE}/otorgar-puntos`, datos);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<RespuestaAPI<ResultadoOtorgarPuntos>>;

    // Si el backend regresó un error con formato, devolverlo
    if (axiosError.response?.data) {
      return axiosError.response.data;
    }

    // Error genérico
    return {
      success: false,
      message: axiosError.message || 'Error al procesar la solicitud',
    } as RespuestaAPI<ResultadoOtorgarPuntos>;
  }
}

/**
 * Periodo para filtrar historial
 */
export type PeriodoHistorial = 'hoy' | 'semana' | 'mes' | '3meses' | 'ano';

/**
 * Obtener historial de transacciones
 * GET /api/scanya/historial
 */
export async function obtenerHistorial(
  periodo: PeriodoHistorial = 'mes',
  pagina: number = 1,
  limite: number = 20,
  sucursalId?: string,    // ← AGREGAR
  empleadoId?: string     // ← AGREGAR
): Promise<RespuestaAPI<{
  transacciones: TransaccionScanYA[];
  total: number;
  pagina: number;
  totalPaginas: number;
}>> {
  const response = await api.get<RespuestaAPI<{
    transacciones: TransaccionScanYA[];
    total: number;
    pagina: number;
    totalPaginas: number;
  }>>(`${BASE}/historial`, {
    params: { periodo, pagina, limite, sucursalId, empleadoId },
  });
  return response.data;
}

/**
 * Obtener vouchers pendientes de canje
 * GET /api/scanya/vouchers-pendientes
 */
export async function obtenerVouchersPendientes(): Promise<RespuestaAPI<{
  vouchers: VoucherPendiente[];
  total: number;
}>> {
  const response = await api.get<RespuestaAPI<{
    vouchers: VoucherPendiente[];
    total: number;
  }>>(`${BASE}/vouchers-pendientes`);
  return response.data;
}

/**
 * Obtener vouchers con filtros (gestión completa)
 * GET /api/scanya/vouchers
 */
export async function obtenerVouchers(
  filtros: FiltrosVouchers = {}
): Promise<RespuestaAPI<{
  vouchers: VoucherCompleto[];
  total: number;
  pagina: number;
  totalPaginas: number;
}>> {
  const response = await api.get<RespuestaAPI<{
    vouchers: VoucherCompleto[];
    total: number;
    pagina: number;
    totalPaginas: number;
  }>>(`${BASE}/vouchers`, {
    params: filtros,
  });
  return response.data;
}

/**
 * Buscar cliente con sus vouchers pendientes
 * POST /api/scanya/buscar-cliente-vouchers
 */
export async function buscarClienteConVouchers(
  datos: BuscarClienteConVouchersInput
): Promise<RespuestaAPI<ClienteConVouchers>> {
  const response = await api.post<RespuestaAPI<ClienteConVouchers>>(
    `${BASE}/buscar-cliente-vouchers`,
    datos
  );
  return response.data;
}

/**
 * Canjear voucher (QR o código manual)
 * POST /api/scanya/validar-voucher
 */
export async function canjearVoucher(datos: CanjearVoucherInput): Promise<RespuestaAPI<{
  voucher: {
    id: string;
    codigo: string;
    puntosUsados: number;
    expiraAt: string;
  };
  recompensa: {
    id: string;
    nombre: string;
    descripcion: string | null;
    imagenUrl: string | null;
  };
  cliente: {
    id: string;
    nombre: string;
  };
}>> {
  const response = await api.post<RespuestaAPI<{
    voucher: {
      id: string;
      codigo: string;
      puntosUsados: number;
      expiraAt: string;
    };
    recompensa: {
      id: string;
      nombre: string;
      descripcion: string | null;
      imagenUrl: string | null;
    };
    cliente: {
      id: string;
      nombre: string;
    };
  }>>(`${BASE}/validar-voucher`, datos);
  return response.data;
}

// =============================================================================
// RECORDATORIOS (FASE 6)
// =============================================================================

/**
 * Crear recordatorio (venta offline)
 * POST /api/scanya/recordatorio
 */
export async function crearRecordatorio(datos: CrearRecordatorioInput): Promise<RespuestaAPI<RecordatorioScanYA>> {
  const response = await api.post<RespuestaAPI<RecordatorioScanYA>>(`${BASE}/recordatorio`, datos);
  return response.data;
}

/**
 * Obtener recordatorios pendientes
 * GET /api/scanya/recordatorios
 */
export async function obtenerRecordatorios(): Promise<RespuestaAPI<{
  recordatorios: RecordatorioScanYA[];
  total: number;
}>> {
  const response = await api.get<RespuestaAPI<{
    recordatorios: RecordatorioScanYA[];
    total: number;
  }>>(`${BASE}/recordatorios`);
  return response.data;
}

/**
 * Descartar recordatorio
 * PUT /api/scanya/recordatorio/:id/descartar
 */
export async function descartarRecordatorio(id: string): Promise<RespuestaAPI<RecordatorioScanYA>> {
  const response = await api.put<RespuestaAPI<RecordatorioScanYA>>(`${BASE}/recordatorio/${id}/descartar`);
  return response.data;
}

// =============================================================================
// CONFIGURACIÓN (FASE 7)
// =============================================================================

/**
 * Obtener configuración de ScanYA
 * GET /api/scanya/configuracion
 */
export async function obtenerConfigScanYA(): Promise<RespuestaAPI<ConfiguracionScanYA>> {
  const response = await api.get<RespuestaAPI<ConfiguracionScanYA>>(`${BASE}/configuracion`);
  return response.data;
}

/**
 * Actualizar configuración de ScanYA
 * PUT /api/scanya/configuracion
 */
export async function actualizarConfigScanYA(datos: ActualizarConfigScanYAInput): Promise<RespuestaAPI<ConfiguracionScanYA>> {
  const response = await api.put<RespuestaAPI<ConfiguracionScanYA>>(`${BASE}/configuracion`, datos);
  return response.data;
}

/**
 * Obtener configuración de puntos
 * GET /api/puntos/configuracion
 */
export async function obtenerConfigPuntos(): Promise<RespuestaAPI<ConfiguracionPuntos>> {
  const response = await api.get<RespuestaAPI<ConfiguracionPuntos>>('/puntos/configuracion');
  return response.data;
}

// =============================================================================
// CONTADORES (FASE 9)
// =============================================================================

/**
 * Obtener contadores para el dashboard
 * GET /api/scanya/contadores
 */
export async function obtenerContadores(): Promise<RespuestaAPI<{
  mensajesSinLeer: number;
  resenasPendientes: number;
  recordatoriosPendientes: number;
}>> {
  const response = await api.get<RespuestaAPI<{
    mensajesSinLeer: number;
    resenasPendientes: number;
    recordatoriosPendientes: number;
  }>>(`${BASE}/contadores`);
  return response.data;
}

/**
 * Obtener lista de sucursales para dropdown de filtros
 * GET /api/scanya/sucursales-lista
 */
export async function obtenerSucursalesLista(): Promise<RespuestaAPI<Array<{
  id: string;
  nombre: string;
}>>> {
  const response = await api.get<RespuestaAPI<Array<{
    id: string;
    nombre: string;
  }>>>(`${BASE}/sucursales-lista`);
  return response.data;
}

/**
 * Obtener lista de operadores (empleados + gerentes + dueño) para dropdown de filtros
 * GET /api/scanya/operadores-lista
 */
export async function obtenerOperadoresLista(sucursalId?: string): Promise<RespuestaAPI<Array<{
  id: string;
  nombre: string;
  tipo: 'empleado' | 'gerente' | 'dueno';
  sucursalId: string | null;
  sucursalNombre: string | null;
}>>> {
  const response = await api.get<RespuestaAPI<Array<{
    id: string;
    nombre: string;
    tipo: 'empleado' | 'gerente' | 'dueno';
    sucursalId: string | null;
    sucursalNombre: string | null;
  }>>>(`${BASE}/operadores-lista`, {
    params: sucursalId ? { sucursalId } : undefined,
  });
  return response.data;
}

// =============================================================================
// UPLOAD TICKET (FASE 11)
// =============================================================================

/**
 * Respuesta de URL pre-firmada para subir ticket
 */
export interface RespuestaUploadTicket {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Obtener URL pre-firmada para subir foto de ticket a R2
 * POST /api/scanya/upload-ticket
 */
export async function obtenerUrlSubidaTicket(
  nombreArchivo: string,
  contentType: string = 'image/webp'
): Promise<RespuestaAPI<RespuestaUploadTicket>> {
  const response = await api.post<RespuestaAPI<RespuestaUploadTicket>>(
    `${BASE}/upload-ticket`,
    { nombreArchivo, contentType }
  );
  return response.data;
}

// =============================================================================
// EXPORT DEFAULT (OBJETO CON TODAS LAS FUNCIONES)
// =============================================================================

const scanyaService = {
  // Autenticación
  loginDueno,
  loginEmpleado,
  refresh,
  obtenerYo,
  logout,

  // Turnos
  abrirTurno,
  obtenerTurnoActual,
  cerrarTurno,

  // Clientes y Puntos
  identificarCliente,
  validarCupon,
  otorgarPuntos,
  obtenerHistorial,
  obtenerVouchersPendientes,
  obtenerVouchers,
  buscarClienteConVouchers,
  canjearVoucher,

  // Recordatorios
  crearRecordatorio,
  obtenerRecordatorios,
  descartarRecordatorio,

  // Configuración
  obtenerConfigScanYA,
  actualizarConfigScanYA,
  obtenerConfigPuntos,

  // Contadores
  obtenerContadores,

  // Upload Ticket
  obtenerUrlSubidaTicket,

  // Listas para filtros
  obtenerSucursalesLista,
  obtenerOperadoresLista,
};

export default scanyaService;