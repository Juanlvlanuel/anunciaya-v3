/**
 * ============================================================================
 * ARTICULOS CONTROLLER - Manejo de Peticiones HTTP
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/articulos.controller.ts
 * 
 * PROPÓSITO:
 * Controlador para endpoints relacionados con artículos (catálogo)
 * 
 * CREADO: Fase 5.3 - Sincronizar Perfil de Negocio
 * AMPLIADO: Fase 5.4.1 - Catálogo CRUD
 */

import { Request, Response } from 'express';
import {
    obtenerCatalogoNegocio,
    obtenerArticuloDetalle,
    registrarVistaArticulo,
    crearArticulo,
    crearArticulosLote,
    sugerirArticulosLoteConIA,
    sugerirArticulosLoteTextoConIA,
    obtenerArticulos,
    obtenerArticuloPorId,
    actualizarArticulo,
    eliminarArticulo,
    duplicarArticuloASucursales,
    generarUrlUploadImagenArticulo,
} from '../services/articulos.service.js';
import {
    crearArticuloSchema,
    crearArticuloLoteSchema,
    actualizarArticuloSchema,
    duplicarArticuloSchema,
    sugerirArticulosLoteIASchema,
    sugerirArticulosLoteTextoIASchema,
    formatearErroresZod,
} from '../validations/articulos.schema.js';

// =============================================================================
// PÚBLICOS (NO REQUIEREN AUTENTICACIÓN)
// =============================================================================

/**
 * GET /api/articulos/negocio/:negocioId
 * Obtiene el catálogo de productos y servicios de un negocio
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de la sucursal (query opcional)
 * @returns Lista de artículos disponibles
 */
export async function getCatalogoNegocio(req: Request, res: Response) {
    try {
        const { negocioId } = req.params;

        // Validar que se envió el negocioId
        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del negocio es requerido',
            });
        }

        // Validar formato UUID básico
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(negocioId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del negocio no es válido',
            });
        }

        const sucursalId = req.query.sucursalId as string | undefined;
        const resultado = await obtenerCatalogoNegocio(negocioId, sucursalId);

        return res.json(resultado);

    } catch (error) {
        console.error('Error en getCatalogoNegocio:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el catálogo',
        });
    }
}

/**
 * GET /api/articulos/detalle/:articuloId
 * Obtiene un artículo individual (funciona con o sin auth)
 * Middleware: verificarTokenOpcional
 */
export async function getArticuloDetalle(req: Request, res: Response) {
    try {
        const { articuloId } = req.params;

        if (!articuloId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo es requerido',
            });
        }

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(articuloId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        // req.usuario puede ser undefined si no hay token
        // Por ahora no usamos userId (futuro: likes/saves)
        const resultado = await obtenerArticuloDetalle(articuloId);

        if (!resultado.success) {
            return res.status(404).json(resultado);
        }

        return res.json(resultado);

    } catch (error) {
        console.error('Error en getArticuloDetalle:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el artículo',
        });
    }
}

// =============================================================================
// BUSINESS STUDIO (REQUIEREN AUTENTICACIÓN)
// =============================================================================

/**
 * POST /api/articulos
 * Crea un nuevo artículo y lo asigna a la sucursal activa
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function postCrearArticulo(req: Request, res: Response) {
    try {
        // Validar datos con Zod
        const validacion = crearArticuloSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        // Obtener negocioId (inyectado por middleware verificarNegocio)
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el negocio',
            });
        }

        // Obtener sucursalId (del query, agregado por interceptor Axios)
        const sucursalId = req.query.sucursalId as string;

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal es requerido',
            });
        }

        // Crear artículo
        const resultado = await crearArticulo(negocioId, sucursalId, validacion.data);

        return res.status(201).json(resultado);

    } catch (error) {
        console.error('Error en postCrearArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear el artículo',
        });
    }
}

/**
 * POST /api/articulos/bulk
 * Crea varios artículos de una sola vez (Alta Rápida de Catálogo)
 *
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 * Body: CrearArticuloInput[] (1 a 100 elementos)
 */
export async function postCrearArticulosLote(req: Request, res: Response) {
    try {
        // Validar datos con Zod
        const validacion = crearArticuloLoteSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        // Obtener negocioId (inyectado por middleware verificarNegocio)
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el negocio',
            });
        }

        // Obtener sucursalId (del query, agregado por interceptor Axios)
        const sucursalId = req.query.sucursalId as string;

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal es requerido',
            });
        }

        // Crear artículos en lote
        const resultado = await crearArticulosLote(negocioId, sucursalId, validacion.data);

        return res.status(201).json(resultado);

    } catch (error) {
        console.error('Error en postCrearArticulosLote:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear los artículos',
        });
    }
}

/**
 * GET /api/articulos
 * Lista todos los artículos de la sucursal activa
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function getArticulos(req: Request, res: Response) {
    try {
        // Obtener negocioId (inyectado por middleware verificarNegocio)
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el negocio',
            });
        }

        // Obtener sucursalId (del query, agregado por interceptor Axios)
        const sucursalId = req.query.sucursalId as string;

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal es requerido',
            });
        }

        // Obtener artículos
        const resultado = await obtenerArticulos(negocioId, sucursalId);

        return res.json(resultado);

    } catch (error) {
        console.error('Error en getArticulos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener artículos',
        });
    }
}

/**
 * GET /api/articulos/:id
 * Obtiene un artículo específico
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function getArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        // Obtener negocioId y sucursalId
        const negocioId = req.negocioId;
        const sucursalId = req.query.sucursalId as string;

        if (!negocioId || !sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        // Obtener artículo
        const resultado = await obtenerArticuloPorId(id, negocioId, sucursalId);

        if (!resultado.success) {
            return res.status(404).json(resultado);
        }

        return res.json(resultado);

    } catch (error) {
        console.error('Error en getArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el artículo',
        });
    }
}

/**
 * PUT /api/articulos/:id
 * Actualiza un artículo existente
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function putActualizarArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        // Validar datos con Zod
        const validacion = actualizarArticuloSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        // Obtener negocioId y sucursalId
        const negocioId = req.negocioId;
        const sucursalId = req.query.sucursalId as string;

        if (!negocioId || !sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        // Actualizar artículo
        const resultado = await actualizarArticulo(id, negocioId, sucursalId, validacion.data);

        return res.json(resultado);

    } catch (error) {
        console.error('Error en putActualizarArticulo:', error);
        
        // Manejar error específico de artículo no encontrado
        if (error instanceof Error && error.message.includes('no encontrado')) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error al actualizar el artículo',
        });
    }
}

/**
 * DELETE /api/articulos/:id
 * Elimina un artículo completamente
 * 
 * Middlewares: verificarToken, verificarNegocio, validarAccesoSucursal
 */
export async function deleteArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        // Obtener negocioId y sucursalId
        const negocioId = req.negocioId;
        const sucursalId = req.query.sucursalId as string;

        if (!negocioId || !sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        // Eliminar artículo
        const resultado = await eliminarArticulo(id, negocioId, sucursalId);

        return res.json(resultado);

    } catch (error) {
        console.error('Error en deleteArticulo:', error);
        
        // Manejar error específico de artículo no encontrado
        if (error instanceof Error && error.message.includes('no encontrado')) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el artículo',
        });
    }
}

/**
 * POST /api/articulos/:id/duplicar
 * Duplica un artículo a otras sucursales (SOLO DUEÑOS)
 * 
 * Middlewares: verificarToken, verificarNegocio
 * NO usa validarAccesoSucursal (es operación multi-sucursal)
 */
export async function postDuplicarArticulo(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        // Validar datos con Zod PRIMERO (necesitamos ver las sucursales destino)
        const validacion = duplicarArticuloSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        // Validar permisos según rol
        const usuario = req.usuario;
        const esGerente = !!usuario?.sucursalAsignada;

        // GERENTES: Solo pueden duplicar en SU PROPIA sucursal
        if (esGerente) {
            const sucursalAsignada = usuario?.sucursalAsignada;
            const sucursalesDestino = validacion.data.sucursalesIds;

            // Validar que solo esté duplicando a su propia sucursal
            if (sucursalesDestino.length !== 1 || sucursalesDestino[0] !== sucursalAsignada) {
                return res.status(403).json({
                    success: false,
                    message: 'Los gerentes solo pueden duplicar artículos en su propia sucursal',
                });
            }
        }

        // DUEÑOS: Pueden duplicar a cualquier sucursal (sin validación adicional)

        // Obtener negocioId
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el negocio',
            });
        }

        // Duplicar artículo
        const resultado = await duplicarArticuloASucursales(id, negocioId, validacion.data);

        return res.status(201).json(resultado);

    } catch (error) {
        console.error('Error en postDuplicarArticulo:', error);
        
        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('no encontrado')) {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('no pertenecen')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Error al duplicar el artículo',
        });
    }
}

/**
 * POST /api/articulos/sugerir-lote-ia
 * Body: { imagenesUrls: string[] }. El comerciante dispara esto con un botón
 * explícito en Alta Rápida de Catálogo tras subir foto(s) de un menú/anaquel
 * — Gemini analiza la(s) imagen(es) y sugiere la lista de artículos. Nunca
 * falla "duro" por ausencia de IA: si Gemini no está disponible,
 * `sugerirArticulosLoteConIA` responde `success:false` con código 200 y el
 * frontend hace fallback silencioso (sin toast de error).
 *
 * Middlewares: verificarToken, verificarNegocio
 */
export async function postSugerirArticulosLoteIA(req: Request, res: Response) {
    try {
        const validacion = sugerirArticulosLoteIASchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await sugerirArticulosLoteConIA(validacion.data.imagenesUrls);
        return res.status(resultado.code).json(resultado);

    } catch (error) {
        console.error('Error en postSugerirArticulosLoteIA:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar la sugerencia',
        });
    }
}

/**
 * POST /api/articulos/sugerir-lote-texto-ia
 * Body: { texto: string }. El comerciante pega una lista de artículos
 * (WhatsApp, Facebook, nota) y Gemini la estructura. Mismo contrato que
 * postSugerirArticulosLoteIA (nunca falla "duro").
 *
 * Middlewares: verificarToken, verificarNegocio
 */
export async function postSugerirArticulosLoteTextoIA(req: Request, res: Response) {
    try {
        const validacion = sugerirArticulosLoteTextoIASchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const resultado = await sugerirArticulosLoteTextoConIA(validacion.data.texto);
        return res.status(resultado.code).json(resultado);

    } catch (error) {
        console.error('Error en postSugerirArticulosLoteTextoIA:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar la sugerencia',
        });
    }
}

// =============================================================================
// UPLOAD DE IMAGEN A R2
// =============================================================================

/**
 * POST /api/articulos/upload-imagen
 * Genera una presigned URL para que el frontend suba la imagen directamente a R2.
 *
 * Middlewares: verificarToken, verificarNegocio
 * Body: { nombreArchivo: string, contentType: string }
 */
export async function postUploadImagenArticulo(req: Request, res: Response) {
    try {
        const { nombreArchivo, contentType } = req.body;

        if (!nombreArchivo || !contentType) {
            return res.status(400).json({
                success: false,
                message: 'nombreArchivo y contentType son requeridos',
            });
        }

        const resultado = await generarUrlUploadImagenArticulo(nombreArchivo, contentType);
        return res.status(resultado.code).json(resultado);

    } catch (error) {
        console.error('Error en postUploadImagenArticulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar URL de subida',
        });
    }
}

// =============================================================================
// MÉTRICAS
// =============================================================================

/**
 * POST /api/articulos/:id/vista
 * Registra una vista de artículo (incrementa total_vistas)
 * NO requiere autenticación - endpoint público
 */
export async function postRegistrarVista(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID del artículo no es válido',
            });
        }

        // Registrar vista
        await registrarVistaArticulo(id);

        return res.json({
            success: true,
            message: 'Vista registrada',
        });

    } catch (error) {
        console.error('Error en postRegistrarVista:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar vista',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    // Públicos
    getCatalogoNegocio,
    getArticuloDetalle,
    postRegistrarVista,
    
    // Business Studio
    postCrearArticulo,
    postCrearArticulosLote,
    postSugerirArticulosLoteIA,
    postSugerirArticulosLoteTextoIA,
    getArticulos,
    getArticulo,
    putActualizarArticulo,
    deleteArticulo,
    postDuplicarArticulo,
};