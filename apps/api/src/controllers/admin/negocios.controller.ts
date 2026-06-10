/**
 * admin/negocios.controller.ts
 * ============================
 * Controllers de la sección Negocios del Panel Admin (Entrega 1 — solo lectura).
 * Solo leen query/params, llaman al service y arman la respuesta camelCase.
 * El acceso y el rol ya los validó `requierePanel` en la ruta.
 *
 * Ubicación: apps/api/src/controllers/admin/negocios.controller.ts
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import {
    listarNegocios,
    obtenerDetalleNegocio,
    listarVendedoresFiltro,
    listarCiudades,
    listarSucursalesNegocio,
    obtenerDetalleSucursal,
    listarPagosNegocio,
    panelConFiltroRegion,
    ESTADOS_PAGO,
    ORDENES,
    type EstadoPago,
    type OrdenNegocios,
} from '../../services/admin/negocios.service.js';
import {
    suspenderNegocio,
    reactivarNegocio,
    reasignarVendedor,
    marcarPagado,
    cancelarNegocio,
    cambiarCorreoDueno,
} from '../../services/admin/negocios-acciones.service.js';
import {
    altaManualNegocio,
    listarCatalogoCiudades,
    existeCorreo,
} from '../../services/admin/altaManualNegocio.service.js';
import {
    altaManualNegocioSchema,
    formatearErroresZod,
} from '../../validations/admin/altaManualNegocio.schema.js';

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
// GET /api/admin/negocios
// =============================================================================

export async function listarNegociosController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro global de región (solo superadmin); gerente/vendedor lo ignoran.
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);

        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const estadoPagoRaw = typeof req.query.estadoPago === 'string' ? req.query.estadoPago : '';
        const vendedorIdRaw = typeof req.query.vendedorId === 'string' ? req.query.vendedorId.trim() : '';
        const ciudadRaw = typeof req.query.ciudad === 'string' ? req.query.ciudad.trim() : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const estadoPago = ESTADOS_PAGO.includes(estadoPagoRaw as EstadoPago)
            ? (estadoPagoRaw as EstadoPago)
            : undefined;
        const orden = ORDENES.includes(ordenRaw as OrdenNegocios)
            ? (ordenRaw as OrdenNegocios)
            : undefined;

        const resultado = await listarNegocios(panel, {
            busqueda: busquedaRaw || undefined,
            estadoPago,
            vendedorId: vendedorIdRaw || undefined,
            ciudad: ciudadRaw || undefined,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Negocios obtenidos', data: resultado });
    } catch (error) {
        console.error('Error en listarNegociosController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los negocios',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/vendedores
// =============================================================================

export async function listarVendedoresFiltroController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const vendedores = await listarVendedoresFiltro(panel);
        res.status(200).json({ success: true, message: 'Vendedores obtenidos', data: vendedores });
    } catch (error) {
        console.error('Error en listarVendedoresFiltroController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los vendedores',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/ciudades
// =============================================================================

export async function listarCiudadesController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const ciudades = await listarCiudades(panel);
        res.status(200).json({ success: true, message: 'Ciudades obtenidas', data: ciudades });
    } catch (error) {
        console.error('Error en listarCiudadesController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las ciudades',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/:id
// =============================================================================

export async function obtenerDetalleNegocioController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;

        const detalle = await obtenerDetalleNegocio(panel, id);
        if (!detalle) {
            res.status(404).json({ success: false, message: 'Negocio no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Negocio obtenido', data: detalle });
    } catch (error) {
        console.error('Error en obtenerDetalleNegocioController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el negocio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/:id/sucursales   (los 3 roles · lista para expandir)
// =============================================================================

export async function listarSucursalesNegocioController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;
        const data = await listarSucursalesNegocio(panel, id);
        res.status(200).json({ success: true, message: 'Sucursales obtenidas', data });
    } catch (error) {
        console.error('Error en listarSucursalesNegocioController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las sucursales',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/:id/sucursales/:sucursalId   (los 3 roles · modal)
// =============================================================================

export async function obtenerDetalleSucursalController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id, sucursalId } = req.params;
        const detalle = await obtenerDetalleSucursal(panel, id, sucursalId);
        if (!detalle) {
            res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
            return;
        }
        res.status(200).json({ success: true, message: 'Sucursal obtenida', data: detalle });
    } catch (error) {
        console.error('Error en obtenerDetalleSucursalController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la sucursal',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/:id/pagos   (los 3 roles · historial de pagos manuales)
// =============================================================================

export async function listarPagosNegocioController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const { id } = req.params;
        const data = await listarPagosNegocio(panel, id);
        res.status(200).json({ success: true, message: 'Pagos obtenidos', data });
    } catch (error) {
        console.error('Error en listarPagosNegocioController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los pagos',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/negocios/:id/suspender   (superadmin + gerente · motivo obligatorio)
// =============================================================================

export async function suspenderNegocioController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { id } = req.params;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        if (!motivo) {
            res.status(400).json({ success: false, message: 'El motivo es obligatorio para suspender.' });
            return;
        }
        const r = await suspenderNegocio(panel, id, motivo);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Negocio suspendido',
            data: r.negocio,
            advertenciaStripe: r.advertenciaStripe ?? null,
        });
    } catch (error) {
        console.error('Error en suspenderNegocioController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al suspender el negocio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/negocios/:id/reactivar   (superadmin + gerente · motivo opcional)
// =============================================================================

export async function reactivarNegocioController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { id } = req.params;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        const r = await reactivarNegocio(panel, id, motivo || null);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Negocio reactivado',
            data: r.negocio,
            advertenciaStripe: r.advertenciaStripe ?? null,
        });
    } catch (error) {
        console.error('Error en reactivarNegocioController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reactivar el negocio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/negocios/:id/reasignar-vendedor   (superadmin + gerente · motivo opcional)
// Body: { embajadorId: string | null, motivo? }  ·  embajadorId null/'' = quitar vendedor
// =============================================================================

export async function reasignarVendedorController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { id } = req.params;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        const bruto = req.body?.embajadorId;
        const embajadorId = bruto === null || bruto === undefined || bruto === '' ? null : bruto;
        if (embajadorId !== null && typeof embajadorId !== 'string') {
            res.status(400).json({ success: false, message: 'embajadorId inválido' });
            return;
        }
        const r = await reasignarVendedor(panel, id, embajadorId, motivo || null);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: embajadorId ? 'Vendedor reasignado' : 'Vendedor quitado',
            data: r.negocio,
        });
    } catch (error) {
        console.error('Error en reasignarVendedorController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reasignar el vendedor',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/negocios/:id/marcar-pagado   (SOLO superadmin)
// Body: { hasta: string (ISO), concepto: 'efectivo'|'transferencia'|'cortesia',
//         monto?: number, meses?: number }
// =============================================================================

export async function marcarPagadoController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { id } = req.params;

        // --- Fecha (hasta): obligatoria, futura y ≤ 2 años (tope de trial_end de Stripe) ---
        const hastaRaw = typeof req.body?.hasta === 'string' ? req.body.hasta.trim() : '';
        const fecha = new Date(hastaRaw);
        if (!hastaRaw || Number.isNaN(fecha.getTime())) {
            res.status(400).json({ success: false, message: 'La fecha de vencimiento es inválida.' });
            return;
        }
        if (fecha.getTime() <= Date.now()) {
            res.status(400).json({ success: false, message: 'La fecha de vencimiento debe ser futura.' });
            return;
        }
        const MAX_MS = 730 * 24 * 60 * 60 * 1000; // 2 años (límite de Stripe para trial_end)
        if (fecha.getTime() > Date.now() + MAX_MS) {
            res.status(400).json({ success: false, message: 'La fecha no puede exceder 2 años (límite de Stripe).' });
            return;
        }

        // --- Concepto: efectivo | transferencia | cortesía ---
        const concepto = req.body?.concepto;
        if (concepto !== 'efectivo' && concepto !== 'transferencia' && concepto !== 'cortesia') {
            res.status(400).json({ success: false, message: 'Concepto inválido (efectivo, transferencia o cortesía).' });
            return;
        }

        // --- Monto: solo efectivo/transferencia; opcional, pero si viene debe ser ≥ 0. Cortesía → null ---
        let monto: number | null = null;
        if (concepto !== 'cortesia' && req.body?.monto != null) {
            const m = Number(req.body.monto);
            if (Number.isNaN(m) || m < 0) {
                res.status(400).json({ success: false, message: 'El monto debe ser un número mayor o igual a 0.' });
                return;
            }
            monto = m;
        }

        // --- Meses: opcional (solo registro), entero ≥ 1 si viene ---
        let meses: number | null = null;
        if (req.body?.meses != null) {
            const mm = Number(req.body.meses);
            if (!Number.isInteger(mm) || mm < 1) {
                res.status(400).json({ success: false, message: 'Los meses deben ser un entero mayor o igual a 1.' });
                return;
            }
            meses = mm;
        }

        const r = await marcarPagado(panel, id, { hasta: fecha.toISOString(), concepto, monto, meses });
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Membresía marcada como pagada',
            data: r.negocio,
            advertenciaStripe: r.advertenciaStripe ?? null,
        });
    } catch (error) {
        console.error('Error en marcarPagadoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar como pagado',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/negocios/:id/cancelar   (SOLO superadmin · motivo obligatorio)
// =============================================================================

export async function cancelarNegocioController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;
        const { id } = req.params;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        if (!motivo) {
            res.status(400).json({ success: false, message: 'El motivo es obligatorio para cancelar.' });
            return;
        }
        const r = await cancelarNegocio(panel, id, motivo);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Negocio cancelado',
            data: r.negocio,
            advertenciaStripe: r.advertenciaStripe ?? null,
        });
    } catch (error) {
        console.error('Error en cancelarNegocioController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar el negocio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/negocios/catalogo-ciudades   (los 3 roles · selector del alta)
// =============================================================================

export async function catalogoCiudadesController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const ciudades = await listarCatalogoCiudades(panel);
        res.status(200).json({ success: true, message: 'Catálogo de ciudades', data: ciudades });
    } catch (error) {
        console.error('Error en catalogoCiudadesController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el catálogo de ciudades',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// PATCH /api/admin/negocios/:id/correo-dueno   (superadmin + gerente)
// Corrige el correo del dueño (rescate de alta manual). Devuelve si el código se reenvió.
// =============================================================================

const cambiarCorreoBodySchema = z.object({
    correoNuevo: z.string().email('Correo inválido').trim().toLowerCase(),
});

export async function cambiarCorreoDuenoController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = cambiarCorreoBodySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Correo inválido' });
            return;
        }
        const resultado = await cambiarCorreoDueno(req.usuarioPanel!, req.params.id, parsed.data.correoNuevo);
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: resultado.correoEnviado
                ? 'Correo actualizado y código enviado al nuevo correo'
                : 'Correo actualizado, pero el código no se pudo enviar',
            data: { correoEnviado: resultado.correoEnviado },
        });
    } catch (error) {
        console.error('Error en cambiarCorreoDuenoController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el correo del dueño' });
    }
}

// =============================================================================
// GET /api/admin/negocios/existe-correo?correo=   (los 3 roles · aviso temprano del alta)
// Responde SOLO un booleano (no expone datos del usuario). Misma normalización que el alta.
// =============================================================================

const existeCorreoQuerySchema = z.object({
    correo: z.string().email().trim().toLowerCase(),
});

export async function existeCorreoController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = existeCorreoQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Correo inválido' });
            return;
        }
        const existe = await existeCorreo(parsed.data.correo);
        res.status(200).json({ success: true, message: 'ok', data: { existe } });
    } catch (error) {
        console.error('Error en existeCorreoController:', error);
        res.status(500).json({ success: false, message: 'Error al verificar el correo' });
    }
}

// =============================================================================
// POST /api/admin/negocios/alta-manual   (superadmin + gerente + vendedor)
// Crea, sin Stripe, el negocio en efectivo/transferencia + su dueño (sin contraseña)
// + su sucursal con ciudad real + el primer pago. Atribución del vendedor: auto (vendedor)
// o del body (gerente/superadmin).
// =============================================================================

export async function altaManualController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel!;

        const validacion = altaManualNegocioSchema.safeParse(req.body);
        if (!validacion.success) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
            return;
        }

        const r = await altaManualNegocio(panel, validacion.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Negocio dado de alta',
            data: { negocioId: r.negocioId, usuarioId: r.usuarioId },
        });
    } catch (error) {
        console.error('Error en altaManualController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al dar de alta el negocio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
