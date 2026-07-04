/**
 * ayuda.controller.ts
 * ====================
 * Controlador del Centro de Ayuda ("Ayuda y Tutoriales").
 *
 * UBICACIÓN: apps/api/src/controllers/ayuda.controller.ts
 */

import { Request, Response } from 'express';
import {
    obtenerCentroAyuda,
    obtenerTutorialPublico,
    incrementarVista,
    registrarFeedback,
    type AppAyuda,
    type AudienciaAyuda,
} from '../services/ayuda.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const APPS_VALIDAS: AppAyuda[] = ['anunciaya', 'scanya'];
const AUDIENCIAS_VALIDAS: AudienciaAyuda[] = ['cliente', 'comerciante'];

// =============================================================================
// GET /api/ayuda?app=...&audiencia=...
// =============================================================================

/**
 * Devuelve el Centro de Ayuda (categorías + artículos publicados) de una
 * app + audiencia. Es el contenido que ve el usuario dentro de la app.
 */
export async function getCentroAyuda(req: Request, res: Response): Promise<void> {
    try {
        const app = String(req.query.app ?? '') as AppAyuda;
        const audiencia = String(req.query.audiencia ?? '') as AudienciaAyuda;

        if (!APPS_VALIDAS.includes(app) || !AUDIENCIAS_VALIDAS.includes(audiencia)) {
            res.status(400).json({
                success: false,
                message: "Parámetros 'app' y 'audiencia' inválidos",
            });
            return;
        }

        const resultado = await obtenerCentroAyuda(app, audiencia);

        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en getCentroAyuda:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el centro de ayuda' });
    }
}

// =============================================================================
// GET /api/ayuda/publico/:slug
// =============================================================================

/**
 * Landing pública de un tutorial (sin login). Alimenta /p/tutorial/:slug + OG.
 */
export async function getTutorialPublico(req: Request, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        if (!slug) {
            res.status(400).json({ success: false, message: 'Slug requerido' });
            return;
        }
        const resultado = await obtenerTutorialPublico(slug);
        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en getTutorialPublico:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el tutorial' });
    }
}

// =============================================================================
// POST /api/ayuda/:articuloId/vista
// =============================================================================

/** Registra una vista del tutorial (contador agregado). */
export async function postVistaTutorial(req: Request, res: Response): Promise<void> {
    try {
        const { articuloId } = req.params;
        if (!articuloId || !UUID_REGEX.test(articuloId)) {
            res.status(400).json({ success: false, message: 'ID de artículo inválido' });
            return;
        }
        const resultado = await incrementarVista(articuloId);
        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en postVistaTutorial:', error);
        res.status(500).json({ success: false, message: 'Error al registrar la vista' });
    }
}

// =============================================================================
// POST /api/ayuda/:articuloId/feedback   body: { util: boolean }
// =============================================================================

/** Registra el voto "¿Te sirvió?" (👍/👎) como contador agregado. */
export async function postFeedbackTutorial(req: Request, res: Response): Promise<void> {
    try {
        const { articuloId } = req.params;
        const util = (req.body ?? {}).util;
        if (!articuloId || !UUID_REGEX.test(articuloId)) {
            res.status(400).json({ success: false, message: 'ID de artículo inválido' });
            return;
        }
        if (typeof util !== 'boolean') {
            res.status(400).json({ success: false, message: "El campo 'util' debe ser booleano" });
            return;
        }
        const resultado = await registrarFeedback(articuloId, util);
        res.status(resultado.code ?? 200).json(resultado);
    } catch (error) {
        console.error('Error en postFeedbackTutorial:', error);
        res.status(500).json({ success: false, message: 'Error al registrar el feedback' });
    }
}
