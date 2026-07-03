/**
 * admin/categorias-marketplace.schema.ts
 * =======================================
 * Validaciones Zod del CRUD de categorías de MarketPlace en el Panel Admin
 * (solo superadmin). Modelo simple: 1 nivel, sin subcategorías ni ciudades.
 *
 * Ubicación: apps/api/src/validations/admin/categorias-marketplace.schema.ts
 */

import { z } from 'zod';

export const crearCategoriaSchema = z.object({
    nombre: z
        .string()
        .trim()
        .min(2, 'El nombre de la categoría es obligatorio.')
        .max(50, 'El nombre es demasiado largo.'),
});

export const editarCategoriaSchema = z.object({
    nombre: z.string().trim().min(2).max(50).optional(),
});

export const cambiarActivaSchema = z.object({ activa: z.boolean() });

export const reordenarSchema = z.object({
    ids: z.array(z.number().int().positive()).min(1, 'Lista de orden vacía.'),
});
