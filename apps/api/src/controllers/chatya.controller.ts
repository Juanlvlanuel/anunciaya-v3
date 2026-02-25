/**
 * chatya.controller.ts
 * =====================
 * Controllers para el módulo de ChatYA (Chat 1:1).
 * Solo recibe peticiones HTTP, llama al service, devuelve respuestas.
 *
 * UBICACIÓN: apps/api/src/controllers/chatya.controller.ts
 */

import type { Request, Response } from 'express';
import {
  listarConversaciones,
  obtenerConversacion,
  crearObtenerConversacion,
  obtenerOCrearMisNotas,
  toggleFijarConversacion,
  toggleArchivarConversacion,
  toggleSilenciarConversacion,
  eliminarConversacion,
  listarMensajes,
  enviarMensaje,
  editarMensaje,
  eliminarMensaje,
  reenviarMensaje,
  marcarMensajesLeidos,
  listarContactos,
  agregarContacto,
  eliminarContacto,
  editarAliasContacto,
  listarBloqueados,
  bloquearUsuario,
  desbloquearUsuario,
  toggleReaccion,
  obtenerReacciones,
  fijarMensaje,
  desfijarMensaje,
  listarMensajesFijados,
  buscarMensajes,
  contarTotalNoLeidos,
  buscarPersonas,
  buscarNegocios,
} from '../services/chatya.service.js';
import type { ModoChatYA, ContextoTipo } from '../types/chatya.types.js';

// =============================================================================
// HELPERS
// =============================================================================

function obtenerUsuarioId(req: Request): string {
  return req.usuario!.usuarioId;
}

function obtenerModo(req: Request): ModoChatYA {
  return (req.usuario!.modoActivo as ModoChatYA) || 'personal';
}

function obtenerSucursalId(req: Request): string | null {
  // Gerente: sucursalAsignada fija desde el token
  // Dueño: sucursalId enviada por el interceptor Axios como query param
  return req.usuario!.sucursalAsignada || (req.query.sucursalId as string) || null;
}

// =============================================================================
// CONVERSACIONES
// =============================================================================

/**
 * GET /api/chatya/conversaciones?modo=personal&limit=20&offset=0
 */
export async function listarConversacionesController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = (req.query.modo as ModoChatYA) || obtenerModo(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const sucursalId = modo === 'comercial' ? obtenerSucursalId(req) : null;

    const archivadas = req.query.archivadas === 'true';
    const resultado = await listarConversaciones(usuarioId, modo, { limit, offset }, archivadas, sucursalId);


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
    console.error('Error en listarConversacionesController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * GET /api/chatya/conversaciones/:id
 */
export async function obtenerConversacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await obtenerConversacion(conversacionId, usuarioId);

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
    console.error('Error en obtenerConversacionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * POST /api/chatya/conversaciones
 * Body: { participante2Id, participante2Modo?, contextoTipo?, contextoReferenciaId? }
 */
export async function crearConversacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = obtenerModo(req);
    const sucursalId = obtenerSucursalId(req);

    const {
      participante2Id,
      participante2Modo = 'personal',
      participante2SucursalId = null,
      contextoTipo = 'directo',
      contextoReferenciaId = null,
    } = req.body;

    if (!participante2Id) {
      return res.status(400).json({
        success: false,
        message: 'participante2Id es requerido',
      });
    }

    if (participante2Id === usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes chatear contigo mismo',
      });
    }

    const resultado = await crearObtenerConversacion({
      participante2Id,
      participante1Modo: modo,
      participante2Modo: participante2Modo as ModoChatYA,
      participante1SucursalId: sucursalId,
      participante2SucursalId,
      contextoTipo: contextoTipo as ContextoTipo,
      contextoReferenciaId,
    }, usuarioId);

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
    console.error('Error en crearConversacionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/chatya/conversaciones/:id/fijar
 */
export async function fijarConversacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await toggleFijarConversacion(conversacionId, usuarioId);

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
    console.error('Error en fijarConversacionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/chatya/conversaciones/:id/archivar
 */
export async function archivarConversacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await toggleArchivarConversacion(conversacionId, usuarioId);

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
    console.error('Error en archivarConversacionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/chatya/conversaciones/:id/silenciar
 */
export async function silenciarConversacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await toggleSilenciarConversacion(conversacionId, usuarioId);

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
    console.error('Error en silenciarConversacionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/chatya/conversaciones/:id
 */
export async function eliminarConversacionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await eliminarConversacion(conversacionId, usuarioId);

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
    console.error('Error en eliminarConversacionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// MIS NOTAS
// =============================================================================

/**
 * GET /api/chatya/mis-notas
 * Obtiene o crea la conversación "Mis Notas" del usuario.
 */
export async function misNotasController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    const resultado = await obtenerOCrearMisNotas(usuarioId);

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
    console.error('Error en misNotasController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// MENSAJES
// =============================================================================

/**
 * GET /api/chatya/conversaciones/:id/mensajes?limit=30&offset=0
 */
export async function listarMensajesController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const resultado = await listarMensajes(conversacionId, usuarioId, { limit, offset });

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
    console.error('Error en listarMensajesController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * POST /api/chatya/conversaciones/:id/mensajes
 * Body: { contenido, tipo?, respuestaAId?, empleadoId? }
 */
export async function enviarMensajeController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = obtenerModo(req);
    const sucursalId = obtenerSucursalId(req);
    const conversacionId = req.params.id;

    const {
      contenido,
      tipo = 'texto',
      respuestaAId = null,
      empleadoId = null,
    } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido del mensaje es requerido',
      });
    }

    if (tipo === 'texto' && contenido.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede exceder 5,000 caracteres',
      });
    }

    const resultado = await enviarMensaje({
      conversacionId,
      emisorId: usuarioId,
      emisorModo: modo,
      emisorSucursalId: sucursalId,
      empleadoId,
      tipo,
      contenido: contenido.trim(),
      respuestaAId,
    });

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
    console.error('Error en enviarMensajeController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/chatya/mensajes/:id
 * Body: { contenido }
 */
export async function editarMensajeController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const mensajeId = req.params.id;
    const { contenido } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido es requerido',
      });
    }

    if (contenido.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede exceder 5,000 caracteres',
      });
    }

    const resultado = await editarMensaje({
      mensajeId,
      emisorId: usuarioId,
      contenido: contenido.trim(),
    });

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
    console.error('Error en editarMensajeController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/chatya/mensajes/:id
 */
export async function eliminarMensajeController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const mensajeId = req.params.id;

    const resultado = await eliminarMensaje(mensajeId, usuarioId);

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
    console.error('Error en eliminarMensajeController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * POST /api/chatya/mensajes/:id/reenviar
 * Body: { destinatarioId, destinatarioModo?, destinatarioSucursalId? }
 */
export async function reenviarMensajeController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = obtenerModo(req);
    const sucursalId = obtenerSucursalId(req);
    const mensajeOriginalId = req.params.id;

    const {
      destinatarioId,
      destinatarioModo = 'personal',
      destinatarioSucursalId = null,
    } = req.body;

    if (!destinatarioId) {
      return res.status(400).json({
        success: false,
        message: 'destinatarioId es requerido',
      });
    }

    const resultado = await reenviarMensaje({
      mensajeOriginalId,
      emisorId: usuarioId,
      emisorModo: modo,
      emisorSucursalId: sucursalId,
      destinatarioId,
      destinatarioModo: destinatarioModo as ModoChatYA,
      destinatarioSucursalId,
    });

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
    console.error('Error en reenviarMensajeController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// LECTURA
// =============================================================================

/**
 * PATCH /api/chatya/conversaciones/:id/leer
 */
export async function marcarLeidosController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await marcarMensajesLeidos(conversacionId, usuarioId);

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
    console.error('Error en marcarLeidosController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// CONTACTOS
// =============================================================================

/**
 * GET /api/chatya/contactos?tipo=personal
 */
export async function listarContactosController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const tipo = (req.query.tipo as 'personal' | 'comercial') || 'personal';

    const resultado = await listarContactos(usuarioId, tipo);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en listarContactosController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * POST /api/chatya/contactos
 * Body: { contactoId, tipo, negocioId?, alias? }
 */
export async function agregarContactoController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { contactoId, tipo = 'personal', negocioId = null, sucursalId = null, alias = null } = req.body;

    if (!contactoId) {
      return res.status(400).json({ success: false, message: 'contactoId es requerido' });
    }

    const resultado = await agregarContacto(usuarioId, { contactoId, tipo, negocioId, sucursalId, alias });

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(201).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en agregarContactoController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/chatya/contactos/:id
 */
export async function eliminarContactoController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const contactoId = req.params.id;

    const resultado = await eliminarContacto(contactoId, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message });
  } catch (error) {
    console.error('Error en eliminarContactoController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/chatya/contactos/:id/alias
 */
export async function editarAliasContactoController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const contactoId = req.params.id;
    const { alias } = req.body as { alias: string | null };

    const resultado = await editarAliasContacto(contactoId, usuarioId, alias);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message });
  } catch (error) {
    console.error('Error en editarAliasContactoController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// BLOQUEO
// =============================================================================

/**
 * GET /api/chatya/bloqueados
 */
export async function listarBloqueadosController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);

    const resultado = await listarBloqueados(usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en listarBloqueadosController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * POST /api/chatya/bloqueados
 * Body: { bloqueadoId, motivo? }
 */
export async function bloquearUsuarioController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { bloqueadoId, motivo = null } = req.body;

    if (!bloqueadoId) {
      return res.status(400).json({ success: false, message: 'bloqueadoId es requerido' });
    }

    const resultado = await bloquearUsuario(usuarioId, { bloqueadoId, motivo });

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(201).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en bloquearUsuarioController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/chatya/bloqueados/:id
 */
export async function desbloquearUsuarioController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const bloqueadoId = req.params.id;

    const resultado = await desbloquearUsuario(bloqueadoId, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message });
  } catch (error) {
    console.error('Error en desbloquearUsuarioController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// REACCIONES
// =============================================================================

/**
 * POST /api/chatya/mensajes/:id/reaccion
 * Body: { emoji }
 */
export async function toggleReaccionController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const mensajeId = req.params.id;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'emoji es requerido' });
    }

    const resultado = await toggleReaccion(mensajeId, usuarioId, emoji);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en toggleReaccionController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * GET /api/chatya/mensajes/:id/reacciones
 */
export async function obtenerReaccionesController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const mensajeId = req.params.id;

    const resultado = await obtenerReacciones(mensajeId, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en obtenerReaccionesController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// MENSAJES FIJADOS
// =============================================================================

/**
 * POST /api/chatya/conversaciones/:id/fijados
 * Body: { mensajeId }
 */
export async function fijarMensajeController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;
    const { mensajeId } = req.body;

    if (!mensajeId) {
      return res.status(400).json({ success: false, message: 'mensajeId es requerido' });
    }

    const resultado = await fijarMensaje(conversacionId, mensajeId, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(201).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en fijarMensajeController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/chatya/conversaciones/:convId/fijados/:msgId
 */
export async function desfijarMensajeController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.convId;
    const mensajeId = req.params.msgId;

    const resultado = await desfijarMensaje(conversacionId, mensajeId, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message });
  } catch (error) {
    console.error('Error en desfijarMensajeController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * GET /api/chatya/conversaciones/:id/fijados
 */
export async function listarFijadosController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;

    const resultado = await listarMensajesFijados(conversacionId, usuarioId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en listarFijadosController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// BÚSQUEDA
// =============================================================================

/**
 * GET /api/chatya/conversaciones/:id/buscar?texto=hola&limit=20&offset=0
 */
export async function buscarMensajesController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const conversacionId = req.params.id;
    const texto = req.query.texto as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!texto || texto.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'El texto de búsqueda es requerido' });
    }

    const resultado = await buscarMensajes(
      { conversacionId, texto, limit, offset },
      usuarioId
    );

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en buscarMensajesController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// BADGE: TOTAL NO LEÍDOS
// =============================================================================

/**
 * GET /api/chatya/no-leidos?modo=personal
 */
export async function contarNoLeidosController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const modo = (req.query.modo as ModoChatYA) || obtenerModo(req);
    const sucursalId = modo === 'comercial' ? obtenerSucursalId(req) : null;

    const resultado = await contarTotalNoLeidos(usuarioId, modo, sucursalId);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en contarNoLeidosController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// =============================================================================
// BÚSQUEDA DE PERSONAS Y NEGOCIOS (Sprint 5)
// =============================================================================

/**
 * GET /api/chatya/buscar-personas?q=texto&limit=10
 */
export async function buscarPersonasController(req: Request, res: Response) {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const q = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El texto de búsqueda debe tener al menos 2 caracteres',
      });
    }

    const resultado = await buscarPersonas(q, usuarioId, limit);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en buscarPersonasController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * GET /api/chatya/buscar-negocios?q=texto&ciudad=Ciudad de México&lat=19.43&lng=-99.13&limit=10
 */
export async function buscarNegociosController(req: Request, res: Response) {
  try {
    const q = req.query.q as string;
    const ciudad = req.query.ciudad as string;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El texto de búsqueda debe tener al menos 2 caracteres',
      });
    }

    if (!ciudad || ciudad.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La ciudad es requerida',
      });
    }

    const resultado = await buscarNegocios(q, ciudad, lat, lng, limit);

    if (!resultado.success) {
      return res.status(resultado.code || 500).json({ success: false, message: resultado.message });
    }

    return res.status(200).json({ success: true, message: resultado.message, data: resultado.data });
  } catch (error) {
    console.error('Error en buscarNegociosController:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}