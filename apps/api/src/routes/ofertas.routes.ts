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
  postRegistrarClick,
  postRegistrarShare,
  getSucursalesDeOferta,
  postCrearOferta,
  getOfertas,
  getOferta,
  putActualizarOferta,
  deleteOferta,
  postDuplicarOferta,
  postUploadImagenOferta,
  postAsignarOferta,
  getBuscarUsuarios,
  postCompartirOfertaChatya,
  postReenviarCupon,
  postRevocarCupon,
  postRevocarCuponMasivo,
  postReactivarCupon,
  getClientesAsignados,
  getMisCupones,
  postRevelarCodigo,
  getMisExclusivas,
  getOfertaPublica,
  getOfertaDestacadaDelDia,
  getSugerenciasOfertas,
  getBuscarOfertas,
} from '../controllers/ofertas.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

const router: ExpressRouter = Router();

// =============================================================================
// RUTAS PÚBLICAS DE OFERTAS (REQUIEREN LOGIN)
// =============================================================================

/**
 * GET /api/ofertas/feed
 * Feed de ofertas geolocalizadas
 *
 * Middleware: verificarTokenOpcional
 * - Lectura pública: se consume desde el perfil público de un negocio
 *   (?sucursalId=) y otras superficies compartibles. Sin sesión, liked/saved
 *   salen en false. Las acciones (guardar/like/métricas) siguen con login.
 * - Incluye liked/saved personalizados cuando hay sesión
 * - Query params: latitud, longitud, distanciaMaxKm, categoriaId, tipo,
 *   busqueda, limite, offset, orden, soloCardya, creadasUltimasHoras
 */
router.get('/feed', verificarTokenOpcional, getFeedOfertas);

/**
 * GET /api/ofertas/detalle/:ofertaId
 * Detalle de una oferta específica
 *
 * Middleware: verificarTokenOpcional
 * - Lectura pública: alimenta el enlace compartible /p/oferta/:id (con OG tags).
 *   El service solo devuelve ofertas con visibilidad 'publico'. Sin sesión,
 *   liked/saved salen en false. Registrar vista/click/share siguen con login
 *   (rutas POST aparte).
 * - Incluye liked/saved personalizados cuando hay sesión
 */
router.get('/detalle/:ofertaId', verificarTokenOpcional, getOfertaDetalle);

/**
 * GET /api/ofertas/:ofertaId/sucursales
 * Lista de sucursales donde aplica la misma oferta operativa.
 * Solo tiene sentido cuando `oferta.totalSucursales > 1`.
 *
 * Middleware: verificarTokenOpcional
 * - Lectura pública: la consume ModalOfertaDetalle (sección "Disponible en N
 *   sucursales") desde el perfil público /p/negocio/:sucursalId y /p/oferta/:id.
 *   El controller no personaliza con la sesión, así que sin login funciona igual.
 */
router.get('/:ofertaId/sucursales', verificarTokenOpcional, getSucursalesDeOferta);

/**
 * GET /api/ofertas/destacada-del-dia
 * Devuelve la oferta destacada vigente (override admin) o, en su defecto,
 * la oferta activa con más vistas en los últimos 7 días.
 *
 * IMPORTANTE: registrada ANTES de cualquier ruta `/:id` para evitar
 * colisiones con el matcher dinámico de Express.
 */
router.get('/destacada-del-dia', verificarToken, getOfertaDestacadaDelDia);

/**
 * GET /api/ofertas/buscar/sugerencias?q=...&ciudad=...
 * Top 5 ofertas activas en la ciudad cuyo título, descripción o nombre del
 * negocio matchea el query (ILIKE substring).
 *
 * Versión sobria del patrón de MarketPlace: sin FTS, sin populares, sin log.
 * IMPORTANTE: declarada ANTES de las rutas paramétricas para que Express no
 * lo confunda con `/:id`.
 */
router.get('/buscar/sugerencias', verificarToken, getSugerenciasOfertas);

/**
 * GET /api/ofertas/buscar?q=...&ciudad=...&tipo=&ordenar=&limit=&offset=
 * Búsqueda completa híbrida (FTS + ILIKE + unaccent) sobre titulo+descripcion
 * + nombre del negocio + categorías. Login obligatorio (regla del proyecto).
 * Declarada ANTES de las rutas paramétricas para evitar colisión con `/:id`.
 */
router.get('/buscar', verificarToken, getBuscarOfertas);

/**
 * GET /api/ofertas/buscar-usuarios?q=...&limit=...
 * Busca usuarios de AnunciaYA (no solo clientes con billetera) para el selector
 * de destinatarios de un cupón en Business Studio.
 *
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 * IMPORTANTE: declarada ANTES de las rutas paramétricas para evitar colisión
 * con `/:id`.
 */
router.get(
  '/buscar-usuarios',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  getBuscarUsuarios
);

/**
 * POST /api/ofertas/:id/vista
 * Registra una vista de oferta (métrica)
 * 
 * Middleware: verificarToken
 * - Incrementa contador de vistas
 * - Llamado cuando se abre el modal de detalle
 */
router.post('/:id/vista', verificarToken, postRegistrarVista);

/**
 * POST /api/ofertas/:id/click
 * Registra un CLICK (engagement) cuando el usuario abre el modal de
 * detalle. Diferente a `vista` (impression al aparecer en viewport).
 * Anti-inflación: 1 click por usuario por día.
 */
router.post('/:id/click', verificarToken, postRegistrarClick);

/**
 * POST /api/ofertas/:id/share
 * Registra un SHARE cuando el usuario comparte la oferta.
 * Anti-inflación: 1 share por usuario por día.
 */
router.post('/:id/share', verificarToken, postRegistrarShare);

// =============================================================================
// RUTAS PÚBLICAS SIN AUTH (código de oferta)
// =============================================================================

/**
 * GET /api/ofertas/publico/:codigo
 * Vista pública de una oferta por código
 * Sin autenticación requerida
 */
router.get('/publico/:codigo', getOfertaPublica);

// =============================================================================
// RUTAS USUARIO AUTENTICADO (ofertas exclusivas)
// =============================================================================

/**
 * GET /api/ofertas/mis-exclusivas
 * Ofertas privadas asignadas al usuario
 */
router.get('/mis-exclusivas', verificarToken, getMisExclusivas);

/**
 * GET /api/ofertas/mis-cupones
 * Lista de cupones del usuario (vista cliente)
 * Query: ?estado=activo|usado|expirado|revocado
 */
router.get('/mis-cupones', verificarToken, getMisCupones);

/**
 * POST /api/ofertas/mis-cupones/:id/revelar
 * Revela el código personal del cupón
 */
router.post('/mis-cupones/:id/revelar', verificarToken, postRevelarCodigo);

// =============================================================================
// RUTAS BUSINESS STUDIO (REQUIEREN AUTH + MODO COMERCIAL + SUCURSAL)
// =============================================================================

/**
 * POST /api/ofertas/upload-imagen
 * Genera presigned URL para subir imagen de oferta a R2
 *
 * Middlewares: verificarToken, verificarNegocio
 * IMPORTANTE: Debe ir ANTES de POST /:id/* para evitar colisiones
 */
router.post(
  '/upload-imagen',
  verificarToken,
  verificarNegocio,
  postUploadImagenOferta
);

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

/**
 * POST /api/ofertas/:id/asignar
 * Asignar oferta privada a usuarios (clientes o no)
 *
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 * (validarAccesoSucursal confina al gerente a su sucursal y provee la sucursal
 * emisora del cupón en ChatYA).
 */
router.post(
  '/:id/asignar',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  postAsignarOferta
);

/**
 * POST /api/ofertas/:id/compartir-chatya
 * Compartir una oferta pública por ChatYA a usuarios del directorio comercial
 *
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
router.post(
  '/:id/compartir-chatya',
  verificarToken,
  verificarNegocio,
  validarAccesoSucursal,
  postCompartirOfertaChatya
);

/**
 * POST /api/ofertas/:id/reenviar
 * Reenviar notificaciones del cupón a clientes asignados
 */
router.post(
  '/:id/reenviar',
  verificarToken,
  verificarNegocio,
  postReenviarCupon
);

/**
 * POST /api/ofertas/:id/revocar
 * Revocar cupón de un usuario específico
 * Body: { usuarioId, motivo? }
 */
router.post(
  '/:id/revocar',
  verificarToken,
  verificarNegocio,
  postRevocarCupon
);

/**
 * POST /api/ofertas/:id/revocar-todos
 * Revocar cupón para TODOS los usuarios activos
 * Body: { motivo? }
 */
router.post(
  '/:id/revocar-todos',
  verificarToken,
  verificarNegocio,
  postRevocarCuponMasivo
);

/**
 * POST /api/ofertas/:id/reactivar
 * Reactivar cupón para todos los usuarios revocados
 */
router.post(
  '/:id/reactivar',
  verificarToken,
  verificarNegocio,
  postReactivarCupon
);

/**
 * GET /api/ofertas/:id/clientes-asignados
 * Obtener clientes a los que se asignó un cupón
 */
router.get(
  '/:id/clientes-asignados',
  verificarToken,
  verificarNegocio,
  getClientesAsignados
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;