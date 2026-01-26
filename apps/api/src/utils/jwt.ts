/**
 * jwt.ts
 * =======
 * Utilidades para manejo de JSON Web Tokens (JWT).
 * 
 * Ubicación: apps/api/src/utils/jwt.ts
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Datos que se guardan dentro del token
 */
export interface PayloadToken {
  usuarioId: string;
  correo: string;
  perfil: string;
  membresia: number;
  modoActivo: string; // 'personal' | 'comercial'
  sucursalAsignada?: string | null; // UUID de sucursal (null = dueño, string = gerente)
}

/**
 * Payload decodificado (incluye campos estándar de JWT)
 */
export interface TokenDecodificado extends PayloadToken {
  iat: number; // Issued at (cuándo se creó)
  exp: number; // Expiration (cuándo expira)
}

// =============================================================================
// GENERAR TOKENS
// =============================================================================

/**
 * Genera un Access Token (corta duración, para peticiones)
 * 
 * @param payload - Datos del usuario a incluir en el token
 * @returns Access token firmado
 */
export function generarAccessToken(payload: PayloadToken): string {
  const token = jwt.sign(
    { ...payload },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES } as jwt.SignOptions
  );
  return token as string;
}

export function generarRefreshToken(payload: PayloadToken): string {
  const token = jwt.sign(
    { ...payload },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES } as jwt.SignOptions
  );
  return token as string;
}
/**
 * Genera ambos tokens (access y refresh)
 * 
 * @param payload - Datos del usuario
 * @returns Objeto con accessToken y refreshToken
 */
export function generarTokens(payload: PayloadToken): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generarAccessToken(payload),
    refreshToken: generarRefreshToken(payload),
  };
}

// =============================================================================
// VERIFICAR TOKENS
// =============================================================================

/**
 * Resultado de verificar un token
 */
interface ResultadoVerificacion {
  valido: boolean;
  payload?: TokenDecodificado;
  error?: string;
}

/**
 * Verifica un Access Token
 * 
 * @param token - Token a verificar
 * @returns Resultado con payload si es válido, o error si no
 */
export function verificarAccessToken(token: string): ResultadoVerificacion {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenDecodificado;
    return { valido: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valido: false, error: 'Token expirado' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valido: false, error: 'Token inválido' };
    }
    return { valido: false, error: 'Error al verificar token' };
  }
}

/**
 * Verifica un Refresh Token
 * 
 * @param token - Token a verificar
 * @returns Resultado con payload si es válido, o error si no
 */
export function verificarRefreshToken(token: string): ResultadoVerificacion {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenDecodificado;
    return { valido: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valido: false, error: 'Refresh token expirado' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valido: false, error: 'Refresh token inválido' };
    }
    return { valido: false, error: 'Error al verificar refresh token' };
  }
}