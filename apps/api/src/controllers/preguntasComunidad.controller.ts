/**
 * preguntasComunidad.controller.ts
 * =================================
 * Controllers para el feed "Pregúntale a [ciudad]" del Home.
 *
 * UBICACIÓN: apps/api/src/controllers/preguntasComunidad.controller.ts
 */

import type { Request, Response } from 'express';
import {
    crearPregunta,
    listarPreguntasPorCiudad,
    listarMisPreguntas,
    obtenerPreguntaPorId,
    cerrarMiPregunta,
    borrarMiPregunta,
    eliminarPermanenteMiPregunta,
    marcarResuelta,
    editarMiPregunta,
    reintentarMiPregunta,
} from '../services/preguntasComunidad.service.js';
import {
    listarComentarios,
    crearComentario,
    editarComentario,
    eliminarComentario,
} from '../services/comentariosComunidad.service.js';
import {
    marcarInteres,
    quitarInteres,
} from '../services/interesPreguntasComunidad.service.js';
import { obtenerEstadoCoyo } from '../services/coyo/orquestador.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// HELPERS
// =============================================================================

function obtenerUsuarioId(req: Request): string {
    return req.usuario!.usuarioId;
}

// =============================================================================
// POST /api/preguntas-comunidad
// =============================================================================

export async function crearPreguntaController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { texto, ciudad, estado } = (req.body ?? {}) as {
            texto?: unknown;
            ciudad?: unknown;
            estado?: unknown;
        };

        // Coerción defensiva — el service revalida formato/length.
        if (typeof texto !== 'string' || typeof ciudad !== 'string' || typeof estado !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'texto, ciudad y estado son requeridos (string)',
            });
        }

        const resultado = await crearPregunta({ usuarioId, texto, ciudad, estado });

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
        console.error('Error en crearPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// GET /api/preguntas-comunidad?ciudad=...&limit=20&offset=0
// =============================================================================

export async function listarPreguntasPorCiudadController(req: Request, res: Response) {
    try {
        const ciudad = typeof req.query.ciudad === 'string' ? req.query.ciudad : '';
        if (ciudad.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro de query "ciudad" es requerido',
            });
        }

        const limit = parseInt(req.query.limit as string) || undefined;
        const offset = parseInt(req.query.offset as string) || undefined;
        // Pasar el usuarioId al service para poblar `yoTambienInteresado`
        // en cada pregunta del feed (EXISTS contra preguntas_interesados).
        const usuarioId = obtenerUsuarioId(req);

        const resultado = await listarPreguntasPorCiudad({ ciudad, limit, offset, usuarioId });

        if (!resultado.success) {
            return res.status(resultado.code || 500).json({
                success: false,
                message: resultado.message,
            });
        }

        // `data` sigue siendo el array de preguntas (no rompe consumidores
        // viejos); `paginacion.total` es el COUNT de activas de la ciudad,
        // que usa el frontend para el scroll infinito y el badge contador.
        return res.status(200).json({
            success: true,
            message: resultado.message,
            data: resultado.data?.preguntas ?? [],
            paginacion: {
                total: resultado.data?.total ?? 0,
                limit: limit ?? 20,
                offset: offset ?? 0,
            },
        });
    } catch (error) {
        console.error('Error en listarPreguntasPorCiudadController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// GET /api/preguntas-comunidad/:id/coyo
// =============================================================================

/**
 * Endpoint de sondeo: devuelve el estado actual de Coyo sobre una pregunta.
 * El frontend lo llama cada N segundos hasta que `estadoCoyo` sea distinto
 * de `'pendiente'` o `'procesando'` (es decir, hasta que sea un estado final
 * `'listo' | 'sin_respuesta' | 'no_aplica'`).
 *
 * Respuesta: { estadoCoyo, respuestaCoyo, resultadosCoyo, coyoProcesadoAt }.
 */
export async function obtenerEstadoCoyoController(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id || !UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la pregunta no es un UUID válido',
            });
        }

        const estado = await obtenerEstadoCoyo(id);

        if (!estado) {
            return res.status(404).json({
                success: false,
                message: 'Pregunta no encontrada',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Estado de Coyo obtenido',
            data: estado,
        });
    } catch (error) {
        console.error('Error en obtenerEstadoCoyoController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// GET /api/preguntas-comunidad/mis-preguntas  (historial del autor)
// =============================================================================

/**
 * Devuelve TODAS las preguntas del usuario autenticado (cualquier estado),
 * paginadas, con `paginacion.total`. Alimenta la vista "Mis preguntas" del
 * Home. El `usuarioId` sale del JWT (no se acepta por query).
 */
export async function listarMisPreguntasController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const limit = parseInt(req.query.limit as string) || undefined;
        const offset = parseInt(req.query.offset as string) || undefined;

        const resultado = await listarMisPreguntas({ usuarioId, limit, offset });

        if (!resultado.success) {
            return res.status(resultado.code || 500).json({
                success: false,
                message: resultado.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: resultado.message,
            data: resultado.data?.preguntas ?? [],
            paginacion: {
                total: resultado.data?.total ?? 0,
                limit: limit ?? 20,
                offset: offset ?? 0,
            },
        });
    } catch (error) {
        console.error('Error en listarMisPreguntasController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// GET /api/preguntas-comunidad/:id  (una pregunta — deep-link de notificaciones)
// =============================================================================

/**
 * Devuelve UNA pregunta 'activa' por su id, con el mismo shape que el feed.
 * El Home la consume para destacar la pregunta a la que apunta una
 * notificación (`/inicio?preguntaId=<id>`). 404 si no existe o ya no está
 * activa (cerrada/oculta/expirada).
 */
export async function obtenerPreguntaPorIdController(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id || !UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la pregunta no es un UUID válido',
            });
        }

        // usuarioId del token para poblar `yoTambienInteresado` (mismo shape
        // que el feed, aunque normalmente el recomendado no marcó interés).
        const usuarioId = obtenerUsuarioId(req);
        const resultado = await obtenerPreguntaPorId(id, usuarioId);

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
        console.error('Error en obtenerPreguntaPorIdController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// COMENTARIOS (hilos de 1 nivel — reemplaza el Q&A de respuestas)
// =============================================================================

const COMENTARIO_MIN = 2;
const COMENTARIO_MAX = 500;

// GET /api/preguntas-comunidad/:preguntaId/comentarios
export async function listarComentariosController(req: Request, res: Response) {
    try {
        const { preguntaId } = req.params;
        if (!preguntaId || !UUID_REGEX.test(preguntaId)) {
            return res.status(400).json({ success: false, message: 'El ID de la pregunta no es un UUID válido' });
        }
        const resultado = await listarComentarios(preguntaId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en listarComentariosController:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
}

// POST /api/preguntas-comunidad/:preguntaId/comentarios  body: { texto, parentId? }
export async function crearComentarioController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { preguntaId } = req.params;
        const { texto, parentId } = (req.body ?? {}) as { texto?: unknown; parentId?: unknown };

        if (!preguntaId || !UUID_REGEX.test(preguntaId)) {
            return res.status(400).json({ success: false, message: 'El ID de la pregunta no es un UUID válido' });
        }
        if (typeof texto !== 'string' || texto.trim().length < COMENTARIO_MIN) {
            return res.status(400).json({ success: false, message: `El comentario debe tener al menos ${COMENTARIO_MIN} caracteres` });
        }
        if (texto.length > COMENTARIO_MAX) {
            return res.status(400).json({ success: false, message: `El comentario no puede exceder ${COMENTARIO_MAX} caracteres` });
        }
        if (parentId !== undefined && parentId !== null && (typeof parentId !== 'string' || !UUID_REGEX.test(parentId))) {
            return res.status(400).json({ success: false, message: 'parentId inválido' });
        }

        const resultado = await crearComentario(
            preguntaId,
            usuarioId,
            texto.trim(),
            (parentId as string | null | undefined) ?? null
        );
        if (!resultado.success) {
            return res.status(resultado.code).json({ success: false, message: resultado.message });
        }
        return res.status(201).json({ success: true, data: resultado.data });
    } catch (error) {
        console.error('Error en crearComentarioController:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
}

// PUT /api/preguntas-comunidad/comentarios/:comentarioId  body: { texto }
export async function editarComentarioController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { comentarioId } = req.params;
        const { texto } = (req.body ?? {}) as { texto?: unknown };

        if (!comentarioId || !UUID_REGEX.test(comentarioId)) {
            return res.status(400).json({ success: false, message: 'El ID del comentario no es un UUID válido' });
        }
        if (typeof texto !== 'string' || texto.trim().length < COMENTARIO_MIN) {
            return res.status(400).json({ success: false, message: `El comentario debe tener al menos ${COMENTARIO_MIN} caracteres` });
        }
        if (texto.length > COMENTARIO_MAX) {
            return res.status(400).json({ success: false, message: `El comentario no puede exceder ${COMENTARIO_MAX} caracteres` });
        }

        const resultado = await editarComentario(comentarioId, usuarioId, texto.trim());
        if (!resultado.success) {
            return res.status(resultado.code).json({ success: false, message: resultado.message });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en editarComentarioController:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
}

// DELETE /api/preguntas-comunidad/comentarios/:comentarioId
export async function eliminarComentarioController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { comentarioId } = req.params;

        if (!comentarioId || !UUID_REGEX.test(comentarioId)) {
            return res.status(400).json({ success: false, message: 'El ID del comentario no es un UUID válido' });
        }

        const resultado = await eliminarComentario(comentarioId, usuarioId);
        if (!resultado.success) {
            return res.status(resultado.code).json({ success: false, message: resultado.message });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en eliminarComentarioController:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
}

// =============================================================================
// HELPER COMÚN PARA ACCIONES DEL AUTOR SOBRE SU PREGUNTA
// =============================================================================

/**
 * Valida UUID y devuelve `{ usuarioId, preguntaId }` o `null` si UUID inválido
 * (ya respondió con 400 al cliente).
 */
function validarParamsAccionAutor(
    req: Request,
    res: Response,
): { usuarioId: string; preguntaId: string } | null {
    const usuarioId = obtenerUsuarioId(req);
    const { preguntaId } = req.params;
    if (!preguntaId || !UUID_REGEX.test(preguntaId)) {
        res.status(400).json({
            success: false,
            message: 'El ID de la pregunta no es un UUID válido',
        });
        return null;
    }
    return { usuarioId, preguntaId };
}

// =============================================================================
// "YO TAMBIÉN QUIERO SABER" — POST/DELETE /api/preguntas-comunidad/:preguntaId/interes
// =============================================================================

export async function marcarInteresController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await marcarInteres({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en marcarInteresController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

export async function quitarInteresController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await quitarInteres({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en quitarInteresController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// CONTROL DEL AUTOR — cerrar / borrar / marcar resuelta / editar
// =============================================================================

export async function cerrarMiPreguntaController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await cerrarMiPregunta({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en cerrarMiPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

export async function borrarMiPreguntaController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await borrarMiPregunta({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en borrarMiPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

export async function eliminarPermanenteMiPreguntaController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await eliminarPermanenteMiPregunta({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en eliminarPermanenteMiPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

export async function marcarResueltaController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await marcarResuelta({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en marcarResueltaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

/**
 * Sprint 2.D — Reintentar pregunta cuando Coyo cayó en `sin_respuesta`.
 *
 * POST /api/preguntas-comunidad/:preguntaId/reintentar
 *
 * Solo el autor. Solo válido si la pregunta está activa Y el
 * `estado_coyo === 'sin_respuesta'`. El service resetea los campos de
 * Coyo y dispara el orquestador de nuevo.
 */
export async function reintentarMiPreguntaController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const resultado = await reintentarMiPregunta({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
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
        console.error('Error en reintentarMiPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

export async function editarMiPreguntaController(req: Request, res: Response) {
    try {
        const params = validarParamsAccionAutor(req, res);
        if (!params) return;

        const { texto } = (req.body ?? {}) as { texto?: unknown };
        if (typeof texto !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'texto es requerido (string)',
            });
        }

        const resultado = await editarMiPregunta({
            preguntaId: params.preguntaId,
            usuarioId: params.usuarioId,
            textoNuevo: texto,
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
        console.error('Error en editarMiPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

