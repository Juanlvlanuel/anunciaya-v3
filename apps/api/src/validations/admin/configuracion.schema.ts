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
