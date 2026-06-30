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
    listarComentarios,
    crearComentario,
    editarComentario,
    eliminarComentario,
} from '../services/servicios/comentarios.js';
import {
    obtenerSugerenciasServicios,
    buscarServicios,
} from '../services/servicios/buscador.js';
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
    crearComentarioSchema,
    editarComentarioSchema,
    crearResenaSchema,
    buscarServiciosQuerySchema,
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

        const resultado = await obtenerPublicacionPorId(id, req.usuario?.usuarioId);
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
 * GET /api/servicios/buscar?q=...&ciudad=...&modo=&tipo=&modalidad=&tipoEmpleo=
 *      &categoria=&soloUrgente=&distanciaMaxKm=&ordenar=&limit=&offset=
 *
 * Búsqueda completa con filtros + orden + paginado. Calca el patrón de
 * `getBuscarArticulos` de MarketPlace, ajustado a los filtros del dominio
 * Servicios. Login obligatorio (regla del proyecto: todo privado, a
 * diferencia de MP que es público).
 *
 * Inserta en `servicios_busquedas_log` fire-and-forget con `usuario_id = NULL`
 * por privacidad.
 */
export async function getBuscarServicios(req: Request, res: Response) {
    try {
        const validacion = buscarServiciosQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }
        const resultado = await buscarServicios(validacion.data);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getBuscarServicios:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al ejecutar la búsqueda',
        });
    }
}

/**
 * GET /api/servicios/publicaciones/:id/comentarios
 * Público: devuelve todos los comentarios (árbol de 1 nivel) de la publicación.
 */
export async function getComentariosPublicacion(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const resultado = await listarComentarios(id);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en getComentariosPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los comentarios',
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
// PRIVADOS — Comentarios (hilos de 1 nivel)
// =============================================================================

/**
 * POST /api/servicios/publicaciones/:id/comentarios
 * Comenta la publicación. Body: { texto, parentId? }. Si `parentId` viene, es
 * una respuesta a ese comentario.
 */
export async function postCrearComentario(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID de la publicación')) return;

        const validacion = crearComentarioSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await crearComentario(
            id,
            usuarioId,
            validacion.data.texto,
            validacion.data.parentId ?? null
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postCrearComentario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al publicar el comentario',
        });
    }
}

/**
 * PUT /api/servicios/comentarios/:id
 * El autor edita su comentario (sin límite de tiempo).
 */
export async function putEditarComentario(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID del comentario')) return;

        const validacion = editarComentarioSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await editarComentario(id, usuarioId, validacion.data.texto);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en putEditarComentario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al editar el comentario',
        });
    }
}

/**
 * DELETE /api/servicios/comentarios/:id
 * Elimina un comentario. Permitido al autor o al dueño de la publicación.
 */
export async function deleteComentario(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const { id } = req.params;
        if (!validarUUID(id, res, 'ID del comentario')) return;

        const resultado = await eliminarComentario(id, usuarioId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en deleteComentario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el comentario',
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
