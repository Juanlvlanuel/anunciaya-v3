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
} from '../../controllers/admin/usuarios.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente']), listarUsuariosController);

router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerExpedienteController);

export default router;
