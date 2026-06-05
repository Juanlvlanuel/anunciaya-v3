/**
 * admin/seguridad.routes.ts
 * ==========================
 * Rutas del 2FA del Panel (solo SuperAdmin). Se montan ANTES del gate global de
 * index.ts (cada ruta trae su propio requierePanel con la opción correcta):
 *
 *  - /2fa/verificar → { exigir2FA: false }  (es quien OTORGA la marca; no puede exigirla)
 *  - /2fa/estado|generar|activar → default: el gate exige 2FA solo si YA está
 *    prendido. Con el 2FA apagado (setup) pasan sin marca.
 *  - /2fa/desactivar → default: con el 2FA prendido, exige que ya hayas pasado el
 *    TOTP (no se puede apagar con solo la contraseña).
 *
 * Ubicación: apps/api/src/routes/admin/seguridad.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
  estado2faController,
  generar2faController,
  activar2faController,
  desactivar2faController,
  verificar2faController,
} from '../../controllers/admin/seguridad.controller.js';

const router: Router = Router();

router.post('/2fa/verificar', requierePanel(['superadmin', 'gerente', 'vendedor'], { exigir2FA: false }), verificar2faController);

router.get('/2fa/estado', requierePanel(['superadmin', 'gerente', 'vendedor']), estado2faController);
router.post('/2fa/generar', requierePanel(['superadmin', 'gerente', 'vendedor']), generar2faController);
router.post('/2fa/activar', requierePanel(['superadmin', 'gerente', 'vendedor']), activar2faController);
router.post('/2fa/desactivar', requierePanel(['superadmin', 'gerente', 'vendedor']), desactivar2faController);

export default router;
