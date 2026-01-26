/**
 * auth.schema.ts
 * ===============
 * Validaciones con Zod v4 para los endpoints de autenticación.
 * 
 * ¿Qué hace este archivo?
 * - Define las reglas que deben cumplir los datos que envía el usuario
 * - Si los datos no cumplen las reglas, devuelve errores claros
 * - Transforma datos (ej: correo a minúsculas)
 * 
 * Ubicación: apps/api/src/validations/auth.schema.ts
 * 
 * NOTA: Usando sintaxis de Zod v4 (diferente a v3)
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================
// Los definimos una vez y los usamos en varios schemas

/**
 * Campo: correo
 * - Debe ser un email válido
 * - Se convierte a minúsculas automáticamente
 * - Máximo 255 caracteres (igual que en la BD)
 */
const campoCorreo = z
  .string()
  .min(1, 'El correo es requerido')
  .email('El correo debe tener un formato válido')
  .max(255, 'El correo no puede exceder 255 caracteres')
  .trim()
  .toLowerCase();

/**
 * Campo: contrasena
 * - Mínimo 8 caracteres (seguridad básica)
 * - Máximo 72 caracteres (límite de bcrypt)
 * - Al menos 1 mayúscula, 1 minúscula, 1 número
 */
const campoContrasena = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede exceder 72 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
  .regex(/[a-z]/, 'La contraseña debe tener al menos una minúscula')
  .regex(/[0-9]/, 'La contraseña debe tener al menos un número');

/**
 * Campo: codigo (verificación)
 * - Exactamente 6 dígitos
 * - Solo números
 */
const campoCodigo = z
  .string()
  .trim()
  .min(1, 'El código es requerido')
  .length(6, 'El código debe tener exactamente 6 dígitos')
  .regex(/^\d+$/, 'El código solo debe contener números');

// =============================================================================
// SCHEMA 1: REGISTRO (soporta normal y Google OAuth)
// =============================================================================
// Para: POST /api/auth/registro

export const registroSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  apellidos: z
    .string()
    .trim()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100, 'Los apellidos no pueden exceder 100 caracteres'),

  correo: campoCorreo,

  // Contraseña: requerida solo si NO viene googleIdToken
  contrasena: campoContrasena.optional(),

  // Google OAuth: si viene, no se requiere contraseña
  googleIdToken: z
    .string()
    .min(1, 'El token de Google es requerido')
    .optional(),

  // Avatar de Google (opcional)
  avatar: z
    .string()
    .url('El avatar debe ser una URL válida')
    .optional()
    .nullable(),

  telefono: z
    .string()
    .trim()
    .regex(/^\+52\d{10}$/, 'El teléfono debe tener formato +52XXXXXXXXXX (10 dígitos)')
    .optional()
    .nullable(),

  perfil: z
    .enum(['personal', 'comercial'])
    .default('personal'),

  // Nombre del negocio (solo si perfil es comercial)
  nombreNegocio: z
    .string()
    .trim()
    .min(2, 'El nombre del negocio debe tener al menos 2 caracteres')
    .max(120, 'El nombre del negocio no puede exceder 120 caracteres')
    .optional()
    .nullable(),

  // Términos y condiciones: siempre requerido
  aceptaTerminos: z
    .boolean()
    .refine(val => val === true, {
      message: 'Debes aceptar los términos y condiciones',
    }),

}).refine(
  // Validación: debe tener contraseña O googleIdToken
  (data) => data.contrasena || data.googleIdToken,
  {
    message: 'Debes proporcionar una contraseña o iniciar sesión con Google',
    path: ['contrasena'],
  }
).refine(
  // Validación: si es comercial, debe tener nombreNegocio
  (data) => {
    if (data.perfil === 'comercial') {
      return data.nombreNegocio && data.nombreNegocio.trim().length >= 2;
    }
    return true;
  },
  {
    message: 'El nombre del negocio es requerido para cuentas comerciales',
    path: ['nombreNegocio'],
  }
);

// Tipo TypeScript generado automáticamente del schema
export type RegistroInput = z.infer<typeof registroSchema>;

// =============================================================================
// SCHEMA 2: VERIFICAR EMAIL
// =============================================================================
// Para: POST /api/auth/verificar-email

export const verificarEmailSchema = z.object({
  correo: campoCorreo,
  codigo: campoCodigo,
});

export type VerificarEmailInput = z.infer<typeof verificarEmailSchema>;

// =============================================================================
// SCHEMA 3: REENVIAR VERIFICACIÓN
// =============================================================================
// Para: POST /api/auth/reenviar-verificacion

export const reenviarVerificacionSchema = z.object({
  correo: campoCorreo,
});

export type ReenviarVerificacionInput = z.infer<typeof reenviarVerificacionSchema>;

// =============================================================================
// FUNCIÓN HELPER: Formatear errores de Zod v4
// =============================================================================
// Convierte los errores de Zod en un array de strings legibles
// NOTA: En Zod v4, se usa "issues" en lugar de "errors"

export function formatearErroresZod(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    // Si el error tiene un path (campo), lo incluimos
    const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${campo}${issue.message}`;
  });
}

// =============================================================================
// SCHEMA 4: LOGIN
// =============================================================================
// Para: POST /api/auth/login

export const loginSchema = z.object({
  correo: campoCorreo,
  contrasena: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// =============================================================================
// SCHEMA 5: REFRESH TOKEN
// =============================================================================
// Para: POST /api/auth/refresh

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

// =============================================================================
// SCHEMA 6: OLVIDÉ CONTRASEÑA
// =============================================================================
// Para: POST /api/auth/olvide-contrasena
// El usuario ingresa su correo para recibir código de recuperación

export const olvideContrasenaSchema = z.object({
  correo: campoCorreo,
});

export type OlvideContrasenaInput = z.infer<typeof olvideContrasenaSchema>;

// =============================================================================
// SCHEMA 7: RESTABLECER CONTRASEÑA
// =============================================================================
// Para: POST /api/auth/restablecer-contrasena
// El usuario ingresa el código recibido + su nueva contraseña

export const restablecerContrasenaSchema = z.object({
  correo: campoCorreo,
  codigo: campoCodigo,
  nuevaContrasena: campoContrasena,
});

export type RestablecerContrasenaInput = z.infer<typeof restablecerContrasenaSchema>;

// =============================================================================
// SCHEMA 8: CAMBIAR CONTRASEÑA (usuario logueado)
// =============================================================================
// Para: PATCH /api/auth/cambiar-contrasena
// El usuario autenticado cambia su contraseña (debe ingresar la actual)

export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z.string().min(1, 'La contraseña actual es requerida'),
  nuevaContrasena: campoContrasena,
}).refine(
  (data) => data.contrasenaActual !== data.nuevaContrasena,
  {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['nuevaContrasena'],
  }
);

export type CambiarContrasenaInput = z.infer<typeof cambiarContrasenaSchema>;

// =============================================================================
// SCHEMA 9: GOOGLE OAUTH
// =============================================================================
// Para: POST /api/auth/google
// El frontend envía el ID token de Google después del login con Google

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'El token de Google es requerido'),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

// =============================================================================
// SCHEMA 10: ACTIVAR 2FA
// =============================================================================
// Para: POST /api/auth/2fa/activar
// El usuario envía el código TOTP para confirmar que configuró bien su app

export const activar2faSchema = z.object({
  codigo: campoCodigo,
});

export type Activar2faInput = z.infer<typeof activar2faSchema>;

// =============================================================================
// SCHEMA 11: VERIFICAR 2FA (durante login)
// =============================================================================
// Para: POST /api/auth/2fa/verificar
// El usuario con 2FA activado envía el código después del login

export const verificar2faSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'El código es requerido')
    .max(20, 'Código inválido'), // Puede ser TOTP (6) o código de respaldo (más largo)
  tokenTemporal: z.string().min(1, 'El token temporal es requerido'),
});

export type Verificar2faInput = z.infer<typeof verificar2faSchema>;

// =============================================================================
// SCHEMA 12: DESACTIVAR 2FA
// =============================================================================
// Para: DELETE /api/auth/2fa/desactivar
// El usuario debe confirmar con su código TOTP actual

export const desactivar2faSchema = z.object({
  codigo: campoCodigo,
});

export type Desactivar2faInput = z.infer<typeof desactivar2faSchema>;