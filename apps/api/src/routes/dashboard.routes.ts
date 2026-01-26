/**
 * ============================================================================
 * DASHBOARD ROUTES - Business Studio
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/dashboard.routes.ts
 * 
 * PROPÓSITO:
 * Definir las rutas del Dashboard de Business Studio
 * 
 * BASE URL: /api/business/dashboard
 * 
 * RUTAS:
 * GET  /kpis         → KPIs principales (ventas, clientes, cupones, rating, vistas, likes)
 * GET  /ventas       → Ventas diarias para gráfica
 * GET  /campanas     → Ofertas y cupones activos
 * GET  /interacciones    → Feed de interacciones recientes (NUEVO)
 * GET  /resenas      → Reseñas recientes
 * GET  /alertas      → Alertas de seguridad
 * PUT  /alertas/:id  → Marcar alerta como leída
 * 
 * MIDDLEWARE:
 * - verificarToken: Autenticación JWT
 * - verificarNegocio: Verifica que el usuario tenga un negocio asociado
 * 
 * CREADO: Fase 5.4 - Dashboard Business Studio
 */

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { verificarToken } from '../middleware/auth';
import { verificarNegocio } from '../middleware/negocio.middleware';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware';

const router: Router = Router();


// =============================================================================
// MIDDLEWARE GLOBAL
// =============================================================================

// Todas las rutas requieren autenticación y negocio asociado
router.use(verificarToken);
router.use(verificarNegocio);
router.use(validarAccesoSucursal);

// =============================================================================
// RUTAS
// =============================================================================

/**
 * GET /api/business/dashboard/kpis
 * Obtiene los KPIs principales del dashboard
 * 
 * Query params:
 * - periodo: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio'
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     ventas: { valor, valorAnterior, porcentajeCambio, tendencia, miniGrafica },
 *     clientes: { valor, valorAnterior, porcentajeCambio, tendencia, nuevos, recurrentes },
 *     transacciones: { valor, valorAnterior, porcentajeCambio, tendencia, ticketPromedio, ticketMaximo, ticketMinimo },
 *     cuponesCanjeados: { valor, valorAnterior, porcentajeCambio, tendencia },
 *     ofertasActivas: number,
 *     campanasActivas: number,
 *     likes: { valor, valorAnterior, porcentajeCambio, tendencia },
 *     rating: { valor, totalResenas },
 *     vistas: { valor, valorAnterior, porcentajeCambio, tendencia }
 *   }
 * }
 */
router.get('/kpis', dashboardController.obtenerKPIs);

/**
 * GET /api/business/dashboard/ventas
 * Obtiene ventas agrupadas por día para la gráfica
 * 
 * Query params:
 * - periodo: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio'
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     ventas: [
 *       { fecha: '2026-01-01', diaSemana: 'Lun', total: 1500.00, transacciones: 5 },
 *       ...
 *     ],
 *     estadisticas: {
 *       promedioDiario: number,
 *       diaPico: string,
 *       mejorVenta: number,
 *       crecimiento: number
 *     }
 *   }
 * }
 */
router.get('/ventas', dashboardController.obtenerVentasDiarias);

/**
 * GET /api/business/dashboard/campanas
 * Obtiene ofertas y cupones activos
 * 
 * Query params:
 * - limite: número (default: 5, max: 20)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id, titulo, tipo, valor, fechaInicio, fechaFin,
 *       usosActuales, limiteUsos, tipoCampana: 'oferta' | 'cupon', expirada
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/campanas', dashboardController.obtenerCampanasActivas);

/**
 * GET /api/business/dashboard/interacciones
 * Obtiene feed de interacciones recientes del negocio
 * 
 * Query params:
 * - limite: número (default: 10, max: 20)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       tipo: 'venta' | 'cupon_canjeado' | 'like' | 'nuevo_seguidor' | 'compartido',
 *       id, titulo, descripcion, avatar, createdAt
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/interacciones', dashboardController.obtenerInteracciones);

/**
 * GET /api/business/dashboard/resenas
 * Obtiene las reseñas más recientes
 * 
 * Query params:
 * - limite: número (default: 5, max: 20)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id, rating, texto, createdAt,
 *       autor: { nombre, apellidos, avatar }
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/resenas', dashboardController.obtenerResenasRecientes);

/**
 * GET /api/business/dashboard/alertas
 * Obtiene alertas de seguridad recientes
 * 
 * Query params:
 * - limite: número (default: 5, max: 20)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     alertas: [
 *       { id, tipo, severidad, titulo, descripcion, leida, createdAt },
 *       ...
 *     ],
 *     noLeidas: number
 *   }
 * }
 */
router.get('/alertas', dashboardController.obtenerAlertasRecientes);

/**
 * PUT /api/business/dashboard/alertas/:id
 * Marca una alerta como leída
 * 
 * Response:
 * {
 *   success: true,
 *   message: 'Alerta marcada como leída'
 * }
 */
router.put('/alertas/:id', dashboardController.marcarAlertaLeida);

// =============================================================================
// EXPORT
// =============================================================================

export default router;