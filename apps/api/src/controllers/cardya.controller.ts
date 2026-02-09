/**
 * cardya.controller.ts
 * ====================
 * Controlador del módulo CardYA (Cliente)
 * 
 * Ubicación: apps/api/src/controllers/cardya.controller.ts
 * 
 * RESPONSABILIDADES:
 * - Validar inputs con Zod
 * - Llamar a los servicios
 * - Formatear respuestas HTTP
 */

import type { Request, Response } from 'express';
import * as cardyaService from '../services/cardya.service.js';
import {
  canjearRecompensaSchema,
  filtrosHistorialComprasSchema,
  filtrosHistorialCanjesSchema,
  filtrosRecompensasSchema,
  filtrosVouchersSchema,
  formatearErroresZod,
} from '../validations/cardya.schema.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Obtiene el usuarioId del request
 * IMPORTANTE: Requiere middleware verificarToken ejecutado antes
 */
function obtenerUsuarioId(req: Request): string {
  return req.usuario!.usuarioId;
}

// =============================================================================
// BILLETERAS Y PUNTOS
// =============================================================================

/**
 * GET /api/cardya/mis-puntos
 * Obtiene todas las billeteras del usuario (negocios donde tiene puntos)
 */
export async function obtenerMisPuntosController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    const resultado = await cardyaService.obtenerBilleterasPorUsuario(usuarioId);

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
    console.error('Error en obtenerMisPuntosController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/cardya/negocio/:negocio_id
 * Obtiene detalle completo de la billetera en un negocio específico
 */
export async function obtenerDetalleNegocioController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { negocio_id } = req.params;

    if (!negocio_id) {
      return res.status(400).json({
        success: false,
        message: 'El ID del negocio es requerido',
      });
    }

    const resultado = await cardyaService.obtenerDetalleNegocioBilletera(
      usuarioId,
      negocio_id
    );

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
    console.error('Error en obtenerDetalleNegocioController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

/**
 * GET /api/cardya/recompensas?negocioId=xxx&soloDisponibles=true
 * Obtiene recompensas disponibles para el usuario
 */
export async function obtenerRecompensasController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    // Validar query params
    const validacion = filtrosRecompensasSchema.safeParse(req.query);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: formatearErroresZod(validacion.error),
      });
    }

    const filtros = validacion.data;

    const resultado = await cardyaService.obtenerRecompensasDisponibles(
      usuarioId,
      filtros
    );

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
    console.error('Error en obtenerRecompensasController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * POST /api/cardya/canjear
 * Canjea una recompensa y genera voucher
 */
export async function canjearRecompensaController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    // Validar body
    const validacion = canjearRecompensaSchema.safeParse(req.body);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: formatearErroresZod(validacion.error),
      });
    }

    const { recompensaId } = validacion.data;

    const resultado = await cardyaService.generarVoucher(usuarioId, recompensaId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({
        success: false,
        message: resultado.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: resultado.message,
      data: resultado.data,
    });
  } catch (error) {
    console.error('Error en canjearRecompensaController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// VOUCHERS
// =============================================================================

/**
 * GET /api/cardya/vouchers?estado=pendiente
 * Obtiene los vouchers del usuario
 */
export async function obtenerMisVouchersController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    // Validar query params
    const validacion = filtrosVouchersSchema.safeParse(req.query);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: formatearErroresZod(validacion.error),
      });
    }

    const filtros = validacion.data;

    const resultado = await cardyaService.obtenerVouchersPorUsuario(
      usuarioId,
      filtros
    );

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
    console.error('Error en obtenerMisVouchersController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * DELETE /api/cardya/vouchers/:id
 * Cancela un voucher y devuelve los puntos
 */
export async function cancelarVoucherController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID del voucher es requerido',
      });
    }

    const resultado = await cardyaService.cancelarVoucher(id, usuarioId);

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
    console.error('Error en cancelarVoucherController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

// =============================================================================
// HISTORIAL
// =============================================================================

/**
 * GET /api/cardya/historial/compras?negocioId=xxx&limit=20&offset=0
 * Obtiene el historial de compras (puntos ganados)
 */
export async function obtenerHistorialComprasController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    // Validar query params
    const validacion = filtrosHistorialComprasSchema.safeParse(req.query);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: formatearErroresZod(validacion.error),
      });
    }

    const filtros = validacion.data;

    const resultado = await cardyaService.obtenerHistorialCompras(
      usuarioId,
      filtros
    );

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
    console.error('Error en obtenerHistorialComprasController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/cardya/historial/canjes?negocioId=xxx&estado=usado&limit=20&offset=0
 * Obtiene el historial de canjes (puntos gastados)
 */
export async function obtenerHistorialCanjesController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    // Validar query params
    const validacion = filtrosHistorialCanjesSchema.safeParse(req.query);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: formatearErroresZod(validacion.error),
      });
    }

    const filtros = validacion.data;

    const resultado = await cardyaService.obtenerHistorialCanjes(
      usuarioId,
      filtros
    );

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
    console.error('Error en obtenerHistorialCanjesController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}