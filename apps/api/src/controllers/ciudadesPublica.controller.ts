/**
 * ciudadesPublica.controller.ts
 * =============================
 * GET /api/ciudades (público, sin auth) — catálogo de ciudades activas para el
 * selector de ubicación de la app. Solo llama al service.
 *
 * Ubicación: apps/api/src/controllers/ciudadesPublica.controller.ts
 */

import type { Request, Response } from 'express';
import { listarCiudadesPublicas } from '../services/ciudadesPublica.service.js';

export async function listarCiudadesPublicasController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await listarCiudadesPublicas();
        res.status(200).json({ success: true, data });
    } catch (error) {
        // El selector de ciudad nunca debe romper la app: ante un fallo, devolver vacío
        // (el front conserva su fallback hardcodeado durante la transición).
        console.error('Error en listarCiudadesPublicasController:', error);
        res.status(200).json({ success: true, data: [] });
    }
}
