/**
 * admin/recibos.controller.ts
 * ===========================
 * Controllers del módulo "Recibos" del Panel: listar (con alcance por rol), descargar el PDF y
 * reenviar el comprobante por correo. Solo llaman al service y arman la respuesta.
 *
 * Ubicación: apps/api/src/controllers/admin/recibos.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarRecibos,
    descargarRecibo,
    reenviarRecibo,
    panelConFiltroRegion,
    ORDENES_RECIBO,
    type OrdenRecibo,
    type OrigenRecibo,
} from '../../services/admin/recibos.service.js';
import { reenviarReciboSchema } from '../../validations/admin/recibos.schema.js';

const POR_PAGINA_DEFAULT = 20;
const POR_PAGINA_MAX = 100;

function enteroPositivo(v: unknown, def: number, max?: number): number {
    const n = typeof v === 'string' ? parseInt(v, 10) : NaN;
    if (!Number.isFinite(n) || n < 1) return def;
    return max ? Math.min(n, max) : n;
}

// =============================================================================
// GET /api/admin/recibos   (super=todos · gerente=su región · vendedor=sus negocios)
// =============================================================================

export async function listarRecibosController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const negocioId = typeof req.query.negocioId === 'string' ? req.query.negocioId : undefined;
        const desde = typeof req.query.desde === 'string' ? req.query.desde : undefined;
        const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : undefined;
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';
        const orden = ORDENES_RECIBO.includes(ordenRaw as OrdenRecibo) ? (ordenRaw as OrdenRecibo) : undefined;
        const origenRaw = typeof req.query.origen === 'string' ? req.query.origen : '';
        const origen = origenRaw === 'membresia' || origenRaw === 'publicidad' ? origenRaw : undefined;

        const data = await listarRecibos(panel, {
            busqueda: busqueda || undefined,
            negocioId,
            desde,
            hasta,
            origen,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });
        res.status(200).json({ success: true, message: 'Recibos obtenidos', data });
    } catch (error) {
        console.error('Error en listarRecibosController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los recibos' });
    }
}

// =============================================================================
// GET /api/admin/recibos/conteo   (total de recibos del alcance — badge del menú)
// =============================================================================

export async function contarRecibosController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        // Reusa la lista (los conteos ignoran filtros de origen y, sin búsqueda/fechas, dan el total del alcance).
        const data = await listarRecibos(panel, { pagina: 1, porPagina: 1 });
        res.status(200).json({ success: true, message: 'Conteo de recibos', data: { total: data.conteos.total } });
    } catch (error) {
        console.error('Error en contarRecibosController:', error);
        res.status(500).json({ success: false, message: 'Error al contar los recibos' });
    }
}

// =============================================================================
// GET /api/admin/recibos/:id/pdf   (genera/regenera el PDF y devuelve su URL)
// =============================================================================

export async function descargarReciboController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const origen: OrigenRecibo = req.query.origen === 'publicidad' ? 'publicidad' : 'membresia';
        const r = await descargarRecibo(panel, req.params.id, origen);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Recibo generado', data: { reciboUrl: r.reciboUrl } });
    } catch (error) {
        console.error('Error en descargarReciboController:', error);
        res.status(500).json({ success: false, message: 'Error al generar el recibo' });
    }
}

// =============================================================================
// POST /api/admin/recibos/:id/reenviar   (envía el comprobante a 1+ correos)
// =============================================================================

export async function reenviarReciboController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = reenviarReciboSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const origen: OrigenRecibo = req.query.origen === 'publicidad' ? 'publicidad' : 'membresia';
        const r = await reenviarRecibo(panel, req.params.id, parsed.data.correos, origen);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: `Comprobante enviado a ${r.enviados} correo(s).`, data: { enviados: r.enviados } });
    } catch (error) {
        console.error('Error en reenviarReciboController:', error);
        res.status(500).json({ success: false, message: 'Error al reenviar el comprobante' });
    }
}
