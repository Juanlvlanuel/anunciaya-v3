/**
 * notificaciones.controller.ts
 * ==============================
 * Controllers para el módulo de Notificaciones.
 *
 * UBICACIÓN: apps/api/src/controllers/notificaciones.controller.ts
 */

import type { Request, Response } from 'express';
import {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  contarNoLeidas,
  eliminarNotificacion,
} from '../services/notificaciones.service.js';
import type { ModoNotificacion } from '../types/notificaciones.types.js';

// =============================================================================
// HELPERS
// =============================================================================

function obtenerUsuarioId(req: Request): string {
  return req.usuario!.usuarioId;
}

// =============================================================================
// GET /api/notificaciones?modo=personal&limit=20&offset=0
// =============================================================================

export async function obtenerNotificacionesController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = (req.query.modo as ModoNotificacion) || 'personal';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    // En modo comercial el interceptor axios agrega `sucursalId` automáticamente.
    // Se filtran las notificaciones por sucursal activa (+ las generales del negocio).
    const sucursalId = typeof req.query.sucursalId === 'string' ? req.query.sucursalId : undefined;

    const resultado = await obtenerNotificaciones(usuarioId, modo, limit, offset, sucursalId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({
        success: false,
        message: resultado.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: resultado.message,
      data: resultado.data,
    });
  } catch (error) {
    console.error('Error en obtenerNotificacionesController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// PATCH /api/notificaciones/:id/leida
// =============================================================================

export async function marcarLeidaController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la notificación es requerido',
      });
    }

    const resultado = await marcarComoLeida(id, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({
        success: false,
        message: resultado.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: resultado.message,
    });
  } catch (error) {
    console.error('Error en marcarLeidaController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// PATCH /api/notificaciones/marcar-todas
// =============================================================================

export async function marcarTodasLeidasController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = (req.query.modo as ModoNotificacion) || 'personal';
    // sucursalId llega por query param (frontend lo manda según contexto: BS vs
    // fuera de BS). Respeta el contexto de sucursal activa para no marcar como
    // leídas notificaciones de otras sucursales no visibles en el panel.
    const sucursalId = typeof req.query.sucursalId === 'string' ? req.query.sucursalId : undefined;

    const resultado = await marcarTodasComoLeidas(usuarioId, modo, sucursalId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({
        success: false,
        message: resultado.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: resultado.message,
    });
  } catch (error) {
    console.error('Error en marcarTodasLeidasController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// DELETE /api/notificaciones/:id
// =============================================================================

export async function eliminarNotificacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la notificación es requerido',
      });
    }

    const resultado = await eliminarNotificacion(id, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({
        success: false,
        message: resultado.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: resultado.message,
    });
  } catch (error) {
    console.error('Error en eliminarNotificacionController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// GET /api/notificaciones/no-leidas?modo=personal
// =============================================================================

export async function contarNoLeidasController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = (req.query.modo as ModoNotificacion) || 'personal';
    // Mismo filtro por sucursal activa que obtenerNotificaciones
    const sucursalId = typeof req.query.sucursalId === 'string' ? req.query.sucursalId : undefined;

    const resultado = await contarNoLeidas(usuarioId, modo, sucursalId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({
        success: false,
        message: resultado.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: resultado.message,
      data: resultado.data,
    });
  } catch (error) {
    console.error('Error en contarNoLeidasController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}