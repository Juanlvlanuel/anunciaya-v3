/**
 * ============================================================================
 * VALIDACIONES ZOD — Coyo (buscador unificado)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/coyo.schema.ts
 *
 * Schemas Zod para el endpoint del buscador unificado que consulta las 4
 * áreas (Negocios, MarketPlace, Servicios, Ofertas) en una sola llamada.
 *
 * Este archivo es deliberadamente autónomo (define su propio
 * `formatearErroresZod` en lugar de importarlo de otro módulo) para que
 * Coyo no acople sus tipos con los de marketplace/servicios/ofertas.
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA: GET /api/coyo/buscar?q=...&ciudad=...&lat=...&lng=...
// =============================================================================
//
// - `q`: obligatorio, mínimo 2 caracteres. Los buscadores internos exigen
//   este mínimo para activar el FTS; sin él la llamada no tiene sentido.
// - `ciudad`: obligatoria. MarketPlace/Servicios/Ofertas filtran estricto
//   por esta ciudad. Negocios usa lat/lng (si llegan) para filtrar por
//   proximidad — si no llegan, busca solo por coincidencia de texto.
// - `lat`/`lng`: opcionales. Mejora el filtrado de Negocios (proximidad)
//   y de MarketPlace/Servicios (distancia precalculada).

export const buscarUnificadoQuerySchema = z.object({
    q: z
        .string()
        .trim()
        .min(2, 'q debe tener al menos 2 caracteres')
        .max(100, 'q no puede exceder 100 caracteres'),
    ciudad: z
        .string()
        .trim()
        .min(2, 'La ciudad es obligatoria')
        .max(100, 'La ciudad no puede exceder 100 caracteres'),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
});

export type BuscarUnificadoQueryInput = z.infer<typeof buscarUnificadoQuerySchema>;

// =============================================================================
// HELPER: Formatear errores de Zod v4
// =============================================================================

export function formatearErroresZod(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${campo}${issue.message}`;
    });
}
