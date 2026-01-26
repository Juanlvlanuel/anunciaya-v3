/**
 * validarModo.ts (NUEVO - Fase 5.0)
 * ==================================
 * Middleware para proteger rutas según el modo de cuenta del usuario.
 * 
 * ¿Qué hace este archivo?
 * - Valida que el usuario tenga el modo correcto para acceder a una ruta
 * - Previene que usuarios en modo Personal accedan a funciones comerciales
 * - Previene que usuarios en modo Comercial usen funciones solo de Personal
 * 
 * ¿Cómo funciona?
 * - Lee el modo_activo del JWT (que está en req.usuario)
 * - Compara con el modo requerido por la ruta
 * - Permite o bloquea el acceso
 * 
 * Ubicación: apps/api/src/middleware/validarModo.ts
 */

import type { Request, Response, NextFunction } from 'express';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Tipos de modo disponibles en el sistema
 */
export type ModoUsuario = 'personal' | 'comercial';

// =============================================================================
// MIDDLEWARE 1: REQUIERE MODO PERSONAL
// =============================================================================

/**
 * Requiere que el usuario esté en modo Personal.
 */
export function requiereModoPersonal(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
    return;
  }

  const modoActual = req.usuario.modoActivo || 'personal';

  if (modoActual !== 'personal') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere estar en modo Personal',
      codigo: 'REQUIERE_MODO_PERSONAL',
      data: {
        modoActual,
        modoRequerido: 'personal',
        sugerencia: 'Cambia a modo Personal para realizar esta acción',
      },
    });
    return;
  }

  next();
}

// =============================================================================
// MIDDLEWARE 2: REQUIERE MODO COMERCIAL
// =============================================================================

/**
 * Requiere que el usuario esté en modo Comercial.
 */
export function requiereModoComercial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
    return;
  }

  const modoActual = req.usuario.modoActivo || 'personal';

  if (modoActual !== 'comercial') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere estar en modo Comercial',
      codigo: 'REQUIERE_MODO_COMERCIAL',
      data: {
        modoActual,
        modoRequerido: 'comercial',
        sugerencia: 'Cambia a modo Comercial para acceder a esta función',
      },
    });
    return;
  }

  next();
}

// =============================================================================
// MIDDLEWARE 3: REQUIERE ACCESO COMERCIAL
// =============================================================================

/**
 * Requiere que el usuario TENGA acceso al modo comercial.
 */
export function requiereAccesoComercial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
    return;
  }

  if (req.usuario.perfil !== 'comercial') {
    res.status(403).json({
      success: false,
      message: 'Necesitas una cuenta comercial para acceder a esta función',
      codigo: 'REQUIERE_CUENTA_COMERCIAL',
      data: {
        perfilActual: req.usuario.perfil,
        sugerencia: 'Activa una suscripción comercial para continuar',
      },
    });
    return;
  }

  next();
}

// =============================================================================
// HELPER: OBTENER MODO DEL USUARIO
// =============================================================================

export function obtenerModoActual(req: Request): ModoUsuario {
  return (req.usuario?.modoActivo as ModoUsuario) || 'personal';
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  requiereModoPersonal,
  requiereModoComercial,
  requiereAccesoComercial,
  obtenerModoActual,
};