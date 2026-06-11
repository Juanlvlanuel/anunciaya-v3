/**
 * admin/usuarios.controller.ts
 * ============================
 * Controllers de la sección Usuarios del Panel Admin: lecturas (lista paginada + expediente 360).
 * Leen query/params, validan, llaman al service y arman la respuesta. El acceso y el rol ya los
 * validó `requierePanel(['superadmin','gerente'])` en la ruta.
 *
 * Las acciones (suspender/reactivar + rescates de acceso) llegarán en la Fase 2.
 *
 * Ubicación: apps/api/src/controllers/admin/usuarios.controller.ts
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import {
    listarUsuarios,
    obtenerExpediente,
    ESTADOS_USUARIO,
    TIPOS_USUARIO,
    ORDENES_USUARIO,
    type EstadoUsuario,
    type TipoUsuario,
    type OrdenUsuarios,
} from '../../services/admin/usuarios.service.js';
import {
    desbloquearIntentos,
    enviarAcceso,
    cambiarCorreoUsuario,
    suspenderUsuario,
    reactivarUsuario,
} from '../../services/admin/usuarios-acciones.service.js';

const POR_PAGINA_DEFAULT = 20;
const POR_PAGINA_MAX = 100;

/** Convierte un query param suelto a entero positivo con tope, o el default. */
function enteroPositivo(valor: unknown, porDefecto: number, maximo?: number): number {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 1) return porDefecto;
    const entero = Math.floor(n);
    return maximo ? Math.min(entero, maximo) : entero;
}

// =============================================================================
// GET /api/admin/usuarios
// =============================================================================

export async function listarUsuariosController(req: Request, res: Response): Promise<void> {
    try {
        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const estadoRaw = typeof req.query.estado === 'string' ? req.query.estado : '';
        const tipoRaw = typeof req.query.tipo === 'string' ? req.query.tipo : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const estado = ESTADOS_USUARIO.includes(estadoRaw as EstadoUsuario)
            ? (estadoRaw as EstadoUsuario)
            : undefined;
        const tipo = TIPOS_USUARIO.includes(tipoRaw as TipoUsuario)
            ? (tipoRaw as TipoUsuario)
            : undefined;
        const orden = ORDENES_USUARIO.includes(ordenRaw as OrdenUsuarios)
            ? (ordenRaw as OrdenUsuarios)
            : undefined;

        const resultado = await listarUsuarios({
            busqueda: busquedaRaw || undefined,
            estado,
            tipo,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
        });

        res.status(200).json({ success: true, message: 'Usuarios obtenidos', data: resultado });
    } catch (error) {
        console.error('Error en listarUsuariosController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los usuarios',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/usuarios/:id
// =============================================================================

export async function obtenerExpedienteController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const expediente = await obtenerExpediente(id);
        if (!expediente) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json({ success: true, message: 'Usuario obtenido', data: expediente });
    } catch (error) {
        console.error('Error en obtenerExpedienteController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el usuario',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/usuarios/:id/desbloquear   (super + gerente)
// =============================================================================

export async function desbloquearIntentosController(req: Request, res: Response): Promise<void> {
    try {
        const r = await desbloquearIntentos(req.usuarioPanel!, req.params.id);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Cuenta desbloqueada' });
    } catch (error) {
        console.error('Error en desbloquearIntentosController:', error);
        res.status(500).json({ success: false, message: 'Error al desbloquear la cuenta' });
    }
}

// =============================================================================
// POST /api/admin/usuarios/:id/enviar-acceso   (super + gerente)
// Reenvía el código para crear/restablecer la contraseña. Devuelve si salió y de qué tipo.
// =============================================================================

export async function enviarAccesoController(req: Request, res: Response): Promise<void> {
    try {
        const r = await enviarAcceso(req.usuarioPanel!, req.params.id);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: r.correoEnviado ? 'Correo de acceso enviado' : 'No se pudo enviar el correo de acceso',
            data: { correoEnviado: r.correoEnviado, tipo: r.tipo },
        });
    } catch (error) {
        console.error('Error en enviarAccesoController:', error);
        res.status(500).json({ success: false, message: 'Error al enviar el acceso' });
    }
}

// =============================================================================
// PATCH /api/admin/usuarios/:id/correo   (super + gerente)
// =============================================================================

const cambiarCorreoBodySchema = z.object({
    correoNuevo: z.string().email('Correo inválido').trim().toLowerCase(),
});

export async function cambiarCorreoController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = cambiarCorreoBodySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Correo inválido' });
            return;
        }
        const r = await cambiarCorreoUsuario(req.usuarioPanel!, req.params.id, parsed.data.correoNuevo);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({
            success: true,
            message: r.correoEnviado
                ? 'Correo actualizado y código enviado al nuevo correo'
                : 'Correo actualizado, pero el código no se pudo enviar',
            data: { correoEnviado: r.correoEnviado },
        });
    } catch (error) {
        console.error('Error en cambiarCorreoController:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar el correo' });
    }
}

// =============================================================================
// POST /api/admin/usuarios/:id/suspender   (SOLO superadmin · motivo obligatorio)
// =============================================================================

export async function suspenderUsuarioController(req: Request, res: Response): Promise<void> {
    try {
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        if (!motivo) {
            res.status(400).json({ success: false, message: 'El motivo es obligatorio para suspender.' });
            return;
        }
        const r = await suspenderUsuario(req.usuarioPanel!, req.params.id, motivo);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Cuenta suspendida' });
    } catch (error) {
        console.error('Error en suspenderUsuarioController:', error);
        res.status(500).json({ success: false, message: 'Error al suspender la cuenta' });
    }
}

// =============================================================================
// POST /api/admin/usuarios/:id/reactivar   (SOLO superadmin · motivo opcional)
// =============================================================================

export async function reactivarUsuarioController(req: Request, res: Response): Promise<void> {
    try {
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        const r = await reactivarUsuario(req.usuarioPanel!, req.params.id, motivo || null);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Cuenta reactivada' });
    } catch (error) {
        console.error('Error en reactivarUsuarioController:', error);
        res.status(500).json({ success: false, message: 'Error al reactivar la cuenta' });
    }
}
