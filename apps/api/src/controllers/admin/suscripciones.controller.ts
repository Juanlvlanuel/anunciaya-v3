/**
 * admin/suscripciones.controller.ts
 * =================================
 * Controllers de la sección Suscripciones del Panel Admin (bitácora financiera): leen
 * query/params, llaman al service y arman la respuesta. El acceso y el rol ya los validó
 * `requierePanel` en la ruta; el alcance fino (región) lo aplica el service.
 *
 * Ubicación: apps/api/src/controllers/admin/suscripciones.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarEventos,
    obtenerDetalleEvento,
    panelConFiltroRegion,
    TIPOS_EVENTO,
    ORIGENES_EVENTO,
    ORDENES_EVENTO,
    type TipoEvento,
    type OrigenEvento,
    type OrdenEvento,
} from '../../services/admin/suscripciones.service.js';

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
// GET /api/admin/suscripciones   (bitácora paginada · super + gerente)
// =============================================================================

export async function listarEventosController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro global de región (solo superadmin); el gerente lo ignora (su token manda).
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);

        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const tipoRaw = typeof req.query.tipo === 'string' ? req.query.tipo : '';
        const origenRaw = typeof req.query.origen === 'string' ? req.query.origen : '';
        const negocioIdRaw = typeof req.query.negocioId === 'string' ? req.query.negocioId.trim() : '';
        const desdeRaw = typeof req.query.desde === 'string' ? req.query.desde.trim() : '';
        const hastaRaw = typeof req.query.hasta === 'string' ? req.query.hasta.trim() : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const tipo = TIPOS_EVENTO.includes(tipoRaw as TipoEvento) ? (tipoRaw as TipoEvento) : undefined;
        const origen = ORIGENES_EVENTO.includes(origenRaw as OrigenEvento) ? (origenRaw as OrigenEvento) : undefined;
        const orden = ORDENES_EVENTO.includes(ordenRaw as OrdenEvento) ? (ordenRaw as OrdenEvento) : undefined;

        const resultado = await listarEventos(panel, {
            busqueda: busquedaRaw || undefined,
            tipo,
            origen,
            negocioId: negocioIdRaw || undefined,
            desde: desdeRaw || undefined,
            hasta: hastaRaw || undefined,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Eventos obtenidos', data: resultado });
    } catch (error) {
        console.error('Error en listarEventosController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los eventos',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/suscripciones/:id   (detalle de evento · super + gerente)
// =============================================================================

export async function obtenerDetalleEventoController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;

        const detalle = await obtenerDetalleEvento(panel, id);
        if (!detalle) {
            res.status(404).json({ success: false, message: 'Evento no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Evento obtenido', data: detalle });
    } catch (error) {
        console.error('Error en obtenerDetalleEventoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el evento',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
