/**
 * transacciones.controller.ts
 * ============================
 * Controllers para el módulo de Transacciones (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/controllers/transacciones.controller.ts
 * 
 * ENDPOINTS:
 * GET    /api/transacciones/historial              - Historial de transacciones de puntos
 * POST   /api/transacciones/:id/revocar            - Revocar transacción
 * 
 * NOTA: Consume funciones de puntos.service.ts (service compartido)
 */

import { Request, Response } from 'express';
import {
  obtenerHistorialTransacciones,
  revocarTransaccion,
} from '../services/puntos.service.js';
import type { PeriodoEstadisticas } from '../types/puntos.types.js';

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
 * Verifica si el usuario es dueño del negocio
 * REGLA: Si sucursalAsignada es null → es dueño
 */
function esDueno(req: Request): boolean {
  const usuario = req.usuario;
  return usuario?.sucursalAsignada === null || usuario?.sucursalAsignada === undefined;
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
// 1. OBTENER HISTORIAL DE TRANSACCIONES
// =============================================================================

/**
 * GET /api/transacciones/historial?periodo=semana&limit=50&offset=0
 * Obtiene historial de transacciones de puntos con filtros
 * Acceso: Dueños y Gerentes (gerentes ven solo su sucursal)
 */
export async function obtenerHistorialController(
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

    // Obtener parámetros de paginación
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Obtener periodo del query param
    const periodo = (req.query.periodo as PeriodoEstadisticas) || 'todo';

    // Validar periodo
    const periodosValidos: PeriodoEstadisticas[] = ['hoy', 'semana', 'mes', '3meses', 'anio', 'todo'];
    if (!periodosValidos.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${periodosValidos.join(', ')}`,
      });
      return;
    }

    // Validar límites
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100',
      });
      return;
    }

    const resultado = await obtenerHistorialTransacciones(
      negocioId,
      sucursalId,
      periodo,
      limit,
      offset
    );

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerHistorialController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
    });
  }
}

// =============================================================================
// 2. REVOCAR TRANSACCIÓN
// =============================================================================

/**
 * POST /api/transacciones/:id/revocar
 * Revoca una transacción de puntos
 * Acceso: Dueños (cualquier transacción) y Gerentes (solo de su sucursal)
 */
export async function revocarTransaccionController(
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

    // Verificar que sea DUEÑO o GERENTE (NO empleados)
    if (!esDueno(req) && !esGerente(req)) {
      res.status(403).json({
        success: false,
        message: 'Solo dueños y gerentes pueden revocar transacciones',
      });
      return;
    }

    const transaccionId = req.params.id;

    if (!transaccionId) {
      res.status(400).json({
        success: false,
        message: 'ID de transacción requerido',
      });
      return;
    }

    // Obtener sucursalId para gerentes (validación de permisos)
    let sucursalId: string | undefined;
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

    const resultado = await revocarTransaccion(transaccionId, negocioId, sucursalId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en revocarTransaccionController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al revocar transacción',
    });
  }
}