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
    cerrarMiPregunta,
    borrarMiPregunta,
    marcarResuelta,
    editarMiPregunta,
    listarMisPreguntas,
} from '../services/preguntasComunidad.service.js';
import {
    crearRespuesta,
    listarRespuestasPorPregunta,
    borrarMiRespuesta,
} from '../services/respuestasPreguntasComunidad.service.js';
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

        return res.status(200).json({
            success: true,
            message: resultado.message,
            data: resultado.data,
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
// POST /api/preguntas-comunidad/:preguntaId/respuestas
// =============================================================================

export async function crearRespuestaController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { preguntaId } = req.params;
        const { texto } = (req.body ?? {}) as { texto?: unknown };

        if (!preguntaId || !UUID_REGEX.test(preguntaId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la pregunta no es un UUID válido',
            });
        }
        if (typeof texto !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'texto es requerido (string)',
            });
        }

        const resultado = await crearRespuesta({ preguntaId, usuarioId, texto });
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
        console.error('Error en crearRespuestaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// GET /api/preguntas-comunidad/:preguntaId/respuestas?limit=20&offset=0
// =============================================================================

export async function listarRespuestasController(req: Request, res: Response) {
    try {
        const { preguntaId } = req.params;
        if (!preguntaId || !UUID_REGEX.test(preguntaId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la pregunta no es un UUID válido',
            });
        }

        const limit = parseInt(req.query.limit as string) || undefined;
        const offset = parseInt(req.query.offset as string) || undefined;

        const resultado = await listarRespuestasPorPregunta({
            preguntaId,
            limit,
            offset,
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
        console.error('Error en listarRespuestasController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// DELETE /api/preguntas-comunidad/respuestas/:respuestaId
// =============================================================================

export async function borrarMiRespuestaController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { respuestaId } = req.params;

        if (!respuestaId || !UUID_REGEX.test(respuestaId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la respuesta no es un UUID válido',
            });
        }

        const resultado = await borrarMiRespuesta(respuestaId, usuarioId);
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
        console.error('Error en borrarMiRespuestaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
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

// =============================================================================
// GET /api/preguntas-comunidad/mis-preguntas?limit=20&offset=0
// =============================================================================

export async function listarMisPreguntasController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const limit = parseInt(req.query.limit as string) || undefined;
        const offset = parseInt(req.query.offset as string) || undefined;

        const resultado = await listarMisPreguntas(usuarioId, limit, offset);
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
        console.error('Error en listarMisPreguntasController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}
