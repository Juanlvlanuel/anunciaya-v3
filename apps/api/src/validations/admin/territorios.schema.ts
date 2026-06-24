/**
 * validations/admin/territorios.schema.ts
 * =======================================
 * Schemas Zod de los bodies de las acciones del módulo Territorios (Panel · Fase 2).
 * La validación de fondo (alcance por rol, ciudad en la región del gerente, no-traslape)
 * la hace el service; aquí solo se valida la FORMA del body.
 *
 * Ubicación: apps/api/src/validations/admin/territorios.schema.ts
 */

import { z } from 'zod';

/** Un punto [lng, lat] (admite alturas extra que se ignoran). */
const puntoSchema = z.array(z.number()).min(2);

/** Un anillo cerrado de un polígono (≥ 4 puntos: el primero = el último). */
const anilloSchema = z.array(puntoSchema).min(4, 'El polígono necesita al menos 4 puntos.');

/** GeoJSON Polygon (uno o más anillos; el primero es el contorno). */
export const poligonoSchema = z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(anilloSchema).min(1, 'El polígono es obligatorio.'),
});

/** Color hex (#RGB / #RRGGBB / #RRGGBBAA). */
const colorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Color inválido.');

/** Crear una zona: ciudad + nombre + polígono (+ color y vendedor opcionales). */
export const crearZonaSchema = z.object({
    ciudadId: z.string().uuid('Ciudad inválida.'),
    nombre: z.string().trim().min(2, 'El nombre de la zona es obligatorio.').max(80, 'El nombre es demasiado largo.'),
    poligono: poligonoSchema,
    color: colorSchema.optional(),
    embajadorId: z.string().uuid('Vendedor inválido.').nullable().optional(),
});

/** Editar una zona (todos opcionales; al menos uno se espera). */
export const editarZonaSchema = z.object({
    nombre: z.string().trim().min(2).max(80).optional(),
    poligono: poligonoSchema.optional(),
    color: colorSchema.nullable().optional(),
});

/** Asignar/quitar el vendedor de una zona (null = quitar). */
export const asignarZonaSchema = z.object({
    embajadorId: z.string().uuid('Vendedor inválido.').nullable(),
});

export type CrearZonaInput = z.infer<typeof crearZonaSchema>;
export type EditarZonaInput = z.infer<typeof editarZonaSchema>;
