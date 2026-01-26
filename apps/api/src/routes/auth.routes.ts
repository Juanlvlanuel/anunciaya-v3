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
} from '../controllers/auth.controller.js';
import { verificarToken } from '../middleware/auth.js';

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

// POST /api/auth/login - Iniciar sesión
router.post('/login', login);

// POST /api/auth/refresh - Renovar access token
router.post('/refresh', refresh);

// POST /api/auth/olvide-contrasena - Solicitar código de recuperación
router.post('/olvide-contrasena', olvideContrasena);

// POST /api/auth/restablecer-contrasena - Establecer nueva contraseña con código
router.post('/restablecer-contrasena', restablecerContrasenaController);

// POST /api/auth/google - Login con Google OAuth
router.post('/google', googleAuth);

// POST /api/auth/2fa/verificar - Verificar código 2FA (durante login)
router.post('/2fa/verificar', verificar2faController);

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

// POST /api/auth/2fa/generar - Generar secreto + QR
router.post('/2fa/generar', verificarToken, generar2faController);

// POST /api/auth/2fa/activar - Confirmar y activar 2FA
router.post('/2fa/activar', verificarToken, activar2faController);

// DELETE /api/auth/2fa/desactivar - Desactivar 2FA
router.delete('/2fa/desactivar', verificarToken, desactivar2faController);

// PATCH /api/auth/modo - Cambia el modo activo del usuario (personal ↔ comercial)
router.patch('/modo', verificarToken, cambiarModoController);

// GET /api/auth/modo-info - Obtiene información sobre el modo actual del usuario
router.get('/modo-info', verificarToken, obtenerInfoModoController);

export default router;