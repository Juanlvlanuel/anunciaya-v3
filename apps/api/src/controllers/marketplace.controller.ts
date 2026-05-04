/**
 * ============================================================================
 * MARKETPLACE CONTROLLER — Manejo de peticiones HTTP
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/marketplace.controller.ts
 *
 * Patrón: idéntico a `articulos.controller.ts`. Solo orquesta validación,
 * extracción de params/query/body, llamada al service y mapeo del resultado a
 * un status HTTP. Cero lógica de negocio.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Sprint:      docs/prompts Marketplace/Sprint-1-Backend-Base.md
 */

import type { Request, Response } from 'express';
import {
    crearArticulo,
    obtenerArticuloPorId,
    obtenerFeed,
    obtenerMisArticulos,
    actualizarArticulo,
    cambiarEstado,
    eliminarArticulo,
    registrarVista,
    generarUrlUploadImagenMarketplace,
} from '../services/marketplace.service.js';
import {
    crearArticuloSchema,
    actualizarArticuloSchema,
    cambiarEstadoSchema,
    feedQuerySchema,
    misArticulosQuerySchema,
    uploadImagenSchema,
    formatearErroresZod,
} from '../validations/marketplace.schema.js';

// =============================================================================
// HELPERS
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function obtenerUsuarioId(req: Request): string | null {
    return req.usuario?.usuarioId ?? null;
}

// =============================================================================
// PÚBLICOS (verificarTokenOpcional)
// =============================================================================

/**
 * GET /api/marketplace/feed?ciudad=...&lat=...&lng=...
 * Devuelve `{ recientes, cercanos }` de la ciudad y coordenadas dadas.
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

        const { ciudad, lat, lng } = validacion.data;
        const resultado = await obtenerFeed(ciudad, lat, lng);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getFeed:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el feed',
        });
    }
}

/**
 * GET /api/marketplace/articulos/:id
 * Detalle público del artículo. Devuelve también activo/pausado/vendido para
 * que los links compartidos funcionen con badge de estado en el FE.
 */
export async function getArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        const resultado = await obtenerArticuloPorId(id);
        if (!resultado.success) {
            return res.status(404).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el artículo',
        });
    }
}

/**
 * POST /api/marketplace/articulos/:id/vista
 * Incrementa total_vistas. Sin auth requerida.
 */
export async function postRegistrarVista(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }
        const resultado = await registrarVista(id);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en postRegistrarVista:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar la vista',
        });
    }
}

// =============================================================================
// PRIVADOS (verificarToken + requiereModoPersonal)
// =============================================================================

/**
 * POST /api/marketplace/articulos
 * Crea un artículo nuevo en estado 'activa' con expira_at = NOW() + 30 días.
 */
export async function postCrearArticulo(req: Request, res: Response) {
    try {
        const validacion = crearArticuloSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const resultado = await crearArticulo(usuarioId, validacion.data);
        // Service puede devolver { success: false, code: 422 } por moderación
        // (rechazo) o { success: false, code: 200 } por sugerencia suave.
        if (!resultado.success && 'code' in resultado && typeof resultado.code === 'number') {
            return res.status(resultado.code).json(resultado);
        }
        return res.status(201).json(resultado);
    } catch (error) {
        console.error('Error en postCrearArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear el artículo',
        });
    }
}

/**
 * PUT /api/marketplace/articulos/:id
 * Actualiza campos editables del artículo (solo dueño). NUNCA modifica
 * `expira_at` (Zod no acepta el campo + service no lo escribe).
 */
export async function putActualizarArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        const validacion = actualizarArticuloSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const resultado = await actualizarArticulo(id, usuarioId, validacion.data);

        if (!resultado.success && 'code' in resultado && typeof resultado.code === 'number') {
            return res.status(resultado.code).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en putActualizarArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar el artículo',
        });
    }
}

/**
 * PATCH /api/marketplace/articulos/:id/estado
 * Aplica transiciones permitidas (activa ⇄ pausada, activa → vendida).
 * 'eliminada' va por DELETE.
 */
export async function patchCambiarEstado(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        const validacion = cambiarEstadoSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const resultado = await cambiarEstado(id, usuarioId, validacion.data.estado);

        if (!resultado.success && 'code' in resultado && typeof resultado.code === 'number') {
            return res.status(resultado.code).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en patchCambiarEstado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado del artículo',
        });
    }
}

/**
 * DELETE /api/marketplace/articulos/:id
 * Soft delete — marca estado='eliminada' y deleted_at. Solo dueño.
 */
export async function deleteArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const resultado = await eliminarArticulo(id, usuarioId);

        if (!resultado.success && 'code' in resultado && typeof resultado.code === 'number') {
            return res.status(resultado.code).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en deleteArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el artículo',
        });
    }
}

/**
 * GET /api/marketplace/mis-articulos?estado=&limit=&offset=
 * Lista paginada del dueño. Excluye eliminados.
 */
export async function getMisArticulos(req: Request, res: Response) {
    try {
        const validacion = misArticulosQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const resultado = await obtenerMisArticulos(usuarioId, validacion.data);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getMisArticulos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tus artículos',
        });
    }
}

/**
 * POST /api/marketplace/upload-imagen
 * Genera presigned URL para subir foto a R2 con prefijo `marketplace/`.
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
        const resultado = await generarUrlUploadImagenMarketplace(nombreArchivo, contentType);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en postUploadImagen:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar URL de subida',
        });
    }
}
