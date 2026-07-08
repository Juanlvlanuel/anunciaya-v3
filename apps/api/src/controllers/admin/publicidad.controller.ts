/**
 * admin/publicidad.controller.ts
 * ==============================
 * Controllers de lectura de la sección Publicidad del Panel Admin (módulo 7):
 * tabla, ficha y contador del menú. Leen query/params, llaman al service y arman
 * la respuesta. El acceso y el rol ya los validó `requierePanel` en la ruta; el
 * alcance fino (por rol/región) lo aplica el service.
 *
 * Ubicación: apps/api/src/controllers/admin/publicidad.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarPublicidad,
    obtenerDetallePublicidad,
    contarPublicidad,
    obtenerKpisPublicidad,
    panelConFiltroRegion,
    ESTADOS_PUBLICIDAD,
    FILTROS_TAMANO,
    ORIGENES_PUBLICIDAD,
    ORDENES_PUBLICIDAD,
    type EstadoPublicidad,
    type FiltroTamano,
    type OrigenPublicidad,
    type OrdenPublicidad,
} from '../../services/admin/publicidad.service.js';
import {
    pausarAnuncio,
    reactivarAnuncio,
    cancelarAnuncio,
    editarAnuncio,
    type EdicionAnuncioInput,
} from '../../services/admin/publicidad-acciones.service.js';
import { crearAnuncioManual, type AltaManualInput, type MetodoCobroManual } from '../../services/admin/publicidad-alta.service.js';
import type { CarruselPub } from '../../services/publicidad-precio.service.js';

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
// GET /api/admin/publicidad
// =============================================================================

export async function listarPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);

        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const estadoRaw = typeof req.query.estado === 'string' ? req.query.estado : '';
        const carruselRaw = typeof req.query.carrusel === 'string' ? req.query.carrusel : '';
        const origenRaw = typeof req.query.origen === 'string' ? req.query.origen : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const estado = ESTADOS_PUBLICIDAD.includes(estadoRaw as EstadoPublicidad)
            ? (estadoRaw as EstadoPublicidad)
            : undefined;
        const carrusel = FILTROS_TAMANO.includes(carruselRaw as FiltroTamano)
            ? (carruselRaw as FiltroTamano)
            : undefined;
        const origen = ORIGENES_PUBLICIDAD.includes(origenRaw as OrigenPublicidad)
            ? (origenRaw as OrigenPublicidad)
            : undefined;
        const orden = ORDENES_PUBLICIDAD.includes(ordenRaw as OrdenPublicidad)
            ? (ordenRaw as OrdenPublicidad)
            : undefined;

        const resultado = await listarPublicidad(panel, {
            busqueda: busquedaRaw || undefined,
            estado,
            carrusel,
            origen,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Publicidad obtenida', data: resultado });
    } catch (error) {
        console.error('Error en listarPublicidadController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la publicidad',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/publicidad/:id
// =============================================================================

export async function obtenerDetallePublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const detalle = await obtenerDetallePublicidad(panel, req.params.id);

        if (!detalle) {
            res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Anuncio obtenido', data: detalle });
    } catch (error) {
        console.error('Error en obtenerDetallePublicidadController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el anuncio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/publicidad/conteo
// =============================================================================

export async function contarPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const total = await contarPublicidad(panel);
        res.status(200).json({ success: true, message: 'Conteo de publicidad', data: { total } });
    } catch (error) {
        console.error('Error en contarPublicidadController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al contar la publicidad',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/publicidad/kpis
// =============================================================================

export async function kpisPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const data = await obtenerKpisPublicidad(panel);
        res.status(200).json({ success: true, message: 'KPIs de publicidad', data });
    } catch (error) {
        console.error('Error en kpisPublicidadController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los KPIs',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// ACCIONES (Fase 2) — las mutaciones usan el panel ORIGINAL (sin lente de región)
// =============================================================================

export async function pausarAnuncioController(req: Request, res: Response): Promise<void> {
    try {
        const resultado = await pausarAnuncio(req.usuarioPanel!, req.params.id);
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Anuncio pausado', data: { estado: resultado.estado } });
    } catch (error) {
        console.error('Error en pausarAnuncioController:', error);
        res.status(500).json({ success: false, message: 'Error al pausar el anuncio', error: error instanceof Error ? error.message : String(error) });
    }
}

export async function reactivarAnuncioController(req: Request, res: Response): Promise<void> {
    try {
        const resultado = await reactivarAnuncio(req.usuarioPanel!, req.params.id);
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Anuncio reactivado', data: { estado: resultado.estado } });
    } catch (error) {
        console.error('Error en reactivarAnuncioController:', error);
        res.status(500).json({ success: false, message: 'Error al reactivar el anuncio', error: error instanceof Error ? error.message : String(error) });
    }
}

export async function cancelarAnuncioController(req: Request, res: Response): Promise<void> {
    try {
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : null;
        const resultado = await cancelarAnuncio(req.usuarioPanel!, req.params.id, motivo);
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Anuncio cancelado', data: { estado: resultado.estado } });
    } catch (error) {
        console.error('Error en cancelarAnuncioController:', error);
        res.status(500).json({ success: false, message: 'Error al cancelar el anuncio', error: error instanceof Error ? error.message : String(error) });
    }
}

export async function editarAnuncioController(req: Request, res: Response): Promise<void> {
    try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const input: EdicionAnuncioInput = {
            carruseles: Array.isArray(body.carruseles) ? (body.carruseles as CarruselPub[]) : [],
            imagenes: (typeof body.imagenes === 'object' && body.imagenes !== null ? body.imagenes : {}) as Partial<Record<CarruselPub, string>>,
            ciudadIds: Array.isArray(body.ciudadIds) ? (body.ciudadIds as string[]) : [],
        };
        const resultado = await editarAnuncio(req.usuarioPanel!, req.params.id, input);
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Anuncio actualizado', data: { estado: resultado.estado } });
    } catch (error) {
        console.error('Error en editarAnuncioController:', error);
        res.status(500).json({ success: false, message: 'Error al editar el anuncio', error: error instanceof Error ? error.message : String(error) });
    }
}

export async function crearAnuncioManualController(req: Request, res: Response): Promise<void> {
    try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const input: AltaManualInput = {
            correoAnunciante: typeof body.correoAnunciante === 'string' ? body.correoAnunciante : '',
            carruseles: Array.isArray(body.carruseles) ? (body.carruseles as CarruselPub[]) : [],
            imagenes: (typeof body.imagenes === 'object' && body.imagenes !== null ? body.imagenes : {}) as Partial<Record<CarruselPub, string>>,
            ciudadIds: Array.isArray(body.ciudadIds) ? (body.ciudadIds as string[]) : [],
            meses: typeof body.meses === 'number' ? body.meses : undefined,
            metodoCobro: body.metodoCobro as MetodoCobroManual,
            monto: typeof body.monto === 'number' ? body.monto : undefined,
        };

        const resultado = await crearAnuncioManual(req.usuarioPanel!, input);
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(201).json({ success: true, message: 'Anuncio registrado', data: resultado });
    } catch (error) {
        console.error('Error en crearAnuncioManualController:', error);
        res.status(500).json({ success: false, message: 'Error al registrar el anuncio', error: error instanceof Error ? error.message : String(error) });
    }
}
