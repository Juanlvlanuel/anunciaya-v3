/**
 * ============================================================================
 * NEGOCIO PUBLICACIONES CONTROLLER — Manejo de peticiones HTTP
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/negocioPublicaciones.controller.ts
 *
 * Patrón: idéntico a `marketplace.controller.ts`. Solo orquesta validación,
 * extracción de params/query/body, llamada al service y mapeo del resultado a
 * un status HTTP. Cero lógica de negocio.
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 */

import type { Request, Response } from 'express';
import {
    crearPublicacion,
    obtenerFeedPublicacionesNegocio,
    obtenerPublicacion,
    actualizarPublicacion,
    archivarPublicacion,
    registrarVistaPublicacion,
    generarUrlUploadImagenNegocioPublicacion,
    eliminarFotoNegocioPublicacionSiHuerfana,
    listarPublicacionesNegocioBS,
    obtenerKpisPublicacionesNegocio,
} from '../services/negocioPublicaciones.service.js';
import {
    listarComentarios,
    crearComentario,
    editarComentario,
    eliminarComentario,
} from '../services/negocioPublicaciones/comentarios.js';
import {
    crearPublicacionSchema,
    actualizarPublicacionSchema,
    feedQuerySchema,
    detalleQuerySchema,
    listadoBSQuerySchema,
    uploadImagenSchema,
    crearComentarioSchema,
    editarComentarioSchema,
    formatearErroresZod,
} from '../validations/negocioPublicaciones.schema.js';
import { obtenerModoActual } from '../middleware/validarModo.js';

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

function obtenerNegocioId(req: Request): string | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (req as any).negocioId ?? null;
}

// =============================================================================
// PÚBLICOS (verificarTokenOpcional / sin auth)
// =============================================================================

/**
 * GET /api/negocio-publicaciones/feed
 * Query: ciudad?, sucursalId?, pagina, limite, + mismos filtros que
 * GET /api/negocios (latitud/longitud/distanciaMaxKm, categoriaId,
 * subcategoriaIds, aceptaCardYA, aDomicilio).
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

        const resultado = await obtenerFeedPublicacionesNegocio(validacion.data);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getFeed (negocioPublicaciones):', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el feed',
        });
    }
}

/**
 * GET /api/negocio-publicaciones/:id
 * Detalle público de la publicación. Query: latitud?, longitud? (para
 * calcular distanciaKm — mismo criterio que el feed).
 */
export async function getPublicacion(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la publicación no es válido',
            });
        }

        const validacionQuery = detalleQuerySchema.safeParse(req.query);
        const gps = validacionQuery.success ? validacionQuery.data : undefined;

        const resultado = await obtenerPublicacion(id, gps);
        if (!resultado.success) {
            return res.status(resultado.code ?? 404).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getPublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la publicación',
        });
    }
}

/**
 * POST /api/negocio-publicaciones/:id/vista
 * Incrementa total_vistas. Sin auth requerida.
 */
export async function postRegistrarVista(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la publicación no es válido',
            });
        }
        const resultado = await registrarVistaPublicacion(id);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en postRegistrarVista (negocioPublicaciones):', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar la vista',
        });
    }
}

// =============================================================================
// PRIVADOS — Business Studio (verificarToken + verificarNegocio [+ validarAccesoSucursal])
// =============================================================================

/**
 * POST /api/negocio-publicaciones
 * Query: sucursalId (agregado automáticamente por el interceptor Axios en modo comercial)
 */
export async function postCrearPublicacion(req: Request, res: Response) {
    try {
        const validacion = crearPublicacionSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const negocioId = obtenerNegocioId(req);
        const sucursalId = (req.query.sucursalId ?? req.params.sucursalId) as string | undefined;
        if (!negocioId || !sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'Falta el negocio o la sucursal para publicar',
            });
        }

        const resultado = await crearPublicacion(negocioId, sucursalId, usuarioId, validacion.data);
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
 * PUT /api/negocio-publicaciones/:id
 */
export async function putActualizarPublicacion(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la publicación no es válido',
            });
        }

        const validacion = actualizarPublicacionSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const negocioId = obtenerNegocioId(req);
        if (!negocioId) {
            return res.status(400).json({ success: false, message: 'Falta el negocio' });
        }

        const resultado = await actualizarPublicacion(id, negocioId, validacion.data);
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
 * DELETE /api/negocio-publicaciones/:id
 * Archiva (soft-delete manual, sin TTL).
 */
export async function deletePublicacion(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la publicación no es válido',
            });
        }

        const negocioId = obtenerNegocioId(req);
        if (!negocioId) {
            return res.status(400).json({ success: false, message: 'Falta el negocio' });
        }

        const resultado = await archivarPublicacion(id, negocioId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en deletePublicacion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al archivar la publicación',
        });
    }
}

/**
 * GET /api/negocio-publicaciones/mias
 * "Mis publicaciones" — listado de administración de la sucursal activa
 * (incluye archivadas, sin filtros de geolocalización/elegibilidad).
 * Query: estado?, busqueda?, pagina, limite, sucursalId (inyectado por el
 * interceptor Axios en modo comercial).
 */
export async function getMisPublicaciones(req: Request, res: Response) {
    try {
        const validacion = listadoBSQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const negocioId = obtenerNegocioId(req);
        const sucursalId = req.query.sucursalId as string | undefined;
        if (!negocioId || !sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'Falta el negocio o la sucursal',
            });
        }

        const resultado = await listarPublicacionesNegocioBS({
            negocioId,
            sucursalId,
            ...validacion.data,
        });
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getMisPublicaciones (negocioPublicaciones):', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tus publicaciones',
        });
    }
}

/**
 * GET /api/negocio-publicaciones/kpis
 * KPIs de la sucursal activa (total, activas, archivadas, vistas, comentarios).
 * Query: sucursalId (inyectado por el interceptor Axios en modo comercial).
 */
export async function getKpisPublicaciones(req: Request, res: Response) {
    try {
        const negocioId = obtenerNegocioId(req);
        const sucursalId = req.query.sucursalId as string | undefined;
        if (!negocioId || !sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'Falta el negocio o la sucursal',
            });
        }

        const resultado = await obtenerKpisPublicacionesNegocio(negocioId, sucursalId);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getKpisPublicaciones (negocioPublicaciones):', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los KPIs',
        });
    }
}

/**
 * POST /api/negocio-publicaciones/upload-imagen
 * Genera presigned URL para subir foto a R2 con prefijo `negocio-publicaciones/`.
 */
export async function postUploadImagen(req: Request, res: Response) {
    try {
        const validacion = uploadImagenSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const { nombreArchivo, contentType } = validacion.data;
        const resultado = await generarUrlUploadImagenNegocioPublicacion(nombreArchivo, contentType);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postUploadImagen (negocioPublicaciones):', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar URL de subida',
        });
    }
}

/**
 * DELETE /api/negocio-publicaciones/foto-huerfana
 * Body: { url: string }
 */
export async function deleteFotoHuerfana(req: Request, res: Response) {
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

        await eliminarFotoNegocioPublicacionSiHuerfana(url);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en deleteFotoHuerfana (negocioPublicaciones):', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la foto.',
        });
    }
}

// =============================================================================
// COMENTARIOS (cualquier usuario autenticado, cualquier modo)
// =============================================================================

/**
 * GET /api/negocio-publicaciones/:id/comentarios
 */
export async function getComentarios(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de publicación inválido' });
        }

        const comentarios = await listarComentarios(id);
        return res.json({ success: true, data: comentarios });
    } catch (error) {
        console.error('Error en getComentarios (negocioPublicaciones):', error);
        return res.status(500).json({ success: false, message: 'Error al obtener los comentarios' });
    }
}

/**
 * POST /api/negocio-publicaciones/:id/comentarios
 */
export async function postCrearComentario(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de publicación inválido' });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

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
            validacion.data.parentId ?? null,
            obtenerModoActual(req)
        );

        if (!resultado.success) {
            const esModeracion = resultado.message.includes('moderación') ||
                                 resultado.message.includes('prohibid') ||
                                 resultado.message.includes('permitid');
            if (esModeracion) return res.status(422).json(resultado);
            return res.status(404).json(resultado);
        }

        return res.status(201).json(resultado);
    } catch (error) {
        console.error('Error en postCrearComentario (negocioPublicaciones):', error);
        return res.status(500).json({ success: false, message: 'Error al publicar el comentario' });
    }
}

/**
 * PUT /api/negocio-publicaciones/comentarios/:id
 */
export async function putEditarComentario(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de comentario inválido' });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const validacion = editarComentarioSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await editarComentario(id, usuarioId, validacion.data.texto);

        if (!resultado.success) {
            const esForbidden = resultado.message.includes('No puedes editar');
            const esModeracion = resultado.message.includes('moderación') ||
                                 resultado.message.includes('prohibid') ||
                                 resultado.message.includes('permitid');
            if (esForbidden) return res.status(403).json(resultado);
            if (esModeracion) return res.status(422).json(resultado);
            return res.status(404).json(resultado);
        }

        return res.json(resultado);
    } catch (error) {
        console.error('Error en putEditarComentario (negocioPublicaciones):', error);
        return res.status(500).json({ success: false, message: 'Error al editar el comentario' });
    }
}

/**
 * DELETE /api/negocio-publicaciones/comentarios/:id
 * Permitido al autor o a cualquier dueño/gerente del negocio de la publicación.
 */
export async function deleteComentario(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de comentario inválido' });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const resultado = await eliminarComentario(id, usuarioId);

        if (!resultado.success) {
            if (resultado.message.includes('No puedes eliminar')) return res.status(403).json(resultado);
            return res.status(404).json(resultado);
        }

        return res.json(resultado);
    } catch (error) {
        console.error('Error en deleteComentario (negocioPublicaciones):', error);
        return res.status(500).json({ success: false, message: 'Error al eliminar el comentario' });
    }
}
