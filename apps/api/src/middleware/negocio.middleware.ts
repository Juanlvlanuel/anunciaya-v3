import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { negocios } from '../db/schemas/schema';
import { eq, sql } from 'drizzle-orm';

// ============================================
// MIDDLEWARE: VERIFICAR PROPIETARIO DEL NEGOCIO
// ============================================

/**
 * Verifica que el usuario autenticado sea el dueño del negocio
 * Requiere que el middleware verificarToken se ejecute primero
 * El negocioId viene como parámetro en la ruta: /api/onboarding/:negocioId
 */
export const verificarPropietarioNegocio = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { negocioId } = req.params;
        const usuarioId = req.usuario?.usuarioId;

        if (!usuarioId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'ID de negocio no proporcionado',
            });
        }

        // Buscar el negocio
        const [negocio] = await db
            .select({ usuarioId: negocios.usuarioId })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (!negocio) {
            return res.status(404).json({
                success: false,
                message: 'Negocio no encontrado',
            });
        }

        // Verificar que el usuario sea el dueño
        if (negocio.usuarioId !== usuarioId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este negocio',
            });
        }

        // Usuario es el propietario, continuar
        next();
    } catch (error) {
        console.error('Error al verificar propietario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar permisos',
        });
    }
};

// ============================================
// MIDDLEWARE: VERIFICAR NEGOCIO EXISTE
// ============================================

/**
 * Verifica que el negocio exista
 * Útil para rutas públicas que no requieren verificar propiedad
 */
export const verificarNegocioExiste = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { negocioId } = req.params;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'ID de negocio no proporcionado',
            });
        }

        const [negocio] = await db
            .select({ id: negocios.id })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (!negocio) {
            return res.status(404).json({
                success: false,
                message: 'Negocio no encontrado',
            });
        }

        next();
    } catch (error) {
        console.error('Error al verificar negocio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar negocio',
        });
    }
};

// ============================================
// MIDDLEWARE: VERIFICAR NEGOCIO DEL USUARIO
// ============================================

/**
 * Verifica que el usuario tenga un negocio asociado
 * Inyecta negocioId en el request para uso en controllers
 * 
 * Requiere: verificarToken ejecutado primero
 * 
 * USAR EN: Rutas de Business Studio donde el negocioId NO viene en la URL
 * Ejemplo: /api/business/dashboard/kpis
 */
export const verificarNegocio = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const usuarioId = req.usuario?.usuarioId;

        if (!usuarioId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        // Buscar el negocio del usuario (puede ser dueño o empleado)
        const [negocio] = await db
            .select({ id: negocios.id })
            .from(negocios)
            .where(eq(negocios.usuarioId, usuarioId))
            .limit(1);

        // Si tiene negocio propio (es dueño)
        if (negocio) {
            (req as any).negocioId = negocio.id;
            return next();
        }

        // Si no tiene negocio propio, buscar en usuarios (puede ser gerente/empleado)
        const queryUsuario = await db.execute(sql`
            SELECT negocio_id 
            FROM usuarios 
            WHERE id = ${usuarioId}
        `);

        if (queryUsuario.rows.length === 0 || !queryUsuario.rows[0].negocio_id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes un negocio asociado',
            });
        }

        // Inyectar negocioId del empleado
        (req as any).negocioId = queryUsuario.rows[0].negocio_id;

        next();
    } catch (error) {
        console.error('Error al verificar negocio del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar negocio',
        });
    }
};