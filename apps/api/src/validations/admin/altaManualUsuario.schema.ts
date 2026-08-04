/**
 * altaManualUsuario.schema.ts
 * ===========================
 * Validación (Zod v4) del alta manual de un usuario (Modo Personal, sin negocio) desde el Panel.
 * Para: POST /api/admin/usuarios/alta-manual
 *
 * Calcado del bloque "Dueño" de altaManualNegocio.schema.ts, sin los campos de negocio/cobro.
 * El backend recibe la CIUDAD como `ciudadId` (uuid del catálogo) y la valida contra la tabla
 * `ciudades` (existencia + activa + región del solicitante). El correo se captura dos veces y
 * se revalida aquí con un refine cross-campo.
 *
 * Ubicación: apps/api/src/validations/admin/altaManualUsuario.schema.ts
 */

import { z } from 'zod';

const correo = z
    .string()
    .min(1, 'El correo es requerido')
    .email('El correo debe tener un formato válido')
    .max(255, 'El correo no puede exceder 255 caracteres')
    .trim()
    .toLowerCase();

export const altaManualUsuarioSchema = z
    .object({
        nombre: z
            .string()
            .trim()
            .min(2, 'El nombre debe tener al menos 2 caracteres')
            .max(100, 'El nombre no puede exceder 100 caracteres'),
        apellidos: z
            .string()
            .trim()
            .min(2, 'Los apellidos deben tener al menos 2 caracteres')
            .max(100, 'Los apellidos no pueden exceder 100 caracteres'),
        correo,
        confirmarCorreo: z
            .string()
            .min(1, 'Confirma el correo')
            .email('El correo de confirmación debe tener un formato válido')
            .max(255, 'El correo no puede exceder 255 caracteres')
            .trim()
            .toLowerCase(),
        telefono: z
            .string()
            .trim()
            .regex(/^\+52\d{10}$/, 'El teléfono debe tener formato +52XXXXXXXXXX (10 dígitos)')
            .optional()
            .nullable(),

        // Ubicación: id de ciudad del catálogo (el backend valida existencia/región).
        ciudadId: z.string().uuid('La ciudad seleccionada es inválida'),

        // Contraseña OPCIONAL: si el admin la define aquí, la cuenta nace con acceso (sin correo).
        // Si se omite → modelo C (sin contraseña; se le manda el código para crearla).
        contrasena: z
            .string()
            .min(8, 'La contraseña debe tener al menos 8 caracteres')
            .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
            .regex(/[0-9]/, 'La contraseña debe tener al menos un número')
            .optional(),
    })
    .refine((d) => d.correo === d.confirmarCorreo, {
        message: 'Los correos no coinciden',
        path: ['confirmarCorreo'],
    });

export type AltaManualUsuarioInput = z.infer<typeof altaManualUsuarioSchema>;

/** Convierte los errores de Zod v4 en un array de strings legibles (issues, no errors). */
export function formatearErroresZod(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${campo}${issue.message}`;
    });
}
