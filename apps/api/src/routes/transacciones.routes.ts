/**
 * transacciones.routes.ts
 * =========================
 * Rutas para el módulo de Transacciones (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/routes/transacciones.routes.ts
 * 
 * RUTAS - TAB VENTAS:
 * GET    /api/transacciones/historial       - Historial de transacciones de puntos
 * GET    /api/transacciones/kpis            - KPIs para página Transacciones BS
 * GET    /api/transacciones/exportar        - Exportar CSV de transacciones
 * POST   /api/transacciones/:id/revocar     - Revocar transacción (con motivo)
 * 
 * RUTAS - TAB CANJES:
 * GET    /api/transacciones/canjes          - Historial de canjes (vouchers)
 * GET    /api/transacciones/canjes/kpis     - KPIs para Tab Canjes
 * 
 * NOTA: Consume controllers de transacciones.controller.ts
 *       La lógica vive en puntos.service.ts y transacciones.service.ts
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerHistorialController,
  revocarTransaccionController,
  obtenerKPIsTransaccionesController,
  exportarTransaccionesController,
  obtenerOperadoresController,
  obtenerKPIsCanjesController,
  obtenerHistorialCanjesController,
} from '../controllers/transacciones.controller.js';

// Importar middlewares
import { verificarToken } from '../middleware/auth.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';

// =============================================================================
// CREAR ROUTER
// =============================================================================

const router: RouterType = Router();

// =============================================================================
// MIDDLEWARE: Todas las rutas requieren autenticación Y tener negocio
// =============================================================================
router.use(verificarToken);
router.use(verificarNegocio);

// =============================================================================
// RUTAS ESTÁTICAS (van primero para evitar conflicto con :id)
// =============================================================================

/**
 * GET /api/transacciones/historial?periodo=semana&limit=50&offset=0
 * Obtiene historial de transacciones de puntos con filtros
 * Acceso: Dueños y Gerentes
 */
router.get('/historial', obtenerHistorialController);

/**
 * GET /api/transacciones/kpis?periodo=semana
 * Obtiene 4 KPIs: total ventas, # transacciones, ticket promedio, revocadas
 * Acceso: Dueños y Gerentes
 */
router.get('/kpis', obtenerKPIsTransaccionesController);

/**
 * GET /api/transacciones/exportar?periodo=mes
 * Descarga CSV con todas las transacciones del periodo
 * Acceso: Dueños y Gerentes
 */
router.get('/exportar', exportarTransaccionesController);

/**
 * GET /api/transacciones/operadores
 * Lista de operadores que han registrado ventas (para dropdown filtro)
 * Acceso: Dueños y Gerentes
 */
router.get('/operadores', obtenerOperadoresController);

// =============================================================================
// RUTAS TAB CANJES (van antes de rutas con parámetros)
// =============================================================================

/**
 * GET /api/transacciones/canjes/kpis?periodo=semana
 * Obtiene 4 KPIs: pendientes, usados, vencidos, total canjes
 * Acceso: Dueños y Gerentes
 */
router.get('/canjes/kpis', obtenerKPIsCanjesController);

/**
 * GET /api/transacciones/canjes?periodo=semana&limit=20&offset=0&estado=pendiente
 * Obtiene historial de canjes (vouchers) con filtros
 * Acceso: Dueños y Gerentes
 */
router.get('/canjes', obtenerHistorialCanjesController);

// =============================================================================
// RUTAS CON PARÁMETROS (van después)
// =============================================================================

/**
 * POST /api/transacciones/:id/revocar
 * Body: { motivo: string }
 * Revoca una transacción de puntos con motivo obligatorio
 * Acceso: Dueños y Gerentes
 */
router.post('/:id/revocar', revocarTransaccionController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;