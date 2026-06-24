/**
 * admin/territorios.controller.ts
 * ===============================
 * Lecturas del módulo Territorios del Panel Admin (Fase 1 · VER). El controller solo
 * llama al service; el alcance por rol lo resuelve el service según `req.usuarioPanel`.
 *
 * Ubicación: apps/api/src/controllers/admin/territorios.controller.ts
 */

import type { Request, Response } from 'express';
import { listarZonas, listarVendedoresAsignables, listarCiudadesDelAlcance, listarMarcasEquipo } from '../../services/admin/territorios.service.js';
import { crearZona, editarZona, asignarZona, borrarZona } from '../../services/admin/territorios-acciones.service.js';
import { listarMisMarcas, crearMarca, editarMarca, borrarMarca } from '../../services/admin/territorios-marcas.service.js';
import { crearZonaSchema, editarZonaSchema, asignarZonaSchema, crearMarcaSchema, editarMarcaSchema } from '../../validations/admin/territorios.schema.js';

/** Primer mensaje de error de un parse fallido de Zod. */
function primerError(issues: { message: string }[]): string {
    return issues[0]?.message ?? 'Datos inválidos';
}

/** GET /api/admin/territorios/zonas — zonas visibles para el rol (filtro ?ciudadId opcional). */
export async function listarZonasController(req: Request, res: Response): Promise<void> {
    try {
        const { ciudadId } = req.query;
        const data = await listarZonas(req.usuarioPanel!, {
            ciudadId: typeof ciudadId === 'string' ? ciudadId : undefined,
        });
        res.status(200).json({ success: true, message: 'Zonas obtenidas', data });
    } catch (error) {
        console.error('Error en listarZonasController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las zonas del territorio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/** GET /api/admin/territorios/ciudades — ciudades sobre las que el rol puede dibujar (super + gerente). */
export async function listarCiudadesController(req: Request, res: Response): Promise<void> {
    try {
        const data = await listarCiudadesDelAlcance(req.usuarioPanel!);
        res.status(200).json({ success: true, message: 'Ciudades obtenidas', data });
    } catch (error) {
        console.error('Error en listarCiudadesController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las ciudades' });
    }
}

/** GET /api/admin/territorios/vendedores — vendedores asignables a una zona (super + gerente). */
export async function listarVendedoresController(req: Request, res: Response): Promise<void> {
    try {
        const data = await listarVendedoresAsignables(req.usuarioPanel!);
        res.status(200).json({ success: true, message: 'Vendedores obtenidos', data });
    } catch (error) {
        console.error('Error en listarVendedoresController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los vendedores' });
    }
}

/** GET /api/admin/territorios/marcas-equipo — marcas de los vendedores, lectura (super + gerente; ?ciudadId opcional). */
export async function listarMarcasEquipoController(req: Request, res: Response): Promise<void> {
    try {
        const { ciudadId } = req.query;
        const data = await listarMarcasEquipo(req.usuarioPanel!, typeof ciudadId === 'string' ? ciudadId : undefined);
        res.status(200).json({ success: true, message: 'Marcas del equipo obtenidas', data });
    } catch (error) {
        console.error('Error en listarMarcasEquipoController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las marcas del equipo' });
    }
}

// =============================================================================
// ACCIONES (Fase 2) — super + gerente (alcance por región en el service)
// =============================================================================

/** POST /api/admin/territorios/zonas — crear una zona. */
export async function crearZonaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearZonaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await crearZona(req.usuarioPanel!, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(201).json({ success: true, message: 'Zona creada', data: r.data });
    } catch (error) {
        console.error('Error en crearZonaController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la zona' });
    }
}

/** PATCH /api/admin/territorios/zonas/:id — editar una zona (nombre/polígono/color). */
export async function editarZonaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = editarZonaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await editarZona(req.usuarioPanel!, req.params.id, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Zona actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarZonaController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la zona' });
    }
}

/** PATCH /api/admin/territorios/zonas/:id/vendedor — asignar/quitar el vendedor (null = quitar). */
export async function asignarZonaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = asignarZonaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await asignarZona(req.usuarioPanel!, req.params.id, parsed.data.embajadorId);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: parsed.data.embajadorId ? 'Zona asignada' : 'Asignación retirada', data: r.data });
    } catch (error) {
        console.error('Error en asignarZonaController:', error);
        res.status(500).json({ success: false, message: 'Error al asignar la zona' });
    }
}

/** DELETE /api/admin/territorios/zonas/:id — borrar una zona. */
export async function borrarZonaController(req: Request, res: Response): Promise<void> {
    try {
        const r = await borrarZona(req.usuarioPanel!, req.params.id);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Zona eliminada', data: r.data });
    } catch (error) {
        console.error('Error en borrarZonaController:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la zona' });
    }
}

// =============================================================================
// MARCAS DEL VENDEDOR (G.2) — solo el vendedor gestiona las suyas
// =============================================================================

/** GET /api/admin/territorios/marcas — las marcas del vendedor. */
export async function listarMarcasController(req: Request, res: Response): Promise<void> {
    try {
        const data = await listarMisMarcas(req.usuarioPanel!);
        res.status(200).json({ success: true, message: 'Marcas obtenidas', data });
    } catch (error) {
        console.error('Error en listarMarcasController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las marcas' });
    }
}

/** POST /api/admin/territorios/marcas — crear una marca. */
export async function crearMarcaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearMarcaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await crearMarca(req.usuarioPanel!, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(201).json({ success: true, message: 'Marca creada', data: r.data });
    } catch (error) {
        console.error('Error en crearMarcaController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la marca' });
    }
}

/** PATCH /api/admin/territorios/marcas/:id — editar el estado/nota de una marca. */
export async function editarMarcaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = editarMarcaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await editarMarca(req.usuarioPanel!, req.params.id, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Marca actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarMarcaController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la marca' });
    }
}

/** DELETE /api/admin/territorios/marcas/:id — borrar una marca. */
export async function borrarMarcaController(req: Request, res: Response): Promise<void> {
    try {
        const r = await borrarMarca(req.usuarioPanel!, req.params.id);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Marca eliminada', data: r.data });
    } catch (error) {
        console.error('Error en borrarMarcaController:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la marca' });
    }
}
