/**
 * configuracionPublica.routes.ts
 * ==============================
 * Ruta PÚBLICA (sin auth) con los valores del negocio que la app web muestra al visitante.
 *
 *   GET /  → { trialDias, precioMembresia }  (trial + precio mensual de la membresía comercial)
 *
 * Ubicación: apps/api/src/routes/configuracionPublica.routes.ts
 */

import { Router } from 'express';
import { obtenerConfigPublicaController } from '../controllers/configuracionPublica.controller.js';

const router: Router = Router();

router.get('/', obtenerConfigPublicaController);

export default router;
