/**
 * authService.ts
 * ===============
 * Funciones para llamar a los endpoints de autenticación del backend.
 *
 * ¿Qué hace este archivo?
 * - Proporciona funciones tipadas para cada endpoint de auth
 * - Centraliza la lógica de llamadas al backend
 * - Facilita el uso desde componentes React
 *
 * Ubicación: apps/web/src/services/authService.ts
 */

import { api, RespuestaAPI } from './api';

// =============================================================================
// TIPOS DE DATOS (basados en el backend)
// =============================================================================

/**
 * Datos del usuario (respuesta del backend)
 */
export interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  perfil: 'personal' | 'comercial';
  membresia: number;
  correoVerificado: boolean;
  telefono?: string | null;
  avatar?: string | null;
  dobleFactorHabilitado?: boolean;
  tieneModoComercial: boolean;
  modoActivo: 'personal' | 'comercial';
  negocioId: string | null;
  sucursalActiva: string | null;
  sucursalAsignada: string | null;
  onboardingCompletado?: boolean;
  // Datos del negocio (modo comercial)
  nombreNegocio: string | null;
  correoNegocio: string | null;
  logoNegocio: string | null;
  fotoPerfilNegocio: string | null;
  nombreSucursalAsignada: string | null;
  correoSucursalAsignada: string | null;
  fotoPerfilSucursalAsignada: string | null;
  createdAt: string;
}
/**
 * Respuesta de login exitoso
 */
export interface RespuestaLogin {
  usuario: Usuario;
  accessToken: string;
  refreshToken: string;
  requiere2FA?: boolean;
  tokenTemporal?: string;
}

/**
 * Datos de una sesión activa
 */
export interface Sesion {
  sessionId: string;
  ip: string | null;
  dispositivo: string | null;
  creadoEn: string;
}

/**
 * Respuesta de generar 2FA
 */
export interface Respuesta2FAGenerar {
  qrCode: string;
  secreto: string;
}

/**
 * Respuesta de activar 2FA
 */
export interface Respuesta2FAActivar {
  codigosRespaldo: string[];
}

// =============================================================================
// TIPOS DE INPUT (lo que envía el frontend)
// =============================================================================

/**
 * Input para registro (soporta normal y Google OAuth)
 */
export interface RegistroInput {
  // ═══════════════════════════════════════════
  // SIEMPRE OBLIGATORIOS
  // ═══════════════════════════════════════════
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  perfil: 'personal' | 'comercial';
  aceptaTerminos: boolean;

  // ═══════════════════════════════════════════
  // CONDICIONALES (uno u otro)
  // Backend valida: debe existir contrasena O googleIdToken
  // ═══════════════════════════════════════════
  contrasena?: string;      // Solo registro normal
  googleIdToken?: string;   // Solo registro Google

  // ═══════════════════════════════════════════
  // OPCIONALES SEGÚN CONTEXTO
  // ═══════════════════════════════════════════
  avatar?: string | null;   // Solo con Google
  nombreNegocio?: string;   // Solo si perfil === 'comercial'
}

/**
 * Respuesta de registro exitoso
 */
export interface RespuestaRegistro {
  correo: string;
}

/**
 * Respuesta de registro con Google (directo, sin verificación)
 */
export interface RespuestaRegistroGoogle {
  usuario: Usuario;
  accessToken: string;
  refreshToken: string;
}

export interface RespuestaOlvideContrasena {
  correoRegistrado: boolean;
  esOAuth?: boolean;
}

export interface LoginInput {
  correo: string;
  contrasena: string;
}

export interface VerificarEmailInput {
  correo: string;
  codigo: string;
}

export interface RestablecerContrasenaInput {
  correo: string;
  codigo: string;
  nuevaContrasena: string;
}

export interface CambiarContrasenaInput {
  contrasenaActual: string;
  nuevaContrasena: string;
}

export interface Verificar2FAInput {
  codigo: string;
  tokenTemporal: string;
}


// =============================================================================
// FUNCIONES DE AUTENTICACIÓN
// =============================================================================

/**
 * 1. Registrar nuevo usuario
 * POST /auth/registro
 * 
 * - Registro normal: guarda en Redis, requiere verificación email
 * - Registro Google: crea usuario directo, devuelve tokens
 */
export async function registro(datos: RegistroInput): Promise<RespuestaAPI<RespuestaRegistro | RespuestaRegistroGoogle>> {
  const response = await api.post<RespuestaAPI<RespuestaRegistro | RespuestaRegistroGoogle>>('/auth/registro', datos);
  return response.data;
}

/**
 * 2. Verificar email con código de 6 dígitos
 * POST /auth/verificar-email
 */
export async function verificarEmail(datos: VerificarEmailInput): Promise<RespuestaAPI<RespuestaLogin>> {
  const response = await api.post<RespuestaAPI<RespuestaLogin>>('/auth/verificar-email', datos);

  return response.data;
}

/**
 * 3. Reenviar código de verificación
 * POST /auth/reenviar-verificacion
 */
export async function reenviarVerificacion(correo: string): Promise<RespuestaAPI> {
  const response = await api.post<RespuestaAPI>('/auth/reenviar-verificacion', { correo });
  return response.data;
}

/**
 * 4. Iniciar sesión
 * POST /auth/login
 *
 * NOTA: Si el usuario tiene 2FA activo, devuelve:
 * { requiere2FA: true, tokenTemporal: "..." }
 */
export async function login(datos: LoginInput): Promise<RespuestaAPI<RespuestaLogin>> {
  const response = await api.post<RespuestaAPI<RespuestaLogin>>('/auth/login', datos);

  return response.data;
}

/**
 * 5. Renovar tokens (se usa internamente en api.ts)
 * POST /auth/refresh
 */
export async function refresh(refreshToken: string): Promise<RespuestaAPI<{ accessToken: string; refreshToken: string }>> {
  const response = await api.post<RespuestaAPI<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
  return response.data;
}

/**
 * 6. Cerrar sesión actual
 * POST /auth/logout
 */
export async function logout(refreshToken: string): Promise<RespuestaAPI> {
  const response = await api.post<RespuestaAPI>('/auth/logout', { refreshToken });
  return response.data;
}

/**
 * 7. Cerrar todas las sesiones
 * POST /auth/logout-todos
 */
export async function logoutTodos(): Promise<RespuestaAPI> {
  const response = await api.post<RespuestaAPI>('/auth/logout-todos');
  return response.data;
}

/**
 * 8. Obtener datos del usuario actual
 * GET /auth/yo
 */
export async function obtenerYo(): Promise<RespuestaAPI<Usuario>> {
  const response = await api.get<RespuestaAPI<Usuario>>('/auth/yo');
  return response.data;
}

/**
 * 9. Obtener sesiones activas
 * GET /auth/sesiones
 */
export async function obtenerSesiones(): Promise<RespuestaAPI<Sesion[]>> {
  const response = await api.get<RespuestaAPI<Sesion[]>>('/auth/sesiones');
  return response.data;
}

/**
 * 10. Solicitar código de recuperación de contraseña
 * POST /auth/olvide-contrasena
 */
export async function olvideContrasena(correo: string): Promise<RespuestaAPI<RespuestaOlvideContrasena>> {
  const response = await api.post<RespuestaAPI<RespuestaOlvideContrasena>>('/auth/olvide-contrasena', { correo });
  return response.data;
}

/**
 * 11. Restablecer contraseña con código
 * POST /auth/restablecer-contrasena
 */
export async function restablecerContrasena(datos: RestablecerContrasenaInput): Promise<RespuestaAPI> {
  const response = await api.post<RespuestaAPI>('/auth/restablecer-contrasena', datos);
  return response.data;
}

/**
 * 12. Cambiar contraseña (usuario logueado)
 * PATCH /auth/cambiar-contrasena
 */
export async function cambiarContrasena(datos: CambiarContrasenaInput): Promise<RespuestaAPI> {
  const response = await api.patch<RespuestaAPI>('/auth/cambiar-contrasena', datos);
  return response.data;
}

/**
 * Datos de Google para usuario nuevo
 */
export interface DatosGoogleNuevo {
  email: string;
  nombre: string;
  apellidos: string;
  avatar: string | null;
}

/**
 * Respuesta cuando el usuario es nuevo (no existe en BD)
 */
export interface RespuestaGoogleNuevo {
  usuarioNuevo: true;
  datosGoogle: DatosGoogleNuevo;
}

/**
 * Respuesta de login con Google (puede ser login o usuario nuevo)
 */
export type RespuestaLoginGoogle = RespuestaLogin | RespuestaGoogleNuevo;

/**
 * 13. Login con Google
 * POST /auth/google
 */
export async function loginConGoogle(idToken: string): Promise<RespuestaAPI<RespuestaLoginGoogle>> {
  const response = await api.post<RespuestaAPI<RespuestaLoginGoogle>>('/auth/google', { idToken });

  return response.data;
}

// =============================================================================
// FUNCIONES DE 2FA
// =============================================================================

/**
 * 14. Generar secreto y QR para 2FA
 * POST /auth/2fa/generar
 */
export async function generar2FA(): Promise<RespuestaAPI<Respuesta2FAGenerar>> {
  const response = await api.post<RespuestaAPI<Respuesta2FAGenerar>>('/auth/2fa/generar');
  return response.data;
}

/**
 * 15. Activar 2FA (confirmar con código TOTP)
 * POST /auth/2fa/activar
 */
export async function activar2FA(codigo: string): Promise<RespuestaAPI<Respuesta2FAActivar>> {
  const response = await api.post<RespuestaAPI<Respuesta2FAActivar>>('/auth/2fa/activar', { codigo });
  return response.data;
}

/**
 * 16. Verificar código 2FA durante login
 * POST /auth/2fa/verificar
 */
export async function verificar2FA(datos: Verificar2FAInput): Promise<RespuestaAPI<RespuestaLogin>> {
  const response = await api.post<RespuestaAPI<RespuestaLogin>>('/auth/2fa/verificar', datos);

  return response.data;
}

/**
 * 17. Desactivar 2FA
 * DELETE /auth/2fa/desactivar
 */
export async function desactivar2FA(codigo: string): Promise<RespuestaAPI> {
  const response = await api.delete<RespuestaAPI>('/auth/2fa/desactivar', {
    data: { codigo },
  });
  return response.data;
}

// =============================================================================
// EXPORT POR DEFECTO (objeto con todas las funciones)
// =============================================================================

const authService = {
  // Auth básico
  registro,
  verificarEmail,
  reenviarVerificacion,
  login,
  refresh,
  logout,
  logoutTodos,
  obtenerYo,
  obtenerSesiones,

  // Contraseña
  olvideContrasena,
  restablecerContrasena,
  cambiarContrasena,

  // Google
  loginConGoogle,

  // 2FA
  generar2FA,
  activar2FA,
  verificar2FA,
  desactivar2FA,
};

export default authService;
