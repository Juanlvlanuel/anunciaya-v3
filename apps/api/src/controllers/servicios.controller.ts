/**
 * ============================================================================
 * SERVICIOS CONTROLLER — Manejo de peticiones HTTP
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/servicios.controller.ts
 *
 * Patrón calcado de `marketplace.controller.ts`. Solo orquesta validación,
 * extracción de params/query/body, llamada al service y mapeo del resultado a
 * un status HTTP. Cero lógica de negocio.
 *
 * Sprint 1 — Servicios. Doc maestro pendiente (Sprint 7).
 */

import type { Request, Response } from 'express';
import {
    crearPublicacion,
    obtenerPublicacionPorId,
    obtenerFeed,
    obtenerFeedInfinito,
    obtenerMisPublicaciones,
    actualizarPublicacion,
    cambiarEstadoPublicacion,
    reactivarPublicacion,
    eliminarPublicacion,
    registrarVista,
    generarUrlUploadImagen,
    eliminarFotoServicioSiHuerfana,
} from '../services/servicios.service.js';
import {
    obtenerPreguntasPublicas,
    crearPregunta,
    responderPregunta,
    editarPreguntaPropia,
    eliminarPreguntaPropia,
    eliminarPreguntaDueno,
} from '../services/servicios/preguntas.js';
import { obtenerSugerenciasServicios } from '../services/servicios/buscador.js';
import {
    crearResenaServicio,
    obtenerPerfilPrestador,
    obtenerPublicacionesDelPrestador,
    obtenerResenasDelPrestador,
} from '../services/servicios/perfilPrestador.js';
import {
    crearPublicacionSchema,
    actualizarPublicacionSchema,
    cambiarEstadoSchema,
    feedQuerySchema,
    feedInfinitoQuerySchema,
    misPublicacionesQuerySchema,
    uploadImagenSchema,
    crearPreguntaSchema,
    editarPreguntaSchema,
    responderPreguntaSchema,
    crearResenaSchema,
    formatearErroresZod,
} from '../validations/servicios.schema.js';

// =============================================================================
// HELPERS
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function obtenerUsuarioId(req: Request): string | null {
    return req.usuario?.usuarioId ?? null;
}

function exigirUsuarioId(req: Request, res: Response): string | null {
    const id = obtenerUsuarioId(req);
    if (!id) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return null;
    }
    return id;
}

function validarUUID(id: string, res: Response, nombre = 'ID'): boolean {
    if (!UUID_REGEX.test(id)) {
        res.status(400).json({
            success: false,
            message: `El ${nombre} no es válido`,
        });
        return false;
    }
    return true;
}

// =============================================================================
// PÚBLICOS (verificarTokenOpcional)
// =============================================================================

/**
 * GET /api/servicios/feed?ciudad=...&lat=...&lng=...&modo=...
 * Devuelve `{ recientes, cercanos }` filtrado opcionalmente por modo.
 */
export async function getFeed(req: Request, res: Response) {
    try {
        const validacion = feedQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await obtenerFeed(validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getFeed:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el feed',
        });
    }
}

/**
 * GET /api/servicios/feed/infinito
 * Feed paginado con filtros (modo, tipo, modalidad) y orden (recientes | cerca).
 */
export async function getFeedInfinito(req: Request, res: Response) {
    try {
        const validacion = feedInfinitoQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await obtenerFeedInfinito(validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getFeedInfinito:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el feed',
        });
    }
}

/**
 * GET /api/servicios/publicaciones/:id
 * Detalle público de la publicación con datos del oferente.
 */
export async function getPublicacion(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const resultado = await obtenerPublicacionPorId(id);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la publicación',
        });
    }
}

/**
 * POST /api/servicios/publicaciones/:id/vista
 * Incrementa total_vistas. Sin auth requerida.
 */
export async function postRegistrarVista(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const resultado = await registrarVista(id);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postRegistrarVista:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar la vista',
        });
    }
}

/**
 * GET /api/servicios/buscar/sugerencias?q=...&ciudad=...
 * Top 5 publicaciones activas en la ciudad cuyo título/descripción/skills/
 * requisitos matchea el query (ILIKE, accent-insensitive).
 *
 * IMPORTANTE: la ruta debe declararse ANTES de las paramétricas (/:id) para
 * que Express no la confunda.
 */
export async function getSugerenciasBuscador(req: Request, res: Response) {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q : '';
        const ciudad =
            typeof req.query.ciudad === 'string' ? req.query.ciudad : '';

        if (!ciudad) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro `ciudad` es requerido',
            });
        }

        const resultado = await obtenerSugerenciasServicios(q, ciudad);
        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error en getSugerenciasBuscador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener sugerencias',
        });
    }
}

/**
 * GET /api/servicios/publicaciones/:id/preguntas
 * Si el caller es dueño → todas. Si es autor de alguna pendiente → la suya
 * + respondidas. Visitante anónimo → solo respondidas.
 */
export async function getPreguntasPublicacion(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const usuarioActualId = obtenerUsuarioId(req);
        const resultado = await obtenerPreguntasPublicas(id, usuarioActualId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getPreguntasPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las preguntas',
        });
    }
}

// =============================================================================
// PRIVADOS — Upload de imagen, listado del usuario
// =============================================================================

/**
 * POST /api/servicios/upload-imagen
 * Genera presigned URL para subir foto a R2 (prefijo `servicios/`).
 */
export async function postUploadImagen(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const validacion = uploadImagenSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const { nombreArchivo, contentType } = validacion.data;
        const resultado = await generarUrlUploadImagen(
            usuarioId,
            nombreArchivo,
            contentType
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postUploadImagen:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar la URL de subida',
        });
    }
}

/**
 * GET /api/servicios/mis-publicaciones?estado=&limit=&offset=
 * Lista paginada de las publicaciones del usuario actual.
 */
export async function getMisPublicaciones(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const validacion = misPublicacionesQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await obtenerMisPublicaciones(usuarioId, validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getMisPublicaciones:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tus publicaciones',
        });
    }
}

// =============================================================================
// PRIVADOS — CRUD de publicaciones
// =============================================================================

/**
 * POST /api/servicios/publicaciones
 * Crea una publicación nueva. expira_at = NOW() + 30d.
 */
export async function postCrearPublicacion(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const validacion = crearPublicacionSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await crearPublicacion(usuarioId, validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postCrearPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear la publicación',
        });
    }
}

/**
 * PUT /api/servicios/publicaciones/:id
 * Actualiza campos editables. Solo el dueño.
 */
export async function putActualizarPublicacion(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const validacion = actualizarPublicacionSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await actualizarPublicacion(usuarioId, id, validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en putActualizarPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la publicación',
        });
    }
}

/**
 * PATCH /api/servicios/publicaciones/:id/estado
 * Cambia estado (activa ↔ pausada). 'eliminada' va por DELETE.
 */
export async function patchCambiarEstado(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const validacion = cambiarEstadoSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await cambiarEstadoPublicacion(
            usuarioId,
            id,
            validacion.data.estado
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en patchCambiarEstado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado',
        });
    }
}

/**
 * POST /api/servicios/publicaciones/:id/reactivar
 * Reactiva una publicación pausada: estado→'activa' + expira_at→NOW()+30d.
 * Solo el dueño puede hacerlo. Solo si la publicación está en estado
 * 'pausada' (no eliminada).
 */
export async function postReactivarPublicacion(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const resultado = await reactivarPublicacion(usuarioId, id);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postReactivarPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al reactivar la publicación',
        });
    }
}

/**
 * DELETE /api/servicios/publicaciones/:id
 * Soft delete (estado='eliminada' + deleted_at).
 */
export async function deletePublicacion(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const resultado = await eliminarPublicacion(usuarioId, id);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en deletePublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la publicación',
        });
    }
}

// =============================================================================
// PRIVADOS — Q&A (Preguntas y respuestas)
// =============================================================================

/**
 * POST /api/servicios/publicaciones/:id/preguntas
 * El autor hace una pregunta pública sobre la publicación.
 */
export async function postCrearPregunta(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const validacion = crearPreguntaSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await crearPregunta(id, usuarioId, validacion.data.pregunta);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postCrearPregunta:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear la pregunta',
        });
    }
}

/**
 * POST /api/servicios/preguntas/:id/responder
 * El dueño de la publicación responde una pregunta pendiente.
 */
export async function postResponderPregunta(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la pregunta')) return;

        const validacion = responderPreguntaSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await responderPregunta(
            id,
            usuarioId,
            validacion.data.respuesta
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postResponderPregunta:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al responder la pregunta',
        });
    }
}

/**
 * PUT /api/servicios/preguntas/:id/mia
 * El autor edita el texto de su propia pregunta (solo si pendiente).
 */
export async function putEditarPreguntaPropia(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la pregunta')) return;

        const validacion = editarPreguntaSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await editarPreguntaPropia(
            id,
            usuarioId,
            validacion.data.pregunta
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en putEditarPreguntaPropia:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al editar la pregunta',
        });
    }
}

/**
 * DELETE /api/servicios/preguntas/:id/mia
 * El autor retira su pregunta (solo si pendiente).
 */
export async function deletePreguntaPropia(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la pregunta')) return;

        const resultado = await eliminarPreguntaPropia(id, usuarioId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en deletePreguntaPropia:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al retirar la pregunta',
        });
    }
}

/**
 * DELETE /api/servicios/preguntas/:id
 * El dueño elimina una pregunta de su publicación.
 */
export async function deletePreguntaDueno(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la pregunta')) return;

        const resultado = await eliminarPreguntaDueno(id, usuarioId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en deletePreguntaDueno:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la pregunta',
        });
    }
}

/**
 * DELETE /api/servicios/foto-huerfana
 * Body: { url: string }
 * El wizard de publicar dispara esto cuando:
 *  - El usuario quita una foto antes de publicar.
 *  - El usuario aborta/borra el borrador y hay fotos subidas en sesión.
 * El service hace reference count contra `servicios_publicaciones.fotos` para
 * que NO se borre si ya está en uso por una publicación creada.
 */
export async function deleteFotoServicioHuerfana(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { url } = req.body ?? {};
        if (typeof url !== 'string' || !url.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Falta la URL de la foto a eliminar.',
            });
        }

        await eliminarFotoServicioSiHuerfana(url);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en deleteFotoServicioHuerfana:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la foto.',
        });
    }
}

/**
 * POST /api/servicios/publicaciones/:id/resenas
 * Autor (no dueño) crea una reseña tras conversación cerrada en ChatYA.
 * Body: { rating, texto }. El destinatario se infiere de la publicación.
 */
export async function postCrearResena(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const validacion = crearResenaSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await crearResenaServicio({
            autorId: usuarioId,
            publicacionId: id,
            rating: validacion.data.rating,
            texto: validacion.data.texto ?? null,
        });
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postCrearResena:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear la reseña',
        });
    }
}

// =============================================================================
// PERFIL DEL PRESTADOR + RESEÑAS (Sprint 5)
// =============================================================================

/**
 * GET /api/servicios/usuarios/:usuarioId
 * Perfil base del prestador con KPIs agregados (rating promedio, total
 * reseñas, # publicaciones activas, tiempo de respuesta).
 */
export async function getPerfilPrestador(req: Request, res: Response) {
    try {
        const { usuarioId } = req.params;
        if (!validarUUID(usuarioId, res, 'ID del usuario')) return;
        const resultado = await obtenerPerfilPrestador(usuarioId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getPerfilPrestador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil',
        });
    }
}

/**
 * GET /api/servicios/usuarios/:usuarioId/publicaciones?estado=&limit=&offset=
 * Listado de publicaciones del prestador (default: solo activas).
 */
export async function getPublicacionesDelPrestador(
    req: Request,
    res: Response,
) {
    try {
        const { usuarioId } = req.params;
        if (!validarUUID(usuarioId, res, 'ID del usuario')) return;

        const estado =
            req.query.estado === 'pausada'
                ? ('pausada' as const)
                : ('activa' as const);
        const limit = req.query.limit
            ? Math.max(1, Math.min(100, Number(req.query.limit)))
            : 50;
        const offset = req.query.offset
            ? Math.max(0, Number(req.query.offset))
            : 0;

        const resultado = await obtenerPublicacionesDelPrestador(usuarioId, {
            estado,
            limit,
            offset,
        });
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getPublicacionesDelPrestador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las publicaciones del prestador',
        });
    }
}

/**
 * GET /api/servicios/usuarios/:usuarioId/resenas?limit=&offset=
 * Listado de reseñas recibidas por el prestador, con autor embebido.
 */
export async function getResenasDelPrestador(req: Request, res: Response) {
    try {
        const { usuarioId } = req.params;
        if (!validarUUID(usuarioId, res, 'ID del usuario')) return;

        const limit = req.query.limit
            ? Math.max(1, Math.min(100, Number(req.query.limit)))
            : 30;
        const offset = req.query.offset
            ? Math.max(0, Number(req.query.offset))
            : 0;

        const resultado = await obtenerResenasDelPrestador(usuarioId, {
            limit,
            offset,
        });
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getResenasDelPrestador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las reseñas',
        });
    }
}
