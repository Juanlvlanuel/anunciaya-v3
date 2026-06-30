/**
 * validations/admin/categorias.schema.ts
 * ======================================
 * Schemas Zod de los bodies del módulo Categorías (Panel · solo superadmin).
 * Valida la FORMA del body; las reglas de fondo (nombre único, subconjunto de
 * ciudades respecto a la categoría, existencia) las hace el service.
 *
 * Las categorías/subcategorías usan id SERIAL (integer), por eso los ids son números.
 *
 * Ubicación: apps/api/src/validations/admin/categorias.schema.ts
 */

import { z } from 'zod';

/** Lista de ciudades donde aplica (vacío = global, en todas las ciudades). */
const ciudadIds = z.array(z.string().uuid('Ciudad inválida.')).max(500, 'Demasiadas ciudades.');

// ── Categoría ────────────────────────────────────────────────────────────────
export const crearCategoriaSchema = z.object({
    nombre: z.string().trim().min(2, 'El nombre de la categoría es obligatorio.').max(50, 'El nombre es demasiado largo.'),
    ciudadIds: ciudadIds.optional(),
});

export const editarCategoriaSchema = z.object({
    nombre: z.string().trim().min(2).max(50).optional(),
});

export const cambiarActivaSchema = z.object({ activa: z.boolean() });

/** Reemplaza el set de ciudades (set semantics). Array vacío = global. */
export const asignarCiudadesSchema = z.object({ ciudadIds });

/** Reordenar: el array es el nuevo orden (índice = orden). */
export const reordenarSchema = z.object({
    ids: z.array(z.number().int().positive()).min(1, 'Lista de orden vacía.'),
});

// ── Subcategoría ─────────────────────────────────────────────────────────────
export const crearSubcategoriaSchema = z.object({
    categoriaId: z.number().int().positive('Categoría inválida.'),
    nombre: z.string().trim().min(2, 'El nombre de la subcategoría es obligatorio.').max(50, 'El nombre es demasiado largo.'),
    ciudadIds: ciudadIds.optional(),
});

export const editarSubcategoriaSchema = z.object({
    nombre: z.string().trim().min(2).max(50).optional(),
});

/** Reordenar subcategorías DENTRO de una categoría. */
export const reordenarSubcategoriasSchema = z.object({
    categoriaId: z.number().int().positive('Categoría inválida.'),
    ids: z.array(z.number().int().positive()).min(1, 'Lista de orden vacía.'),
});
