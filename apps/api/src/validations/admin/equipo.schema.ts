/**
 * admin/equipo.schema.ts
 * ======================
 * Validación Zod de las acciones del módulo "Equipo y accesos" (Fase 2).
 *
 * Ubicación: apps/api/src/validations/admin/equipo.schema.ts
 */

import { z } from 'zod';

/** Alta de vendedor (crea o promueve la cuenta + embajador + ciudades). */
export const altaVendedorSchema = z.object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
    apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(100),
    correo: z.string().email('Correo inválido').trim().toLowerCase(),
    telefono: z
        .string()
        .trim()
        .max(20)
        .optional()
        .transform((v) => (v ? v : undefined)),
    // Código de referido: letras y números, 3–20. CASE-SENSITIVE (coherente con la resolución del ?ref=).
    codigoReferido: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9]{3,20}$/, 'El código solo admite letras y números (3–20 caracteres).'),
    // Ciudades que cubre: 1+ y, por el trigger, todas de una misma región (se valida en el service).
    ciudadIds: z.array(z.string().uuid('Ciudad inválida')).min(1, 'Selecciona al menos una ciudad.'),
});
export type AltaVendedorInput = z.infer<typeof altaVendedorSchema>;

/** Alta de gerente (crea o promueve la cuenta + rol_equipo='gerente' + region_id). Solo superadmin. */
export const altaGerenteSchema = z.object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
    apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(100),
    correo: z.string().email('Correo inválido').trim().toLowerCase(),
    telefono: z
        .string()
        .trim()
        .max(20)
        .optional()
        .transform((v) => (v ? v : undefined)),
    regionId: z.string().uuid('Región inválida'),
});
export type AltaGerenteInput = z.infer<typeof altaGerenteSchema>;

/** Editar datos de la cuenta de un miembro (todos los campos opcionales; se actualiza lo que venga). */
export const editarDatosSchema = z.object({
    nombre: z.string().trim().min(1).max(100).optional(),
    apellidos: z.string().trim().min(1).max(100).optional(),
    telefono: z.string().trim().max(20).optional(),
    correo: z.string().email('Correo inválido').trim().toLowerCase().optional(),
});
export type EditarDatosInput = z.infer<typeof editarDatosSchema>;

/** Reasignar la región de un gerente. Solo superadmin. */
export const reasignarRegionSchema = z.object({
    regionId: z.string().uuid('Región inválida'),
});
export type ReasignarRegionInput = z.infer<typeof reasignarRegionSchema>;
