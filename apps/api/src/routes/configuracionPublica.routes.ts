/**
 * configuracionPublica.routes.ts
 * ==============================
 * Ruta PÚBLICA (sin auth) con los valores del negocio que la app web muestra al visitante.
 *
 *   GET /  → { trialDias }  (duración del trial de la cuenta comercial)
 *
 * Ubicación: apps/api/src/routes/configuracionPublica.routes.ts
 */

import { Router } from 'express';
import { obtenerConfigPublicaController } from '../controllers/configuracionPublica.controller.js';

const router: Router = Router();

router.get('/', obtenerConfigPublicaController);

export default router;
