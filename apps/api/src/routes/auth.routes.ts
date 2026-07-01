/**
 * auth.routes.ts
 * ===============
 * Rutas de autenticación (registro, verificación, login, etc.)
 * 
 * Ubicación: apps/api/src/routes/auth.routes.ts
 */

import { Router } from 'express';
import {
  registro,
  verificarEmailController,
  reenviarVerificacion,
  login,
  refresh,
  logout,
  logoutTodos,
  yo,
  sesiones,
  olvideContrasena,
  restablecerContrasenaController,
  cambiarContrasenaController,
  googleAuth,
  generar2faController,
  activar2faController,
  verificar2faController,
  desactivar2faController,
  cambiarModoController,
  obtenerInfoModoController,
  cambiarContrasenaProvisionalController,
  verificarDisponibilidadCorreoController,
  actualizarUbicacionController,
  actualizarRegistroPendienteController,
  actualizarPerfilController,
  urlSubidaAvatarController,
  establecerContrasenaController,
  vincularGoogleController,
  solicitarCambioCorreoController,
  confirmarCambioCorreoController,
  eliminarCuentaController,
  canjearHandoffDemoController,
} from '../controllers/auth.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { limitadorVerificacionCorreo } from '../middleware/rateLimiter.js';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// =============================================================================

// POST /api/auth/registro - Crear cuenta nueva
router.post('/registro', registro);

// POST /api/auth/verificar-email - Confirmar código de verificación
router.post('/verificar-email', verificarEmailController);

// POST /api/auth/reenviar-verificacion - Reenviar código al correo
router.post('/reenviar-verificacion', reenviarVerificacion);

// POST /api/auth/actualizar-registro-pendiente - Corrige datos del registro antes de pagar (OBS-12),
// sin re-verificar el correo. Lo usa el panel "Continúa tu registro" al volver de Stripe.
router.post('/actualizar-registro-pendiente', actualizarRegistroPendienteController);

// POST /api/auth/login - Iniciar sesión
router.post('/login', login);

// POST /api/auth/refresh - Renovar access token
router.post('/refresh', refresh);

// POST /api/auth/olvide-contrasena - Solicitar código de recuperación
router.post('/olvide-contrasena', olvideContrasena);

// POST /api/auth/restablecer-contrasena - Establecer nueva contraseña con código
router.post('/restablecer-contrasena', restablecerContrasenaController);

// POST /api/auth/cambiar-contrasena-provisional - Cambiar contraseña provisional (gerentes nuevos)
router.post('/cambiar-contrasena-provisional', cambiarContrasenaProvisionalController);

// POST /api/auth/google - Login con Google OAuth
router.post('/google', googleAuth);

// POST /api/auth/2fa/verificar - Verificar código 2FA (durante login)
router.post('/2fa/verificar', verificar2faController);

// POST /api/auth/demo/canjear-handoff - Canjea el handoff token del Demo de Business Studio por
// una sesión de impersonación (el token efímero es la autorización; la generó el Panel). PÚBLICA.
router.post('/demo/canjear-handoff', canjearHandoffDemoController);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', verificarToken, logout);

// GET /api/auth/yo - Obtener usuario actual
router.get('/yo', verificarToken, yo);

// POST /api/auth/logout-todos - Cerrar todas las sesiones
router.post('/logout-todos', verificarToken, logoutTodos);

// GET /api/auth/sesiones - Ver sesiones activas
router.get('/sesiones', verificarToken, sesiones);

// PATCH /api/auth/cambiar-contrasena - Cambiar contraseña (usuario logueado)
router.patch('/cambiar-contrasena', verificarToken, cambiarContrasenaController);

// POST /api/auth/establecer-contrasena - Crear la primera contraseña (cuentas sin contraseña, ej. Google)
router.post('/establecer-contrasena', verificarToken, establecerContrasenaController);

// POST /api/auth/google/vincular - Vincular Google a la cuenta logueada (agrega método de login)
router.post('/google/vincular', verificarToken, vincularGoogleController);

// POST /api/auth/cambiar-correo/solicitar - Paso 1: envía un código de verificación al nuevo correo
router.post('/cambiar-correo/solicitar', verificarToken, limitadorVerificacionCorreo, solicitarCambioCorreoController);

// POST /api/auth/cambiar-correo/confirmar - Paso 2: aplica el nuevo correo con el código recibido
router.post('/cambiar-correo/confirmar', verificarToken, confirmarCambioCorreoController);

// POST /api/auth/eliminar-cuenta - Da de baja la cuenta del usuario (soft-delete)
router.post('/eliminar-cuenta', verificarToken, eliminarCuentaController);

// PATCH /api/auth/perfil - Actualizar datos personales (nombre, teléfono, avatar, etc.)
router.patch('/perfil', verificarToken, actualizarPerfilController);

// POST /api/auth/avatar/url-subida - Presigned URL para subir el avatar a R2
router.post('/avatar/url-subida', verificarToken, urlSubidaAvatarController);

// POST /api/auth/2fa/generar - Generar secreto + QR
router.post('/2fa/generar', verificarToken, generar2faController);

// POST /api/auth/2fa/activar - Confirmar y activar 2FA
router.post('/2fa/activar', verificarToken, activar2faController);

// DELETE /api/auth/2fa/desactivar - Desactivar 2FA
router.delete('/2fa/desactivar', verificarToken, desactivar2faController);

// PATCH /api/auth/modo - Cambia el modo activo del usuario (personal ↔ comercial)
router.patch('/modo', verificarToken, cambiarModoController);

// PATCH /api/auth/ubicacion - Persiste la ciudad del usuario (selector/GPS → ciudad_id)
router.patch('/ubicacion', verificarToken, actualizarUbicacionController);

// GET /api/auth/modo-info - Obtiene información sobre el modo actual del usuario
router.get('/modo-info', verificarToken, obtenerInfoModoController);

// GET /api/auth/verificar-disponibilidad-correo?correo=xxx
// Verifica si un correo ya está registrado. Usado para feedback en tiempo real
// al crear cuentas (ej: crear gerente desde BS Sucursales).
router.get(
  '/verificar-disponibilidad-correo',
  verificarToken,
  limitadorVerificacionCorreo,
  verificarDisponibilidadCorreoController
);

export default router;