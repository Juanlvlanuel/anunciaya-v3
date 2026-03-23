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
  generarUrlUploadImagenOferta,
  asignarOfertaAUsuarios,
  obtenerOfertasExclusivasUsuario,
  obtenerOfertaPublica,
  reenviarCupon,
  revocarCupon,
  revocarCuponMasivo,
  reactivarCupon,
  obtenerClientesAsignados,
  obtenerMisCupones,
  revelarCodigoCupon,
} from '../services/ofertas.service.js';
import {
  crearOfertaSchema,
  actualizarOfertaSchema,
  duplicarOfertaSchema,
  filtrosFeedSchema,
  asignarOfertaSchema,
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
// UPLOAD IMAGEN (R2)
// =============================================================================

/**
 * POST /api/ofertas/upload-imagen
 * Genera presigned URL para subir imagen de oferta directamente a R2
 *
 * Middlewares: verificarToken, verificarNegocio
 */
export async function postUploadImagenOferta(req: Request, res: Response) {
  try {
    const { nombreArchivo, contentType } = req.body;

    if (!nombreArchivo || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'nombreArchivo y contentType son requeridos',
      });
    }

    const resultado = await generarUrlUploadImagenOferta(nombreArchivo, contentType);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en postUploadImagenOferta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar URL de subida',
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
// ASIGNAR OFERTA A USUARIOS (OFERTAS EXCLUSIVAS)
// =============================================================================

/**
 * POST /api/ofertas/:id/asignar
 * Asigna una oferta privada a clientes selectos
 *
 * Middlewares: verificarToken, verificarNegocio
 */
export async function postAsignarOferta(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: 'El ID de la oferta no es válido' });
    }

    const validacion = asignarOfertaSchema.safeParse(req.body);
    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errores: formatearErroresZod(validacion.error),
      });
    }

    const negocioId = req.negocioId;
    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'No se pudo identificar el negocio' });
    }

    const resultado = await asignarOfertaAUsuarios(
      id,
      negocioId,
      validacion.data.usuariosIds,
      validacion.data.motivo
    );

    if (!resultado.success) {
      return res.status(404).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Error en postAsignarOferta:', error);
    return res.status(500).json({ success: false, message: 'Error al asignar oferta' });
  }
}

// =============================================================================
// OFERTAS EXCLUSIVAS DEL USUARIO
// =============================================================================

/**
 * GET /api/ofertas/mis-exclusivas
 * Obtiene ofertas privadas asignadas al usuario autenticado
 *
 * Middlewares: verificarToken
 */
export async function getMisExclusivas(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const resultado = await obtenerOfertasExclusivasUsuario(usuarioId);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getMisExclusivas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener ofertas exclusivas' });
  }
}

// =============================================================================
// OFERTA PÚBLICA POR CÓDIGO
// =============================================================================

/**
 * GET /api/ofertas/publico/:codigo
 * Obtiene detalle público de una oferta por su código
 * Sin autenticación requerida
 */
export async function getOfertaPublica(req: Request, res: Response) {
  try {
    const { codigo } = req.params;
    if (!codigo || codigo.length > 50) {
      return res.status(400).json({ success: false, message: 'Código inválido' });
    }

    const resultado = await obtenerOfertaPublica(codigo);
    if (!resultado.success) {
      return res.status(404).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Error en getOfertaPublica:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener oferta' });
  }
}

// =============================================================================
// REENVIAR CUPÓN
// =============================================================================

/**
 * POST /api/ofertas/:id/reenviar
 * Reenvía notificaciones del cupón a todos los clientes asignados
 */
export async function postReenviarCupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const negocioId = req.negocioId;
    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'No se pudo identificar el negocio' });
    }

    const resultado = await reenviarCupon(id, negocioId);
    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Error en postReenviarCupon:', error);
    return res.status(500).json({ success: false, message: 'Error al reenviar cupón' });
  }
}

// =============================================================================
// REVOCAR CUPÓN
// =============================================================================

export async function postRevocarCupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { usuarioId, motivo } = req.body;
    const negocioId = req.negocioId;
    const revocadoPorId = req.usuario?.usuarioId;

    if (!negocioId || !revocadoPorId) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros' });
    }
    if (!usuarioId) {
      return res.status(400).json({ success: false, message: 'El ID del usuario es requerido' });
    }

    const resultado = await revocarCupon(id, usuarioId, negocioId, revocadoPorId, motivo);
    if (!resultado.success) {
      return res.status(400).json(resultado);
    }
    return res.json(resultado);
  } catch (error) {
    console.error('Error en postRevocarCupon:', error);
    return res.status(500).json({ success: false, message: 'Error al revocar cupón' });
  }
}

// =============================================================================
// REVOCAR CUPÓN MASIVO (todos los usuarios)
// =============================================================================

export async function postRevocarCuponMasivo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const negocioId = req.negocioId;
    const revocadoPorId = req.usuario?.usuarioId;

    if (!negocioId || !revocadoPorId) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros' });
    }

    const resultado = await revocarCuponMasivo(id, negocioId, revocadoPorId, motivo);
    if (!resultado.success) {
      return res.status(400).json(resultado);
    }
    return res.json(resultado);
  } catch (error) {
    console.error('Error en postRevocarCuponMasivo:', error);
    return res.status(500).json({ success: false, message: 'Error al revocar cupón' });
  }
}

// =============================================================================
// REACTIVAR CUPÓN
// =============================================================================

export async function postReactivarCupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const negocioId = req.negocioId;
    if (!negocioId) return res.status(400).json({ success: false, message: 'Faltan parámetros' });

    const resultado = await reactivarCupon(id, negocioId);
    if (!resultado.success) return res.status(400).json(resultado);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en postReactivarCupon:', error);
    return res.status(500).json({ success: false, message: 'Error al reactivar cupón' });
  }
}

// =============================================================================
// CLIENTES ASIGNADOS A UN CUPÓN
// =============================================================================

export async function getClientesAsignados(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const negocioId = req.negocioId;
    if (!negocioId) return res.status(400).json({ success: false, message: 'Faltan parámetros' });

    const resultado = await obtenerClientesAsignados(id, negocioId);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getClientesAsignados:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
  }
}

// =============================================================================
// MIS CUPONES (VISTA CLIENTE)
// =============================================================================

export async function getMisCupones(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const estado = req.query.estado as string | undefined;
    const resultado = await obtenerMisCupones(usuarioId, estado);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getMisCupones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener cupones' });
  }
}

export async function postRevelarCodigo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const contrasena = req.body?.contrasena as string | undefined;
    const resultado = await revelarCodigoCupon(id, usuarioId, contrasena);
    if (!resultado.success) {
      return res.status(resultado.code ?? 400).json(resultado);
    }
    return res.json(resultado);
  } catch (error) {
    console.error('Error en postRevelarCodigo:', error);
    return res.status(500).json({ success: false, message: 'Error al revelar código' });
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

  // Código de descuento + ofertas exclusivas
  postReenviarCupon,
  postRevocarCupon,
  postAsignarOferta,
  getMisCupones,
  postRevelarCodigo,
  getMisExclusivas,
  getOfertaPublica,
};