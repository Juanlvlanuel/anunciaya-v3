/**
 * auth.ts (middleware)
 * =====================
 * Middleware para proteger rutas que requieren autenticación.
 * 
 * Ubicación: apps/api/src/middleware/auth.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { verificarAccessToken, type TokenDecodificado } from '../utils/jwt.js';
import { verificarAccessTokenScanYA } from '../utils/jwtScanYA.js';

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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenDecodificado & { empleadoId?: string | null };
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

// =============================================================================
// MIDDLEWARE: VERIFICAR TOKEN CHATYA (AnunciaYA + ScanYA)
// =============================================================================

/**
 * Middleware especial para las rutas de ChatYA.
 * Acepta tanto tokens de AnunciaYA como tokens de ScanYA.
 *
 * Cuando el token es de ScanYA, mapea los datos al formato TokenDecodificado:
 *   - usuarioId  → negocioUsuarioId (siempre el dueño del negocio)
 *   - modoActivo → 'comercial'
 *   - sucursalAsignada → sucursalId del token ScanYA
 *
 * Esto permite que dueños, gerentes y empleados de ScanYA usen ChatYA
 * respondiendo en nombre del negocio.
 */
export async function verificarTokenChatYA(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.substring(7);

  // 1. Intentar como token AnunciaYA (descartar si es token ScanYA)
  const resultadoAY = verificarAccessToken(token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (resultadoAY.valido && resultadoAY.payload && !(resultadoAY.payload as any)._tipo) {
    const payload = resultadoAY.payload;
    // Gerente en modo comercial: sustituir usuarioId por el del dueño del negocio
    // para que opere "como el negocio" desde su sucursal (mismo modelo que ScanYA).
    // El emisor original (gerente) se preserva en `empleadoId` para trazabilidad.
    if (
      payload.modoActivo === 'comercial' &&
      payload.sucursalAsignada &&
      payload.negocioUsuarioId &&
      payload.negocioUsuarioId !== payload.usuarioId
    ) {
      req.usuario = {
        ...payload,
        empleadoId: payload.usuarioId,
        usuarioId: payload.negocioUsuarioId,
      };
    } else {
      req.usuario = payload;
    }
    next();
    return;
  }

  // 2. Intentar como token ScanYA
  const resultadoSY = verificarAccessTokenScanYA(token);
  if (resultadoSY.valido && resultadoSY.payload) {
    const sy = resultadoSY.payload;
    // negocioUsuarioId es requerido para usar ChatYA
    // Si no está en el token (tokens viejos), obtenerlo de la BD
    if (!sy.negocioUsuarioId && sy.negocioId) {
      try {
        const { db } = await import('../db/index.js');
        const { sql } = await import('drizzle-orm');
        const resultado = await db.execute(sql`SELECT usuario_id FROM negocios WHERE id = ${sy.negocioId}`);
        // db.execute con node-postgres puede retornar rows directamente o dentro de .rows
        const rows = Array.isArray(resultado) ? resultado : (resultado as unknown as { rows: unknown[] }).rows;
        const row = rows?.[0] as { usuario_id?: string } | undefined;
        if (row?.usuario_id) {
          sy.negocioUsuarioId = row.usuario_id;
        }
      } catch (err) {
        console.error('[ChatYA Auth] Error buscando negocioUsuarioId en BD:', err);
      }
    }

    if (!sy.negocioUsuarioId) {
      res.status(403).json({
        success: false,
        message: 'Token ScanYA sin acceso a ChatYA. Solicita re-login.',
      });
      return;
    }

    // Mapear token ScanYA al formato esperado por chatya_controller
    req.usuario = {
      usuarioId: sy.negocioUsuarioId!,
      correo: sy.correo || '',
      perfil: 'comercial',
      membresia: 1,
      modoActivo: 'comercial',
      sucursalAsignada: sy.sucursalId,
      iat: sy.iat,
      exp: sy.exp,
    } as TokenDecodificado;

    // Guardar también el payload ScanYA original para acceso a negocioId
    req.scanyaUsuario = sy;

    next();
    return;
  }

  res.status(401).json({ success: false, message: 'Token inválido' });
}