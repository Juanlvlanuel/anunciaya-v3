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
    obtenerFeedInfinito,
    obtenerMisArticulos,
    actualizarArticulo,
    cambiarEstado,
    eliminarArticulo,
    registrarVista,
    registrarHeartbeat,
    generarUrlUploadImagenMarketplace,
    obtenerVendedorPorId,
    obtenerArticulosDeVendedor,
    eliminarFotoMarketplaceSiHuerfana,
} from '../services/marketplace.service.js';
import {
    obtenerSugerencias,
    obtenerPopulares,
    buscarArticulos,
} from '../services/marketplace/buscador.js';
import { reactivarArticulo } from '../services/marketplace/expiracion.js';
import {
    crearArticuloSchema,
    actualizarArticuloSchema,
    cambiarEstadoSchema,
    feedQuerySchema,
    feedInfinitoQuerySchema,
    misArticulosQuerySchema,
    uploadImagenSchema,
    sugerenciasQuerySchema,
    popularesQuerySchema,
    buscarQuerySchema,
    crearComentarioSchema,
    editarComentarioSchema,
    formatearErroresZod,
} from '../validations/marketplace.schema.js';
import {
    listarComentarios,
    crearComentario,
    editarComentario,
    eliminarComentario,
} from '../services/marketplace/comentarios.js';

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

        const { ciudad, lat, lng, modo } = validacion.data;
        const resultado = await obtenerFeed(ciudad, lat, lng, modo);
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
 * GET /api/marketplace/feed/infinito
 *
 * Feed paginado estilo Facebook con orden y filtros. Cada artículo trae avatar
 * + nombre del vendedor y top 2 preguntas respondidas para evitar requests
 * adicionales desde el frontend.
 *
 * Query params:
 *   - ciudad (req)
 *   - lat, lng (req)
 *   - orden: 'recientes' (default) | 'vistos' | 'cerca'
 *   - pagina: 1-based, default 1
 *   - limite: 1-20, default 10
 *   - precioMin, precioMax (opcionales)
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

        // Token opcional — si hay usuario logueado, el feed devuelve `guardado`
        // por artículo (true si lo tiene en su lista de guardados).
        const usuarioId = obtenerUsuarioId(req);
        const resultado = await obtenerFeedInfinito({ ...validacion.data, usuarioId });
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getFeedInfinito:', error);
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

        const resultado = await obtenerArticuloPorId(id, req.usuario?.usuarioId);
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

/**
 * DELETE /api/marketplace/foto-huerfana
 * Body: { url: string }
 * El composer de publicar dispara esto cuando:
 *  - El usuario quita una foto antes de publicar.
 *  - El usuario descarta el borrador y hay fotos subidas en sesión.
 * El service hace reference count contra `articulos_marketplace.fotos` para
 * que NO se borre si ya está en uso por un artículo creado.
 */
export async function deleteFotoMarketplaceHuerfana(req: Request, res: Response) {
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

        await eliminarFotoMarketplaceSiHuerfana(url);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en deleteFotoMarketplaceHuerfana:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la foto.',
        });
    }
}

// =============================================================================
// PERFIL DEL VENDEDOR (Sprint 5)
// =============================================================================

/**
 * GET /api/marketplace/vendedor/:usuarioId
 * Devuelve el perfil público del vendedor con KPIs reales. Si el vendedor
 * bloqueó al usuario actual, devuelve 404.
 */
export async function getVendedorMarketplace(req: Request, res: Response) {
    try {
        const { usuarioId } = req.params;
        if (!UUID_REGEX.test(usuarioId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del vendedor no es válido',
            });
        }

        const usuarioActual = obtenerUsuarioId(req) ?? undefined;
        const resultado = await obtenerVendedorPorId(usuarioId, usuarioActual);

        if (!resultado.success && 'code' in resultado && typeof resultado.code === 'number') {
            return res.status(resultado.code).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getVendedorMarketplace:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil del vendedor',
        });
    }
}

/**
 * GET /api/marketplace/vendedor/:usuarioId/publicaciones?estado=&limit=&offset=
 * Devuelve la lista paginada de publicaciones del vendedor por estado.
 */
export async function getPublicacionesDeVendedor(req: Request, res: Response) {
    try {
        const { usuarioId } = req.params;
        if (!UUID_REGEX.test(usuarioId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del vendedor no es válido',
            });
        }

        const estadoParam = (req.query.estado as string) ?? 'activa';
        if (estadoParam !== 'activa' && estadoParam !== 'vendida') {
            return res.status(400).json({
                success: false,
                message: 'estado debe ser "activa" o "vendida"',
            });
        }

        const limit = Math.min(
            Math.max(parseInt((req.query.limit as string) ?? '20', 10) || 20, 1),
            100
        );
        const offset = Math.max(parseInt((req.query.offset as string) ?? '0', 10) || 0, 0);

        // Visitante autenticado (puede ser null si entra sin sesión —
        // el route usa `verificarTokenOpcional`). Pasarlo al service hace
        // que cada artículo devuelva `guardado: true|false` para que el
        // corazón de la card refleje el estado correcto desde el primer
        // render, sin requerir fetch adicional en el frontend.
        const visitanteId = obtenerUsuarioId(req);

        const resultado = await obtenerArticulosDeVendedor(
            usuarioId,
            estadoParam,
            { limit, offset },
            visitanteId
        );
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getPublicacionesDeVendedor:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las publicaciones del vendedor',
        });
    }
}

// =============================================================================
// BUSCADOR (Sprint 6)
// =============================================================================

/**
 * GET /api/marketplace/buscar/sugerencias?q=...&ciudad=...
 * Top 5 títulos de artículos activos cuyo FTS matchea el query.
 */
export async function getSugerenciasBuscador(req: Request, res: Response) {
    try {
        const validacion = sugerenciasQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }
        const { q, ciudad } = validacion.data;
        const resultado = await obtenerSugerencias(q, ciudad);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getSugerenciasBuscador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener sugerencias',
        });
    }
}

/**
 * GET /api/marketplace/buscar/populares?ciudad=...
 * Top 6 términos más buscados en la ciudad en los últimos 7 días.
 * Cacheado en Redis con TTL 1h.
 */
export async function getPopularesBuscador(req: Request, res: Response) {
    try {
        const validacion = popularesQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }
        const resultado = await obtenerPopulares(validacion.data.ciudad);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getPopularesBuscador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener búsquedas populares',
        });
    }
}

/**
 * GET /api/marketplace/buscar?q=...&ciudad=...&lat=...&lng=...&precioMin=...
 *      &precioMax=...&condicion=nuevo,usado&distanciaMaxKm=10&ordenar=...&limit=...&offset=...
 *
 * Búsqueda completa con filtros + orden + paginado. Inserta en
 * `marketplace_busquedas_log` fire-and-forget (usuario_id NULL por privacidad).
 */
export async function getBuscarArticulos(req: Request, res: Response) {
    try {
        const validacion = buscarQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }
        const resultado = await buscarArticulos(validacion.data);
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getBuscarArticulos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al ejecutar la búsqueda',
        });
    }
}

// =============================================================================
// HEARTBEAT "VIENDO AHORA" (Sprint 9.1)
// =============================================================================

/**
 * POST /api/marketplace/articulos/:id/heartbeat
 * El usuario autenticado señala que sigue en el detalle del artículo.
 * Actualiza su score en el Sorted Set de Redis con timestamp actual.
 * Fire-and-forget desde el frontend cada 60s — responde siempre { ok: true }.
 */
export async function postHeartbeat(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'El ID del artículo no es válido' });
        }

        const usuarioId = obtenerUsuarioId(req);
        if (!usuarioId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        await registrarHeartbeat(id, usuarioId);
        return res.json({ ok: true });
    } catch (error) {
        console.error('Error en postHeartbeat:', error);
        // No exponemos el error — el heartbeat es best-effort.
        return res.json({ ok: true });
    }
}

// =============================================================================
// REACTIVAR ARTÍCULO (Sprint 7)
// =============================================================================

/**
 * POST /api/marketplace/articulos/:id/reactivar
 * El dueño reactiva un artículo `pausada` — extiende `expira_at` 30 días más
 * y vuelve a `estado='activa'`.
 */
export async function postReactivarArticulo(req: Request, res: Response) {
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

        const resultado = await reactivarArticulo(id, usuarioId);

        if (!resultado.success && 'code' in resultado && typeof resultado.code === 'number') {
            return res.status(resultado.code).json(resultado);
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error en postReactivarArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al reactivar el artículo',
        });
    }
}

// =============================================================================
// COMENTARIOS (hilos de 1 nivel — reemplaza el Q&A Sprint 9.2)
// =============================================================================

/**
 * GET /api/marketplace/articulos/:id/comentarios
 * Devuelve TODOS los comentarios vivos del artículo en árbol de 1 nivel.
 * Público (sin filtros de visibilidad). Token opcional: el frontend deduce los
 * permisos (editar = autor; eliminar = autor o dueño) con el usuario actual y
 * el `vendedor.id` del artículo que ya tiene.
 */
export async function getComentariosArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de artículo inválido' });
        }

        const comentarios = await listarComentarios(id);
        return res.json({ success: true, data: comentarios });
    } catch (error) {
        console.error('Error en getComentariosArticulo:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener los comentarios' });
    }
}

/**
 * POST /api/marketplace/articulos/:id/comentarios
 * El usuario autenticado comenta el artículo. Si `parentId` viene en el body,
 * es una respuesta a ese comentario.
 */
export async function postCrearComentario(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de artículo inválido' });
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
            validacion.data.parentId ?? null
        );

        if (!resultado.success) {
            const esForbidden = resultado.message.includes('propio artículo');
            const esModeracion = resultado.message.includes('moderación') ||
                                 resultado.message.includes('prohibid') ||
                                 resultado.message.includes('permitid');
            if (esForbidden) return res.status(403).json(resultado);
            if (esModeracion) return res.status(422).json(resultado);
            return res.status(404).json(resultado);
        }

        return res.status(201).json(resultado);
    } catch (error) {
        console.error('Error en postCrearComentario:', error);
        return res.status(500).json({ success: false, message: 'Error al publicar el comentario' });
    }
}

/**
 * PUT /api/marketplace/comentarios/:id
 * El autor edita su comentario (sin límite de tiempo).
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
        console.error('Error en putEditarComentario:', error);
        return res.status(500).json({ success: false, message: 'Error al editar el comentario' });
    }
}

/**
 * DELETE /api/marketplace/comentarios/:id
 * Elimina un comentario. Permitido al autor o al dueño del artículo. Si es un
 * comentario raíz, arrastra sus respuestas.
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
        console.error('Error en deleteComentario:', error);
        return res.status(500).json({ success: false, message: 'Error al eliminar el comentario' });
    }
}
