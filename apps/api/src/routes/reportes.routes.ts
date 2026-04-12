/**
 * reportes.routes.ts
 * ===================
 * Rutas para el módulo de Reportes (Business Studio)
 *
 * Ubicación: apps/api/src/routes/reportes.routes.ts
 *
 * RUTAS:
 * GET /api/business/reportes?tab=ventas&periodo=mes         - Datos del reporte
 * GET /api/business/reportes/exportar?tab=ventas&periodo=mes - Exportar a XLSX
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerReporteController,
  exportarReporteController,
  obtenerClientesInactivosController,
} from '../controllers/reportes.controller.js';

import { verificarToken } from '../middleware/auth.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';

const router: RouterType = Router();

// Middleware: autenticación + negocio
router.use(verificarToken);
router.use(verificarNegocio);

/**
 * GET /api/business/reportes?tab=ventas&periodo=mes
 * Query params:
 *   tab: 'ventas' | 'clientes' | 'empleados' | 'promociones' | 'resenas'
 *   periodo: 'hoy' | 'semana' | 'mes' | '3meses' | 'anio' | 'todo'
 */
router.get('/', obtenerReporteController);

/**
 * GET /api/business/reportes/exportar?tab=ventas&periodo=mes
 * Descarga archivo XLSX
 */
router.get('/exportar', exportarReporteController);

/**
 * GET /api/business/reportes/clientes-inactivos?tipo=riesgo|inactivos
 * Lista detallada de clientes en riesgo o inactivos
 */
router.get('/clientes-inactivos', obtenerClientesInactivosController);

export default router;
