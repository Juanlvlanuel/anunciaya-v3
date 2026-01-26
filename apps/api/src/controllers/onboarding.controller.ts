/**
 * ============================================================================
 * ONBOARDING CONTROLLER - Controlador del Wizard de Onboarding
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/onboarding.controller.ts
 * 
 * ACTUALIZADO: 2 Enero 2026 - Refactor para usar negocioManagement.service
 */

import { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { negocioSucursales } from '../db/schemas/schema';

// NUEVO: Importar desde negocioManagement.service (funciones CRUD generales)
import {
    actualizarInfoGeneral,
    actualizarSucursal,
    actualizarContactoSucursal,
    actualizarContactoNegocio,
    actualizarHorariosSucursal,
    actualizarLogoNegocio,
    actualizarPortadaSucursal,
    agregarImagenesGaleria,
    actualizarMetodosPagoNegocio,
    actualizarParticipacionPuntos,
} from '../services/negocioManagement.service';

// Importar desde onboarding.service (funciones específicas del wizard)
import {
    crearArticulosIniciales,
    finalizarOnboarding,
    obtenerProgresoOnboarding,
    obtenerNegocioUsuario,
    guardarBorradorPaso1,
    guardarBorradorSucursal,
    guardarBorradorContacto,
    guardarBorradorHorarios,
    guardarBorradorLogo,
    guardarBorradorPortada,
    guardarBorradorGaleria,
    guardarBorradorMetodosPago,
    guardarBorradorPuntos,
    guardarBorradorArticulos,
} from '../services/onboarding.service';

// Schemas de validación
import {
    paso1Schema,
    ubicacionSchema,
    contactoSchema,
    horariosSchema,
    metodosPagoSchema,
    puntosSchema,
    articulosSchema,
    paso1DraftSchema,
    ubicacionDraftSchema,
    contactoDraftSchema,
    horariosDraftSchema,
    logoDraftSchema,
    portadaDraftSchema,
    galeriaDraftSchema,
    metodosPagoDraftSchema,
    puntosDraftSchema,
    articulosDraftSchema,
} from '../validations/onboarding.schema';

// ============================================
// PASO 1: NOMBRE + SUBCATEGORÍAS
// POST /api/onboarding/:negocioId/paso1
// ============================================

export const guardarPaso1Controller = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = paso1Schema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        // ACTUALIZADO: Usa actualizarInfoGeneral del negocioManagement.service
        const result = await actualizarInfoGeneral(negocioId, validacion.data);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al guardar paso 1:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al guardar paso 1',
        });
    }
};

// ============================================
// PASO 2: ACTUALIZAR SUCURSAL PRINCIPAL
// PUT /api/onboarding/:negocioId/sucursal
// ============================================

export const actualizarSucursalPrincipalController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = ubicacionSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos de ubicación inválidos',
                errors: validacion.error.issues,
            });
        }

        // ACTUALIZADO: Usa actualizarSucursal del negocioManagement.service
        const result = await actualizarSucursal(negocioId, validacion.data);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al actualizar sucursal:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar sucursal',
        });
    }
};

// ============================================
// PASO 3: ACTUALIZAR CONTACTO
// POST /api/onboarding/:negocioId/contacto
// ============================================

export const actualizarContacto = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = contactoSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos de contacto inválidos',
                errors: validacion.error.issues,
            });
        }

        const { telefono, whatsapp, correo, sitioWeb } = validacion.data;
        const { sucursalId } = req.body;

        // ACTUALIZADO: Usa funciones del negocioManagement.service
        if (telefono || whatsapp) {
            if (!sucursalId) {
                return res.status(400).json({
                    success: false,
                    message: 'sucursalId es requerido para actualizar teléfono/whatsapp',
                });
            }

            await actualizarContactoSucursal(sucursalId, {
                telefono: telefono ?? undefined,
                whatsapp: whatsapp ?? undefined
            });
        }

        if (correo || sitioWeb) {
            await actualizarContactoNegocio(negocioId, {
                correo: correo ?? undefined,
                sitioWeb: sitioWeb ?? undefined
            });
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
};

// ============================================
// PASO 4: GUARDAR HORARIOS
// POST /api/onboarding/:negocioId/horarios
// ============================================

export const guardarHorarios = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;
        const { sucursalId } = req.body;

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        const validacion = horariosSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos de horarios inválidos',
                errors: validacion.error.issues,
            });
        }

        // ACTUALIZADO: Usa actualizarHorariosSucursal del negocioManagement.service
        const result = await actualizarHorariosSucursal(sucursalId, validacion.data);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al guardar horarios:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al guardar horarios',
        });
    }
};

// ============================================
// PASO 5: ACTUALIZAR LOGO
// POST /api/onboarding/:negocioId/logo
// ============================================

export const actualizarLogo = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;
        const { logoUrl } = req.body;

        if (!logoUrl) {
            return res.status(400).json({
                success: false,
                message: 'logoUrl es requerido',
            });
        }

        // ACTUALIZADO: Usa actualizarLogoNegocio del negocioManagement.service
        const result = await actualizarLogoNegocio(negocioId, logoUrl);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al actualizar logo:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar logo',
        });
    }
};

// ============================================
// PASO 5: ACTUALIZAR PORTADA
// POST /api/onboarding/:negocioId/portada
// ============================================

export const actualizarPortada = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;
        const { sucursalId, portadaUrl } = req.body;  // ← AGREGAR sucursalId

        if (!sucursalId) {  // ← VALIDAR sucursalId
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        if (!portadaUrl) {
            return res.status(400).json({
                success: false,
                message: 'portadaUrl es requerida',
            });
        }

        // CORRECTO: Pasar sucursalId como primer parámetro
        const result = await actualizarPortadaSucursal(sucursalId, portadaUrl);  // ✅ CORRECTO

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al actualizar portada:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar portada',
        });
    }
};

// ============================================
// PASO 5: AGREGAR GALERÍA
// POST /api/onboarding/:negocioId/galeria
// ============================================

export const agregarGaleria = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;
        const { imagenes } = req.body;

        if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere al menos una imagen',
            });
        }

        if (imagenes.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Máximo 10 imágenes permitidas',
            });
        }

        // 🆕 BUSCAR SUCURSAL PRINCIPAL AUTOMÁTICAMENTE
        const [sucursalPrincipal] = await db
            .select({ id: negocioSucursales.id })
            .from(negocioSucursales)
            .where(
                and(
                    eq(negocioSucursales.negocioId, negocioId),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .limit(1);

        if (!sucursalPrincipal) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró la sucursal principal del negocio',
            });
        }

        // ✅ PASAR sucursalId encontrado
        const result = await agregarImagenesGaleria(
            negocioId,
            sucursalPrincipal.id,  // ← Usar sucursal principal encontrada
            imagenes
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al agregar galería:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al agregar galería',
        });
    }
};

// ============================================
// PASO 6: GUARDAR MÉTODOS DE PAGO
// POST /api/onboarding/:negocioId/metodos-pago
// ============================================

export const guardarMetodosPago = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = metodosPagoSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Métodos de pago inválidos',
                errors: validacion.error.issues,
            });
        }

        // ACTUALIZADO: Usa actualizarMetodosPagoNegocio del negocioManagement.service
        const { sucursalId } = req.body;

        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        const result = await actualizarMetodosPagoNegocio(negocioId, sucursalId, validacion.data);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error al guardar métodos de pago:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al guardar métodos de pago',
        });
    }
};

// ============================================
// PASO 7: PARTICIPACIÓN EN PUNTOS
// POST /api/onboarding/:negocioId/puntos
// ============================================

export const configurarPuntos = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = puntosSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        // ACTUALIZADO: Usa actualizarParticipacionPuntos del negocioManagement.service
        const result = await actualizarParticipacionPuntos(
            negocioId,
            validacion.data
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al configurar puntos:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al configurar puntos',
        });
    }
};

// ============================================
// PASO 8: CREAR ARTÍCULOS INICIALES
// POST /api/onboarding/:negocioId/articulos
// ============================================

export const crearArticulos = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;
        const { sucursalId } = req.body;  // ← EXTRAER sucursalId

        // Validar sucursalId
        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'sucursalId es requerido',
            });
        }

        const validacion = articulosSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos de artículos inválidos',
                errors: validacion.error.issues,
            });
        }

        // Pasar los 3 parámetros: negocioId, sucursalId, data
        const result = await crearArticulosIniciales(
            negocioId,
            sucursalId,           // ← AGREGAR ESTE
            validacion.data
        );

        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear artículos:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al crear artículos',
        });
    }
};
// ============================================
// FINALIZAR ONBOARDING
// POST /api/onboarding/:negocioId/finalizar
// ============================================

export const finalizar = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;
        const { usuarioId } = req.body;

        if (!usuarioId) {
            return res.status(400).json({
                success: false,
                message: 'usuarioId es requerido',
            });
        }

        // Usa finalizarOnboarding del onboarding.service (específico del wizard)
        const result = await finalizarOnboarding(negocioId, usuarioId);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al finalizar onboarding:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al finalizar onboarding',
        });
    }
};

// ============================================
// OBTENER MI NEGOCIO
// GET /api/onboarding/mi-negocio
// ============================================

export const obtenerMiNegocio = async (req: Request, res: Response) => {
    try {
        const usuarioId = req.usuario!.usuarioId;

        // Usa obtenerNegocioUsuario del onboarding.service
        const negocio = await obtenerNegocioUsuario(usuarioId);

        res.status(200).json({
            success: true,
            data: negocio,
        });
    } catch (error) {
        console.error('Error al obtener mi negocio:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener negocio',
        });
    }
};

// ============================================
// OBTENER PROGRESO
// GET /api/onboarding/:negocioId/progreso
// ============================================

export const obtenerProgreso = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        // Usa obtenerProgresoOnboarding del onboarding.service
        const progreso = await obtenerProgresoOnboarding(negocioId);

        res.status(200).json({
            success: true,
            data: progreso,
        });
    } catch (error) {
        console.error('Error al obtener progreso:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener progreso',
        });
    }
};


// ============================================
// BORRADOR PASO 1
// ============================================

export const guardarBorradorPaso1Controller = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        // Validar con schema PARCIAL (permite campos opcionales)
        const validacion = paso1DraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorPaso1(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorPaso1Controller:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador',
        });
    }
};

// ============================================
// BORRADOR SUCURSAL (UBICACIÓN)
// ============================================

export const guardarBorradorSucursalController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = ubicacionDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorSucursal(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorSucursalController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de ubicación',
        });
    }
};

// ============================================
// BORRADOR CONTACTO
// ============================================

export const guardarBorradorContactoController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = contactoDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorContacto(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorContactoController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de contacto',
        });
    }
};

// ============================================
// BORRADOR HORARIOS
// ============================================

export const guardarBorradorHorariosController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = horariosDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorHorarios(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorHorariosController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de horarios',
        });
    }
};

// ============================================
// BORRADOR LOGO
// ============================================

export const guardarBorradorLogoController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = logoDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorLogo(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorLogoController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de logo',
        });
    }
};

// ============================================
// BORRADOR PORTADA
// ============================================

export const guardarBorradorPortadaController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = portadaDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorPortada(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorPortadaController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de portada',
        });
    }
};

// ============================================
// BORRADOR GALERÍA
// ============================================

export const guardarBorradorGaleriaController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = galeriaDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorGaleria(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorGaleriaController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de galería',
        });
    }
};

// ============================================
// BORRADOR MÉTODOS DE PAGO
// ============================================

export const guardarBorradorMetodosPagoController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = metodosPagoDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorMetodosPago(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorMetodosPagoController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de métodos de pago',
        });
    }
};

// ============================================
// BORRADOR PUNTOS
// ============================================

export const guardarBorradorPuntosController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = puntosDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorPuntos(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorPuntosController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de puntos',
        });
    }
};

// ============================================
// BORRADOR ARTÍCULOS
// ============================================

export const guardarBorradorArticulosController = async (req: Request, res: Response) => {
    try {
        const { negocioId } = req.params;

        const validacion = articulosDraftSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: validacion.error.issues,
            });
        }

        const resultado = await guardarBorradorArticulos(negocioId, validacion.data);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Error en guardarBorradorArticulosController:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error al guardar borrador de artículos',
        });
    }
};

// ============================================
// EXPORTS
// ============================================

export default {
    guardarPaso1Controller,
    actualizarSucursalPrincipalController,
    actualizarContacto,
    guardarHorarios,
    actualizarLogo,
    actualizarPortada,
    agregarGaleria,
    guardarMetodosPago,
    configurarPuntos,
    crearArticulos,
    finalizar,
    obtenerMiNegocio,
    obtenerProgreso,
    guardarBorradorPaso1Controller,
    guardarBorradorSucursalController,
    guardarBorradorContactoController,
    guardarBorradorHorariosController,
    guardarBorradorLogoController,
    guardarBorradorPortadaController,
    guardarBorradorGaleriaController,
    guardarBorradorMetodosPagoController,
    guardarBorradorPuntosController,
    guardarBorradorArticulosController,
};