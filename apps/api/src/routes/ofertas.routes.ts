/**
 * ============================================================================
 * OFERTAS ROUTES - Rutas de la API
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/ofertas.routes.ts
 * 
 * PROPÓSITO:
 * Define las rutas HTTP para ofertas con middlewares apropiados
 * 
 * ARQUITECTURA DUAL:
 * 1. Feed público: /feed, /detalle/:id (ambos modos - requiere auth)
 * 2. CRUD Business Studio: CRUD completo (solo modo comercial)
 * 3. Vista pública: /publico/:id (sin auth - para compartir)
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 * ACTUALIZADO: Enero 2026 - Endpoint público para compartir
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getFeedOfertas,
  getOfertaDetalle,
  postRegistrarVista,
  postCrearOferta,
  getOfertas,
  getOferta,
  putActualizarOferta,
  deleteOferta,
  postDuplicarOferta,
} from '../controllers/ofertas.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

const router: ExpressRouter = Router();

// =============================================================================
// RUTAS PÚBLICAS (Auth opcional - funcionan con o sin login)
// =============================================================================

/**
 * GET /api/ofertas/feed
 * Feed de ofertas geolocalizadas
 * 
 * Middleware: verificarTokenOpcional
 * - Funciona CON o SIN login
 * - Si hay usuario → incluye liked/saved personalizados
 * - Si NO hay usuario → liked/saved = false
 * - Query params: latitud, longitud, distanciaMaxKm, categoriaId, tipo, busqueda, limite, offset
 */
router.get('/feed', verificarTokenOpcional, getFeedOfertas);

/**
 * GET /api/ofertas/detalle/:ofertaId
 * Detalle de una oferta específica
 * 
 * Middleware: verificarTokenOpcional
 * - Para modal de detalle o enlaces compartidos
 * - Funciona CON o SIN login
 * - Si hay usuario → incluye liked/saved personalizados
 * - Si NO hay usuario → liked/saved = false
 */
router.get('/detalle/:ofertaId', verificarTokenOpcional, getOfertaDetalle);

/**
 * POST /api/ofertas/:id/vista
 * Registra una vista de oferta (métrica)
 * 
 * Middleware: verificarToken
 * - Incrementa contador de vistas
 * - Llamado cuando se abre el modal de detalle
 */
router.post('/:id/vista', verificarToken, postRegistrarVista);

// =============================================================================
// RUTAS BUSINESS STUDIO (REQUIEREN AUTH + MODO COMERCIAL + SUCURSAL)
// =============================================================================

/**
 * POST /api/ofertas
 * Crear nueva oferta
 * 
 * Middlewares:
 * - verificarToken: Usuario autenticado
 * - verificarNegocio: Modo comercial + inyecta negocioId
 * - validarAccesoSucursal: Valida acceso a la sucursal (dueño o manager asignado)
 * 
 * Body: { titulo, descripcion, tipo, valor, compraMinima, fechaInicio, fechaFin, limiteUsos, articuloId, activo }
 * Query: sucursalId (agregado automáticamente por interceptor Axios)
 */
router.post(
  '/',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  postCrearOferta
);

/**
 * GET /api/ofertas
 * Listar ofertas de la sucursal
 * 
 * Middlewares:
 * - verificarToken: Usuario autenticado
 * - verificarNegocio: Modo comercial + inyecta negocioId
 * - validarAccesoSucursal: Valida acceso a la sucursal
 * 
 * Query: sucursalId (agregado automáticamente por interceptor Axios)
 * Returns: Array de ofertas con métricas y estado
 */
router.get(
  '/',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  getOfertas
);

/**
 * GET /api/ofertas/:id
 * Obtener una oferta específica
 * 
 * Middlewares:
 * - verificarToken: Usuario autenticado
 * - verificarNegocio: Modo comercial + inyecta negocioId
 * - validarAccesoSucursal: Valida acceso a la sucursal
 * 
 * Params: id (UUID de la oferta)
 * Query: sucursalId
 */
router.get(
  '/:id',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  getOferta
);

/**
 * PUT /api/ofertas/:id
 * Actualizar oferta existente
 * 
 * Middlewares:
 * - verificarToken: Usuario autenticado
 * - verificarNegocio: Modo comercial + inyecta negocioId
 * - validarAccesoSucursal: Valida acceso a la sucursal
 * 
 * Params: id (UUID de la oferta)
 * Body: Campos a actualizar (todos opcionales)
 * Query: sucursalId
 */
router.put(
  '/:id',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  putActualizarOferta
);

/**
 * DELETE /api/ofertas/:id
 * Eliminar oferta
 * 
 * Middlewares:
 * - verificarToken: Usuario autenticado
 * - verificarNegocio: Modo comercial + inyecta negocioId
 * - validarAccesoSucursal: Valida acceso a la sucursal
 * 
 * Params: id (UUID de la oferta)
 * Query: sucursalId
 */
router.delete(
  '/:id',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  deleteOferta
);

/**
 * POST /api/ofertas/:id/duplicar
 * Duplicar oferta a otras sucursales (SOLO DUEÑOS)
 * 
 * Middlewares:
 * - verificarToken: Usuario autenticado
 * - verificarNegocio: Modo comercial + inyecta negocioId
 * - NO usa validarAccesoSucursal (operación multi-sucursal)
 * 
 * Validación adicional: Usuario NO debe tener sucursalAsignada (solo dueños)
 * 
 * Params: id (UUID de la oferta original)
 * Body: { sucursalesIds: string[] }
 */
router.post(
  '/:id/duplicar',
  verificarToken,
  verificarNegocio,
  postDuplicarOferta
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;