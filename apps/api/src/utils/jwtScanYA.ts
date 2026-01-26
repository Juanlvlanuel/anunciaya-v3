/**
 * jwtScanYA.ts
 * =============
 * Utilidades JWT específicas para ScanYA.
 * Tokens separados de los de AnunciaYA web.
 * 
 * Ubicación: apps/api/src/utils/jwtScanYA.ts
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Permisos del usuario en ScanYA
 */
export interface PermisosScanYA {
  registrarVentas: boolean;
  procesarCanjes: boolean;
  verHistorial: boolean;
  responderChat: boolean;
  responderResenas: boolean;
}

/**
 * Payload del token ScanYA
 */
export interface PayloadTokenScanYA {
  tipo: 'dueno' | 'gerente' | 'empleado';
  
  // Siempre presente
  negocioId: string;
  sucursalId: string;
  nombreNegocio: string;
  
  // Si es dueño o gerente
  usuarioId?: string;
  correo?: string;
  nombreUsuario?: string;
  
  // Si es empleado
  empleadoId?: string;
  nick?: string;
  nombreEmpleado?: string;
  
  // Permisos operativos (ScanYA)
  permisos: PermisosScanYA;
  
  // Permisos administrativos (solo dueño/gerente)
  puedeElegirSucursal: boolean;
  puedeConfigurarNegocio: boolean;
}

/**
 * Payload decodificado (incluye campos estándar de JWT)
 */
export interface TokenScanYADecodificado extends PayloadTokenScanYA {
  iat: number;
  exp: number;
}

// =============================================================================
// CONSTANTES
// =============================================================================

// Usamos un prefijo diferente para diferenciar tokens de ScanYA
const SCANYA_TOKEN_PREFIX = 'scanya_';

// Duración de tokens ScanYA (más largos porque es uso en punto de venta)
const ACCESS_TOKEN_EXPIRES = '12h';  // 12 horas (un turno largo)
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 días

// =============================================================================
// GENERAR TOKENS
// =============================================================================

/**
 * Genera un Access Token para ScanYA
 */
export function generarAccessTokenScanYA(payload: PayloadTokenScanYA): string {
  const token = jwt.sign(
    { ...payload, _tipo: SCANYA_TOKEN_PREFIX },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES } as jwt.SignOptions
  );
  return token as string;
}

/**
 * Genera un Refresh Token para ScanYA
 */
export function generarRefreshTokenScanYA(payload: PayloadTokenScanYA): string {
  const token = jwt.sign(
    { ...payload, _tipo: SCANYA_TOKEN_PREFIX },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES } as jwt.SignOptions
  );
  return token as string;
}

/**
 * Genera ambos tokens para ScanYA
 */
export function generarTokensScanYA(payload: PayloadTokenScanYA): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generarAccessTokenScanYA(payload),
    refreshToken: generarRefreshTokenScanYA(payload),
  };
}

// =============================================================================
// VERIFICAR TOKENS
// =============================================================================

interface ResultadoVerificacionScanYA {
  valido: boolean;
  payload?: TokenScanYADecodificado;
  error?: string;
}

/**
 * Verifica un Access Token de ScanYA
 */
export function verificarAccessTokenScanYA(token: string): ResultadoVerificacionScanYA {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenScanYADecodificado & { _tipo?: string };
    
    // Verificar que sea un token de ScanYA
    if (payload._tipo !== SCANYA_TOKEN_PREFIX) {
      return { valido: false, error: 'Token no es de ScanYA' };
    }
    
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
 * Verifica un Refresh Token de ScanYA
 */
export function verificarRefreshTokenScanYA(token: string): ResultadoVerificacionScanYA {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenScanYADecodificado & { _tipo?: string };
    
    // Verificar que sea un token de ScanYA
    if (payload._tipo !== SCANYA_TOKEN_PREFIX) {
      return { valido: false, error: 'Refresh token no es de ScanYA' };
    }
    
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