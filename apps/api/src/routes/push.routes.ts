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
import { verificarTokenChatYA } from '../middleware/auth.js';

const router: RouterType = Router();

// verificarTokenChatYA (no verificarToken): acepta tokens de AnunciaYA Y de
// ScanYA, y resuelve el usuarioId al del receptor real de ChatYA (para ScanYA,
// el negocioUsuarioId del dueño). Así la suscripción push queda asociada al
// mismo id al que el servidor envía el push.
router.use(verificarTokenChatYA);

router.post('/suscribir', suscribirController);
router.post('/desuscribir', desuscribirController);

export default router;
