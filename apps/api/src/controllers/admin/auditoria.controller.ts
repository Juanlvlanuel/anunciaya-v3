/**
 * admin/auditoria.controller.ts
 * =============================
 * Controllers de la sección Auditoría del Panel Admin (bitácora de acciones del
 * equipo): leen query/params, llaman al service y arman la respuesta. El acceso y el
 * rol ya los validó `requierePanel` en la ruta; el alcance fino (región/equipo) lo
 * aplica el service.
 *
 * Ubicación: apps/api/src/controllers/admin/auditoria.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarAuditoria,
    obtenerDetalleAuditoria,
    listarActoresAuditoria,
    panelConFiltroRegion,
    ORDENES_AUDITORIA,
    type OrdenAuditoria,
} from '../../services/admin/auditoria-consulta.service.js';
import { eliminarAuditoria, vaciarAuditoria } from '../../services/admin/auditoria-acciones.service.js';

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
// GET /api/admin/auditoria   (bitácora paginada · super + gerente)
// =============================================================================

export async function listarAuditoriaController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro global de región (solo superadmin); el gerente lo ignora (su token manda).
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);

        const actorIdRaw = typeof req.query.actorId === 'string' ? req.query.actorId.trim() : '';
        const accionRaw = typeof req.query.accion === 'string' ? req.query.accion.trim() : '';
        const entidadTipoRaw = typeof req.query.entidadTipo === 'string' ? req.query.entidadTipo.trim() : '';
        const entidadIdRaw = typeof req.query.entidadId === 'string' ? req.query.entidadId.trim() : '';
        const desdeRaw = typeof req.query.desde === 'string' ? req.query.desde.trim() : '';
        const hastaRaw = typeof req.query.hasta === 'string' ? req.query.hasta.trim() : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const orden = ORDENES_AUDITORIA.includes(ordenRaw as OrdenAuditoria) ? (ordenRaw as OrdenAuditoria) : undefined;

        const resultado = await listarAuditoria(panel, {
            actorId: actorIdRaw || undefined,
            accion: accionRaw || undefined,
            entidadTipo: entidadTipoRaw || undefined,
            entidadId: entidadIdRaw || undefined,
            desde: desdeRaw || undefined,
            hasta: hastaRaw || undefined,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Auditoría obtenida', data: resultado });
    } catch (error) {
        console.error('Error en listarAuditoriaController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la auditoría',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/auditoria/actores   (actores del filtro · super + gerente)
// =============================================================================

export async function listarActoresAuditoriaController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const actores = await listarActoresAuditoria(panel);
        res.status(200).json({ success: true, message: 'Actores obtenidos', data: actores });
    } catch (error) {
        console.error('Error en listarActoresAuditoriaController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los actores',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/auditoria/:id   (detalle de un registro · super + gerente)
// =============================================================================

export async function obtenerDetalleAuditoriaController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;

        const detalle = await obtenerDetalleAuditoria(panel, id);
        if (!detalle) {
            res.status(404).json({ success: false, message: 'Registro no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Registro obtenido', data: detalle });
    } catch (error) {
        console.error('Error en obtenerDetalleAuditoriaController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el registro',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// DELETE /api/admin/auditoria/:id   (borrar un registro · SOLO superadmin)
// =============================================================================

export async function eliminarAuditoriaController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const resultado = await eliminarAuditoria(id);
        if (!resultado.ok) {
            res.status(404).json({ success: false, message: 'Registro no encontrado' });
            return;
        }
        res.status(200).json({ success: true, message: 'Registro eliminado' });
    } catch (error) {
        console.error('Error en eliminarAuditoriaController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el registro',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// DELETE /api/admin/auditoria   (vaciar toda la bitácora · SOLO superadmin)
// =============================================================================

export async function vaciarAuditoriaController(req: Request, res: Response): Promise<void> {
    try {
        // Vacía RESPETANDO los filtros activos (mismos que la lista) + el alcance del panel. Sin filtros → todo.
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const actorIdRaw = typeof req.query.actorId === 'string' ? req.query.actorId.trim() : '';
        const accionRaw = typeof req.query.accion === 'string' ? req.query.accion.trim() : '';
        const entidadTipoRaw = typeof req.query.entidadTipo === 'string' ? req.query.entidadTipo.trim() : '';
        const entidadIdRaw = typeof req.query.entidadId === 'string' ? req.query.entidadId.trim() : '';
        const desdeRaw = typeof req.query.desde === 'string' ? req.query.desde.trim() : '';
        const hastaRaw = typeof req.query.hasta === 'string' ? req.query.hasta.trim() : '';

        const resultado = await vaciarAuditoria(panel, {
            actorId: actorIdRaw || undefined,
            accion: accionRaw || undefined,
            entidadTipo: entidadTipoRaw || undefined,
            entidadId: entidadIdRaw || undefined,
            desde: desdeRaw || undefined,
            hasta: hastaRaw || undefined,
        });
        res.status(200).json({ success: true, message: `Bitácora depurada (${resultado.borradas})`, data: resultado });
    } catch (error) {
        console.error('Error en vaciarAuditoriaController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al vaciar la bitácora',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
