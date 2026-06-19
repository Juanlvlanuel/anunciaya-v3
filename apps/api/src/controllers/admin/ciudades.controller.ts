/**
 * admin/ciudades.controller.ts
 * ============================
 * Lecturas del módulo Ciudades del Panel Admin. Solo superadmin (lo protege el
 * gate global de routes/admin/index.ts). El controller solo llama services.
 *
 * Ubicación: apps/api/src/controllers/admin/ciudades.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarCiudadesCatalogo,
    listarRegionesConConteo,
    type FiltroActiva,
} from '../../services/admin/ciudades.service.js';
import {
    crearCiudad,
    crearCiudadesMultiple,
    editarCiudad,
    cambiarActivaCiudad,
    asignarRegionCiudad,
    asignarRegionMultiple,
    crearRegion,
    editarRegion,
} from '../../services/admin/ciudades-acciones.service.js';
import {
    crearCiudadSchema,
    crearCiudadesMultipleSchema,
    editarCiudadSchema,
    cambiarActivaSchema,
    asignarRegionSchema,
    asignarRegionMultipleSchema,
    crearRegionSchema,
    editarRegionSchema,
} from '../../validations/admin/ciudades.schema.js';

const ACTIVAS_VALIDAS: FiltroActiva[] = ['todas', 'activas', 'inactivas'];

/** Primer mensaje de error de un parse fallido de Zod. */
function primerError(issues: { message: string }[]): string {
    return issues[0]?.message ?? 'Datos inválidos';
}

/** GET /api/admin/ciudades — catálogo de ciudades con filtros opcionales. */
export async function listarCiudadesCatalogoController(req: Request, res: Response): Promise<void> {
    try {
        const { busqueda, regionId, estado, activa } = req.query;
        const data = await listarCiudadesCatalogo({
            busqueda: typeof busqueda === 'string' ? busqueda : undefined,
            regionId: typeof regionId === 'string' ? regionId : undefined,
            estado: typeof estado === 'string' ? estado : undefined,
            activa:
                typeof activa === 'string' && ACTIVAS_VALIDAS.includes(activa as FiltroActiva)
                    ? (activa as FiltroActiva)
                    : 'todas',
        });
        res.status(200).json({ success: true, message: 'Ciudades obtenidas', data });
    } catch (error) {
        console.error('Error en listarCiudadesCatalogoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las ciudades',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/** GET /api/admin/ciudades/regiones — regiones con su # de ciudades. */
export async function listarRegionesCatalogoController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await listarRegionesConConteo();
        res.status(200).json({ success: true, message: 'Regiones obtenidas', data });
    } catch (error) {
        console.error('Error en listarRegionesCatalogoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las regiones',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// ACCIONES (Fase 2) — solo superadmin (gate global)
// =============================================================================

/** POST /api/admin/ciudades — alta de una ciudad. */
export async function crearCiudadController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearCiudadSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await crearCiudad(req.usuarioPanel!, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(201).json({ success: true, message: 'Ciudad creada', data: r.data });
    } catch (error) {
        console.error('Error en crearCiudadController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la ciudad' });
    }
}

/** POST /api/admin/ciudades/multiple — alta de varias ciudades (mapa). */
export async function crearCiudadesMultipleController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearCiudadesMultipleSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await crearCiudadesMultiple(req.usuarioPanel!, parsed.data.ciudades, parsed.data.regionId ?? null);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        const { creadas, omitidas } = r.data;
        const message = omitidas.length
            ? `${creadas} ciudad(es) agregada(s); ${omitidas.length} ya existía(n)`
            : `${creadas} ciudad(es) agregada(s)`;
        res.status(201).json({ success: true, message, data: r.data });
    } catch (error) {
        console.error('Error en crearCiudadesMultipleController:', error);
        res.status(500).json({ success: false, message: 'Error al agregar las ciudades' });
    }
}

/** PATCH /api/admin/ciudades/:id — editar una ciudad. */
export async function editarCiudadController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = editarCiudadSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await editarCiudad(req.usuarioPanel!, req.params.id, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Ciudad actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarCiudadController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la ciudad' });
    }
}

/** PATCH /api/admin/ciudades/:id/activa — activar/desactivar una ciudad. */
export async function cambiarActivaCiudadController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = cambiarActivaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await cambiarActivaCiudad(req.usuarioPanel!, req.params.id, parsed.data.activa);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: parsed.data.activa ? 'Ciudad activada' : 'Ciudad desactivada', data: r.data });
    } catch (error) {
        console.error('Error en cambiarActivaCiudadController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el estado de la ciudad' });
    }
}

/** PATCH /api/admin/ciudades/:id/region — asignar/quitar región de una ciudad. */
export async function asignarRegionCiudadController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = asignarRegionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await asignarRegionCiudad(req.usuarioPanel!, req.params.id, parsed.data.regionId);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: parsed.data.regionId ? 'Región asignada' : 'Región retirada', data: r.data });
    } catch (error) {
        console.error('Error en asignarRegionCiudadController:', error);
        res.status(500).json({ success: false, message: 'Error al asignar la región' });
    }
}

/** POST /api/admin/ciudades/asignar-region — agrupar varias ciudades en una región. */
export async function asignarRegionMultipleController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = asignarRegionMultipleSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await asignarRegionMultiple(req.usuarioPanel!, parsed.data.ciudadIds, parsed.data.regionId);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        const { asignadas, bloqueadas } = r.data;
        const message = bloqueadas.length
            ? `${asignadas} ciudad(es) agrupada(s); ${bloqueadas.length} bloqueada(s) por cobertura de vendedores`
            : `${asignadas} ciudad(es) agrupada(s)`;
        res.status(200).json({ success: true, message, data: r.data });
    } catch (error) {
        console.error('Error en asignarRegionMultipleController:', error);
        res.status(500).json({ success: false, message: 'Error al agrupar las ciudades' });
    }
}

/** POST /api/admin/ciudades/regiones — crear una región. */
export async function crearRegionController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearRegionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await crearRegion(req.usuarioPanel!, parsed.data.nombre);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(201).json({ success: true, message: 'Región creada', data: r.data });
    } catch (error) {
        console.error('Error en crearRegionController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la región' });
    }
}

/** PATCH /api/admin/ciudades/regiones/:id — editar una región (renombrar/activar/desactivar). */
export async function editarRegionController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = editarRegionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await editarRegion(req.usuarioPanel!, req.params.id, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Región actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarRegionController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la región' });
    }
}
