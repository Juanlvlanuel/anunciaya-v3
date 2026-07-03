/**
 * admin/categorias-marketplace.controller.ts
 * ===========================================
 * Controllers del CRUD de categorías de MarketPlace en el Panel Admin (solo
 * superadmin, bajo el gate global). Orquestan validación → service → HTTP.
 *
 * Ubicación: apps/api/src/controllers/admin/categorias-marketplace.controller.ts
 */

import type { Request, Response } from 'express';
import { listarCatalogo } from '../../services/admin/categorias-marketplace.service.js';
import {
    crearCategoria,
    editarCategoria,
    cambiarActivaCategoria,
    reordenarCategorias,
} from '../../services/admin/categorias-marketplace-acciones.service.js';
import {
    crearCategoriaSchema,
    editarCategoriaSchema,
    cambiarActivaSchema,
    reordenarSchema,
} from '../../validations/admin/categorias-marketplace.schema.js';

function primerError(issues: { message: string }[]): string {
    return issues[0]?.message ?? 'Datos inválidos';
}

function parseId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─ LECTURA ─
export async function listarCategoriasMPController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        // Filtro opcional por ciudad (analítica). Si no es un uuid válido, se
        // ignora → conteos de todas las ciudades.
        const raw = req.query.ciudadId;
        const ciudadId = typeof raw === 'string' && RE_UUID.test(raw) ? raw : undefined;
        const data = await listarCatalogo(ciudadId);
        res.status(200).json({ success: true, message: 'Catálogo obtenido', data });
    } catch (error) {
        console.error('Error en listarCategoriasMPController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el catálogo' });
    }
}

// ─ CREAR ─
export async function crearCategoriaMPController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = crearCategoriaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await crearCategoria(req.usuarioPanel!, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(201).json({ success: true, message: 'Categoría creada', data: r.data });
    } catch (error) {
        console.error('Error en crearCategoriaMPController:', error);
        res.status(500).json({ success: false, message: 'Error al crear la categoría' });
    }
}

// ─ EDITAR ─
export async function editarCategoriaMPController(req: Request, res: Response): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) {
            res.status(400).json({ success: false, message: 'Identificador inválido.' });
            return;
        }
        const parsed = editarCategoriaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await editarCategoria(req.usuarioPanel!, id, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Categoría actualizada', data: r.data });
    } catch (error) {
        console.error('Error en editarCategoriaMPController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la categoría' });
    }
}

// ─ CAMBIAR ACTIVA ─
export async function cambiarActivaCategoriaMPController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const id = parseId(req.params.id);
        if (id === null) {
            res.status(400).json({ success: false, message: 'Identificador inválido.' });
            return;
        }
        const parsed = cambiarActivaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await cambiarActivaCategoria(req.usuarioPanel!, id, parsed.data.activa);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: parsed.data.activa ? 'Categoría activada' : 'Categoría desactivada',
            data: r.data,
        });
    } catch (error) {
        console.error('Error en cambiarActivaCategoriaMPController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el estado de la categoría' });
    }
}

// ─ REORDENAR ─
export async function reordenarCategoriasMPController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const parsed = reordenarSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: primerError(parsed.error.issues) });
            return;
        }
        const r = await reordenarCategorias(req.usuarioPanel!, parsed.data.ids);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Orden actualizado', data: r.data });
    } catch (error) {
        console.error('Error en reordenarCategoriasMPController:', error);
        res.status(500).json({ success: false, message: 'Error al reordenar' });
    }
}
