/**
 * ============================================================================
 * OFERTAS CONTROLLER - Manejo de Peticiones HTTP
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/ofertas.controller.ts
 * 
 * PROPÓSITO:
 * Controlador para endpoints relacionados con ofertas
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { Request, Response } from 'express';
import {
  obtenerFeedOfertas,
  obtenerOfertaDetalle,
  registrarVistaOferta,
  crearOferta,
  obtenerOfertas,
  obtenerOfertaPorId,
  actualizarOferta,
  eliminarOferta,
  duplicarOfertaASucursales,
} from '../services/ofertas.service.js';
import {
  crearOfertaSchema,
  actualizarOfertaSchema,
  duplicarOfertaSchema,
  filtrosFeedSchema,
  formatearErroresZod,
} from '../validations/ofertas.schema.js';

// =============================================================================
// FEED PÚBLICO (REQUIERE AUTH - AMBOS MODOS)
// =============================================================================

/**
 * GET /api/ofertas/feed
 * Obtiene feed de ofertas geolocalizadas
 * 
 * Query params:
 * - latitud, longitud, distanciaMaxKm
 * - categoriaId, tipo, busqueda
 * - limite, offset
 * 
 * Funciona en modo personal y comercial
 */
export async function getFeedOfertas(req: Request, res: Response) {
  try {
    // Usuario autenticado (puede ser null si la ruta no requiere auth)
    const userId = req.usuario?.usuarioId || null;

    // Validar query params con Zod
    const validacion = filtrosFeedSchema.safeParse(req.query);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errores: formatearErroresZod(validacion.error),
      });
    }

    // Obtener feed
    const resultado = await obtenerFeedOfertas(userId, validacion.data);

    return res.json(resultado);
  } catch (error) {
    console.error('Error en getFeedOfertas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ofertas',
    });
  }
}

/**
 * GET /api/ofertas/detalle/:ofertaId
 * Obtiene detalle de una oferta específica
 * Para modal de detalle o enlaces compartidos
 */
export async function getOfertaDetalle(req: Request, res: Response) {
  try {
    const { ofertaId } = req.params;
    const userId = req.usuario?.usuarioId || null;

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(ofertaId)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    const resultado = await obtenerOfertaDetalle(ofertaId, userId);

    if (!resultado.success) {
      return res.status(404).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Error en getOfertaDetalle:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener detalle de la oferta',
    });
  }
}

// =============================================================================
// BUSINESS STUDIO (REQUIEREN AUTH + MODO COMERCIAL)
// =============================================================================

/**
 * POST /api/ofertas
 * Crea una nueva oferta y la asigna a la sucursal activa
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function postCrearOferta(req: Request, res: Response) {
  try {
    // Validar datos con Zod
    const validacion = crearOfertaSchema.safeParse(req.body);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errores: formatearErroresZod(validacion.error),
      });
    }

    // Obtener negocioId (inyectado por middleware verificarNegocio)
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar el negocio',
      });
    }

    // Obtener sucursalId (del query, agregado por interceptor Axios)
    const sucursalId = req.query.sucursalId as string;

    if (!sucursalId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la sucursal es requerido',
      });
    }

    // Crear oferta
    const resultado = await crearOferta(
      negocioId,
      sucursalId,
      validacion.data
    );

    return res.status(201).json(resultado);
  } catch (error) {
    console.error('Error en postCrearOferta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la oferta',
    });
  }
}

/**
 * GET /api/ofertas
 * Lista todas las ofertas de la sucursal activa
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function getOfertas(req: Request, res: Response) {
  try {
    // Obtener negocioId (inyectado por middleware verificarNegocio)
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar el negocio',
      });
    }

    // Obtener sucursalId (del query, agregado por interceptor Axios)
    const sucursalId = req.query.sucursalId as string;

    if (!sucursalId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la sucursal es requerido',
      });
    }

    // Obtener ofertas
    const resultado = await obtenerOfertas(negocioId, sucursalId);

    return res.json(resultado);
  } catch (error) {
    console.error('Error en getOfertas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ofertas',
    });
  }
}

/**
 * GET /api/ofertas/:id
 * Obtiene una oferta específica
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function getOferta(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    // Obtener negocioId y sucursalId
    const negocioId = req.negocioId;
    const sucursalId = req.query.sucursalId as string;

    if (!negocioId || !sucursalId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos',
      });
    }

    // Obtener oferta
    const resultado = await obtenerOfertaPorId(id, negocioId, sucursalId);

    if (!resultado.success) {
      return res.status(404).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Error en getOferta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la oferta',
    });
  }
}

/**
 * PUT /api/ofertas/:id
 * Actualiza una oferta existente
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function putActualizarOferta(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    // Validar datos con Zod
    const validacion = actualizarOfertaSchema.safeParse(req.body);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errores: formatearErroresZod(validacion.error),
      });
    }

    // Obtener negocioId y sucursalId
    const negocioId = req.negocioId;
    const sucursalId = req.query.sucursalId as string;

    if (!negocioId || !sucursalId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos',
      });
    }

    // Actualizar oferta
    const resultado = await actualizarOferta(
      id,
      negocioId,
      sucursalId,
      validacion.data
    );

    return res.json(resultado);
  } catch (error) {
    console.error('Error en putActualizarOferta:', error);

    // Manejar error específico de oferta no encontrada
    if (
      error instanceof Error &&
      error.message.includes('no encontrada')
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la oferta',
    });
  }
}

/**
 * DELETE /api/ofertas/:id
 * Elimina una oferta completamente
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function deleteOferta(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    // Obtener negocioId y sucursalId
    const negocioId = req.negocioId;
    const sucursalId = req.query.sucursalId as string;

    if (!negocioId || !sucursalId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos',
      });
    }

    // Eliminar oferta
    const resultado = await eliminarOferta(id, negocioId, sucursalId);

    return res.json(resultado);
  } catch (error) {
    console.error('Error en deleteOferta:', error);

    // Manejar error específico de oferta no encontrada
    if (
      error instanceof Error &&
      error.message.includes('no encontrada')
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la oferta',
    });
  }
}

/**
 * POST /api/ofertas/:id/duplicar
 * Duplica una oferta a otras sucursales (SOLO DUEÑOS)
 * 
 * Middlewares: verificarToken, verificarNegocio
 * NO usa validarAccesoSucursal (operación multi-sucursal)
 */
export async function postDuplicarOferta(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    // Validar datos con Zod PRIMERO (necesitamos ver las sucursales destino)
    const validacion = duplicarOfertaSchema.safeParse(req.body);

    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errores: formatearErroresZod(validacion.error),
      });
    }

    // Validar permisos según rol
    const usuario = req.usuario;
    const esGerente = !!usuario?.sucursalAsignada;

    // GERENTES: Solo pueden duplicar en SU PROPIA sucursal
    if (esGerente) {
      const sucursalAsignada = usuario?.sucursalAsignada;
      const sucursalesDestino = validacion.data.sucursalesIds;

      // Validar que solo esté duplicando a su propia sucursal
      if (sucursalesDestino.length !== 1 || sucursalesDestino[0] !== sucursalAsignada) {
        return res.status(403).json({
          success: false,
          message: 'Los gerentes solo pueden duplicar ofertas en su propia sucursal',
        });
      }
    }

    // DUEÑOS: Pueden duplicar a cualquier sucursal (sin validación adicional)

    // Obtener negocioId
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar el negocio',
      });
    }

    // Duplicar oferta
    const resultado = await duplicarOfertaASucursales(
      id,
      negocioId,
      validacion.data
    );

    return res.status(201).json(resultado);
  } catch (error) {
    console.error('Error en postDuplicarOferta:', error);

    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes('no pertenecen')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Error al duplicar la oferta',
    });
  }
}

// =============================================================================
// MÉTRICAS
// =============================================================================

/**
 * POST /api/ofertas/:id/vista
 * Registra una vista de oferta (incrementa total_vistas)
 * Requiere autenticación
 */
export async function postRegistrarVista(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    // Registrar vista
    await registrarVistaOferta(id);

    return res.json({
      success: true,
      message: 'Vista registrada',
    });
  } catch (error) {
    console.error('Error en postRegistrarVista:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar vista',
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Feed público (requiere auth)
  getFeedOfertas,
  getOfertaDetalle,
  postRegistrarVista,

  // Business Studio (requiere auth + modo comercial)
  postCrearOferta,
  getOfertas,
  getOferta,
  putActualizarOferta,
  deleteOferta,
  postDuplicarOferta,
};