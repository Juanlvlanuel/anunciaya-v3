/**
 * clientes.controller.ts
 * =========================
 * Controllers para el módulo de Clientes (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/controllers/clientes.controller.ts
 * 
 * ENDPOINTS:
 * GET    /api/clientes/top                     - Top clientes con puntos
 * 
 * NOTA: Consume funciones de puntos.service.ts (service compartido)
 */

import { Request, Response } from 'express';
import {
  obtenerTopClientes,
} from '../services/puntos.service.js';

// =============================================================================
// HELPERS PARA OBTENER DATOS DEL CONTEXTO
// =============================================================================

/**
 * Obtiene el negocioId del request
 * IMPORTANTE: Requiere middleware verificarNegocio ejecutado antes
 */
function obtenerNegocioId(req: Request): string | null {
  return req.negocioId || null;
}

/**
 * Obtiene el sucursalId del contexto
 * - Query param ?sucursalId=xxx (enviado automáticamente por interceptor Axios)
 * - req.usuario.sucursalAsignada (gerente tiene asignación fija en el token)
 */
function obtenerSucursalId(req: Request): string | undefined {
  const querySucursal = req.query.sucursalId as string;
  if (querySucursal) {
    return querySucursal;
  }

  if (req.usuario?.sucursalAsignada) {
    return req.usuario.sucursalAsignada;
  }

  return undefined;
}

/**
 * Verifica si el usuario es gerente
 * REGLA: Si sucursalAsignada tiene valor → es gerente
 */
function esGerente(req: Request): boolean {
  const usuario = req.usuario;
  return !!usuario?.sucursalAsignada;
}

// =============================================================================
// 1. OBTENER TOP CLIENTES CON PUNTOS
// =============================================================================

/**
 * GET /api/clientes/top?limit=10
 * Obtiene los clientes con más puntos disponibles
 * Acceso: Dueños y Gerentes (gerentes ven solo su sucursal)
 */
export async function obtenerTopClientesController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);

    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Obtener sucursal del contexto
    let sucursalId = obtenerSucursalId(req);

    // GERENTES: Forzar filtro por su sucursal asignada (NO pueden ver otras)
    if (esGerente(req)) {
      sucursalId = req.usuario?.sucursalAsignada || undefined;
      if (!sucursalId) {
        res.status(403).json({
          success: false,
          message: 'Gerente debe tener sucursal asignada',
        });
        return;
      }
    }

    // Obtener límite del query param
    const limit = parseInt(req.query.limit as string) || 10;

    // Validar límite
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100',
      });
      return;
    }

    const resultado = await obtenerTopClientes(negocioId, sucursalId, limit);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerTopClientesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top clientes',
    });
  }
}