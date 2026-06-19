/**
 * ciudadesPublica.routes.ts
 * =========================
 * GET /api/ciudades (público, sin auth) — catálogo de ciudades activas para el
 * selector de ubicación de la app. Se monta en routes/index.ts.
 *
 * Ubicación: apps/api/src/routes/ciudadesPublica.routes.ts
 */

import { Router } from 'express';
import { listarCiudadesPublicasController } from '../controllers/ciudadesPublica.controller.js';

const router: Router = Router();

router.get('/', listarCiudadesPublicasController);

export default router;
