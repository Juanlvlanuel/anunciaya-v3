/**
 * admin/configuracion.controller.ts
 * =================================
 * Controllers de la sección "Configuración" del Panel Admin (módulo 9). Solo llaman al service y
 * arman la respuesta. El acceso (solo superadmin) lo garantiza el gate global de
 * `routes/admin/index.ts`, donde se monta este router.
 *
 * Ubicación: apps/api/src/controllers/admin/configuracion.controller.ts
 */

import type { Request, Response } from 'express';
import { listarConfiguracion } from '../../services/admin/configuracion.service.js';
import { actualizarConfig } from '../../services/admin/configuracion-acciones.service.js';
import { cambiarPrecioMensual, activarPlanAnual } from '../../services/admin/precio-membresia.service.js';
import { actualizarConfigSchema, cambiarPrecioMembresiaSchema, planAnualSchema } from '../../validations/admin/configuracion.schema.js';

// =============================================================================
// GET /api/admin/configuracion   (solo superadmin · valores editables del negocio)
// =============================================================================

export async function listarConfiguracionController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await listarConfiguracion();
        res.status(200).json({ success: true, message: 'Configuración obtenida', data });
    } catch (error) {
        console.error('Error en listarConfiguracionController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la configuración',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// PATCH /api/admin/configuracion/:clave   (solo superadmin · editar un valor)
// =============================================================================

export async function actualizarConfiguracionController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = actualizarConfigSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await actualizarConfig(req.usuarioPanel!, req.params.clave, parsed.data.valor);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: `${r.etiqueta} actualizada`,
            data: { clave: r.clave, valor: r.valor },
        });
    } catch (error) {
        console.error('Error en actualizarConfiguracionController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la configuración' });
    }
}

// =============================================================================
// PUT /api/admin/configuracion/precio-membresia   (solo superadmin · cambia el precio MENSUAL)
// =============================================================================

export async function cambiarPrecioMensualController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = cambiarPrecioMembresiaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await cambiarPrecioMensual(req.usuarioPanel!, parsed.data.precioMensual);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: `Precio mensual actualizado a $${r.precioMensual}`,
            data: r,
        });
    } catch (error) {
        console.error('Error en cambiarPrecioMensualController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el precio de la membresía' });
    }
}

// =============================================================================
// PUT /api/admin/configuracion/plan-anual   (solo superadmin · activa/desactiva el plan anual)
// =============================================================================

export async function planAnualController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = planAnualSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await activarPlanAnual(req.usuarioPanel!, parsed.data.activo);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: r.activo ? `Plan anual activado ($${r.anual?.precio}/año)` : 'Plan anual desactivado',
            data: r,
        });
    } catch (error) {
        console.error('Error en planAnualController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el plan anual' });
    }
}
