/**
 * coyo.routes.ts
 * ===============
 * Rutas para el asistente Coyo (Home).
 *
 * UBICACIÓN: apps/api/src/routes/coyo.routes.ts
 *
 * Sprint inicial:
 *   GET /api/coyo/buscar?q=...&ciudad=...&lat=&lng=
 *     Buscador unificado en las 4 áreas (Negocios, MarketPlace,
 *     Servicios, Ofertas). Login obligatorio (regla del proyecto).
 */

import { Router, type Router as RouterType } from 'express';
import { getBuscarUnificado } from '../controllers/coyo.controller.js';
import { verificarToken } from '../middleware/auth.js';

// =============================================================================
// CREAR ROUTER
// =============================================================================

const router: RouterType = Router();

// =============================================================================
// MIDDLEWARE: Todas las rutas requieren autenticación
// =============================================================================
router.use(verificarToken);

// =============================================================================
// RUTAS
// =============================================================================

/**
 * GET /api/coyo/buscar?q=...&ciudad=...&lat=...&lng=...
 * Buscador unificado. Devuelve resultados agrupados por tipo (negocios,
 * ofertas, marketplace, servicios) con máximo 3 ítems por área.
 */
router.get('/buscar', getBuscarUnificado);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;
