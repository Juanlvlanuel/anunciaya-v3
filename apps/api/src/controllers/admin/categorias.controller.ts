/**
 * admin/categorias.controller.ts
 * ==============================
 * Módulo Categorías del Panel Admin (catálogo de negocios + disponibilidad por
 * ciudad). Solo superadmin (gate global de routes/admin/index.ts). El controller
 * solo valida la entrada y llama services.
 *
 * Ubicación: apps/api/src/controllers/admin/categorias.controller.ts
 */

import type { Request, Response } from 'express';
import { listarCatalogoAdmin } from '../../services/admin/categorias.service.js';
import {
    crearCategoria,
    editarCategoria,
    cambiarActivaCategoria,
    reordenarCategorias,
    asignarCiudadesCategoria,
    crearSubcategoria,
    editarSubcategoria,
    cambiarActivaSubcategoria,
    reordenarSubcategorias,
    asignarCiudadesSubcategoria,
} from '../../services/admin/categorias-acciones.service.js';
import {
    crearCategoriaSchema,
    editarCategoriaSchema,
    cambiarActivaSchema,
    asignarCiudadesSchema,
    reordenarSchema,
    crearSubcategoriaSchema,
    editarSubcategoriaSchema,
    reordenarSubcategoriasSchema,
} from '../../validations/admin/categorias.schema.js';

/** Primer mensaje de error de un parse fallido de Zod. */
function primerError(issues: { message: string }[]): string {
    return issues[0]?.message ?? 'Datos inválidos';
}

/** Parsea el :id de la ruta como entero positivo (categorías/subcategorías son serial). */
function parseId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// LECTURA
// =============================================================================

/** GET /api/admin/categorias — catálogo completo (categorías → subcategorías + ciudades). */
export async function listarCatalogoController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro opcional por ciudad (analítica de negocios por plaza). UUID inválido → todas.
        const raw = req.query.ciudadId;
        const ciudadId = typeof raw === 'string' && RE_UUID.test(raw) ? raw : undefined;
        const data = await listarCatalogoAdmin(ciudadId);
        res.status(200).json({ success: true, message: 'Catálogo obtenido', data });
    } catch (error) {
        console.error('Error en listarCatalogoController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el catálogo' });
    }
}

// =============================================================================
// ACCIONES · CATEGORÍA
// =============================================================================

export async function crearCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearCategoriaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await crearCategoria(req.usuarioPanel!, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(201).json({ success: true, message: 'Categoría creada', data: r.data });
    } catch (error) {
        console.error('Error en crearCategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la categoría' });
    }
}

export async function editarCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) { res.status(400).json({ success: false, message: 'Identificador inválido.' }); return; }
        const parsed = editarCategoriaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await editarCategoria(req.usuarioPanel!, id, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Categoría actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarCategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la categoría' });
    }
}

export async function cambiarActivaCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) { res.status(400).json({ success: false, message: 'Identificador inválido.' }); return; }
        const parsed = cambiarActivaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await cambiarActivaCategoria(req.usuarioPanel!, id, parsed.data.activa);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: parsed.data.activa ? 'Categoría activada' : 'Categoría desactivada', data: r.data });
    } catch (error) {
        console.error('Error en cambiarActivaCategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el estado de la categoría' });
    }
}

export async function asignarCiudadesCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) { res.status(400).json({ success: false, message: 'Identificador inválido.' }); return; }
        const parsed = asignarCiudadesSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await asignarCiudadesCategoria(req.usuarioPanel!, id, parsed.data.ciudadIds);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: r.data.total ? 'Disponibilidad actualizada' : 'Categoría disponible en todas las ciudades', data: r.data });
    } catch (error) {
        console.error('Error en asignarCiudadesCategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la disponibilidad' });
    }
}

export async function reordenarCategoriasController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = reordenarSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await reordenarCategorias(req.usuarioPanel!, parsed.data.ids);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Orden actualizado', data: r.data });
    } catch (error) {
        console.error('Error en reordenarCategoriasController:', error);
        res.status(500).json({ success: false, message: 'Error al reordenar' });
    }
}

// =============================================================================
// ACCIONES · SUBCATEGORÍA
// =============================================================================

export async function crearSubcategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearSubcategoriaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await crearSubcategoria(req.usuarioPanel!, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(201).json({ success: true, message: 'Subcategoría creada', data: r.data });
    } catch (error) {
        console.error('Error en crearSubcategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la subcategoría' });
    }
}

export async function editarSubcategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) { res.status(400).json({ success: false, message: 'Identificador inválido.' }); return; }
        const parsed = editarSubcategoriaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await editarSubcategoria(req.usuarioPanel!, id, parsed.data);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Subcategoría actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarSubcategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la subcategoría' });
    }
}

export async function cambiarActivaSubcategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) { res.status(400).json({ success: false, message: 'Identificador inválido.' }); return; }
        const parsed = cambiarActivaSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await cambiarActivaSubcategoria(req.usuarioPanel!, id, parsed.data.activa);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: parsed.data.activa ? 'Subcategoría activada' : 'Subcategoría desactivada', data: r.data });
    } catch (error) {
        console.error('Error en cambiarActivaSubcategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el estado de la subcategoría' });
    }
}

export async function asignarCiudadesSubcategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) { res.status(400).json({ success: false, message: 'Identificador inválido.' }); return; }
        const parsed = asignarCiudadesSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await asignarCiudadesSubcategoria(req.usuarioPanel!, id, parsed.data.ciudadIds);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: r.data.total ? 'Disponibilidad actualizada' : 'Subcategoría disponible en todas las ciudades de su categoría', data: r.data });
    } catch (error) {
        console.error('Error en asignarCiudadesSubcategoriaController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la disponibilidad' });
    }
}

export async function reordenarSubcategoriasController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = reordenarSubcategoriasSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ success: false, message: primerError(parsed.error.issues) }); return; }
        const r = await reordenarSubcategorias(req.usuarioPanel!, parsed.data.categoriaId, parsed.data.ids);
        if (!r.ok) { res.status(r.status).json({ success: false, message: r.mensaje }); return; }
        res.status(200).json({ success: true, message: 'Orden actualizado', data: r.data });
    } catch (error) {
        console.error('Error en reordenarSubcategoriasController:', error);
        res.status(500).json({ success: false, message: 'Error al reordenar' });
    }
}
