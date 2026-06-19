/**
 * validations/admin/ciudades.schema.ts
 * ====================================
 * Schemas Zod de los bodies de las acciones del módulo Ciudades (Panel · Fase 2).
 * La validación de fondo (slug único, guard "una región" de vendedores, existencia
 * de la región) la hace el service; aquí solo se valida la forma del body.
 *
 * Ubicación: apps/api/src/validations/admin/ciudades.schema.ts
 */

import { z } from 'zod';

/** Datos de una ciudad para darla de alta (individual o en lote desde el mapa). */
export const ciudadAltaSchema = z.object({
    nombre: z.string().trim().min(2, 'El nombre de la ciudad es obligatorio.').max(100, 'El nombre es demasiado largo.'),
    estado: z.string().trim().min(2, 'El estado es obligatorio.').max(100, 'El estado es demasiado largo.'),
    lat: z.coerce.number({ message: 'La latitud es obligatoria.' }).min(-90, 'Latitud fuera de rango.').max(90, 'Latitud fuera de rango.'),
    lng: z.coerce.number({ message: 'La longitud es obligatoria.' }).min(-180, 'Longitud fuera de rango.').max(180, 'Longitud fuera de rango.'),
    pais: z.string().trim().max(100).optional(),
    regionId: z.string().uuid('Región inválida.').nullable().optional(),
    importancia: z.coerce.number().int().min(0).max(100).optional(),
    activa: z.boolean().optional(),
    alias: z.array(z.string().trim().min(1)).max(20).optional(),
});

export const crearCiudadSchema = ciudadAltaSchema;

/** Alta de varias ciudades de un jalón (selección múltiple en el mapa); región común opcional. */
export const crearCiudadesMultipleSchema = z.object({
    ciudades: z.array(ciudadAltaSchema).min(1, 'Selecciona al menos una ciudad.').max(200, 'Demasiadas ciudades a la vez (máximo 200).'),
    regionId: z.string().uuid('Región inválida.').nullable().optional(),
});

/** Editar campos de una ciudad (todos opcionales; al menos uno se espera). */
export const editarCiudadSchema = z.object({
    nombre: z.string().trim().min(2).max(100).optional(),
    estado: z.string().trim().min(2).max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    importancia: z.coerce.number().int().min(0).max(100).optional(),
    alias: z.array(z.string().trim().min(1)).max(20).optional(),
});

export const cambiarActivaSchema = z.object({ activa: z.boolean() });

/** Asignar/quitar región de UNA ciudad (null = quitar). */
export const asignarRegionSchema = z.object({
    regionId: z.string().uuid('Región inválida.').nullable(),
});

/** Asignar región a VARIAS ciudades (agrupar desde el mapa). */
export const asignarRegionMultipleSchema = z.object({
    ciudadIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos una ciudad.').max(500, 'Demasiadas ciudades a la vez.'),
    regionId: z.string().uuid('Región inválida.').nullable(),
});

export const crearRegionSchema = z.object({
    nombre: z.string().trim().min(2, 'El nombre de la región es obligatorio.').max(100, 'El nombre es demasiado largo.'),
});

/** Editar una región (renombrar y/o activar/desactivar; sin eliminar). */
export const editarRegionSchema = z.object({
    nombre: z.string().trim().min(2).max(100).optional(),
    activa: z.boolean().optional(),
});

export type CiudadAltaInput = z.infer<typeof ciudadAltaSchema>;
