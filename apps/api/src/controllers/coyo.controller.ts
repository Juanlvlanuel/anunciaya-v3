/**
 * coyo.controller.ts
 * ===================
 * Controllers para los endpoints de Coyo (asistente del Home).
 *
 * Sprint inicial: solo el buscador unificado que consulta las 4 áreas
 * (Negocios, MarketPlace, Servicios, Ofertas) en paralelo. La capa de
 * interpretación de lenguaje natural con Gemini vivirá en otro layer
 * (Frente 3, fuera de este controller).
 *
 * UBICACIÓN: apps/api/src/controllers/coyo.controller.ts
 */

import type { Request, Response } from 'express';
import { buscarEnTodaLaApp } from '../services/coyo/buscadorUnificado.js';
import {
    buscarUnificadoQuerySchema,
    formatearErroresZod,
} from '../validations/coyo.schema.js';

// =============================================================================
// GET /api/coyo/buscar?q=...&ciudad=...&lat=...&lng=...
// =============================================================================

/**
 * Búsqueda unificada en las 4 áreas. Devuelve resultados agrupados por
 * tipo, con máximo 3 ítems por área. Tolerante a fallos parciales: si
 * una sección falla, las demás siguen.
 *
 * `usuarioId` viene del token (req.usuario, agregado por verificarToken)
 * y se pasa al service para que Negocios pueda calcular liked/followed.
 */
export async function getBuscarUnificado(req: Request, res: Response) {
    try {
        const validacion = buscarUnificadoQuerySchema.safeParse(req.query);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Query inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }
        const usuarioId = req.usuario?.usuarioId ?? null;
        const resultado = await buscarEnTodaLaApp({
            ...validacion.data,
            usuarioId,
        });
        return res.json(resultado);
    } catch (error) {
        console.error('Error en getBuscarUnificado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al ejecutar la búsqueda unificada',
        });
    }
}
