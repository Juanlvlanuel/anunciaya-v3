/**
 * ============================================================================
 * MIDDLEWARE: Validar Acceso a Sucursal
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/middleware/sucursal.middleware.ts
 * 
 * PROPÓSITO:
 * Validar que el usuario tenga acceso a la sucursal que está consultando
 * 
 * REGLAS:
 * - DUEÑOS (sucursalAsignada = null): Pueden acceder a todas sus sucursales
 * - GERENTES (sucursalAsignada !== null): Solo pueden acceder a su sucursal asignada
 * - Si no hay sucursalId en query: Permitir (datos globales)
 * 
 * USO:
 * Aplicar este middleware DESPUÉS de verificarToken en rutas de Business Studio
 * 
 * CREADO: 2 de Enero, 2026
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// =============================================================================
// MIDDLEWARE: VALIDAR ACCESO A SUCURSAL
// =============================================================================

/**
 * Valida que el usuario tenga acceso a la sucursal solicitada
 * 
 * @param req - Request con query.sucursalId y usuario del token
 * @param res - Response
 * @param next - NextFunction
 */
export async function validarAccesoSucursal(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { sucursalId } = req.query;
        const userId = (req as any).usuario?.usuarioId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        // Obtener datos completos del usuario desde DB
        const queryUsuario = sql`
            SELECT negocio_id, sucursal_asignada 
            FROM usuarios 
            WHERE id = ${userId}
        `;

        const resultadoUsuario = await db.execute(queryUsuario);

        if (resultadoUsuario.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const usuario = {
            id: userId,
            negocioId: resultadoUsuario.rows[0].negocio_id,
            sucursalAsignada: resultadoUsuario.rows[0].sucursal_asignada,
        };
        // Si no hay sucursalId, permitir (datos globales o sucursal principal)
        if (!sucursalId) {
            return next();
        }

        // Si usuario no tiene negocioId, no tiene acceso a sucursales
        if (!usuario?.negocioId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes un negocio registrado',
            });
        }

        // =================================================================
        // CASO 1: DUEÑO (sucursalAsignada = null)
        // Puede acceder a cualquier sucursal de su negocio
        // =================================================================
        if (!usuario.sucursalAsignada) {
            // Validar que la sucursal pertenece a su negocio
            const query = sql`
                SELECT id 
                FROM negocio_sucursales 
                WHERE id = ${sucursalId as string}
                  AND negocio_id = ${usuario.negocioId}
            `;

            const resultado = await db.execute(query);

            if (resultado.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Esta sucursal no pertenece a tu negocio',
                });
            }

            // Sucursal válida, continuar
            return next();
        }

        // =================================================================
        // CASO 2: GERENTE (sucursalAsignada !== null)
        // Solo puede acceder a su sucursal asignada
        // =================================================================

        if (sucursalId !== usuario.sucursalAsignada) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a esta sucursal. Solo puedes ver datos de tu sucursal asignada.',
            });
        }

        // Sucursal válida, continuar
        next();
    } catch (error) {
        console.error('Error al validar acceso a sucursal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al validar permisos de sucursal',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    validarAccesoSucursal,
};