/**
 * auth.controller.ts
 * ===================
 * Controlador para los endpoints de autenticación.
 * 
 * ¿Qué hace este archivo?
 * - Recibe las peticiones HTTP
 * - Valida los datos con Zod
 * - Llama al servicio correspondiente
 * - Devuelve las respuestas JSON
 * 
 * Ubicación: apps/api/src/controllers/auth.controller.ts
 */
import type { Request, Response } from 'express';

import {
  registroSchema,
  verificarEmailSchema,
  reenviarVerificacionSchema,
  loginSchema,
  refreshSchema,
  formatearErroresZod,
  olvideContrasenaSchema,
  restablecerContrasenaSchema,
  cambiarContrasenaSchema,
  googleAuthSchema,
  activar2faSchema,
  verificar2faSchema,
  desactivar2faSchema,
} from '../validations/auth.schema.js';
import {
  registrarUsuario,
  verificarEmail,
  reenviarCodigo,
  loginUsuario,
  refrescarToken,
  obtenerUsuarioActual,
  cerrarSesion,
  cerrarTodasSesiones,
  obtenerSesiones,
  solicitarRecuperacion,
  restablecerContrasena,
  cambiarContrasena,
  loginConGoogle,
  generar2fa,
  activar2fa,
  verificar2fa,
  desactivar2fa,
  cambiarModo,       
  obtenerInfoModo,
} from '../services/auth.service.js';

// =============================================================================
// CONTROLLER 1: REGISTRO
// =============================================================================

/**
 * POST /api/auth/registro
 * 
 * Registra un nuevo usuario en el sistema.
 * 
 * Body esperado:
 * {
 *   "nombre": "Juan",
 *   "apellidos": "Pérez García",
 *   "correo": "juan@ejemplo.com",
 *   "contrasena": "MiPassword123",
 *   "perfil": "personal"  // opcional, default: "personal"
 * }
 */
export async function registro(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = registroSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos de registro inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await registrarUsuario(validacion.data);

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
// CONTROLLER 2: VERIFICAR EMAIL
// =============================================================================

/**
 * POST /api/auth/verificar-email
 * 
 * Verifica el correo del usuario con el código de 6 dígitos.
 * 
 * Body esperado:
 * {
 *   "correo": "juan@ejemplo.com",
 *   "codigo": "123456"
 * }
 */
export async function verificarEmailController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = verificarEmailSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos de verificación inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await verificarEmail(validacion.data);

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
// CONTROLLER 3: REENVIAR VERIFICACIÓN
// =============================================================================

/**
 * POST /api/auth/reenviar-verificacion
 * 
 * Reenvía el código de verificación al correo.
 * 
 * Body esperado:
 * {
 *   "correo": "juan@ejemplo.com"
 * }
 */
export async function reenviarVerificacion(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = reenviarVerificacionSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Correo inválido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await reenviarCodigo(validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
  });
}

// =============================================================================
// CONTROLLER 4: LOGIN
// =============================================================================

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const validacion = loginSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos de login inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // Obtener IP y User-Agent del request
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || null;
  const userAgent = req.headers['user-agent'] || null;

  const resultado = await loginUsuario(validacion.data, ip, userAgent);

  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}
// =============================================================================
// CONTROLLER 5: REFRESH
// =============================================================================

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const validacion = refreshSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Refresh token requerido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ← AGREGAR: Obtener IP y User-Agent
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || null;
  const userAgent = req.headers['user-agent'] || null;

  // ← MODIFICAR: Pasar ip y userAgent al servicio
  const resultado = await refrescarToken(validacion.data, ip, userAgent);

  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 6: LOGOUT
// =============================================================================

/**
 * POST /api/auth/logout
 * Body: { "refreshToken": "xxx" }
 */
export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({
      success: false,
      message: 'Refresh token requerido para cerrar sesión',
    });
    return;
  }

  const resultado = await cerrarSesion(req.usuario.usuarioId, refreshToken);

  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
  });
}

// =============================================================================
// CONTROLLER 7: YO (USUARIO ACTUAL)
// =============================================================================

/**
 * GET /api/auth/yo
 */
export async function yo(req: Request, res: Response): Promise<void> {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  const resultado = await obtenerUsuarioActual(req.usuario.usuarioId);

  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 8: CERRAR TODAS LAS SESIONES
// =============================================================================

/**
 * POST /api/auth/logout-todos
 * Cierra sesión en todos los dispositivos
 */
export async function logoutTodos(req: Request, res: Response): Promise<void> {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  const resultado = await cerrarTodasSesiones(req.usuario.usuarioId);

  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 9: OBTENER SESIONES ACTIVAS
// =============================================================================

/**
 * GET /api/auth/sesiones
 * Lista todos los dispositivos conectados
 */
export async function sesiones(req: Request, res: Response): Promise<void> {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  const resultado = await obtenerSesiones(req.usuario.usuarioId);

  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: resultado.data,
  });
}

// =============================================================================
// CONTROLLER 10: OLVIDÉ CONTRASEÑA
// =============================================================================

/**
 * POST /api/auth/olvide-contrasena
 * 
 * Solicita recuperación de contraseña. Envía código por email.
 * 
 * Body esperado:
 * {
 *   "correo": "juan@ejemplo.com"
 * }
 */
export async function olvideContrasena(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = olvideContrasenaSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Correo inválido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await solicitarRecuperacion(validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
    data: {
      correoRegistrado: resultado.correoRegistrado,
      esOAuth: resultado.esOAuth,
    },
  });
}

// =============================================================================
// CONTROLLER 11: RESTABLECER CONTRASEÑA
// =============================================================================

/**
 * POST /api/auth/restablecer-contrasena
 * 
 * Establece nueva contraseña usando el código recibido por email.
 * 
 * Body esperado:
 * {
 *   "correo": "juan@ejemplo.com",
 *   "codigo": "847293",
 *   "nuevaContrasena": "MiNuevaPassword123"
 * }
 */
export async function restablecerContrasenaController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = restablecerContrasenaSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await restablecerContrasena(validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 3: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
  });
}

// =============================================================================
// CONTROLLER 12: CAMBIAR CONTRASEÑA (usuario logueado)
// =============================================================================

/**
 * PATCH /api/auth/cambiar-contrasena
 * 
 * Cambia la contraseña del usuario autenticado.
 * Requiere enviar la contraseña actual para confirmar.
 * 
 * Body esperado:
 * {
 *   "contrasenaActual": "MiPasswordActual123",
 *   "nuevaContrasena": "MiNuevaPassword456"
 * }
 */
export async function cambiarContrasenaController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar que el usuario esté autenticado
  // ---------------------------------------------------------------------------
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = cambiarContrasenaSchema.safeParse(req.body);

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
  const resultado = await cambiarContrasena(req.usuario.usuarioId, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
  });
}

// =============================================================================
// CONTROLLER 13: LOGIN CON GOOGLE
// =============================================================================

/**
 * POST /api/auth/google
 * 
 * Inicia sesión o registra un usuario usando Google OAuth.
 * 
 * Body esperado:
 * {
 *   "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 * }
 */
export async function googleAuth(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = googleAuthSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Token de Google requerido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Obtener IP y User-Agent
  // ---------------------------------------------------------------------------
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || null;
  const userAgent = req.headers['user-agent'] || null;

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await loginConGoogle(validacion.data, ip, userAgent);

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
// CONTROLLER 14: GENERAR 2FA
// =============================================================================

/**
 * POST /api/auth/2fa/generar
 * 
 * Genera el secreto TOTP y código QR para configurar 2FA.
 * Requiere estar autenticado.
 * 
 * No requiere body.
 */
export async function generar2faController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await generar2fa(req.usuario.usuarioId);

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
// CONTROLLER 15: ACTIVAR 2FA
// =============================================================================

/**
 * POST /api/auth/2fa/activar
 * 
 * Confirma y activa 2FA verificando un código TOTP.
 * Requiere estar autenticado.
 * 
 * Body esperado:
 * {
 *   "codigo": "123456"
 * }
 */
export async function activar2faController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = activar2faSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Código inválido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await activar2fa(req.usuario.usuarioId, validacion.data);

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
// CONTROLLER 16: VERIFICAR 2FA (durante login)
// =============================================================================

/**
 * POST /api/auth/2fa/verificar
 * 
 * Verifica el código 2FA para completar el login.
 * No requiere autenticación (usa token temporal).
 * 
 * Body esperado:
 * {
 *   "codigo": "123456",
 *   "tokenTemporal": "uuid-del-token-temporal"
 * }
 */
export async function verificar2faController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = verificar2faSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Obtener IP y User-Agent
  // ---------------------------------------------------------------------------
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || null;
  const userAgent = req.headers['user-agent'] || null;

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await verificar2fa(validacion.data, ip, userAgent);

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
// CONTROLLER 17: DESACTIVAR 2FA
// =============================================================================

/**
 * DELETE /api/auth/2fa/desactivar
 * 
 * Desactiva la autenticación de dos factores.
 * Requiere estar autenticado y confirmar con código TOTP.
 * 
 * Body esperado:
 * {
 *   "codigo": "123456"
 * }
 */
export async function desactivar2faController(req: Request, res: Response): Promise<void> {
  // ---------------------------------------------------------------------------
  // Paso 1: Verificar autenticación
  // ---------------------------------------------------------------------------
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 2: Validar datos con Zod
  // ---------------------------------------------------------------------------
  const validacion = desactivar2faSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Código inválido',
      errors: formatearErroresZod(validacion.error),
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Paso 3: Llamar al servicio
  // ---------------------------------------------------------------------------
  const resultado = await desactivar2fa(req.usuario.usuarioId, validacion.data);

  // ---------------------------------------------------------------------------
  // Paso 4: Responder
  // ---------------------------------------------------------------------------
  res.status(resultado.code ?? 200).json({
    success: resultado.success,
    message: resultado.message,
  });
}

// =============================================================================
// CONTROLLER 18: SISTEMA DE MODOS
// =============================================================================

/**
 * PATCH /api/auth/modo
 * Cambia el modo activo del usuario entre Personal y Comercial
 */
export async function cambiarModoController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Validar datos del body
    const { modo } = req.body;

    if (!modo) {
      res.status(400).json({
        success: false,
        message: 'El campo "modo" es requerido',
      });
      return;
    }

    // Validar que sea un modo válido
    if (modo !== 'personal' && modo !== 'comercial') {
      res.status(400).json({
        success: false,
        message: 'Modo inválido. Debe ser "personal" o "comercial"',
      });
      return;
    }

    // Llamar al service
    const resultado = await cambiarModo(req.usuario.usuarioId, modo);

    // Devolver respuesta
    res.status(resultado.code || 200).json({
      success: resultado.success,
      message: resultado.message,
      data: resultado.data,
    });

  } catch (error) {
    console.error('❌ Error en cambiarModoController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar modo de cuenta',
    });
  }
}

/**
 * GET /api/auth/modo-info
 * Obtiene información sobre el modo actual del usuario
 */
export async function obtenerInfoModoController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Llamar al service
    const resultado = await obtenerInfoModo(req.usuario.usuarioId);

    // Devolver respuesta
    res.status(resultado.code || 200).json({
      success: resultado.success,
      message: resultado.message,
      data: resultado.data,
    });

  } catch (error) {
    console.error('❌ Error en obtenerInfoModoController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de modo',
    });
  }
}