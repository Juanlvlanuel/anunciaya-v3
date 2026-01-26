/**
 * ============================================================================
 * NEGOCIOS ROUTES - Rutas de Negocios
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/negocios.routes.ts
 * 
 * PROPÓSITO:
 * Define las rutas HTTP para consultar información de negocios y sucursales
 * 
 * ACTUALIZADO: Fase 5.3 - Agregadas rutas de lista y perfil completo
 * 
 * ENDPOINTS DISPONIBLES:
 * - GET    /api/negocios                        - Lista sucursales cercanas (auth)
 * - GET    /api/negocios/sucursal/:id           - Perfil completo (auth opcional)
 * - GET    /api/negocios/:id                    - Info básica del negocio (auth)
 * - GET    /api/negocios/:id/galeria            - Imágenes de galería (auth)
 * - DELETE /api/negocios/:id/logo               - Eliminar logo (auth)
 * - DELETE /api/negocios/:id/portada            - Eliminar portada (auth)
 * - DELETE /api/negocios/:id/galeria/:imageId   - Eliminar imagen (auth)
 * 
 * ACTUALIZADO: Fase 5.3 - Agregadas rutas de lista y perfil completo
 * MIGRADO: Enero 2026 - Auth opcional en /sucursal/:id (eliminado /publico)
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { Router } from 'express';
import {
    listarSucursalesController,
    obtenerPerfilSucursalController,
    obtenerNegocioController,
    obtenerGaleriaController,
    subirLogoController,
    subirFotoPerfilController,
    subirPortadaController,
    subirGaleriaController,
    eliminarLogoController,
    eliminarPortadaController,
    eliminarImagenGaleriaController,
    eliminarFotoPerfilController,
    obtenerSucursalesNegocioController,
    actualizarInformacionController,
    actualizarContactoController,
    actualizarUbicacionController,
    actualizarHorariosController,
    actualizarImagenesController,
    actualizarOperacionController,
} from '../controllers/negocios.controller';
import { verificarToken } from '../middleware/auth';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware';
import { verificarNegocio } from '../middleware/negocio.middleware';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware';

const router: Router = Router();

// =============================================================================
// RUTAS CON AUTH OPCIONAL (funcionan con o sin login)
// =============================================================================

/**
 * GET /api/negocios/sucursal/:id
 * Obtiene perfil completo de una sucursal
 * 
 * Middleware: verificarTokenOpcional
 * - Funciona CON o SIN login
 * - Si hay usuario → incluye liked/saved personalizados
 * - Si NO hay usuario → liked/saved = false
 * 
 * Para: modal de detalle en app Y enlaces compartidos públicos
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "negocioId": "uuid",
 *     "negocioNombre": "Mi Negocio",
 *     "sucursalId": "uuid",
 *     "sucursalNombre": "Sucursal Centro",
 *     "direccion": "Calle 123",
 *     "telefono": "5512345678",
 *     "categorias": [...],
 *     "horarios": [...],
 *     "metodosPago": [...],
 *     "galeria": [...],
 *     "metricas": {...},
 *     "liked": true/false,   // Dinámico según usuario
 *     "saved": true/false    // Dinámico según usuario
 *   }
 * }
 */
router.get('/sucursal/:id', verificarTokenOpcional, obtenerPerfilSucursalController);

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

// Aplicar middleware de autenticación a todas las rutas siguientes
router.use(verificarToken);

/**
 * GET /api/negocios
 * Lista sucursales cercanas con filtros PostGIS
 * 
 * Query Params:
 * - latitud: number (opcional)
 * - longitud: number (opcional)
 * - distanciaMaxKm: number (default: 50)
 * - categoriaId: number (opcional)
 * - subcategoriaIds: string (comma separated, ej: "1,2,3")
 * - metodosPago: string (comma separated, ej: "efectivo,tarjeta")
 * - aceptaCardYA: boolean (opcional)
 * - tieneEnvio: boolean (opcional)
 * - busqueda: string (opcional)
 * - limite: number (default: 20)
 * - offset: number (default: 0)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "negocioId": "uuid",
 *       "negocioNombre": "Mi Negocio",
 *       "sucursalId": "uuid",
 *       "sucursalNombre": "Sucursal Centro",
 *       "distanciaKm": 1.5,
 *       "direccion": "Calle 123",
 *       "categorias": [...],
 *       "metodosPago": [...],
 *       "totalLikes": 150,
 *       "calificacionPromedio": 4.5,
 *       "liked": true,
 *       "saved": false,
 *       "estaAbierto": true
 *     },
 *     ...
 *   ]
 * }
 */

/**
 * PUT /api/negocios/:id/informacion
 * Actualiza información general del negocio (nombre, descripción, categorías, CardYA)
 * Solo dueños - gerentes reciben 403
 */
router.put(
    '/:id/informacion',
    verificarNegocio,
    validarAccesoSucursal,
    actualizarInformacionController
);

/**
 * PUT /api/negocios/:id/contacto
 * Actualiza datos de contacto de la sucursal
 * Dueños: telefono, whatsapp, correo, sitioWeb, redes
 * Gerentes: nombreSucursal, telefono, whatsapp, correo, redes (SIN sitioWeb)
 */
router.put(
    '/:id/contacto',
    verificarNegocio,
    validarAccesoSucursal,
    actualizarContactoController
);

/**
 * PUT /api/negocios/:id/ubicacion
 * Actualiza ubicación de la sucursal (direccion, ciudad, GPS)
 * Todos pueden editar
 */
router.put(
    '/:id/ubicacion',
    verificarNegocio,
    validarAccesoSucursal,
    actualizarUbicacionController
);

/**
 * PUT /api/negocios/:id/horarios
 * Actualiza horarios de los 7 días de la semana
 * Todos pueden editar
 */
router.put(
    '/:id/horarios',
    verificarNegocio,
    validarAccesoSucursal,
    actualizarHorariosController
);

/**
 * PUT /api/negocios/:id/imagenes
 * Actualiza imágenes del negocio/sucursal
 * Dueños: logo, fotoPerfil, portada, galería
 * Gerentes: fotoPerfil, portada, galería (SIN logo)
 */
router.put(
    '/:id/imagenes',
    verificarNegocio,
    validarAccesoSucursal,
    actualizarImagenesController
);

/**
 * PUT /api/negocios/:id/operacion
 * Actualiza métodos de pago y envío
 * Todos pueden editar
 */
router.put(
    '/:id/operacion',
    verificarNegocio,
    validarAccesoSucursal,
    actualizarOperacionController
);


/**
 * POST /api/negocios/:id/logo
 * Sube logo del negocio
 * 
 * Body: { logoUrl: string }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Logo actualizado correctamente"
 * }
 */
router.post(
    '/:id/logo',
    verificarNegocio,
    validarAccesoSucursal,
    subirLogoController
);

/**
 * POST /api/negocios/sucursal/:id/foto-perfil
 * Sube foto de perfil de sucursal
 * 
 * Body: { fotoPerfilUrl: string }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Foto de perfil actualizada correctamente"
 * }
 */
router.post(
    '/sucursal/:id/foto-perfil',
    verificarToken,
    subirFotoPerfilController
);

/**
 * POST /api/negocios/:id/portada
 * Sube portada de sucursal
 * 
 * Query: ?sucursalId=xxx
 * Body: { portadaUrl: string }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Portada actualizada correctamente"
 * }
 */
router.post(
    '/:id/portada',
    verificarNegocio,
    validarAccesoSucursal,
    subirPortadaController
);

/**
 * POST /api/negocios/:id/galeria
 * Agrega imágenes a la galería
 * 
 * Query: ?sucursalId=xxx
 * Body: { imagenes: [{ url: string, cloudinaryPublicId: string }] }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": [
 *     { id: 1, url: "https://...", orden: 1 },
 *     ...
 *   ]
 * }
 */
router.post(
    '/:id/galeria',
    verificarNegocio,
    validarAccesoSucursal,
    subirGaleriaController
);


router.get('/', listarSucursalesController);

/**
 * GET /api/negocios/sucursal/:id/horarios
 * Obtiene solo los horarios de una sucursal (lazy load)
 * Usado para mostrar modal de horarios sin cargar perfil completo
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": [
 *     { "diaSemana": 0, "abierto": false, "horaApertura": null, "horaCierre": null },
 *     { "diaSemana": 1, "abierto": true, "horaApertura": "09:00:00", "horaCierre": "21:00:00" },
 *     ...
 *   ]
 * }
 */
router.get('/sucursal/:id/horarios', async (req, res) => {
    try {
        const { id: sucursalId } = req.params;

        const resultado = await db.execute(sql`
      SELECT 
        dia_semana as "diaSemana",
        abierto,
        hora_apertura as "horaApertura",
        hora_cierre as "horaCierre",
        tiene_horario_comida as "tieneHorarioComida",
        comida_inicio as "comidaInicio",
        comida_fin as "comidaFin"
      FROM negocio_horarios
      WHERE sucursal_id = ${sucursalId}
      ORDER BY dia_semana
    `);

        res.json({
            success: true,
            data: resultado.rows
        });
    } catch (error) {
        console.error('Error al obtener horarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener horarios'
        });
    }
});

/**
 * GET /api/negocios/:negocioId/sucursales
 * Obtiene todas las sucursales de un negocio
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "nombre": "Sucursal Centro",
 *       "esPrincipal": true,
 *       "direccion": "Calle 123",
 *       "ciudad": "CDMX",
 *       "telefono": "5512345678",
 *       "activa": true
 *     }
 *   ]
 * }
 */
router.get('/:negocioId/sucursales', obtenerSucursalesNegocioController);

/**
 * GET /api/negocios/:id
 * Obtiene información básica de un negocio (logo, portada, nombre, etc)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "nombre": "Mi Negocio",
 *     "descripcion": "...",
 *     "logoUrl": "https://...",
 *     "portadaUrl": "https://...",
 *     "sitioWeb": "https://...",
 *     "activo": true,
 *     "verificado": false
 *   }
 * }
 */
router.get('/:id', obtenerNegocioController);

/**
 * GET /api/negocios/:id/galeria
 * Obtiene todas las imágenes de la galería de un negocio
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "url": "https://...",
 *       "titulo": "Foto 1",
 *       "orden": 1,
 *       "cloudinaryPublicId": "..."
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/:id/galeria', obtenerGaleriaController);

/**
 * DELETE /api/negocios/:id/logo
 * Elimina el logo del negocio (pone NULL en BD)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Logo eliminado correctamente"
 * }
 */
router.delete('/:id/logo', eliminarLogoController);

/**
 * DELETE /api/negocios/:id/portada
 * Elimina la portada del negocio (pone NULL en BD)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Portada eliminada correctamente"
 * }
 */
router.delete('/:id/portada', eliminarPortadaController);

/**
 * DELETE /api/negocios/sucursal/:id/foto-perfil
 * Elimina la foto de perfil de la sucursal (pone NULL en BD)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Foto de perfil eliminada correctamente"
 * }
 */
router.delete('/sucursal/:id/foto-perfil', eliminarFotoPerfilController);

/**
 * DELETE /api/negocios/:negocioId/galeria/:imageId
 * Elimina una imagen específica de la galería
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Imagen eliminada de galería"
 * }
 */
router.delete('/:negocioId/galeria/:imageId', eliminarImagenGaleriaController);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;