/**
 * admin/usuarios.controller.ts
 * ============================
 * Controllers de la sección Usuarios del Panel Admin: lecturas (lista paginada + expediente 360).
 * Leen query/params, validan, llaman al service y arman la respuesta. El acceso y el rol ya los
 * validó `requierePanel(['superadmin','gerente'])` en la ruta.
 *
 * Las acciones (suspender/reactivar + rescates de acceso) llegarán en la Fase 2.
 *
 * Ubicación: apps/api/src/controllers/admin/usuarios.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarUsuarios,
    obtenerExpediente,
    ESTADOS_USUARIO,
    TIPOS_USUARIO,
    ORDENES_USUARIO,
    type EstadoUsuario,
    type TipoUsuario,
    type OrdenUsuarios,
} from '../../services/admin/usuarios.service.js';

const POR_PAGINA_DEFAULT = 20;
const POR_PAGINA_MAX = 100;

/** Convierte un query param suelto a entero positivo con tope, o el default. */
function enteroPositivo(valor: unknown, porDefecto: number, maximo?: number): number {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 1) return porDefecto;
    const entero = Math.floor(n);
    return maximo ? Math.min(entero, maximo) : entero;
}

// =============================================================================
// GET /api/admin/usuarios
// =============================================================================

export async function listarUsuariosController(req: Request, res: Response): Promise<void> {
    try {
        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const estadoRaw = typeof req.query.estado === 'string' ? req.query.estado : '';
        const tipoRaw = typeof req.query.tipo === 'string' ? req.query.tipo : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const estado = ESTADOS_USUARIO.includes(estadoRaw as EstadoUsuario)
            ? (estadoRaw as EstadoUsuario)
            : undefined;
        const tipo = TIPOS_USUARIO.includes(tipoRaw as TipoUsuario)
            ? (tipoRaw as TipoUsuario)
            : undefined;
        const orden = ORDENES_USUARIO.includes(ordenRaw as OrdenUsuarios)
            ? (ordenRaw as OrdenUsuarios)
            : undefined;

        const resultado = await listarUsuarios({
            busqueda: busquedaRaw || undefined,
            estado,
            tipo,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Usuarios obtenidos', data: resultado });
    } catch (error) {
        console.error('Error en listarUsuariosController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los usuarios',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/usuarios/:id
// =============================================================================

export async function obtenerExpedienteController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const expediente = await obtenerExpediente(id);
        if (!expediente) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Usuario obtenido', data: expediente });
    } catch (error) {
        console.error('Error en obtenerExpedienteController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el usuario',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
