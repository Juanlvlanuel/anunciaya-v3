/**
 * admin/sesion.routes.ts
 * =======================
 * Ruta de identidad del Panel: GET /api/admin/yo.
 *
 * A diferencia del resto de /api/admin/* (gate global de superadmin en index.ts),
 * esta ruta debe responder a los TRES roles del equipo, porque es la que el
 * frontend usa para saber quién entró y a qué tiene acceso. Por eso lleva su
 * propio `requierePanel(['superadmin','gerente','vendedor'])` y se monta antes
 * del gate global.
 *
 * Ubicación: apps/api/src/routes/admin/sesion.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import { getYoPanelController } from '../../controllers/admin/sesion.controller.js';

const router: Router = Router();

// `exigir2FA: false`: /yo debe poder responder aunque el superadmin tenga el 2FA
// del Panel pendiente — es justo donde el frontend descubre que debe pedir el TOTP.
router.get(
    '/yo',
    requierePanel(['superadmin', 'gerente', 'vendedor'], { exigir2FA: false }),
    getYoPanelController,
);

export default router;
