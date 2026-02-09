/**
 * cardya.routes.ts
 * ================
 * Rutas para el módulo CardYA (Cliente)
 * 
 * Ubicación: apps/api/src/routes/cardya.routes.ts
 * 
 * RUTAS:
 * GET    /api/cardya/mis-puntos                - Obtener billeteras del usuario
 * GET    /api/cardya/negocio/:negocio_id       - Detalle de billetera en un negocio
 * GET    /api/cardya/recompensas                - Listar recompensas disponibles
 * POST   /api/cardya/canjear                    - Canjear recompensa
 * GET    /api/cardya/vouchers                   - Listar vouchers del usuario
 * DELETE /api/cardya/vouchers/:id               - Cancelar voucher
 * GET    /api/cardya/historial/compras          - Historial de compras
 * GET    /api/cardya/historial/canjes           - Historial de canjes
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerMisPuntosController,
  obtenerDetalleNegocioController,
  obtenerRecompensasController,
  canjearRecompensaController,
  obtenerMisVouchersController,
  cancelarVoucherController,
  obtenerHistorialComprasController,
  obtenerHistorialCanjesController,
} from '../controllers/cardya.controller.js';

// Importar middlewares
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
// RUTAS: BILLETERAS Y PUNTOS
// =============================================================================

/**
 * GET /api/cardya/mis-puntos
 * Obtiene todas las billeteras del usuario (negocios donde tiene puntos)
 * Acceso: Usuarios autenticados
 */
router.get('/mis-puntos', obtenerMisPuntosController);

/**
 * GET /api/cardya/negocio/:negocio_id
 * Obtiene el detalle completo de la billetera en un negocio específico
 * Incluye últimas transacciones y datos de contacto
 * Acceso: Usuarios autenticados
 */
router.get('/negocio/:negocio_id', obtenerDetalleNegocioController);

// =============================================================================
// RUTAS: RECOMPENSAS
// =============================================================================

/**
 * GET /api/cardya/recompensas?negocioId=xxx&soloDisponibles=true
 * Obtiene recompensas disponibles para el usuario
 * Query params opcionales:
 *   - negocioId: Filtrar por negocio específico
 *   - soloDisponibles: Solo las que puede canjear (tiene puntos y stock)
 * Acceso: Usuarios autenticados
 */
router.get('/recompensas', obtenerRecompensasController);

/**
 * POST /api/cardya/canjear
 * Canjea una recompensa y genera un voucher
 * Body: { recompensaId: string }
 * Acceso: Usuarios autenticados
 */
router.post('/canjear', canjearRecompensaController);

// =============================================================================
// RUTAS: VOUCHERS
// =============================================================================

/**
 * GET /api/cardya/vouchers?estado=pendiente
 * Obtiene los vouchers del usuario
 * Query params opcionales:
 *   - estado: pendiente | usado | expirado | cancelado
 * Acceso: Usuarios autenticados
 */
router.get('/vouchers', obtenerMisVouchersController);

/**
 * DELETE /api/cardya/vouchers/:id
 * Cancela un voucher y devuelve los puntos al usuario
 * Solo se pueden cancelar vouchers en estado "pendiente"
 * Acceso: Usuarios autenticados (dueño del voucher)
 */
router.delete('/vouchers/:id', cancelarVoucherController);

// =============================================================================
// RUTAS: HISTORIAL
// =============================================================================

/**
 * GET /api/cardya/historial/compras?negocioId=xxx&limit=20&offset=0
 * Obtiene el historial de compras (puntos ganados)
 * Query params opcionales:
 *   - negocioId: Filtrar por negocio específico
 *   - limit: Cantidad de resultados (1-100, default: 20)
 *   - offset: Paginación (default: 0)
 * Acceso: Usuarios autenticados
 */
router.get('/historial/compras', obtenerHistorialComprasController);

/**
 * GET /api/cardya/historial/canjes?negocioId=xxx&estado=usado&limit=20&offset=0
 * Obtiene el historial de canjes (puntos gastados)
 * Query params opcionales:
 *   - negocioId: Filtrar por negocio específico
 *   - estado: usado | cancelado
 *   - limit: Cantidad de resultados (1-100, default: 20)
 *   - offset: Paginación (default: 0)
 * Acceso: Usuarios autenticados
 */
router.get('/historial/canjes', obtenerHistorialCanjesController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;