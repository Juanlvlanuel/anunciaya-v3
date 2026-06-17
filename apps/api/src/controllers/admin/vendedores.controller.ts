/**
 * admin/vendedores.controller.ts
 * ==============================
 * Controllers de la sección "Vendedores y comisiones" del Panel Admin — pieza A: la CARTERA.
 * Leen query/params, llaman al service y arman la respuesta camelCase. El acceso y el rol ya los
 * validó `requierePanel` en la ruta; el alcance fino lo aplica el service.
 *
 * Ubicación: apps/api/src/controllers/admin/vendedores.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarVendedores,
    contarVendedores,
    obtenerVendedor,
    listarCartera,
    listarComisionesVendedor,
    ESTADOS_EMBAJADOR,
    ORDENES_VENDEDORES,
    type EstadoEmbajador,
    type OrdenVendedores,
} from '../../services/admin/vendedores.service.js';
import { panelConFiltroRegion, ESTADOS_PAGO, type EstadoPago } from '../../services/admin/negocios.service.js';
import { devengarPeriodo, periodoActual } from '../../services/admin/comisiones-devengo.service.js';
import { registrarAuditoria } from '../../services/admin/auditoria.service.js';

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
// GET /api/admin/vendedores   (super + gerente + vendedor · alcance por rol)
// =============================================================================

export async function listarVendedoresController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro global de región (solo superadmin); gerente/vendedor lo ignoran.
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);

        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const estadoRaw = typeof req.query.estado === 'string' ? req.query.estado : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const estado = ESTADOS_EMBAJADOR.includes(estadoRaw as EstadoEmbajador)
            ? (estadoRaw as EstadoEmbajador)
            : undefined;
        const orden = ORDENES_VENDEDORES.includes(ordenRaw as OrdenVendedores)
            ? (ordenRaw as OrdenVendedores)
            : undefined;

        const resultado = await listarVendedores(panel, {
            busqueda: busquedaRaw || undefined,
            estado,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Vendedores obtenidos', data: resultado });
    } catch (error) {
        console.error('Error en listarVendedoresController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los vendedores',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/vendedores/conteo   (super + gerente + vendedor · badge del menú)
// =============================================================================

export async function contarVendedoresController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const total = await contarVendedores(panel);
        res.status(200).json({ success: true, message: 'Conteo obtenido', data: { total } });
    } catch (error) {
        console.error('Error en contarVendedoresController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el conteo' });
    }
}

// =============================================================================
// GET /api/admin/vendedores/:id   (super + gerente + vendedor · ficha, alcance por rol)
// :id = usuarios.id del vendedor (consistente con Equipo).
// =============================================================================

export async function obtenerVendedorController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;

        const detalle = await obtenerVendedor(panel, id);
        if (!detalle) {
            res.status(404).json({ success: false, message: 'Vendedor no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Vendedor obtenido', data: detalle });
    } catch (error) {
        console.error('Error en obtenerVendedorController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el vendedor',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/vendedores/:id/cartera   (super + gerente + vendedor · negocios del vendedor)
// =============================================================================

export async function listarCarteraController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;

        const estadoPagoRaw = typeof req.query.estadoPago === 'string' ? req.query.estadoPago : '';
        const estadoPago = ESTADOS_PAGO.includes(estadoPagoRaw as EstadoPago) ? estadoPagoRaw : undefined;

        const resultado = await listarCartera(panel, id, {
            estadoPago,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        if (!resultado) {
            res.status(404).json({ success: false, message: 'Vendedor no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Cartera obtenida', data: resultado });
    } catch (error) {
        console.error('Error en listarCarteraController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la cartera',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/vendedores/comisiones/recalcular   (solo super · devenga el periodo)
// Body: { periodo?: 'YYYY-MM' } — si no se manda, usa el mes en curso.
// =============================================================================

export async function recalcularComisionesController(req: Request, res: Response): Promise<void> {
    try {
        const periodoRaw = typeof req.body?.periodo === 'string' ? req.body.periodo : '';
        const periodo = /^\d{4}-\d{2}$/.test(periodoRaw) ? periodoRaw : periodoActual();

        const resumen = await devengarPeriodo(periodo);

        await registrarAuditoria(req.usuarioPanel!, {
            accion: 'comisiones_recalcular',
            entidadTipo: 'comisiones',
            entidadId: null,
            datosPrevios: null,
            datosNuevos: resumen,
            motivo: null,
        });

        res.status(200).json({ success: true, message: `Comisiones de ${periodo} recalculadas`, data: resumen });
    } catch (error) {
        console.error('Error en recalcularComisionesController:', error);
        res.status(500).json({ success: false, message: 'Error al recalcular las comisiones' });
    }
}

// =============================================================================
// GET /api/admin/vendedores/:id/comisiones   (super + gerente + vendedor · estado de cuenta)
// =============================================================================

export async function listarComisionesVendedorController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;

        const data = await listarComisionesVendedor(panel, id);
        if (!data) {
            res.status(404).json({ success: false, message: 'Vendedor no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Comisiones obtenidas', data });
    } catch (error) {
        console.error('Error en listarComisionesVendedorController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las comisiones' });
    }
}
