/**
 * ============================================================================
 * ARTICULOS ROUTES - Rutas del Catálogo
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/articulos.routes.ts
 * 
 * ENDPOINTS:
 * - GET /api/articulos/negocio/:negocioId → Catálogo de un negocio (público)
 * - POST /api/articulos → Crear artículo (Business Studio)
 * - GET /api/articulos → Listar artículos (Business Studio)
 * - GET /api/articulos/:id → Obtener artículo (Business Studio)
 * - PUT /api/articulos/:id → Actualizar artículo (Business Studio)
 * - DELETE /api/articulos/:id → Eliminar artículo (Business Studio)
 * - POST /api/articulos/:id/duplicar → Duplicar a otras sucursales (solo dueños)
 * 
 * CREADO: Fase 5.3 - Sincronizar Perfil de Negocio
 * AMPLIADO: Fase 5.4.1 - Catálogo CRUD
 * MIGRADO: Enero 2026 - Eliminado /publico (no necesario con auth opcional)
 */

import { Router } from 'express';
import {
    getCatalogoNegocio,
    getArticuloDetalle,
    postRegistrarVista,
    postCrearArticulo,
    getArticulos,
    getArticulo,
    putActualizarArticulo,
    deleteArticulo,
    postDuplicarArticulo,
} from '../controllers/articulos.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS (no requieren autenticación)
// =============================================================================

/**
 * GET /api/articulos/negocio/:negocioId
 * Obtiene el catálogo de productos y servicios de un negocio
 * Query param opcional: ?sucursalId=UUID
 */
router.get('/negocio/:negocioId', getCatalogoNegocio);

/**
 * GET /api/articulos/detalle/:articuloId
 * Obtiene un artículo individual (CON o SIN login)
 * Middleware: verificarTokenOpcional
 * Para: enlaces compartidos Y modal dentro de la app
 */
router.get('/detalle/:articuloId', verificarTokenOpcional, getArticuloDetalle);

/**
 * POST /api/articulos/:id/vista
 * Registra una vista de artículo (incrementa total_vistas)
 * NO requiere autenticación
 */
router.post('/:id/vista', postRegistrarVista);

// =============================================================================
// RUTAS BUSINESS STUDIO (requieren autenticación)
// =============================================================================

/**
 * POST /api/articulos
 * Crea un nuevo artículo y lo asigna a la sucursal activa
 * 
 * Middlewares:
 * - verificarToken: Valida JWT y agrega req.usuario
 * - verificarNegocio: Inyecta req.negocioId (dueño o empleado)
 * - validarAccesoSucursal: Valida acceso según rol (query.sucursalId)
 * 
 * Body: { tipo, nombre, descripcion?, categoria?, precioBase, precioDesde?, imagenPrincipal?, disponible?, destacado? }
 * Query: ?sucursalId=UUID (agregado automáticamente por interceptor Axios)
 */
router.post(
    '/',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    postCrearArticulo
);

/**
 * GET /api/articulos
 * Lista todos los artículos de la sucursal activa
 * 
 * Middlewares:
 * - verificarToken: Valida JWT
 * - verificarNegocio: Inyecta req.negocioId
 * - validarAccesoSucursal: Filtra por sucursalId según rol
 * 
 * Query: ?sucursalId=UUID (agregado automáticamente por interceptor Axios)
 * 
 * Respuesta: Array de artículos con métricas (total_ventas, total_vistas)
 */
router.get(
    '/',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    getArticulos
);

/**
 * GET /api/articulos/:id
 * Obtiene un artículo específico
 * 
 * Middlewares:
 * - verificarToken: Valida JWT
 * - verificarNegocio: Inyecta req.negocioId
 * - validarAccesoSucursal: Valida que pertenezca a la sucursal
 * 
 * Params: id (UUID del artículo)
 * Query: ?sucursalId=UUID
 * 
 * Respuesta: Artículo completo
 */
router.get(
    '/:id',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    getArticulo
);

/**
 * PUT /api/articulos/:id
 * Actualiza un artículo existente
 * 
 * Middlewares:
 * - verificarToken: Valida JWT
 * - verificarNegocio: Inyecta req.negocioId
 * - validarAccesoSucursal: Valida que pertenezca a la sucursal
 * 
 * Params: id (UUID del artículo)
 * Query: ?sucursalId=UUID
 * Body: { nombre?, descripcion?, categoria?, precioBase?, precioDesde?, imagenPrincipal?, disponible?, destacado?, orden? }
 * 
 * Respuesta: Artículo actualizado
 */
router.put(
    '/:id',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    putActualizarArticulo
);

/**
 * DELETE /api/articulos/:id
 * Elimina un artículo completamente
 * CASCADE elimina automáticamente de articulo_sucursales
 * 
 * Middlewares:
 * - verificarToken: Valida JWT
 * - verificarNegocio: Inyecta req.negocioId
 * - validarAccesoSucursal: Valida que pertenezca a la sucursal
 * 
 * Params: id (UUID del artículo)
 * Query: ?sucursalId=UUID
 * 
 * Respuesta: Confirmación de eliminación
 */
router.delete(
    '/:id',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    deleteArticulo
);

/**
 * POST /api/articulos/:id/duplicar
 * Duplica un artículo a otras sucursales (SOLO DUEÑOS)
 * Crea NUEVAS copias independientes en cada sucursal
 * 
 * Middlewares:
 * - verificarToken: Valida JWT
 * - verificarNegocio: Inyecta req.negocioId
 * - NO usa validarAccesoSucursal (operación multi-sucursal)
 * 
 * Validación interna: Solo usuarios SIN sucursalAsignada (dueños) pueden usar esta ruta
 * 
 * Params: id (UUID del artículo original)
 * Body: { sucursalesIds: string[] } - Array de UUIDs de sucursales destino
 * 
 * Respuesta: Array de artículos duplicados con sus IDs y sucursales
 */
router.post(
    '/:id/duplicar',
    verificarToken,
    verificarNegocio,
    // NO validarAccesoSucursal - el controller valida que sea dueño
    postDuplicarArticulo
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;