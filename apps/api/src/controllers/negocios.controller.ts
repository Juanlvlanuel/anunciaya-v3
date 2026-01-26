/**
 * ============================================================================
 * NEGOCIOS CONTROLLER - Controlador de Negocios
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/negocios.controller.ts
 * 
 * PROPÓSITO:
 * Maneja las peticiones HTTP relacionadas con negocios y sucursales
 * 
 * ACTUALIZADO: Fase 5.3 - Agregados endpoints de lista y perfil completo
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import {
    listarSucursalesCercanas,
    obtenerPerfilSucursal,
    obtenerNegocioPorId,
    obtenerGaleriaNegocio,
    obtenerSucursalesNegocio,
} from '../services/negocios.service';

import {
    eliminarLogoNegocio,
    eliminarPortadaSucursal,
    eliminarImagenGaleria,
    actualizarInfoGeneral,
    actualizarDescripcionNegocio,
    actualizarParticipacionPuntos,
    actualizarContactoSucursal,
    actualizarContactoNegocio,
    actualizarRedesSocialesSucursal,
    actualizarNombreSucursal,
    actualizarSucursal,
    actualizarHorariosSucursal,
    actualizarLogoNegocio,
    actualizarFotoPerfilSucursal,
    actualizarPortadaSucursal,
    agregarImagenesGaleria,
    actualizarMetodosPagoNegocio,
    actualizarEnvioDomicilio,
    actualizarServicioDomicilio,
    eliminarFotoPerfilSucursal,
} from '../services/negocioManagement.service';

// =============================================================================
// LISTAR SUCURSALES CERCANAS (NUEVO - Fase 5.3)
// =============================================================================

/**
 * GET /api/negocios
 * Lista sucursales cercanas con filtros PostGIS
 * 
 * Query Params:
 * - latitud: number
 * - longitud: number
 * - distanciaMaxKm: number (default: 50)
 * - categoriaId: number
 * - subcategoriaIds: number[] (comma separated)
 * - metodosPago: string[] (comma separated)
 * - aceptaCardYA: boolean
 * - tieneEnvio: boolean
 * - busqueda: string
 * - limite: number (default: 20)
 * - offset: number (default: 0)
 * - votanteSucursalId: string (UUID de sucursal si está en modo comercial)
 */
export async function listarSucursalesController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId || null;

        // Parsear query params
        const latitud = req.query.latitud ? parseFloat(req.query.latitud as string) : undefined;
        const longitud = req.query.longitud ? parseFloat(req.query.longitud as string) : undefined;
        const distanciaMaxKm = req.query.distanciaMaxKm ? parseFloat(req.query.distanciaMaxKm as string) : 50;
        const categoriaId = req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined;
        const subcategoriaIds = req.query.subcategoriaIds
            ? (req.query.subcategoriaIds as string).split(',').map(id => parseInt(id))
            : undefined;
        const metodosPago = req.query.metodosPago
            ? (req.query.metodosPago as string).split(',')
            : undefined;
        const aceptaCardYA = req.query.aceptaCardYA === 'true' ? true : req.query.aceptaCardYA === 'false' ? false : undefined;
        const tieneEnvio = req.query.tieneEnvio === 'true' ? true : req.query.tieneEnvio === 'false' ? false : undefined;
        const busqueda = req.query.busqueda as string | undefined;
        const limite = req.query.limite ? parseInt(req.query.limite as string) : 20;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
        const votanteSucursalId = req.query.votanteSucursalId as string | undefined;

        const resultado = await listarSucursalesCercanas(userId, {
            latitud,
            longitud,
            distanciaMaxKm,
            categoriaId,
            subcategoriaIds,
            metodosPago,
            aceptaCardYA,
            tieneEnvio,
            busqueda,
            limite,
            offset,
            votanteSucursalId: votanteSucursalId || null,
        });

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al listar sucursales:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al listar sucursales',
        });
    }
}

// =============================================================================
// OBTENER PERFIL COMPLETO DE SUCURSAL (NUEVO - Fase 5.3)
// =============================================================================

/**
 * GET /api/negocios/sucursal/:id
 * Obtiene perfil completo de una sucursal con métricas
 * Requiere autenticación
 * 
 * Query Params:
 * - votanteSucursalId: string (UUID de sucursal si está en modo comercial)
 */
export async function obtenerPerfilSucursalController(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.usuario?.usuarioId || null;
        const votanteSucursalId = req.query.votanteSucursalId as string | undefined;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de sucursal es requerido',
            });
        }

        const resultado = await obtenerPerfilSucursal(id, userId, votanteSucursalId || null);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener perfil de sucursal:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener perfil',
        });
    }
}

// =============================================================================
// OBTENER PERFIL PÚBLICO (NUEVO - Fase 5.3)
// =============================================================================

/**
 * GET /api/negocios/publico/:id
 * Obtiene perfil completo de una sucursal SIN autenticación
 * Para enlaces compartidos
 */
// =============================================================================
// OBTENER SUCURSALES DE UN NEGOCIO (NUEVO - Fase 5.4)
// =============================================================================

/**
 * GET /api/negocios/:negocioId/sucursales
 * Obtiene todas las sucursales de un negocio
 */
export async function obtenerSucursalesNegocioController(req: Request, res: Response) {
    try {
        const { negocioId } = req.params;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'ID de negocio es requerido',
            });
        }

        const resultado = await obtenerSucursalesNegocio(negocioId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener sucursales:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener sucursales',
        });
    }
}

// =============================================================================
// CONTROLADORES EXISTENTES (SIN CAMBIOS)
// =============================================================================

/**
 * GET /api/negocios/:id
 * Obtiene información básica de un negocio (logo, portada, nombre, etc)
 */
export async function obtenerNegocioController(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de negocio es requerido',
            });
        }

        const resultado = await obtenerNegocioPorId(id);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener negocio:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener negocio',
        });
    }
}

/**
 * GET /api/negocios/:id/galeria
 * Obtiene todas las imágenes de la galería de un negocio
 */
export async function obtenerGaleriaController(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de negocio es requerido',
            });
        }

        const resultado = await obtenerGaleriaNegocio(id);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener galería:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener galería',
        });
    }
}

/**
 * DELETE /api/negocios/:id/logo
 * Elimina el logo del negocio (pone NULL en BD)
 */
export async function eliminarLogoController(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de negocio es requerido',
            });
        }

        const resultado = await eliminarLogoNegocio(id);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al eliminar logo:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al eliminar logo',
        });
    }
}

/**
 * DELETE /api/negocios/:id/portada
 * Elimina la portada del negocio (pone NULL en BD)
 */
export async function eliminarPortadaController(req: Request, res: Response) {
    try {
        const sucursalId = req.query.sucursalId as string;

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        const resultado = await eliminarPortadaSucursal(sucursalId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al eliminar portada:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al eliminar portada',
        });
    }
}

/**
 * DELETE /api/negocios/:negocioId/galeria/:imageId
 * Elimina una imagen de la galería
 */
export async function eliminarImagenGaleriaController(req: Request, res: Response) {
    try {
        const { imageId } = req.params;

        if (!imageId) {
            return res.status(400).json({
                success: false,
                message: 'ID de imagen es requerido',
            });
        }

        const resultado = await eliminarImagenGaleria(parseInt(imageId));

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al eliminar imagen de galería:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al eliminar imagen',
        });
    }
}

/**
 * DELETE /api/negocios/sucursal/:id/foto-perfil
 * Elimina la foto de perfil de la sucursal (pone NULL en BD + elimina de Cloudinary)
 */
export async function eliminarFotoPerfilController(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de sucursal es requerido',
            });
        }

        const resultado = await eliminarFotoPerfilSucursal(id);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al eliminar foto de perfil:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al eliminar foto de perfil',
        });
    }
}

/**
 * POST /api/negocios/:id/logo
 * Sube logo del negocio a Cloudinary y guarda en BD
 */
export async function subirLogoController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { logoUrl } = req.body;

        if (!logoUrl) {
            return res.status(400).json({
                success: false,
                message: 'URL del logo es requerida',
            });
        }

        const resultado = await actualizarLogoNegocio(negocioId, logoUrl);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al subir logo:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al subir logo',
        });
    }
}

/**
 * POST /api/negocios/sucursal/:id/foto-perfil
 * Sube foto de perfil de sucursal a Cloudinary y guarda en BD
 */
export async function subirFotoPerfilController(req: Request, res: Response) {
    try {
        const { id: sucursalId } = req.params;
        const { fotoPerfilUrl } = req.body;

        if (!fotoPerfilUrl) {
            return res.status(400).json({
                success: false,
                message: 'URL de la foto de perfil es requerida',
            });
        }

        const resultado = await actualizarFotoPerfilSucursal(sucursalId, fotoPerfilUrl);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al subir foto de perfil:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al subir foto de perfil',
        });
    }
}

/**
 * POST /api/negocios/:id/portada
 * Sube portada de sucursal a Cloudinary y guarda en BD
 */
export async function subirPortadaController(req: Request, res: Response) {
    try {
        const { portadaUrl } = req.body;
        const sucursalId = req.query.sucursalId as string;

        if (!portadaUrl) {
            return res.status(400).json({
                success: false,
                message: 'URL de la portada es requerida',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        const resultado = await actualizarPortadaSucursal(sucursalId, portadaUrl);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al subir portada:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al subir portada',
        });
    }
}

/**
 * POST /api/negocios/:id/galeria
 * Agrega imágenes a la galería en Cloudinary y BD
 */
export async function subirGaleriaController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { imagenes } = req.body; // Array de { url, cloudinaryPublicId }
        const sucursalId = req.query.sucursalId as string;

        if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Imágenes son requeridas',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        const resultado = await agregarImagenesGaleria(negocioId, sucursalId, imagenes);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al subir galería:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al subir galería',
        });
    }
}

// =============================================================================
// TAB 1: DATOS DEL NEGOCIO (INFORMACIÓN)
// =============================================================================

/**
 * PUT /api/negocios/:id/informacion
 * Actualiza información general del negocio
 * Solo dueños - gerentes reciben 403
 * 
 * Body:
 * {
 *   nombre: string,
 *   descripcion: string,
 *   subcategoriasIds: number[],
 *   participaCardYA: boolean
 * }
 */
export async function actualizarInformacionController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { nombre, descripcion, subcategoriasIds, participaCardYA } = req.body;
        const userId = (req as any).usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        // CRÍTICO: Bloquear gerentes de editar información de nivel negocio
        const queryUsuario = await db.execute(sql`
            SELECT sucursal_asignada 
            FROM usuarios 
            WHERE id = ${userId as string}
        `);

        if (queryUsuario.rows.length > 0 && queryUsuario.rows[0].sucursal_asignada !== null) {
            return res.status(403).json({
                success: false,
                message: 'Los gerentes no pueden editar información del negocio. Esta acción requiere permisos de dueño.',
            });
        }

        // Validaciones básicas
        if (!nombre || nombre.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del negocio es requerido',
            });
        }

        if (!subcategoriasIds || subcategoriasIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar al menos 1 subcategoría',
            });
        }

        if (subcategoriasIds.length > 3) {
            return res.status(400).json({
                success: false,
                message: 'Máximo 3 subcategorías permitidas',
            });
        }

        // 1. Actualizar nombre y subcategorías
        await actualizarInfoGeneral(negocioId, {
            nombre: nombre.trim(),
            subcategoriasIds,
        });

        // 2. Actualizar descripción (si viene)
        if (descripcion !== undefined) {
            await actualizarDescripcionNegocio(negocioId, descripcion.trim());
        }

        // 3. Actualizar participación en CardYA
        await actualizarParticipacionPuntos(negocioId, {
            participaPuntos: participaCardYA ?? true,
        });

        res.status(200).json({
            success: true,
            message: 'Información actualizada correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar información:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar información',
        });
    }
}

// =============================================================================
// TAB 2: CONTACTO / DATOS DE SUCURSAL
// =============================================================================

/**
 * PUT /api/negocios/:id/contacto
 * Actualiza datos de contacto
 * Dueños: telefono, whatsapp, correo, sitioWeb, redes
 * Gerentes: nombreSucursal, telefono, whatsapp, correo, redes (SIN sitioWeb)
 */
export async function actualizarContactoController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { nombreSucursal, telefono, whatsapp, correo, sitioWeb, redesSociales } = req.body;
        const userId = (req as any).usuario?.usuarioId;
        const sucursalId = req.query.sucursalId as string | undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'No hay sucursal activa',
            });
        }

        // Verificar si es gerente (sucursal_asignada !== null)
        const queryUsuario = await db.execute(sql`
            SELECT sucursal_asignada 
            FROM usuarios 
            WHERE id = ${userId as string}
        `);

        const esGerente = queryUsuario.rows[0]?.sucursal_asignada !== null;

        // 1. Actualizar nombre de sucursal (solo gerentes)
        if (nombreSucursal && esGerente) {
            await actualizarNombreSucursal(sucursalId, nombreSucursal);
        }

        // 2. Actualizar contacto de sucursal
        await actualizarContactoSucursal(sucursalId, {
            telefono: telefono || null,
            whatsapp: whatsapp || null,
        });

        // 3. Actualizar correo en sucursal
        if (correo !== undefined) {
            await db.execute(sql`
                UPDATE negocio_sucursales 
                SET correo = ${correo || null}, updated_at = NOW()
                WHERE id = ${sucursalId as string}
            `);
        }

        // 4. Actualizar redes sociales
        if (redesSociales) {
            await actualizarRedesSocialesSucursal(sucursalId, redesSociales);
        }

        // 5. Actualizar sitio web (solo dueños)
        if (sitioWeb !== undefined && !esGerente) {
            await actualizarContactoNegocio(negocioId, { sitioWeb });
        }

        res.status(200).json({
            success: true,
            message: 'Contacto actualizado correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar contacto:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar contacto',
        });
    }
}

// =============================================================================
// TAB 3: UBICACIÓN
// =============================================================================

/**
 * PUT /api/negocios/:id/ubicacion
 * Actualiza ubicación de la sucursal
 */
export async function actualizarUbicacionController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { direccion, ciudad, latitud, longitud, zonaHoraria } = req.body;
        const userId = (req as any).usuario?.usuarioId;
        const sucursalId = req.query.sucursalId as string | undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'No hay sucursal activa',
            });
        }

        // Validaciones
        if (!direccion || !ciudad || latitud === undefined || longitud === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Dirección, ciudad, latitud y longitud son requeridos',
            });
        }

        await actualizarSucursal(negocioId, {
            direccion,
            ciudad,
            latitud,
            longitud,
            zonaHoraria: zonaHoraria || 'America/Mexico_City',
        });

        res.status(200).json({
            success: true,
            message: 'Ubicación actualizada correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar ubicación:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar ubicación',
        });
    }
}

// =============================================================================
// TAB 4: HORARIOS
// =============================================================================

/**
 * PUT /api/negocios/:id/horarios
 * Actualiza horarios de la sucursal
 */
export async function actualizarHorariosController(req: Request, res: Response) {
    try {
        const { horarios } = req.body;
        const userId = (req as any).usuario?.usuarioId;
        const sucursalId = req.query.sucursalId as string | undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'No hay sucursal activa',
            });
        }

        // Validaciones
        if (!horarios || !Array.isArray(horarios)) {
            return res.status(400).json({
                success: false,
                message: 'Horarios debe ser un array',
            });
        }

        if (horarios.length !== 7) {
            return res.status(400).json({
                success: false,
                message: 'Debes proporcionar horarios para los 7 días',
            });
        }

        await actualizarHorariosSucursal(sucursalId, { horarios });

        res.status(200).json({
            success: true,
            message: 'Horarios actualizados correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar horarios:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar horarios',
        });
    }
}

// =============================================================================
// TAB 5: IMÁGENES
// =============================================================================

/**
 * PUT /api/negocios/:id/imagenes
 * Actualiza imágenes del negocio/sucursal
 * Dueños: logo, fotoPerfil, portada, galería
 * Gerentes: fotoPerfil, portada, galería (SIN logo)
 */
export async function actualizarImagenesController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { logoUrl, fotoPerfilUrl, portadaUrl, galeriaUrls } = req.body;
        const userId = (req as any).usuario?.usuarioId;
        const sucursalId = req.query.sucursalId as string | undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'No hay sucursal activa',
            });
        }

        // Verificar si es gerente
        const queryUsuario = await db.execute(sql`
            SELECT sucursal_asignada 
            FROM usuarios 
            WHERE id = ${userId as string}
        `);

        const esGerente = queryUsuario.rows[0]?.sucursal_asignada !== null;

        // 1. Actualizar logo (solo dueños)
        if (logoUrl && !esGerente) {
            await actualizarLogoNegocio(negocioId, logoUrl);
        }

        // 2. Actualizar foto de perfil
        if (fotoPerfilUrl) {
            await actualizarFotoPerfilSucursal(sucursalId, fotoPerfilUrl);
        }

        // 3. Actualizar portada
        if (portadaUrl) {
            await actualizarPortadaSucursal(sucursalId, portadaUrl);
        }

        // 4. Actualizar galería
        if (galeriaUrls && Array.isArray(galeriaUrls)) {
            await agregarImagenesGaleria(negocioId, sucursalId, galeriaUrls);
        }

        res.status(200).json({
            success: true,
            message: 'Imágenes actualizadas correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar imágenes:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar imágenes',
        });
    }
}

// =============================================================================
// TAB 6: OPERACIÓN - VERSIÓN CORREGIDA
// =============================================================================

/**
 * PUT /api/negocios/:id/operacion
 * Actualiza configuración de operación (NIVEL SUCURSAL)
 * 
 * Body:
 * {
 *   metodosPago: string[],  // ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia']
 *   tieneEnvio: boolean,
 *   tieneServicio: boolean
 * }
 */
export async function actualizarOperacionController(req: Request, res: Response) {
    try {
        const { id: negocioId } = req.params;
        const { metodosPago, tieneEnvio, tieneServicio } = req.body;
        const userId = (req as any).usuario?.usuarioId;
        const sucursalId = req.query.sucursalId as string | undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'No hay sucursal activa',
            });
        }

        // Validaciones
        if (!metodosPago || !Array.isArray(metodosPago)) {
            return res.status(400).json({
                success: false,
                message: 'Métodos de pago debe ser un array',
            });
        }

        if (metodosPago.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar al menos un método de pago',
            });
        }

        // Validar que los métodos sean válidos
        const metodosValidos = ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia'];
        const metodosInvalidos = metodosPago.filter(m => !metodosValidos.includes(m));

        if (metodosInvalidos.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Métodos de pago inválidos: ${metodosInvalidos.join(', ')}`,
            });
        }

        // 1. Actualizar métodos de pago (NIVEL SUCURSAL)
        await actualizarMetodosPagoNegocio(negocioId, sucursalId, { metodos: metodosPago });

        // 2. Actualizar envío a domicilio
        if (tieneEnvio !== undefined) {
            await actualizarEnvioDomicilio(sucursalId, tieneEnvio);
        }

        // 3. Actualizar servicio a domicilio
        if (tieneServicio !== undefined) {
            await actualizarServicioDomicilio(sucursalId, tieneServicio);
        }

        res.status(200).json({
            success: true,
            message: 'Operación actualizada correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar operación:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar operación',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
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
};