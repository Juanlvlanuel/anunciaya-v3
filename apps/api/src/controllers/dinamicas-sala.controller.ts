/**
 * ============================================================================
 * DINÁMICAS SALA CONTROLLER — Fase 4.1
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/dinamicas-sala.controller.ts
 *
 * Solo agendar la sala y la carga inicial por HTTP. El resto (unirse, chat,
 * moderar, iniciar sorteo) vive en `socket.ts` — son eventos en vivo, no
 * peticiones request/response.
 */

import type { Request, Response } from 'express';
import { activarSala, obtenerEstadoSala } from '../services/dinamicas/sala.service.js';
import { activarSalaSchema, formatearErroresZod } from '../validations/dinamicas-sala.schema.js';
import { obtenerIO, roomSalaDinamica } from '../socket.js';

function exigirUsuarioId(req: Request, res: Response): string | null {
    const id = req.usuario?.usuarioId ?? null;
    if (!id) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return null;
    }
    return id;
}

/** POST /api/dinamicas/:id/sala/activar — solo el organizador (body: salaProgramadaPara) */
export async function postActivarSala(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = activarSalaSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await activarSala(usuarioId, req.params.id as string, validacion.data.salaProgramadaPara);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }

    // Avisar en vivo a quien YA esté conectado a la sala (organizador en
    // otra pestaña, participantes esperando) — sin esto, su cronómetro se
    // queda contando para la hora vieja hasta que recarguen la página.
    obtenerIO()?.to(roomSalaDinamica(req.params.id as string)).emit('dinamica:sala:programada-actualizada', {
        salaProgramadaPara: validacion.data.salaProgramadaPara,
    });

    return res.json(resultado);
}

/** GET /api/dinamicas/:id/sala — carga inicial (público, `verificarTokenOpcional`) */
export async function getEstadoSala(req: Request, res: Response) {
    const resultado = await obtenerEstadoSala(req.params.id as string, req.usuario?.usuarioId);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}
