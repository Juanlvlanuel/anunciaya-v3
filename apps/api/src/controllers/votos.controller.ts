/**
 * ============================================================================
 * VOTOS CONTROLLER - Controlador de Votos
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/votos.controller.ts
 * 
 * PROPÓSITO:
 * Maneja las peticiones HTTP para likes y follows (seguir)
 */

import { Request, Response } from 'express';
import {
    crearVoto,
    eliminarVoto,
    obtenerSeguidos,
    obtenerContadoresVotos,
} from '../services/votos.service';

// =============================================================================
// CREAR VOTO (Like o Save)
// =============================================================================

/**
 * POST /api/votos
 * Crea un voto (like o follow)
 * 
 * Body:
 * {
 *   "entityType": "sucursal",
 *   "entityId": "uuid",
 *   "tipoAccion": "like" | "follow",
 *   "votanteSucursalId": "uuid" | null  // Si vota como negocio
 * }
 */
export async function crearVotoController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        const { entityType, entityId, tipoAccion, votanteSucursalId } = req.body;

        // Validaciones
        if (!entityType || !entityId || !tipoAccion) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId, tipoAccion',
            });
        }

        if (!['like', 'follow'].includes(tipoAccion)) {
            return res.status(400).json({
                success: false,
                message: 'tipoAccion debe ser "like" o "follow"',
            });
        }

        const validEntityTypes = ['sucursal', 'articulo', 'publicacion', 'oferta', 'rifa', 'subasta', 'empleo'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: `entityType no válido. Debe ser uno de: ${validEntityTypes.join(', ')}`,
            });
        }

        // Crear voto
        const resultado = await crearVoto({
            userId,
            entityType,
            entityId,
            tipoAccion,
            votanteSucursalId,
        });

        if (!resultado.success) {
            return res.status(400).json(resultado);
        }

        res.status(201).json(resultado);
    } catch (error) {
        console.error('Error al crear voto:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al crear voto',
        });
    }
}

// =============================================================================
// ELIMINAR VOTO (Quitar Like o Follow)
// =============================================================================

/**
 * DELETE /api/votos/:entityType/:entityId/:tipoAccion?votanteSucursalId=uuid
 * Elimina un voto (quita like o follow)
 * 
 * Query params:
 * - votanteSucursalId: UUID de sucursal (opcional, si votó como negocio)
 */
export async function eliminarVotoController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        const { entityType, entityId, tipoAccion } = req.params;
        const votanteSucursalId = req.query.votanteSucursalId as string | undefined;

        // Validaciones
        if (!entityType || !entityId || !tipoAccion) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        if (!['like', 'follow'].includes(tipoAccion)) {
            return res.status(400).json({
                success: false,
                message: 'tipoAccion debe ser "like" o "follow"',
            });
        }

        // Eliminar voto
        const resultado = await eliminarVoto(
            userId,
            entityType as any,
            entityId,
            tipoAccion as 'like' | 'follow',
            votanteSucursalId || null
        );

        if (!resultado.success) {
            return res.status(404).json(resultado);
        }

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al eliminar voto:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al eliminar voto',
        });
    }
}

// =============================================================================
// OBTENER SEGUIDOS
// =============================================================================

/**
 * GET /api/seguidos?entityType=sucursal&pagina=1&limite=20&latitud=31.3&longitud=-113.5
 * Obtiene la lista de entidades guardadas (seguidos) del usuario
 * 
 * Query Params:
 * - entityType: Tipo de entidad a filtrar
 * - pagina: Número de página (default: 1)
 * - limite: Items por página (default: 20, max: 100)
 * - latitud: Latitud GPS del usuario (opcional, para calcular distancia)
 * - longitud: Longitud GPS del usuario (opcional, para calcular distancia)
 * - votanteSucursalId: ID de sucursal si vota como negocio (query param del interceptor)
 * - incluirTodosModos: 'true' para obtener TODOS los seguidos sin filtrar por modo
 */
export async function obtenerSeguidosController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        const entityType = req.query.entityType as string | undefined;
        const pagina = parseInt(req.query.pagina as string) || 1;
        const limite = parseInt(req.query.limite as string) || 20;
        const incluirTodosModos = req.query.incluirTodosModos === 'true';

        // Si incluirTodosModos=true, NO usar votanteSucursalId (obtener TODOS)
        const votanteSucursalId = incluirTodosModos
            ? undefined
            : (req.query.votanteSucursalId as string | undefined);

        // Parámetros de geolocalización (opcionales)
        const latitud = req.query.latitud ? parseFloat(req.query.latitud as string) : undefined;
        const longitud = req.query.longitud ? parseFloat(req.query.longitud as string) : undefined;

        // Validar límite
        if (limite > 100) {
            return res.status(400).json({
                success: false,
                message: 'El límite máximo es 100',
            });
        }

        const resultado = await obtenerSeguidos(
            userId,
            entityType as any,
            pagina,
            limite,
            votanteSucursalId,
            latitud,
            longitud
        );

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener seguidos:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener seguidos',
        });
    }
}

// =============================================================================
// OBTENER CONTADORES DE VOTOS
// =============================================================================

/**
 * GET /api/votos/contadores/:entityType/:entityId
 * Obtiene los contadores de likes y saves de una entidad
 */
export async function obtenerContadoresController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.params;

        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        const resultado = await obtenerContadoresVotos(
            entityType as any,
            entityId
        );

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener contadores:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener contadores',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    crearVotoController,
    eliminarVotoController,
    obtenerSeguidosController,
    obtenerContadoresController,
};