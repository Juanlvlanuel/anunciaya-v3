/**
 * validations/admin/configuracion.schema.ts
 * ==========================================
 * Schema Zod del body para editar un valor de configuración (Panel · módulo 9, Fase 2).
 *
 * El valor viaja SIEMPRE como string (coincide con `configuracion_sistema.valor` que es text):
 *   - número → el dígito como texto ("21");
 *   - escalera → el JSON serializado de los tramos.
 * La validación de fondo (rango del número, forma de los tramos) la hace el service contra el catálogo.
 *
 * Ubicación: apps/api/src/validations/admin/configuracion.schema.ts
 */

import { z } from 'zod';

export const actualizarConfigSchema = z.object({
    valor: z.string().min(1, 'El valor es obligatorio.').max(5000, 'El valor es demasiado largo.'),
});

export type ActualizarConfigInput = z.infer<typeof actualizarConfigSchema>;

/**
 * Body del botón "Cambiar precio de la membresía" (Sprint Stripe · 1c): el monto mensual en MXN
 * (entero). El service crea los Prices nuevos en Stripe (mensual + anual = 10×) y reapunta la config.
 */
export const cambiarPrecioMembresiaSchema = z.object({
    precioMensual: z.coerce
        .number({ message: 'El precio es obligatorio.' })
        .int('El precio debe ser un entero.')
        .min(100, 'El precio mínimo es $100 MXN.')
        .max(100000, 'El precio máximo es $100,000 MXN.'),
});

export type CambiarPrecioMembresiaInput = z.infer<typeof cambiarPrecioMembresiaSchema>;

/** Body del toggle "Ofrecer plan anual" (Sprint Stripe · 1c): on/off. */
export const planAnualSchema = z.object({
    activo: z.boolean(),
});

export type PlanAnualInput = z.infer<typeof planAnualSchema>;
