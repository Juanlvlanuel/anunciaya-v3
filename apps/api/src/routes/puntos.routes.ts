/**
 * puntos.routes.ts
 * =================
 * Rutas de Configuración de Puntos del negocio.
 * 
 * Ubicación: apps/api/src/routes/puntos.routes.ts
 */

import { Router } from 'express';
import {
  obtenerConfigPuntosController,
  actualizarConfigPuntosController,
} from '../controllers/puntos.controller.js';
import { verificarToken } from '../middleware/auth.js';

const router: Router = Router();

// =============================================================================
// RUTAS DE CONFIGURACIÓN DE PUNTOS (Fase 7)
// =============================================================================

// GET /api/puntos/configuracion - Obtener configuración de puntos
router.get('/configuracion', verificarToken, obtenerConfigPuntosController);

// PUT /api/puntos/configuracion - Actualizar configuración de puntos (solo dueño)
router.put('/configuracion', verificarToken, actualizarConfigPuntosController);

export default router;