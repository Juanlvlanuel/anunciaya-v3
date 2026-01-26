/**
 * scanya.controller.ts
 * =====================
 * Controlador para los endpoints de ScanYA.
 * 
 * Ubicación: apps/api/src/controllers/scanya.controller.ts
 */

import type { Request, Response } from 'express';
import {
  loginDuenoSchema,
  loginEmpleadoSchema,
  cerrarTurnoSchema,
  identificarClienteSchema,
  validarCuponSchema,
  otorgarPuntosSchema,
  historialSchema,
  validarVoucherSchema,
  buscarClienteConVouchersSchema,
  obtenerVouchersSchema,
  formatearErroresZod,
  crearRecordatorioSchema,
  actualizarConfigScanYASchema,
} from '../validations/scanya.schema.js';
import {
  loginDueno,
  loginEmpleado,
  refrescarTokenScanYA,
  obtenerUsuarioScanYA,
  abrirTurno,
  obtenerTurnoActual,
  cerrarTurno,
  identificarCliente,
  validarCupon,
  otorgarPuntos,
  obtenerHistorial,
  validarVoucher,
  obtenerVouchersPendientes,
  obtenerVouchers,
  buscarClienteConVouchers,
  crearRecordatorio,
  obtenerRecordatorios,
  descartarRecordatorio,
  obtenerConfigScanYA,
  actualizarConfigScanYA,
  generarUrlUploadTicket,
  obtenerContadores,
} from '../services/scanya.service.js';

// =============================================================================
// CONTROLLER 1: LOGIN DUEÑO
// =============================================================================

/**
 * POST /api/scanya/login-dueno
 * 
 * Autentica al dueño del negocio usando las credenciales de AnunciaYA.
 * 
 * Body esperado:
 * {
 *   "correo": "dueno@ejemplo.com",
 *   "contrasena": "MiPassword123",
 *   "sucursalId": "uuid-opcional" // Si no se envía, usa la sucursal principal
 * }
 */
export async function loginDuenoController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = loginDuenoSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos de login inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await loginDueno(validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 2: LOGIN EMPLEADO
// =============================================================================

/**
 * POST /api/scanya/login-empleado
 * 
 * Autentica a un empleado usando Nick + PIN.
 * 
 * Body esperado:
 * {
 *   "nick": "carlos",
 *   "pin": "1234"
 * }
 */
export async function loginEmpleadoController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = loginEmpleadoSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos de login inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await loginEmpleado(validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 3: REFRESH TOKEN
// =============================================================================

/**
 * POST /api/scanya/refresh
 * 
 * Renueva los tokens de ScanYA usando el refresh token.
 * 
 * Body esperado:
 * {
 *   "refreshToken": "token-actual"
 * }
 */
export async function refreshScanYAController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar que venga el refresh token
  // ---------------------------------------------------------------------------
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Refresh token requerido',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await refrescarTokenScanYA(refreshToken);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 4: OBTENER USUARIO ACTUAL
// =============================================================================

/**
 * GET /api/scanya/yo
 * 
 * Obtiene los datos del usuario actual de ScanYA.
 * Requiere token de ScanYA válido.
 */
export async function yoScanYAController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar que el middleware haya agregado el usuario
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerUsuarioScanYA(req.scanyaUsuario);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 5: LOGOUT (simple, solo del lado del cliente)
// =============================================================================

/**
 * POST /api/scanya/logout
 * 
 * Endpoint de logout para ScanYA.
 * En realidad el logout se maneja del lado del cliente (borrar tokens),
 * pero este endpoint sirve para confirmar la acción.
 */
export async function logoutScanYAController(_req: Request, res: Response): Promise<void> {
  // El logout real se hace del lado del cliente borrando los tokens
  // Este endpoint solo confirma la acción
  res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente',
  });
}

// =============================================================================
// CONTROLLER 6: ABRIR TURNO
// =============================================================================

/**
 * POST /api/scanya/turno/abrir
 * 
 * Abre un nuevo turno para el usuario autenticado.
 * 
 * Body esperado (opcional):
 * {
 *   "notas": "Turno de la mañana"
 * }
 */
export async function abrirTurnoController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio (sin parámetros adicionales)
  // ---------------------------------------------------------------------------
  const resultado = await abrirTurno(req.scanyaUsuario);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 7: OBTENER TURNO ACTUAL
// =============================================================================

/**
 * GET /api/scanya/turno/actual
 * 
 * Obtiene el turno activo del usuario autenticado.
 */
export async function obtenerTurnoActualController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerTurnoActual(req.scanyaUsuario);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 8: CERRAR TURNO
// =============================================================================

/**
 * POST /api/scanya/turno/cerrar
 * 
 * Cierra el turno activo del usuario autenticado.
 * 
 * Body esperado:
 * {
 *   "turnoId": "uuid-del-turno",
 *   "notasCierre": "Todo en orden" // opcional
 * }
 */
export async function cerrarTurnoController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = cerrarTurnoSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await cerrarTurno(
    req.scanyaUsuario,
    validacion.data.turnoId,
    validacion.data.notasCierre
  );

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 9: IDENTIFICAR CLIENTE (Fase 5)
// =============================================================================

/**
 * POST /api/scanya/identificar-cliente
 * 
 * Busca un cliente por su número de teléfono.
 * 
 * Body esperado:
 * {
 *   "telefono": "6441234567"
 * }
 */
export async function identificarClienteController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = identificarClienteSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await identificarCliente(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 10: VALIDAR CUPÓN (Fase 5)
// =============================================================================

/**
 * POST /api/scanya/validar-cupon
 * 
 * Verifica si un cupón es válido antes de aplicarlo.
 * 
 * Body esperado:
 * {
 *   "codigo": "DESCUENTO20",
 *   "clienteId": "uuid-del-cliente"
 * }
 */
export async function validarCuponController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = validarCuponSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await validarCupon(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 11: OTORGAR PUNTOS (Fase 5)
// =============================================================================

/**
 * POST /api/scanya/otorgar-puntos
 * 
 * Registra una venta y otorga puntos al cliente.
 * 
 * Body esperado:
 * {
 *   "clienteId": "uuid-del-cliente",
 *   "montoTotal": 250.00,
 *   "montoEfectivo": 150.00,
 *   "montoTarjeta": 100.00,
 *   "montoTransferencia": 0,
 *   "cuponId": "uuid-del-cupon",  // opcional
 *   "fotoTicketUrl": "https://...", // opcional
 *   "numeroOrden": "ORD-001"  // opcional
 * }
 */
export async function otorgarPuntosController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = otorgarPuntosSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await otorgarPuntos(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 12: HISTORIAL DE TRANSACCIONES (Fase 12 - COMPLETA)
// =============================================================================

/**
 * GET /api/scanya/historial
 * 
 * Obtiene el historial de transacciones con filtros por rol y fecha.
 * 
 * Query params:
 * - periodo: 'hoy' | 'semana' | 'mes' | '3meses' | 'ano' (default: 'mes')
 * - pagina: número de página (default: 1)
 * - limite: registros por página (default: 20)
 */
export async function historialController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Obtener y validar query params
  // ---------------------------------------------------------------------------
  const periodo = (req.query.periodo as string) || 'mes';
  const pagina = parseInt(req.query.pagina as string) || 1;
  const limite = parseInt(req.query.limite as string) || 20;

  const validacion = historialSchema.safeParse({ periodo, pagina, limite });

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Parámetros inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerHistorial(
    req.scanyaUsuario,
    validacion.data.periodo,
    validacion.data.pagina,
    validacion.data.limite
  );

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}
// =============================================================================
// CONTROLLER 13: VALIDAR VOUCHER (Fase 5)
// =============================================================================

/**
 * POST /api/scanya/validar-voucher
 * 
 * Valida un voucher de recompensa para su entrega.
 * 
 * Body esperado (método QR):
 * {
 *   "voucherId": "uuid-del-voucher",
 *   "usuarioId": "uuid-del-usuario"
 * }
 * 
 * Body esperado (método código manual):
 * {
 *   "codigo": "ABC123"
 * }
 */
export async function validarVoucherController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = validarVoucherSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await validarVoucher(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 13B: OBTENER VOUCHERS CON FILTROS (Nueva - Gestión Completa)
// =============================================================================

/**
 * GET /api/scanya/vouchers
 * 
 * Obtiene vouchers con filtros avanzados.
 * Permisos automáticos por rol.
 * 
 * Query params:
 * - estado: 'pendiente' | 'usado' | 'vencido' | 'cancelado' | 'todos' (default: 'pendiente')
 * - sucursalId: uuid (opcional, solo dueño/gerente)
 * - pagina: number (default: 1)
 * - limite: number (default: 20, max: 50)
 */
export async function obtenerVouchersController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Extraer y parsear query params
  // ---------------------------------------------------------------------------
  const estado = (req.query.estado as string) || 'pendiente';
  const sucursalId = req.query.sucursalId as string | undefined;
  const pagina = parseInt(req.query.pagina as string) || 1;
  const limite = parseInt(req.query.limite as string) || 20;

  // ---------------------------------------------------------------------------
  // Paso 3: Validar con Zod
  // ---------------------------------------------------------------------------
  const validacion = obtenerVouchersSchema.safeParse({
    estado,
    sucursalId,
    pagina,
    limite,
  });

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Parámetros inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 4: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerVouchers(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 5: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 13C: BUSCAR CLIENTE CON SUS VOUCHERS (Fase 5)
// =============================================================================
/**
 * Controller para buscar cliente con sus vouchers
 * POST /api/scanya/buscar-cliente-vouchers
 */
export async function buscarClienteConVouchersController(
  req: Request,
  res: Response
): Promise<void> {
  // Paso 1: Verificar autenticación
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // Paso 2: Extraer teléfono del body
  const { telefono } = req.body;

  // Paso 3: Validar con Zod
  const validacion = buscarClienteConVouchersSchema.safeParse({ telefono });

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Teléfono inválido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // Paso 4: Llamar al servicio
  const resultado = await buscarClienteConVouchers(
    req.scanyaUsuario,
    validacion.data.telefono
  );

  // Paso 5: Responder
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 14: VOUCHERS PENDIENTES (Fase 5)
// =============================================================================

/**
 * GET /api/scanya/vouchers-pendientes
 * 
 * Obtiene los vouchers pendientes de entrega del negocio.
 */
export async function vouchersPendientesController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerVouchersPendientes(req.scanyaUsuario);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 15: CREAR RECORDATORIO (Fase 6)
// =============================================================================

/**
 * POST /api/scanya/recordatorio
 * 
 * Crea un recordatorio de venta para procesar después.
 * 
 * Body esperado:
 * {
 *   "telefonoOAlias": "5551234567" o "señora rubia",
 *   "monto": 450.00,
 *   "montoEfectivo": 450.00,
 *   "montoTarjeta": 0,
 *   "montoTransferencia": 0,
 *   "nota": "Pagó con billete de $500"  // opcional
 * }
 */
export async function crearRecordatorioController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = crearRecordatorioSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await crearRecordatorio(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 16: OBTENER RECORDATORIOS (Fase 6)
// =============================================================================

/**
 * GET /api/scanya/recordatorios
 * 
 * Obtiene los recordatorios pendientes según el rol del usuario.
 */
export async function obtenerRecordatoriosController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerRecordatorios(req.scanyaUsuario);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}


// =============================================================================
// CONTROLLER 18: DESCARTAR RECORDATORIO (Fase 6)
// =============================================================================

/**
 * PUT /api/scanya/recordatorio/:id/descartar
 * 
 * Marca un recordatorio como descartado.
 */
export async function descartarRecordatorioController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Obtener ID del recordatorio
  // ---------------------------------------------------------------------------
  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      success: false,
      message: 'ID de recordatorio requerido',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await descartarRecordatorio(req.scanyaUsuario, id);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 19: OBTENER CONFIGURACIÓN SCANYA (Fase 7)
// =============================================================================

/**
 * GET /api/scanya/configuracion
 * 
 * Obtiene la configuración de ScanYA del negocio.
 */
export async function obtenerConfigScanYAController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await obtenerConfigScanYA(req.scanyaUsuario);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 20: ACTUALIZAR CONFIGURACIÓN SCANYA (Fase 7)
// =============================================================================

/**
 * PUT /api/scanya/configuracion
 * 
 * Actualiza la configuración de ScanYA del negocio.
 * Solo el dueño puede modificar la configuración.
 * 
 * Body esperado:
 * {
 *   "fotoTicket": "opcional",  // "nunca" | "opcional" | "obligatoria"
 *   "alertaMontoAlto": 5000,   // o null para desactivar
 *   "alertaTransaccionesHora": 20,  // o null para desactivar
 *   "requiereNumeroOrden": false
 * }
 */
export async function actualizarConfigScanYAController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = actualizarConfigScanYASchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await actualizarConfigScanYA(req.scanyaUsuario, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}


// =============================================================================
// CONTROLLER: GENERAR URL UPLOAD TICKET (Fase 9)
// =============================================================================

export async function uploadTicketController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.scanyaUsuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    const { nombreArchivo, contentType } = req.body;

    // Validar campos requeridos
    if (!nombreArchivo || !contentType) {
      res.status(400).json({
        success: false,
        message: 'nombreArchivo y contentType son requeridos',
      });
      return;
    }

    // Validar tipo de contenido
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!tiposPermitidos.includes(contentType)) {
      res.status(400).json({
        success: false,
        message: `Tipo no permitido. Usar: ${tiposPermitidos.join(', ')}`,
      });
      return;
    }

    const resultado = await generarUrlUploadTicket(req.scanyaUsuario, nombreArchivo, contentType);

    res.status(resultado.code ?? 200).json({
      success: resultado.success,
      message: resultado.message,
      data: resultado.data,
    });

  } catch (error) {
    console.error('Error en uploadTicketController:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// CONTROLLER: OBTENER CONTADORES (Fase 9)
// =============================================================================

export async function contadoresController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.scanyaUsuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    const resultado = await obtenerContadores(req.scanyaUsuario);

    res.status(resultado.code ?? 200).json({
      success: resultado.success,
      message: resultado.message,
      data: resultado.data,
    });

  } catch (error) {
    console.error('Error en contadoresController:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}