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
  // Para gerentes: UUID del DUEÑO del negocio al que están asignados.
  // ChatYA usa este valor como identidad comercial del gerente cuando está en
  // modo comercial, para que opere "como el negocio" (igual que ScanYA).
  negocioUsuarioId?: string | null;
  // Rol de equipo del Panel Admin (null = usuario normal). El frontend lo usa
  // para decidir el destino al iniciar sesión; el backend revalida en BD.
  rolEquipo?: string | null; // 'superadmin' | 'gerente' | 'vendedor' | null
  // Región del equipo (gerente: usuarios.region_id; vendedor: embajadores.region_id).
  regionId?: string | null;
  // Marca de "este token pasó el 2FA del Panel". Solo la ponen los tokens emitidos
  // por /api/admin/2fa/verificar; el refresh la propaga. El gate del Panel la exige
  // cuando el superadmin tiene el 2FA del Panel prendido.
  panel2fa?: boolean;
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