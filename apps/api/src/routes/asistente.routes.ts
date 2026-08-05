/**
 * asistente.routes.ts
 * ====================
 * Rutas del Asistente Coyo (FAB global) — Fase 1.
 *
 * UBICACIÓN: apps/api/src/routes/asistente.routes.ts
 *
 *   POST /api/asistente/interpretar
 *     Un turno de chat (texto y/o audio) + historial reciente + contexto de
 *     la app. Login obligatorio. Rate limit propio (más estricto que el
 *     general) por el costo de cada llamada a Gemini.
 */

import { Router, type Router as RouterType } from 'express';
import { postInterpretarAsistente } from '../controllers/asistente.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { limitadorAsistente } from '../middleware/rateLimiter.js';

const router: RouterType = Router();

router.use(verificarToken);
router.use(limitadorAsistente);

router.post('/interpretar', postInterpretarAsistente);

export default router;
