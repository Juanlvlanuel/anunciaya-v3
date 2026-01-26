/**
 * ============================================================================
 * MIDDLEWARE: Autenticación Opcional
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/middleware/authOpcional.middleware.ts
 * 
 * PROPÓSITO:
 * Permite acceso a endpoints tanto con login como sin login
 * Si hay token válido → inyecta req.usuario
 * Si NO hay token → continúa con req.usuario = undefined
 * 
 * CASOS DE USO:
 * - Ofertas compartidas (liked/saved solo si hay usuario)
 * - Artículos compartidos
 * - Perfiles de negocios (métricas personalizadas si hay usuario)
 * 
 * CREADO: Enero 2026 - Sistema de Compartir con Auth Opcional
 */

import type { Request, Response, NextFunction } from 'express';
import { verificarAccessToken } from '../utils/jwt.js';

/**
 * Middleware que permite acceso con o sin autenticación
 * 
 * Con token válido → req.usuario = { usuarioId, correo, ... }
 * Sin token o token inválido → req.usuario = undefined
 * 
 * Diferencia con verificarToken:
 * - verificarToken → Bloquea si no hay token (401)
 * - verificarTokenOpcional → Siempre continúa
 */
export const verificarTokenOpcional = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Intentar extraer token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token → continuar sin usuario
      req.usuario = undefined;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      req.usuario = undefined;
      return next();
    }

    // Verificar token usando la función existente
    const resultado = verificarAccessToken(token);

    if (resultado.valido && resultado.payload) {
      // Token válido → inyectar usuario
      req.usuario = resultado.payload;
      next();
    } else {
      // Token inválido o expirado → continuar sin usuario
      req.usuario = undefined;
      next();
    }
  } catch {
    // Error inesperado → continuar sin usuario
    req.usuario = undefined;
    next();
  }
};