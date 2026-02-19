/**
 * clientes.controller.ts
 * =========================
 * Controllers para el módulo de Clientes (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/controllers/clientes.controller.ts
 * 
 * ENDPOINTS:
 * GET    /api/clientes/top                     - Top clientes con puntos
 * GET    /api/clientes/kpis                    - KPIs para página Clientes BS
 * GET    /api/clientes                         - Lista de clientes con filtros
 * GET    /api/clientes/:id                     - Detalle completo de un cliente
 * GET    /api/clientes/:id/historial           - Historial de transacciones de un cliente
 * 
 * NOTA: Consume funciones de puntos.service.ts y clientes.service.ts
 */

import { Request, Response } from 'express';
import {
  obtenerTopClientes,
} from '../services/puntos.service.js';
import {
  obtenerKPIsClientes,
  obtenerClientes,
  obtenerDetalleCliente,
  obtenerHistorialCliente,
} from '../services/clientes.service.js';

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

// =============================================================================
// 2. OBTENER KPIs CLIENTES (Página Clientes BS)
// =============================================================================

/**
 * GET /api/clientes/kpis
 * Obtiene 4 KPIs: total clientes, distribución nivel, nuevos mes, inactivos
 * Acceso: Dueños y Gerentes
 */
export async function obtenerKPIsClientesController(
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

    let sucursalId = obtenerSucursalId(req);

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

    const resultado = await obtenerKPIsClientes(negocioId, sucursalId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerKPIsClientesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener KPIs de clientes',
    });
  }
}

// =============================================================================
// 3. OBTENER LISTA DE CLIENTES (Página Clientes BS)
// =============================================================================

/**
 * GET /api/clientes?busqueda=xxx&nivel=oro&limit=20&offset=0
 * Lista clientes con filtros y paginación
 * Acceso: Dueños y Gerentes
 */
export async function obtenerClientesController(
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

    let sucursalId = obtenerSucursalId(req);

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

    // Parámetros de filtro
    const busqueda = req.query.busqueda as string | undefined;
    const nivel = req.query.nivel as 'bronce' | 'plata' | 'oro' | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Validar nivel
    if (nivel && !['bronce', 'plata', 'oro'].includes(nivel)) {
      res.status(400).json({
        success: false,
        message: 'Nivel inválido. Valores permitidos: bronce, plata, oro',
      });
      return;
    }

    const resultado = await obtenerClientes(negocioId, {
      sucursalId,
      busqueda,
      nivel,
      limit,
      offset,
    });

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerClientesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
    });
  }
}

// =============================================================================
// 4. OBTENER DETALLE DE UN CLIENTE (Modal Clientes BS)
// =============================================================================

/**
 * GET /api/clientes/:id
 * Detalle completo: puntos, vouchers, estadísticas, datos personales
 * Acceso: Dueños y Gerentes
 */
export async function obtenerDetalleClienteController(
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

    const clienteId = req.params.id;

    if (!clienteId) {
      res.status(400).json({
        success: false,
        message: 'ID de cliente requerido',
      });
      return;
    }

    const resultado = await obtenerDetalleCliente(negocioId, clienteId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerDetalleClienteController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del cliente',
    });
  }
}

// =============================================================================
// 5. OBTENER HISTORIAL DE UN CLIENTE (Modal Clientes BS)
// =============================================================================

/**
 * GET /api/clientes/:id/historial?limit=20&offset=0
 * Transacciones de un cliente específico
 * Acceso: Dueños y Gerentes
 */
export async function obtenerHistorialClienteController(
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

    const clienteId = req.params.id;

    if (!clienteId) {
      res.status(400).json({
        success: false,
        message: 'ID de cliente requerido',
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const resultado = await obtenerHistorialCliente(negocioId, clienteId, limit, offset);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerHistorialClienteController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial del cliente',
    });
  }
}