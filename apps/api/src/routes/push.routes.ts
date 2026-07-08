/**
 * push.routes.ts
 * ==============
 * Rutas de Web Push (suscripción a notificaciones push de la PWA).
 *
 * UBICACIÓN: apps/api/src/routes/push.routes.ts
 *
 * RUTAS (todas requieren token):
 * POST /api/push/suscribir     - Registra la suscripción push del dispositivo
 * POST /api/push/desuscribir   - Elimina la suscripción (al desactivar)
 */

import { Router, type Router as RouterType } from 'express';
import { suscribirController, desuscribirController } from '../controllers/push.controller.js';
import { verificarToken } from '../middleware/auth.js';

const router: RouterType = Router();

router.use(verificarToken);

router.post('/suscribir', suscribirController);
router.post('/desuscribir', desuscribirController);

export default router;
