/**
 * routes/admin/usuarios.routes.ts
 * ===============================
 * Rutas de la sección Usuarios del Panel Admin: lectura (lista + expediente) y, en la Fase 2,
 * acciones de soporte (rescates de acceso) y moderación (suspender/reactivar).
 *
 * PERMISO PARTIDO (ver Usuarios_Pendientes.md):
 *   - Soporte/lectura → superadmin + gerente (cross-región; los usuarios no tienen región hoy).
 *   - Moderación (suspender/reactivar) → SOLO superadmin (Fase 2).
 *
 * Como la sección la usa también el gerente, este router se monta ANTES del gate global de
 * superadmin en `routes/admin/index.ts` (igual que /negocios, /yo y /2fa).
 *
 *   GET /        → superadmin + gerente (lista paginada + conteos)
 *   GET /:id     → superadmin + gerente (expediente 360 resumen)
 *
 * Ubicación: apps/api/src/routes/admin/usuarios.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarUsuariosController,
    obtenerExpedienteController,
    contarUsuariosController,
    desbloquearIntentosController,
    codigoAccesoController,
    cambiarCorreoController,
    suspenderUsuarioController,
    reactivarUsuarioController,
} from '../../controllers/admin/usuarios.controller.js';

const router: Router = Router();

// ─── Lectura ─────────────────────────────────────────────────────────────────
router.get('/', requierePanel(['superadmin', 'gerente']), listarUsuariosController);
// /conteo antes de /:id para que "conteo" no caiga en el comodín del id.
router.get('/conteo', requierePanel(['superadmin', 'gerente']), contarUsuariosController);
router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerExpedienteController);

// ─── Soporte (rescates de acceso) — superadmin + gerente ─────────────────────────
router.post('/:id/desbloquear', requierePanel(['superadmin', 'gerente']), desbloquearIntentosController);
router.post('/:id/codigo-acceso', requierePanel(['superadmin', 'gerente']), codigoAccesoController);
router.patch('/:id/correo', requierePanel(['superadmin', 'gerente']), cambiarCorreoController);

// ─── Moderación (suspender / reactivar) — SOLO superadmin ────────────────────────
router.post('/:id/suspender', requierePanel(['superadmin']), suspenderUsuarioController);
router.post('/:id/reactivar', requierePanel(['superadmin']), reactivarUsuarioController);

export default router;
