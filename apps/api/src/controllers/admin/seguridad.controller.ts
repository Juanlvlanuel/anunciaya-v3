/**
 * admin/seguridad.controller.ts
 * ==============================
 * Endpoints del 2FA del Panel (solo SuperAdmin). Toman el usuarioId de
 * req.usuarioPanel (lo deja requierePanel). El código TOTP viene en el body.
 *
 * Ubicación: apps/api/src/controllers/admin/seguridad.controller.ts
 */

import type { Request, Response } from 'express';
import {
  estado2faPanel,
  generar2faPanel,
  activar2faPanel,
  desactivar2faPanel,
  verificar2faPanel,
} from '../../services/admin/seguridad.service.js';

function ipDe(req: Request): string | null {
  return req.ip ?? null;
}
function uaDe(req: Request): string | null {
  return req.headers['user-agent'] ?? null;
}
function codigoDe(req: Request): string {
  return String(req.body?.codigo ?? '').trim();
}

/** GET /api/admin/2fa/estado */
export async function estado2faController(req: Request, res: Response): Promise<void> {
  try {
    const usuarioId = req.usuarioPanel?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const r = await estado2faPanel(usuarioId);
    res.status(r.code).json(r);
  } catch (error) {
    console.error('Error en estado2faController:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el estado del 2FA' });
  }
}

/** POST /api/admin/2fa/generar */
export async function generar2faController(req: Request, res: Response): Promise<void> {
  try {
    const usuarioId = req.usuarioPanel?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const r = await generar2faPanel(usuarioId);
    res.status(r.code).json(r);
  } catch (error) {
    console.error('Error en generar2faController:', error);
    res.status(500).json({ success: false, message: 'Error al generar el 2FA' });
  }
}

/** POST /api/admin/2fa/activar  body: { codigo } */
export async function activar2faController(req: Request, res: Response): Promise<void> {
  try {
    const usuarioId = req.usuarioPanel?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const codigo = codigoDe(req);
    if (!codigo) {
      res.status(400).json({ success: false, message: 'Falta el código' });
      return;
    }
    const r = await activar2faPanel(usuarioId, codigo, ipDe(req), uaDe(req));
    res.status(r.code).json(r);
  } catch (error) {
    console.error('Error en activar2faController:', error);
    res.status(500).json({ success: false, message: 'Error al activar el 2FA' });
  }
}

/** POST /api/admin/2fa/desactivar */
export async function desactivar2faController(req: Request, res: Response): Promise<void> {
  try {
    const usuarioId = req.usuarioPanel?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const r = await desactivar2faPanel(usuarioId);
    res.status(r.code).json(r);
  } catch (error) {
    console.error('Error en desactivar2faController:', error);
    res.status(500).json({ success: false, message: 'Error al desactivar el 2FA' });
  }
}

/** POST /api/admin/2fa/verificar  body: { codigo } — en la puerta */
export async function verificar2faController(req: Request, res: Response): Promise<void> {
  try {
    const usuarioId = req.usuarioPanel?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const codigo = codigoDe(req);
    if (!codigo) {
      res.status(400).json({ success: false, message: 'Falta el código' });
      return;
    }
    const r = await verificar2faPanel(usuarioId, codigo, ipDe(req), uaDe(req));
    res.status(r.code).json(r);
  } catch (error) {
    console.error('Error en verificar2faController:', error);
    res.status(500).json({ success: false, message: 'Error al verificar el 2FA' });
  }
}
