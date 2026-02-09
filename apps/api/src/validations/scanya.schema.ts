/**
 * scanya.schema.ts
 * =================
 * Validaciones Zod para los endpoints de ScanYA.
 * 
 * Ubicación: apps/api/src/validations/scanya.schema.ts
 */

import { z } from 'zod';

// =============================================================================
// SCHEMAS DE AUTENTICACIÓN
// =============================================================================

/**
 * Login Dueño - Usa las mismas credenciales de AnunciaYA
 */
export const loginDuenoSchema = z.object({
  correo: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido')
    .transform((val) => val.toLowerCase().trim()),
  contrasena: z
    .string()
    .min(1, 'La contraseña es requerida'),
  sucursalId: z
    .string()
    .uuid('ID de sucursal inválido')
    .optional(), // Opcional: si no se envía, usa la sucursal principal
});

/**
 * Login Empleado - Nick + PIN
 */
export const loginEmpleadoSchema = z.object({
  nick: z
    .string()
    .min(1, 'El nick es requerido')
    .max(30, 'El nick no puede tener más de 30 caracteres')
    .transform((val) => val.toLowerCase().trim()),
  pin: z
    .string()
    .length(4, 'El PIN debe tener 4 dígitos')
    .regex(/^\d{4}$/, 'El PIN debe contener solo números'),
});

// =============================================================================
// SCHEMAS DE TURNOS (Fase 4)
// =============================================================================

/**
 * Cerrar Turno - ID requerido, notas opcionales
 */
export const cerrarTurnoSchema = z.object({
  turnoId: z
    .string()
    .uuid('ID de turno inválido'),
  notasCierre: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional(),
});

// =============================================================================
// SCHEMAS DE FASE 5: PUNTOS, CUPONES Y VOUCHERS
// =============================================================================

/**
 * Identificar Cliente - Buscar por teléfono
 */
export const identificarClienteSchema = z.object({
  telefono: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .max(15, 'El teléfono no puede tener más de 15 dígitos')
    .regex(/^\d+$/, 'El teléfono debe contener solo números')
    .transform((val) => val.trim()),
});

/**
 * Validar Cupón - Verificar antes de aplicar
 */
export const validarCuponSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'El código no puede tener más de 50 caracteres')
    .transform((val) => val.toUpperCase().trim()),
  clienteId: z
    .string()
    .uuid('ID de cliente inválido'),
});

/**
 * Otorgar Puntos - Registrar venta y dar puntos
 */
export const otorgarPuntosSchema = z.object({
  clienteId: z
    .string()
    .uuid('ID de cliente inválido'),
  montoTotal: z
    .number()
    .positive('El monto debe ser mayor a 0'),
  montoEfectivo: z
    .number()
    .min(0, 'El monto en efectivo no puede ser negativo')
    .default(0),
  montoTarjeta: z
    .number()
    .min(0, 'El monto en tarjeta no puede ser negativo')
    .default(0),
  montoTransferencia: z
    .number()
    .min(0, 'El monto en transferencia no puede ser negativo')
    .default(0),
  cuponId: z
    .string()
    .uuid('ID de cupón inválido')
    .optional(),
  fotoTicketUrl: z
    .string()
    .url('URL de foto inválida')
    .optional(),
  numeroOrden: z
    .string()
    .max(50, 'El número de orden no puede tener más de 50 caracteres')
    .optional(),
  nota: z
    .string()
    .max(500, 'La nota no puede tener más de 500 caracteres')
    .optional(),
  concepto: z
    .string()
    .max(200, 'El concepto no puede tener más de 200 caracteres')
    .optional(),
  recordatorioId: z.string().uuid().optional(),
});

/**
 * Historial de Transacciones - Filtros opcionales
 */
export const historialSchema = z.object({
  periodo: z
    .enum(['hoy', 'semana', 'mes', '3meses', 'ano'])
    .default('mes'),
  pagina: z
    .number()
    .int()
    .min(1)
    .default(1),
  limite: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),
});

/**
 * Validar Voucher - Por QR o código manual
 * 
 * Métodos:
 * 1. QR: voucherId + usuarioId (token temporal JWT del cliente)
 * 2. Código: solo el código de 6 dígitos (cliente ya identificado previamente)
 */
export const validarVoucherSchema = z.object({
  // Método QR: voucherId + usuarioId
  voucherId: z
    .string()
    .uuid('ID de voucher inválido')
    .optional(),
  usuarioId: z
    .string()
    .uuid('ID de usuario inválido')
    .optional(),
  // Método manual: solo código de 6 caracteres
  codigo: z
    .string()
    .length(6, 'El código debe tener 6 caracteres')
    .regex(/^[A-Z0-9]{6}$/, 'Código inválido')
    .optional(),
}).refine(
  (data) => {
    // Debe venir QR (voucherId + usuarioId) O código manual (solo codigo)
    const tieneQR = data.voucherId && data.usuarioId;
    const tieneCodigo = data.codigo;
    return tieneQR || tieneCodigo;
  },
  { message: 'Debe proporcionar (voucherId + usuarioId) para QR o (codigo) para validación manual' }
);

/**
 * Buscar Cliente con Vouchers - Para flujo de canje
 */
export const buscarClienteConVouchersSchema = z.object({
  telefono: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .max(15, 'El teléfono no puede tener más de 15 dígitos'),
});

/**
 * Obtener Vouchers - Gestión completa con filtros
 */
export const obtenerVouchersSchema = z.object({
  estado: z
    .enum(['pendiente', 'usado', 'expirado', 'cancelado', 'todos'])
    .default('pendiente'),
  sucursalId: z
    .string()
    .uuid('ID de sucursal inválido')
    .optional(),
  empleadoId: z.string().uuid().optional(),
  pagina: z
    .number()
    .int()
    .min(1)
    .default(1),
  limite: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),
});

// =============================================================================
// SCHEMAS DE FASE 6: RECORDATORIOS
// =============================================================================

/**
 * Crear Recordatorio - Para ventas offline
 */
export const crearRecordatorioSchema = z.object({
  telefonoOAlias: z
    .string()
    .min(1, 'El teléfono o alias es requerido')
    .max(50, 'El teléfono o alias no puede tener más de 50 caracteres')
    .transform((val) => val.trim()),
  monto: z
    .number()
    .positive('El monto debe ser mayor a 0'),
  montoEfectivo: z
    .number()
    .min(0, 'El monto en efectivo no puede ser negativo')
    .default(0),
  montoTarjeta: z
    .number()
    .min(0, 'El monto en tarjeta no puede ser negativo')
    .default(0),
  montoTransferencia: z
    .number()
    .min(0, 'El monto en transferencia no puede ser negativo')
    .default(0),
  nota: z
    .string()
    .max(500, 'La nota no puede tener más de 500 caracteres')
    .optional(),
  concepto: z
    .string()
    .max(200, 'El concepto no puede tener más de 200 caracteres')
    .optional(),
});


// =============================================================================
// SCHEMAS DE FASE 7: CONFIGURACIÓN SCANYA
// =============================================================================

/**
 * Actualizar Configuración ScanYA
 */
export const actualizarConfigScanYASchema = z.object({
  fotoTicket: z
    .enum(['nunca', 'opcional', 'obligatoria'])
    .optional(),
  alertaMontoAlto: z
    .number()
    .min(0, 'El monto de alerta no puede ser negativo')
    .nullable()
    .optional(),
  alertaTransaccionesHora: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 transacción por hora')
    .max(1000, 'Máximo 1000 transacciones por hora')
    .nullable()
    .optional(),
  requiereNumeroOrden: z
    .boolean()
    .optional(),
});

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

export type LoginDuenoInput = z.infer<typeof loginDuenoSchema>;
export type LoginEmpleadoInput = z.infer<typeof loginEmpleadoSchema>;
export type CerrarTurnoInput = z.infer<typeof cerrarTurnoSchema>;
export type IdentificarClienteInput = z.infer<typeof identificarClienteSchema>;
export type ValidarCuponInput = z.infer<typeof validarCuponSchema>;
export type OtorgarPuntosInput = z.infer<typeof otorgarPuntosSchema>;
export type HistorialInput = z.infer<typeof historialSchema>;
export type ValidarVoucherInput = z.infer<typeof validarVoucherSchema>;
export type BuscarClienteConVouchersInput = z.infer<typeof buscarClienteConVouchersSchema>;
export type ObtenerVouchersInput = z.infer<typeof obtenerVouchersSchema>;
export type CrearRecordatorioInput = z.infer<typeof crearRecordatorioSchema>;
export type ActualizarConfigScanYAInput = z.infer<typeof actualizarConfigScanYASchema>;

// =============================================================================
// FUNCIÓN AUXILIAR PARA FORMATEAR ERRORES
// =============================================================================

/**
 * Convierte errores de Zod a un formato más amigable
 */
export function formatearErroresZod(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo = issue.path.join('.');
    errores[campo] = issue.message;
  }

  return errores;
}