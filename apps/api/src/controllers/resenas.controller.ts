/**
 * resenas.controller.ts
 * =======================
 * Controlador para endpoints de reseñas.
 *
 * UBICACIÓN: apps/api/src/controllers/resenas.controller.ts
 */

import { Request, Response } from 'express';
import {
    obtenerResenasSucursal,
    obtenerPromedioResenas,
    verificarPuedeResenar,
    crearResena,
    obtenerResenasNegocio,
    responderResena,
    editarResena,
} from '../services/resenas.service.js';
import { crearResenaSchema, responderResenaSchema, editarResenaSchema } from '../validations/resenas.schema.js';

// =============================================================================
// HELPERS
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatearErroresZod(error: unknown): Record<string, string> {
    const errores: Record<string, string> = {};
    const zodError = error as { issues?: { path: (string | number)[]; message: string }[] };
    if (zodError.issues) {
        for (const issue of zodError.issues) {
            errores[issue.path.join('.') || '_root'] = issue.message;
        }
    }
    return errores;
}

// =============================================================================
// GET /api/resenas/sucursal/:sucursalId
// =============================================================================

/**
 * Obtiene las reseñas de una sucursal (público)
 */
export async function getResenasSucursal(req: Request, res: Response): Promise<void> {
    try {
        const { sucursalId } = req.params;

        if (!sucursalId || !UUID_REGEX.test(sucursalId)) {
            res.status(400).json({
                success: false,
                message: 'El ID de la sucursal no es válido',
            });
            return;
        }

        const resultado = await obtenerResenasSucursal(sucursalId);

        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en getResenasSucursal:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reseñas' });
    }
}

// =============================================================================
// GET /api/resenas/sucursal/:sucursalId/promedio
// =============================================================================

/**
 * Obtiene el promedio de calificación de una sucursal (público)
 */
export async function getPromedioResenas(req: Request, res: Response): Promise<void> {
    try {
        const { sucursalId } = req.params;

        if (!sucursalId || !UUID_REGEX.test(sucursalId)) {
            res.status(400).json({
                success: false,
                message: 'El ID de la sucursal no es válido',
            });
            return;
        }

        const resultado = await obtenerPromedioResenas(sucursalId);

        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en getPromedioResenas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener promedio' });
    }
}

// =============================================================================
// GET /api/resenas/puede-resenar/:sucursalId
// =============================================================================

/**
 * Verifica si el usuario autenticado puede dejar reseña (requiere auth)
 */
export async function getPuedeResenar(req: Request, res: Response): Promise<void> {
    try {
        const { sucursalId } = req.params;

        if (!sucursalId || !UUID_REGEX.test(sucursalId)) {
            res.status(400).json({
                success: false,
                message: 'El ID de la sucursal no es válido',
            });
            return;
        }

        if (!req.usuario?.usuarioId) {
            res.status(401).json({ success: false, message: 'No autenticado' });
            return;
        }

        const resultado = await verificarPuedeResenar(req.usuario.usuarioId, sucursalId);

        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en getPuedeResenar:', error);
        res.status(500).json({ success: false, message: 'Error al verificar' });
    }
}

// =============================================================================
// POST /api/resenas
// =============================================================================

/**
 * Crea una nueva reseña (requiere auth + compra verificada)
 */
export async function postCrearResena(req: Request, res: Response): Promise<void> {
    try {
        if (!req.usuario?.usuarioId) {
            res.status(401).json({ success: false, message: 'No autenticado' });
            return;
        }

        // Validar con Zod
        const validacion = crearResenaSchema.safeParse(req.body);

        if (!validacion.success) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: formatearErroresZod(validacion.error),
            });
            return;
        }

        const resultado = await crearResena(req.usuario.usuarioId, validacion.data);

        res.status(resultado.code ?? (resultado.success ? 201 : 400)).json(resultado);
    } catch (error) {
        console.error('Error en postCrearResena:', error);
        res.status(500).json({ success: false, message: 'Error al crear reseña' });
    }
}

// =============================================================================
// GET /api/resenas/negocio (requiere auth ScanYA)
// =============================================================================

/**
 * Lista reseñas del negocio con respuestas incluidas.
 * Query params: ?sucursalId=xxx&pendientes=true
 */
export async function getResenasNegocio(req: Request, res: Response): Promise<void> {
    try {
        if (!req.scanyaUsuario) {
            res.status(401).json({ success: false, message: 'No autenticado en ScanYA' });
            return;
        }

        const { negocioId, sucursalId: sucursalToken, tipo } = req.scanyaUsuario;

        // Determinar sucursal a filtrar según rol
        let sucursalFiltro: string | undefined;
        if (tipo === 'gerente' || tipo === 'empleado') {
            // Gerente y empleado solo ven su sucursal
            sucursalFiltro = sucursalToken;
        } else if (req.query.sucursalId) {
            // Dueño puede filtrar por sucursal opcional
            sucursalFiltro = req.query.sucursalId as string;
        }

        const soloPendientes = req.query.pendientes === 'true';

        const resultado = await obtenerResenasNegocio(negocioId, sucursalFiltro, soloPendientes);

        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en getResenasNegocio:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reseñas' });
    }
}

// =============================================================================
// POST /api/resenas/responder (requiere auth ScanYA)
// =============================================================================

/**
 * El negocio responde a una reseña de cliente.
 * Body: { resenaId, texto }
 */
export async function postResponderResena(req: Request, res: Response): Promise<void> {
    try {
        if (!req.scanyaUsuario) {
            res.status(401).json({ success: false, message: 'No autenticado en ScanYA' });
            return;
        }

        // Validar con Zod
        const validacion = responderResenaSchema.safeParse(req.body);

        if (!validacion.success) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: formatearErroresZod(validacion.error),
            });
            return;
        }

        // Determinar quién responde según tipo
        let respondidoPorId: string | null = null;         //UsuarioId (dueño/gerente)
        let respondidoPorEmpleadoId: string | null = null; // EmpleadoId (empleado)

        if (req.scanyaUsuario.tipo === 'empleado' && req.scanyaUsuario.empleadoId) {
            respondidoPorEmpleadoId = req.scanyaUsuario.empleadoId;
        } else {
            respondidoPorId = req.scanyaUsuario.usuarioId || null;
        }

        const resultado = await responderResena(
            req.scanyaUsuario.negocioId,
            validacion.data,
            respondidoPorId,
            respondidoPorEmpleadoId
        );

        res.status(resultado.code ?? (resultado.success ? 201 : 400)).json(resultado);
    } catch (error) {
        console.error('Error en postResponderResena:', error);
        res.status(500).json({ success: false, message: 'Error al responder reseña' });
    }
}

// =============================================================================
// PUT /api/resenas/:id (requiere auth AnunciaYA - cliente edita su reseña)
// =============================================================================

/**
 * Cliente edita su propia reseña (texto y/o rating).
 */
export async function putEditarResena(req: Request, res: Response): Promise<void> {
    try {
        if (!req.usuario?.usuarioId) {
            res.status(401).json({ success: false, message: 'No autenticado' });
            return;
        }

        const validacion = editarResenaSchema.safeParse({
            resenaId: req.params.id,
            ...req.body,
        });

        if (!validacion.success) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: formatearErroresZod(validacion.error),
            });
            return;
        }

        const { resenaId, texto, rating } = validacion.data;
        const resultado = await editarResena(req.usuario.usuarioId, resenaId, { texto, rating });

        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en putEditarResena:', error);
        res.status(500).json({ success: false, message: 'Error al editar reseña' });
    }
}