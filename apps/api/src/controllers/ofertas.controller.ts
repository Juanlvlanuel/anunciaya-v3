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
  obtenerOfertaDestacadaDelDia as obtenerOfertaDestacadaDelDiaService,
  registrarVistaOferta,
  registrarClickOferta,
  registrarShareOferta,
  obtenerSucursalesDeOferta,
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
import { obtenerSugerenciasOfertas } from '../services/ofertas/buscador.js';
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
 * Obtiene feed de ofertas geolocalizadas.
 *
 * Requiere usuario autenticado (verificarToken). El feed devuelve
 * liked/saved personalizados.
 */
export async function getFeedOfertas(req: Request, res: Response) {
  try {
    const userId = req.usuario!.usuarioId;

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
    const userId = req.usuario!.usuarioId;

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

/**
 * GET /api/ofertas/:id/sucursales
 * Devuelve la lista de sucursales donde aplica la MISMA oferta operativa
 * (mismo grupo de partición que el dedup del feed).
 *
 * Query params opcionales:
 *  - latitud, longitud → calcula distancia desde el GPS del usuario y
 *    ordena por distancia ASC. Sin GPS, ordena por matriz primero.
 */
export async function getSucursalesDeOferta(req: Request, res: Response) {
  try {
    const { ofertaId } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(ofertaId)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    const latitud = Number(req.query.latitud);
    const longitud = Number(req.query.longitud);
    const gpsUsuario =
      Number.isFinite(latitud) && Number.isFinite(longitud)
        ? { latitud, longitud }
        : undefined;

    const resultado = await obtenerSucursalesDeOferta(ofertaId, gpsUsuario);
    if (!resultado.success) {
      return res.status(resultado.code ?? 404).json(resultado);
    }
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getSucursalesDeOferta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener sucursales de la oferta',
    });
  }
}

/**
 * GET /api/ofertas/destacada-del-dia
 * Devuelve la oferta destacada vigente para el feed público.
 * - Si hay override admin activo y vigente, devuelve esa oferta.
 * - Si no, calcula automáticamente la más popular activa.
 * - Si no hay ninguna, devuelve `data: null` (no es error).
 */
export async function getOfertaDestacadaDelDia(req: Request, res: Response) {
  try {
    const userId = req.usuario!.usuarioId;

    // GPS opcional para calcular distancia. NO filtra por ciudad
    // (la destacada del día es contenido editorial global).
    const latitud = Number(req.query.latitud);
    const longitud = Number(req.query.longitud);
    const gpsUsuario =
      Number.isFinite(latitud) && Number.isFinite(longitud)
        ? { latitud, longitud }
        : undefined;

    const resultado = await obtenerOfertaDestacadaDelDiaService(userId, gpsUsuario);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getOfertaDestacadaDelDia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la oferta destacada del día',
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

    // Registrar vista (incrementa contador acumulado + evento individual)
    const usuarioId = req.usuario!.usuarioId;
    await registrarVistaOferta(id, usuarioId);

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

/**
 * POST /api/ofertas/:id/share
 * Registra un share cuando el usuario comparte la oferta (WhatsApp,
 * Facebook, X, Copiar link, Web Share API).
 * Anti-inflación: 1 share por usuario por día calendario.
 */
export async function postRegistrarShare(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    const usuarioId = req.usuario!.usuarioId;
    await registrarShareOferta(id, usuarioId);

    return res.json({
      success: true,
      message: 'Share registrado',
    });
  } catch (error) {
    console.error('Error en postRegistrarShare:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar share',
    });
  }
}

/**
 * POST /api/ofertas/:id/click
 * Registra un click (engagement) cuando el usuario abre el modal.
 * Anti-inflación: 1 click por usuario por día calendario.
 */
export async function postRegistrarClick(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la oferta no es válido',
      });
    }

    const usuarioId = req.usuario!.usuarioId;
    await registrarClickOferta(id, usuarioId);

    return res.json({
      success: true,
      message: 'Click registrado',
    });
  } catch (error) {
    console.error('Error en postRegistrarClick:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar click',
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
// BUSCADOR (sugerencias en vivo)
// =============================================================================

/**
 * GET /api/ofertas/buscar/sugerencias?q=...&ciudad=...
 * Top 5 ofertas activas en la ciudad cuyo título, descripción o nombre del
 * negocio matchea el query (ILIKE substring).
 *
 * Versión sobria del patrón de MarketPlace: sin FTS, sin populares, sin log.
 * Ver `services/ofertas/buscador.ts` para racional.
 */
export async function getSugerenciasOfertas(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const ciudad = typeof req.query.ciudad === 'string' ? req.query.ciudad : '';

    const resultado = await obtenerSugerenciasOfertas(q, ciudad);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getSugerenciasOfertas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener sugerencias',
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
  getOfertaDestacadaDelDia,
  getSugerenciasOfertas,
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