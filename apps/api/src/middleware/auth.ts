/**
 * auth.ts (middleware)
 * =====================
 * Middleware para proteger rutas que requieren autenticación.
 * 
 * Ubicación: apps/api/src/middleware/auth.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { verificarAccessToken, type TokenDecodificado } from '../utils/jwt.js';

// =============================================================================
// EXTENDER TIPOS DE EXPRESS
// =============================================================================

/**
 * Extendemos Request para incluir el usuario autenticado y negocioId
 * 
 * - usuario: Datos del token JWT (agregado por verificarToken)
 * - negocioId: UUID del negocio (agregado por verificarNegocio middleware)
 */
declare global {
  namespace Express {
    interface Request {
      usuario?: TokenDecodificado;
      negocioId?: string;
    }
  }
}

// =============================================================================
// MIDDLEWARE: VERIFICAR TOKEN
// =============================================================================

/**
 * Verifica que el request tenga un access token válido.
 * Si es válido, agrega `req.usuario` con los datos del token.
 * 
 * Uso:
 * router.get('/ruta-protegida', verificarToken, controller);
 */
export function verificarToken(req: Request, res: Response, next: NextFunction): void {
  // Obtener el header Authorization
  const authHeader = req.headers.authorization;

  // Verificar que exista y tenga formato "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de acceso requerido',
    });
    return;
  }

  // Extraer el token (quitar "Bearer ")
  const token = authHeader.substring(7);

  // Verificar el token
  const resultado = verificarAccessToken(token);

  if (!resultado.valido || !resultado.payload) {
    res.status(401).json({
      success: false,
      message: resultado.error || 'Token inválido',
    });
    return;
  }

  // Agregar usuario al request para usar en el controller
  req.usuario = resultado.payload;

  // Continuar al siguiente middleware/controller
  next();
}

// =============================================================================
// MIDDLEWARE: VERIFICAR PERFIL
// =============================================================================

/**
 * Verifica que el usuario tenga un perfil específico.
 * Debe usarse DESPUÉS de verificarToken.
 * 
 * Uso:
 * router.get('/solo-comercial', verificarToken, verificarPerfil('comercial'), controller);
 */
export function verificarPerfil(perfilRequerido: 'personal' | 'comercial') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    if (req.usuario.perfil !== perfilRequerido) {
      res.status(403).json({
        success: false,
        message: `Esta acción requiere perfil ${perfilRequerido}`,
      });
      return;
    }

    next();
  };
}

// =============================================================================
// MIDDLEWARE: VERIFICAR MEMBRESÍA
// =============================================================================

/**
 * Verifica que el usuario tenga al menos cierto nivel de membresía.
 * Debe usarse DESPUÉS de verificarToken.
 * 
 * Uso:
 * router.get('/premium', verificarToken, verificarMembresia(2), controller);
 */
export function verificarMembresia(nivelMinimo: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    if (req.usuario.membresia < nivelMinimo) {
      res.status(403).json({
        success: false,
        message: `Esta acción requiere membresía nivel ${nivelMinimo} o superior`,
      });
      return;
    }

    next();
  };
}