/**
 * vacantes.routes.ts
 * ====================
 * Rutas del módulo "Vacantes" en Business Studio (Sprint 8).
 *
 * Ubicación: apps/api/src/routes/vacantes.routes.ts
 *
 * RUTAS (todas montadas bajo /api/business-studio/vacantes):
 *
 *   GET    /                     → lista paginada (filtrada por sucursal activa)
 *   GET    /kpis                 → 4 KPIs: total, activas, por expirar, conversaciones
 *   POST   /                     → crear vacante (fuerza modo='solicito' + tipo='vacante-empresa')
 *   PUT    /:id                  → actualizar campos
 *   PATCH  /:id/estado           → pausar/reactivar (estado='activa'|'pausada')
 *   PATCH  /:id/cerrar           → cerrar (estado='cerrada' — puesto cubierto)
 *   DELETE /:id                  → soft delete
 *
 * Middleware obligatorio:
 *   - verificarToken         → usuario autenticado
 *   - verificarNegocio       → tiene negocio activo
 *   - validarAccesoSucursal  → tiene acceso a la sucursal del query string
 *
 * IMPORTANTE: las rutas con parámetros (:id) van DESPUÉS de las estáticas
 * (/kpis, /) para que Express no interprete "kpis" como :id.
 */

import { Router, type Router as RouterType } from 'express';
import {
    listarVacantesController,
    obtenerKpisVacantesController,
    crearVacanteController,
    actualizarVacanteController,
    cambiarEstadoVacanteController,
    cerrarVacanteController,
    eliminarVacanteController,
} from '../controllers/vacantes.controller.js';

import { verificarToken } from '../middleware/auth.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

const router: RouterType = Router();

// =============================================================================
// MIDDLEWARE GLOBAL
// =============================================================================
router.use(verificarToken);
router.use(verificarNegocio);
router.use(validarAccesoSucursal);

// =============================================================================
// RUTAS ESTÁTICAS (van primero)
// =============================================================================

/**
 * GET /api/business-studio/vacantes/kpis?sucursalId=...
 * 4 métricas para las cards arriba de la lista.
 */
router.get('/kpis', obtenerKpisVacantesController);

/**
 * GET /api/business-studio/vacantes?sucursalId=...&estado=...&busqueda=...&limit=...&offset=...
 * Lista paginada de vacantes de la sucursal activa.
 */
router.get('/', listarVacantesController);

/**
 * POST /api/business-studio/vacantes
 * Crear nueva vacante. La sucursalId va en el body (decidida por el operador
 * en el dropdown del slideover).
 */
router.post('/', crearVacanteController);

// =============================================================================
// RUTAS CON PARÁMETROS
// =============================================================================

/**
 * PATCH /api/business-studio/vacantes/:id/cerrar
 * Cierra la vacante (estado='cerrada'). Distinto de pausar.
 */
router.patch('/:id/cerrar', cerrarVacanteController);

/**
 * PATCH /api/business-studio/vacantes/:id/estado
 * Pausar o reactivar. Body: { estado: 'activa' | 'pausada' }.
 */
router.patch('/:id/estado', cambiarEstadoVacanteController);

/**
 * PUT /api/business-studio/vacantes/:id
 * Actualizar campos. Soporta update parcial.
 */
router.put('/:id', actualizarVacanteController);

/**
 * DELETE /api/business-studio/vacantes/:id
 * Soft delete (estado='eliminada' + deleted_at=NOW()).
 */
router.delete('/:id', eliminarVacanteController);

export default router;
