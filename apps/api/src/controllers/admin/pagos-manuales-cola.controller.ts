/**
 * admin/pagos-manuales-cola.controller.ts
 * =======================================
 * Controllers de la cola "Por verificar" (pago manual) del módulo Suscripciones del Panel.
 * Llaman al service `pagos-manuales-cola.service.ts`.
 *
 * Ubicación: apps/api/src/controllers/admin/pagos-manuales-cola.controller.ts
 */

import type { Request, Response } from 'express';
import {
    aprobarSolicitud,
    guardarDatosCobro,
    listarSolicitudesPendientes,
    listarSolicitudesProcesadas,
    obtenerDatosCobroAdmin,
    rechazarSolicitud,
} from '../../services/admin/pagos-manuales-cola.service.js';
import { DATOS_COBRO_DEFAULT } from '../../services/membresia.service.js';

// =============================================================================
// LISTAR LA COLA
// =============================================================================

export async function listarSolicitudesController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const data = await listarSolicitudesPendientes(panel);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarSolicitudesController:', error);
        res.status(500).json({ success: false, message: 'Error al listar las solicitudes' });
    }
}

// =============================================================================
// HISTORIAL (solicitudes procesadas: aprobadas / rechazadas)
// =============================================================================

export async function listarSolicitudesProcesadasController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const estadoRaw = typeof req.query.estado === 'string' ? req.query.estado : '';
        const estado = estadoRaw === 'aprobado' || estadoRaw === 'rechazado' ? estadoRaw : undefined;
        const paginaN = Number(req.query.pagina);
        const porPaginaN = Number(req.query.porPagina);
        const pagina = Number.isFinite(paginaN) && paginaN >= 1 ? Math.floor(paginaN) : 1;
        const porPagina = Number.isFinite(porPaginaN) && porPaginaN >= 1 ? Math.min(100, Math.floor(porPaginaN)) : 20;
        const data = await listarSolicitudesProcesadas(panel, { estado, pagina, porPagina });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarSolicitudesProcesadasController:', error);
        res.status(500).json({ success: false, message: 'Error al listar el historial de solicitudes' });
    }
}

// =============================================================================
// APROBAR
// =============================================================================

export async function aprobarSolicitudController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { solicitudId } = req.params;

        // monto/meses son opcionales: si no vienen, el service usa los DECLARADOS por el dueño.
        // El service calcula la vigencia (hasta) y valida rangos.
        const montoRaw = req.body?.monto;
        const mesesRaw = req.body?.meses;
        const monto = Number.isFinite(Number(montoRaw)) ? Number(montoRaw) : undefined;
        const meses = Number.isInteger(mesesRaw) && mesesRaw > 0 ? mesesRaw : undefined;

        const r = await aprobarSolicitud(panel, solicitudId, { monto, meses });
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Pago aprobado y registrado.' });
    } catch (error) {
        console.error('Error en aprobarSolicitudController:', error);
        res.status(500).json({ success: false, message: 'Error al aprobar la solicitud' });
    }
}

// =============================================================================
// RECHAZAR
// =============================================================================

export async function rechazarSolicitudController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { solicitudId } = req.params;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        if (!motivo) {
            res.status(400).json({ success: false, message: 'El motivo es obligatorio.' });
            return;
        }
        const r = await rechazarSolicitud(panel, solicitudId, motivo);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Solicitud rechazada.' });
    } catch (error) {
        console.error('Error en rechazarSolicitudController:', error);
        res.status(500).json({ success: false, message: 'Error al rechazar la solicitud' });
    }
}

// =============================================================================
// DATOS DE COBRO
// =============================================================================

export async function obtenerDatosCobroController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await obtenerDatosCobroAdmin();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en obtenerDatosCobroController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los datos de cobro' });
    }
}

export async function guardarDatosCobroController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const b = req.body ?? {};
        const datos = {
            banco: typeof b.banco === 'string' ? b.banco.trim() : DATOS_COBRO_DEFAULT.banco,
            titular: typeof b.titular === 'string' ? b.titular.trim() : DATOS_COBRO_DEFAULT.titular,
            clabe: typeof b.clabe === 'string' ? b.clabe.trim() : DATOS_COBRO_DEFAULT.clabe,
            cuenta: typeof b.cuenta === 'string' ? b.cuenta.trim() : DATOS_COBRO_DEFAULT.cuenta,
            tarjeta: typeof b.tarjeta === 'string' ? b.tarjeta.trim() : DATOS_COBRO_DEFAULT.tarjeta,
            instrucciones: typeof b.instrucciones === 'string' ? b.instrucciones.trim() : DATOS_COBRO_DEFAULT.instrucciones,
        };
        await guardarDatosCobro(panel, datos);
        res.status(200).json({ success: true, message: 'Datos de cobro guardados.' });
    } catch (error) {
        console.error('Error en guardarDatosCobroController:', error);
        res.status(500).json({ success: false, message: 'Error al guardar los datos de cobro' });
    }
}
