/**
 * scanyaAuth.middleware.ts
 * =========================
 * Middleware para proteger rutas de ScanYA.
 * Verifica tokens específicos de ScanYA (diferentes a los de AnunciaYA web).
 * 
 * Ubicación: apps/api/src/middleware/scanyaAuth.middleware.ts
 */

import type { Request, Response, NextFunction } from 'express';
import {
  verificarAccessTokenScanYA,
  type TokenScanYADecodificado,
  type PermisosScanYA
} from '../utils/jwtScanYA.js';

// =============================================================================
// EXTENDER TIPOS DE EXPRESS
// =============================================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      scanyaUsuario?: TokenScanYADecodificado;
    }
  }
}

// =============================================================================
// MIDDLEWARE: VERIFICAR TOKEN SCANYA
// =============================================================================

/**
 * Verifica que el request tenga un access token válido de ScanYA.
 * Si es válido, agrega `req.scanyaUsuario` con los datos del token.
 * 
 * Uso:
 * router.get('/ruta-protegida', verificarTokenScanYA, controller);
 */
export function verificarTokenScanYA(req: Request, res: Response, next: NextFunction): void {
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
  const resultado = verificarAccessTokenScanYA(token);

  if (!resultado.valido || !resultado.payload) {
    res.status(401).json({
      success: false,
      message: resultado.error || 'Token inválido',
    });
    return;
  }

  // Agregar usuario al request para usar en el controller
  req.scanyaUsuario = resultado.payload;

  // Continuar al siguiente middleware/controller
  next();
}

// =============================================================================
// MIDDLEWARE: VERIFICAR TIPO DE USUARIO
// =============================================================================

/**
 * Verifica que el usuario sea dueño.
 * Debe usarse DESPUÉS de verificarTokenScanYA.
 */
export function verificarEsDueno(req: Request, res: Response, next: NextFunction): void {
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  if (req.scanyaUsuario.tipo !== 'dueno') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere ser dueño del negocio',
    });
    return;
  }

  next();
}

/**
 * Verifica que el usuario sea dueño O gerente.
 * Debe usarse DESPUÉS de verificarTokenScanYA.
 */
export function verificarEsDuenoOGerente(req: Request, res: Response, next: NextFunction): void {
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  if (req.scanyaUsuario.tipo !== 'dueno' && req.scanyaUsuario.tipo !== 'gerente') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere ser dueño o gerente',
    });
    return;
  }

  next();
}

/**
 * Verifica que el usuario sea empleado.
 * Debe usarse DESPUÉS de verificarTokenScanYA.
 */
export function verificarEsEmpleado(req: Request, res: Response, next: NextFunction): void {
  if (!req.scanyaUsuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  if (req.scanyaUsuario.tipo !== 'empleado') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere ser empleado',
    });
    return;
  }

  next();
}

// =============================================================================
// MIDDLEWARE: VERIFICAR PERMISOS
// =============================================================================

/**
 * Verifica que el usuario tenga un permiso específico.
 * Debe usarse DESPUÉS de verificarTokenScanYA.
 * 
 * Uso:
 * router.post('/otorgar-puntos', verificarTokenScanYA, verificarPermiso('registrarVentas'), controller);
 */
export function verificarPermiso(permiso: keyof PermisosScanYA) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.scanyaUsuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Los dueños tienen todos los permisos
    if (req.scanyaUsuario.tipo === 'dueno') {
      next();
      return;
    }

    // Verificar permiso específico para empleados
    if (!req.scanyaUsuario.permisos[permiso]) {
      const mensajesPermiso: Record<keyof PermisosScanYA, string> = {
        registrarVentas: 'registrar ventas',
        procesarCanjes: 'procesar canjes',
        verHistorial: 'ver historial',
        responderChat: 'responder mensajes',
        responderResenas: 'responder reseñas',
      };

      res.status(403).json({
        success: false,
        message: `No tienes permiso para ${mensajesPermiso[permiso]}`,
      });
      return;
    }

    next();
  };
}

// =============================================================================
// MIDDLEWARE: VERIFICAR MÚLTIPLES PERMISOS (OR)
// =============================================================================

/**
 * Verifica que el usuario tenga AL MENOS UNO de los permisos especificados.
 * 
 * Uso:
 * router.get('/dashboard', verificarTokenScanYA, verificarAlgunPermiso(['registrarVentas', 'verHistorial']), controller);
 */
export function verificarAlgunPermiso(permisos: (keyof PermisosScanYA)[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.scanyaUsuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Los dueños tienen todos los permisos
    if (req.scanyaUsuario.tipo === 'dueno') {
      next();
      return;
    }

    // Verificar si tiene al menos uno de los permisos
    const tieneAlguno = permisos.some(permiso => req.scanyaUsuario!.permisos[permiso]);

    if (!tieneAlguno) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos suficientes para esta acción',
      });
      return;
    }

    next();
  };
}