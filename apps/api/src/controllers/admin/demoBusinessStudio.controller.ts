/**
 * controllers/admin/demoBusinessStudio.controller.ts
 * ==================================================
 * Demo de Business Studio para vendedores. Solo llama al service (CLAUDE.md: controllers sin lógica).
 * El vendedor efectivo es la cuenta del Panel autenticada (req.usuarioPanel.usuarioId): cada quien
 * su propia copia.
 */

import type { Request, Response } from 'express';
import {
    abrirDemo,
    reiniciarDemo,
    obtenerEstadoDemo,
    DemoError,
} from '../../services/demoBusinessStudio.service.js';

function vendedorIdDe(req: Request): string | null {
    return req.usuarioPanel?.usuarioId ?? null;
}

function manejarError(error: unknown, res: Response, accion: string): void {
    if (error instanceof DemoError && error.codigo === 'DEMO_MAESTRO_NO_CONFIGURADO') {
        res.status(409).json({
            success: false,
            message: 'El demo de Business Studio aún no está configurado. Contacta al administrador.',
            errorCode: error.codigo,
        });
        return;
    }
    console.error(`Error en ${accion}:`, error);
    res.status(500).json({ success: false, message: 'No se pudo completar la acción del demo' });
}

export async function estadoDemoController(req: Request, res: Response): Promise<void> {
    try {
        const vendedorId = vendedorIdDe(req);
        if (!vendedorId) {
            res.status(400).json({ success: false, message: 'Se requiere una cuenta de equipo para usar el demo' });
            return;
        }
        const data = await obtenerEstadoDemo(vendedorId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        manejarError(error, res, 'estadoDemoController');
    }
}

export async function abrirDemoController(req: Request, res: Response): Promise<void> {
    try {
        const vendedorId = vendedorIdDe(req);
        if (!vendedorId) {
            res.status(400).json({ success: false, message: 'Se requiere una cuenta de equipo para usar el demo' });
            return;
        }
        const { negocioId, sucursalPrincipalId, handoffToken } = await abrirDemo(vendedorId);
        res.status(200).json({ success: true, data: { negocioId, sucursalPrincipalId, handoffToken } });
    } catch (error) {
        manejarError(error, res, 'abrirDemoController');
    }
}

export async function reiniciarDemoController(req: Request, res: Response): Promise<void> {
    try {
        const vendedorId = vendedorIdDe(req);
        if (!vendedorId) {
            res.status(400).json({ success: false, message: 'Se requiere una cuenta de equipo para usar el demo' });
            return;
        }
        const { negocioId, sucursalPrincipalId, handoffToken } = await reiniciarDemo(vendedorId);
        res.status(200).json({ success: true, data: { negocioId, sucursalPrincipalId, handoffToken } });
    } catch (error) {
        manejarError(error, res, 'reiniciarDemoController');
    }
}
