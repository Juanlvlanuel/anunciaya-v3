/**
 * ============================================================================
 * VOTOS ROUTES - Rutas de Votos
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/votos.routes.ts
 * 
 * PROPÓSITO:
 * Define las rutas HTTP para likes y seguidos
 * Sistema reutilizable para todas las secciones de AnunciaYA
 * 
 * ENDPOINTS DISPONIBLES:
 * - POST   /api/votos                                  - Crear like o follow
 * - DELETE /api/votos/:entityType/:entityId/:tipoAccion - Eliminar like o follow
 * - GET    /api/seguidos                              - Obtener seguidos del usuario
 * - GET    /api/votos/contadores/:entityType/:entityId - Obtener contadores
 */

import { Router } from 'express';
import {
    crearVotoController,
    eliminarVotoController,
    obtenerSeguidosController,
    obtenerContadoresController,
} from '../controllers/votos.controller';
import { verificarToken } from '../middleware/auth';

const router: Router = Router();

// =============================================================================
// MIDDLEWARE GLOBAL
// =============================================================================
// Todas las rutas requieren autenticación
router.use(verificarToken);

// =============================================================================
// RUTAS
// =============================================================================

/**
 * POST /api/votos
 * Crea un voto (like o follow)
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid-del-negocio",
 *   "tipoAccion": "like" | "follow"
 * }
 * 
 * Response 201:
 * {
 *   "success": true,
 *   "message": "Like registrado correctamente",
 *   "data": {
 *     "id": "123",
 *     "userId": "uuid",
 *     "entityType": "negocio",
 *     "entityId": "uuid",
 *     "tipoAccion": "like",
 *     "createdAt": "2024-12-26T..."
 *   }
 * }
 */
router.post('/', crearVotoController);

/**
 * DELETE /api/votos/:entityType/:entityId/:tipoAccion
 * Elimina un voto (quita like o follow)
 * 
 * Params:
 * - entityType: "negocio" | "articulo" | "publicacion" | etc
 * - entityId: UUID de la entidad
 * - tipoAccion: "like" | "follow"
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Like eliminado correctamente"
 * }
 */
router.delete('/:entityType/:entityId/:tipoAccion', eliminarVotoController);

/**
 * GET /api/seguidos?entityType=sucursal&pagina=1&limite=20&latitud=31.3&longitud=-113.5
 * Obtiene la lista de entidades seguidas del usuario
 * 
 * Query Params:
 * - entityType (opcional): Filtrar por tipo de entidad
 * - pagina (opcional): Número de página (default: 1)
 * - limite (opcional): Items por página (default: 20, max: 100)
 * - latitud (opcional): Latitud GPS para calcular distancia
 * - longitud (opcional): Longitud GPS para calcular distancia
 * - votanteSucursalId (opcional): Auto-agregado por interceptor si modo comercial
 * 
 * Response 200 (cuando entityType='sucursal'):
 * {
 *   "success": true,
 *   "data": {
 *     "seguidos": [
 *       {
 *         "id": "123",
 *         "sucursalId": "uuid",
 *         "nombre": "Imprenta Fin US",
 *         "categoria": "Negocios",
 *         "imagen_perfil": "https://...",
 *         "galeria": [{"url": "...", "titulo": "...", "orden": 1}],
 *         "estaAbierto": null,
 *         "distanciaKm": 0.5,
 *         "calificacionPromedio": "4.5",
 *         "totalCalificaciones": 10,
 *         "whatsapp": "+526381234567",
 *         "liked": true
 *       }
 *     ],
 *     "total": 45,
 *     "pagina": 1,
 *     "limite": 20,
 *     "totalPaginas": 3
 *   }
 * }
 * 
 * Response 200 (otros entityTypes):
 * {
 *   "success": true,
 *   "data": {
 *     "seguidos": [
 *       {
 *         "id": "123",
 *         "entityType": "articulo",
 *         "entityId": "uuid",
 *         "createdAt": "2024-12-26T..."
 *       }
 *     ],
 *     "total": 45,
 *     "pagina": 1,
 *     "limite": 20,
 *     "totalPaginas": 3
 *   }
 * }
 */
router.get('/', obtenerSeguidosController);

/**
 * GET /api/votos/contadores/:entityType/:entityId
 * Obtiene los contadores de likes y follows de una entidad
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "totalLikes": 150,
 *     "totalFollows": 89
 *   }
 * }
 */
router.get('/contadores/:entityType/:entityId', obtenerContadoresController);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;