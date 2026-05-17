/**
 * ============================================================================
 * VACANTES CONTROLLER (Sprint 8 — Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/vacantes.controller.ts
 *
 * Endpoints REST del módulo "Vacantes" en Business Studio. Orquesta validación
 * (Zod) → llamada al service → mapeo a status HTTP. Cero lógica de negocio.
 *
 * Todas las rutas protegidas con middleware:
 *   verificarToken → verificarNegocio → validarAccesoSucursal → controller
 */

import type { Request, Response } from 'express';
import {
    crearVacante,
    actualizarVacante,
    listarVacantes,
    obtenerKpisVacantes,
    cambiarEstadoVacante,
    cerrarVacante,
    eliminarVacante,
} from '../services/vacantes.service.js';
import {
    crearVacanteSchema,
    actualizarVacanteSchema,
    cambiarEstadoSchema,
    listarVacantesQuerySchema,
    formatearErroresZod,
} from '../validations/servicios.schema.js';

// =============================================================================
// HELPERS
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function obtenerUsuarioId(req: Request): string | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (req as any).usuario?.usuarioId ?? null;
}

function obtenerSucursalId(req: Request): string | null {
    const sucursalId = req.query.sucursalId;
    if (typeof sucursalId === 'string' && UUID_REGEX.test(sucursalId)) {
        return sucursalId;
    }
    return null;
}

function exigirUsuarioId(req: Request, res: Response): string | null {
    const usuarioId = obtenerUsuarioId(req);
    if (!usuarioId) {
        res.status(401).json({
            success: false,
            message: 'No autenticado',
        });
        return null;
    }
    return usuarioId;
}

function exigirSucursalId(req: Request, res: Response): string | null {
    const sucursalId = obtenerSucursalId(req);
    if (!sucursalId) {
        res.status(400).json({
            success: false,
            message: 'Se requiere sucursalId en query string',
        });
        return null;
    }
    return sucursalId;
}

// =============================================================================
// 1) GET /api/business-studio/vacantes — listar vacantes de la sucursal
// =============================================================================

export async function listarVacantesController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;
        const sucursalId = exigirSucursalId(req, res);
        if (!sucursalId) return;

        const validacion = listarVacantesQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await listarVacantes(usuarioId, sucursalId, validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en listarVacantesController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al listar vacantes',
        });
    }
}

// =============================================================================
// 2) GET /api/business-studio/vacantes/kpis — 4 KPIs del dashboard
// =============================================================================

export async function obtenerKpisVacantesController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;
        const sucursalId = exigirSucursalId(req, res);
        if (!sucursalId) return;

        const resultado = await obtenerKpisVacantes(usuarioId, sucursalId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en obtenerKpisVacantesController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener KPIs',
        });
    }
}

// =============================================================================
// 3) POST /api/business-studio/vacantes — crear vacante
// =============================================================================

export async function crearVacanteController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const validacion = crearVacanteSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await crearVacante(usuarioId, validacion.data);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en crearVacanteController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear la vacante',
        });
    }
}

// =============================================================================
// 4) PUT /api/business-studio/vacantes/:id — actualizar
// =============================================================================

export async function actualizarVacanteController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const publicacionId = req.params.id;
        if (!UUID_REGEX.test(publicacionId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de vacante inválido',
            });
        }

        const validacion = actualizarVacanteSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await actualizarVacante(
            usuarioId,
            publicacionId,
            validacion.data
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en actualizarVacanteController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la vacante',
        });
    }
}

// =============================================================================
// 5) PATCH /api/business-studio/vacantes/:id/estado — pausar/reactivar
// =============================================================================

export async function cambiarEstadoVacanteController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const publicacionId = req.params.id;
        if (!UUID_REGEX.test(publicacionId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de vacante inválido',
            });
        }

        const validacion = cambiarEstadoSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await cambiarEstadoVacante(
            usuarioId,
            publicacionId,
            validacion.data.estado
        );
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en cambiarEstadoVacanteController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar estado',
        });
    }
}

// =============================================================================
// 6) PATCH /api/business-studio/vacantes/:id/cerrar — cerrar (puesto cubierto)
// =============================================================================

export async function cerrarVacanteController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const publicacionId = req.params.id;
        if (!UUID_REGEX.test(publicacionId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de vacante inválido',
            });
        }

        const resultado = await cerrarVacante(usuarioId, publicacionId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en cerrarVacanteController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cerrar la vacante',
        });
    }
}

// =============================================================================
// 7) DELETE /api/business-studio/vacantes/:id — soft delete
// =============================================================================

export async function eliminarVacanteController(req: Request, res: Response) {
    try {
        const usuarioId = exigirUsuarioId(req, res);
        if (!usuarioId) return;

        const publicacionId = req.params.id;
        if (!UUID_REGEX.test(publicacionId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de vacante inválido',
            });
        }

        const resultado = await eliminarVacante(usuarioId, publicacionId);
        return res.status(resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en eliminarVacanteController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la vacante',
        });
    }
}
