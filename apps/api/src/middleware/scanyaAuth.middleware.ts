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
export async function verificarTokenScanYA(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  // Verificar revocación remota para empleados
  if (resultado.payload.tipo === 'empleado' && resultado.payload.empleadoId) {
    try {
      const { estaTokenRevocado } = await import('../utils/tokenStoreScanYA.js');
      const revocado = await estaTokenRevocado(resultado.payload.empleadoId, resultado.payload.iat);
      if (revocado) {
        res.status(401).json({
          success: false,
          message: 'Sesión revocada por el administrador',
        });
        return;
      }
    } catch {
      // Si Redis falla, permitir acceso (fail-open)
    }
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
// Mapeo de permiso a columna en BD
const PERMISO_A_COLUMNA: Record<keyof PermisosScanYA, string> = {
  registrarVentas: 'puede_registrar_ventas',
  procesarCanjes: 'puede_procesar_canjes',
  verHistorial: 'puede_ver_historial',
  responderChat: 'puede_responder_chat',
  responderResenas: 'puede_responder_resenas',
};

const MENSAJES_PERMISO: Record<keyof PermisosScanYA, string> = {
  registrarVentas: 'registrar ventas',
  procesarCanjes: 'procesar canjes',
  verHistorial: 'ver historial',
  responderChat: 'responder mensajes',
  responderResenas: 'responder reseñas',
};

export function verificarPermiso(permiso: keyof PermisosScanYA) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.scanyaUsuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Los dueños y gerentes tienen todos los permisos
    if (req.scanyaUsuario.tipo === 'dueno' || req.scanyaUsuario.tipo === 'gerente') {
      next();
      return;
    }

    // Para empleados: verificar permiso en BD (no del token) para reflejar cambios en tiempo real
    if (req.scanyaUsuario.empleadoId) {
      try {
        const { db } = await import('../db/index.js');
        const { sql } = await import('drizzle-orm');
        const columna = PERMISO_A_COLUMNA[permiso];
        const empleadoId = req.scanyaUsuario.empleadoId;
        const resultado = await db.execute(
          sql`SELECT ${sql.raw(columna)} AS tiene_permiso FROM empleados WHERE id = ${empleadoId} AND activo = true`
        );
        const row = (resultado as unknown as { rows: { tiene_permiso: boolean }[] }).rows[0];

        if (!row || !row.tiene_permiso) {
          res.status(403).json({
            success: false,
            message: `No tienes permiso para ${MENSAJES_PERMISO[permiso]}`,
          });
          return;
        }

        next();
        return;
      } catch {
        // Si falla la BD, usar permisos del token como fallback
      }
    }

    // Fallback: verificar del token
    if (!req.scanyaUsuario.permisos[permiso]) {
      res.status(403).json({
        success: false,
        message: `No tienes permiso para ${MENSAJES_PERMISO[permiso]}`,
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