/**
 * ============================================================================
 * NEGOCIO MANAGEMENT SERVICE - Gestión de Negocios
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/negocioManagement.service.ts
 * 
 * PROPÓSITO:
 * Funciones CRUD generales para actualizar información de negocios y sucursales.
 * Estas funciones son reutilizadas por múltiples módulos (Onboarding, Perfil, etc.)
 * 
 * CREADO: 2 Enero 2026 - Refactor desde onboarding.service.ts
 */

import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
    negocios,
    asignacionSubcategorias,
    subcategoriasNegocio,
    negocioSucursales,
    negocioHorarios,
    negocioMetodosPago,
    negocioGaleria,
    usuarios,
} from '../db/schemas/schema';
import type {
    UbicacionInput,
    HorariosInput,
    MetodosPagoInput,
    PuntosInput,
} from '../validations/onboarding.schema';

import { v2 as cloudinary } from 'cloudinary';

// ============================================
// INFORMACIÓN GENERAL DEL NEGOCIO
// ============================================

/**
 * Actualiza nombre del negocio y asigna subcategorías
 * 
 * LÓGICA DE NOMBRE:
 * - Si el negocio tiene 1 sola sucursal → sincroniza nombre en ambas tablas
 * - Si tiene 2+ sucursales → solo actualiza negocios.nombre (la marca)
 * - Si se envía nombreSucursal → actualiza negocio_sucursales.nombre de la sucursal activa
 * 
 * @param negocioId - UUID del negocio
 * @param datos - { nombre, subcategoriasIds, nombreSucursal?, sucursalId? }
 * @returns Objeto con success y mensaje
 */
export const actualizarInfoGeneral = async (
    negocioId: string,
    datos: { nombre: string; subcategoriasIds: number[]; nombreSucursal?: string; sucursalId?: string }
) => {
    try {
        const { nombre, subcategoriasIds, nombreSucursal, sucursalId } = datos;
        await db.transaction(async (tx) => {
            // 1. Verificar que el negocio existe
            const negocio = await tx
                .select()
                .from(negocios)
                .where(eq(negocios.id, negocioId))
                .limit(1);

            if (negocio.length === 0) {
                throw new Error('Negocio no encontrado');
            }

            // 2. Validar que las subcategorías existen
            const subcategoriasValidas = await tx
                .select({ id: subcategoriasNegocio.id })
                .from(subcategoriasNegocio)
                .where(inArray(subcategoriasNegocio.id, subcategoriasIds));

            if (subcategoriasValidas.length !== subcategoriasIds.length) {
                throw new Error('Una o más subcategorías no son válidas');
            }

            // 3. Actualizar nombre del negocio (marca)
            await tx
                .update(negocios)
                .set({
                    nombre: nombre.trim(),
                })
                .where(eq(negocios.id, negocioId));

            // 3.1 Sincronizar nombre en sucursal según cantidad de sucursales
            const sucursalesDelNegocio = await tx
                .select({ id: negocioSucursales.id, esPrincipal: negocioSucursales.esPrincipal })
                .from(negocioSucursales)
                .where(eq(negocioSucursales.negocioId, negocioId));

            if (sucursalesDelNegocio.length === 1) {
                // 1 sola ubicación → sincronizar nombre en ambas tablas
                await tx
                    .update(negocioSucursales)
                    .set({
                        nombre: nombre.trim(),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(negocioSucursales.id, sucursalesDelNegocio[0].id));
            } else if (nombreSucursal && sucursalId) {
                // 2+ ubicaciones y se envió nombre de sucursal → actualizar solo esa sucursal
                await tx
                    .update(negocioSucursales)
                    .set({
                        nombre: nombreSucursal.trim(),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(negocioSucursales.id, sucursalId));
            }

            // 4. Eliminar todas las subcategorías anteriores
            await tx
                .delete(asignacionSubcategorias)
                .where(eq(asignacionSubcategorias.negocioId, negocioId));

            // 5. Insertar nuevas subcategorías
            if (subcategoriasIds.length > 0) {
                const subcategoriasInsert = subcategoriasIds.map((subcategoriaId) => ({
                    negocioId,
                    subcategoriaId,
                }));

                await tx.insert(asignacionSubcategorias).values(subcategoriasInsert);
            }
        });

        return {
            success: true,
            message: 'Información general actualizada correctamente',
        };
    } catch (error) {
        console.error('Error en actualizarInfoGeneral:', error);
        throw new Error('Error al actualizar información general del negocio');
    }
};

/**
 * Actualiza la descripción general del negocio
 * 
 * @param negocioId - UUID del negocio
 * @param descripcion - Descripción del negocio
 * @returns Objeto con success y mensaje
 */
export const actualizarDescripcionNegocio = async (
    negocioId: string,
    descripcion: string
) => {
    try {
        await db
            .update(negocios)
            .set({
                descripcion: descripcion.trim(),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioId));

        return {
            success: true,
            message: 'Descripción actualizada correctamente',
        };
    } catch (error) {
        console.error('Error al actualizar descripción:', error);
        throw new Error('Error al actualizar descripción');
    }
};

/**
 * Actualiza las redes sociales de la sucursal
 * 
 * @param sucursalId - UUID de la sucursal
 * @param redesSociales - Objeto con URLs de redes sociales
 * @returns Objeto con success y mensaje
 */
export const actualizarRedesSocialesSucursal = async (
    sucursalId: string,
    redesSociales: {
        facebook?: string;
        instagram?: string;
        tiktok?: string;
        twitter?: string;
    }
) => {
    try {
        const redesSocialesJson = {
            facebook: redesSociales.facebook || null,
            instagram: redesSociales.instagram || null,
            tiktok: redesSociales.tiktok || null,
            twitter: redesSociales.twitter || null,
        };

        await db
            .update(negocioSucursales)
            .set({
                redesSociales: redesSocialesJson,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        return {
            success: true,
            message: 'Redes sociales actualizadas correctamente',
        };
    } catch (error) {
        console.error('Error al actualizar redes sociales:', error);
        throw new Error('Error al actualizar redes sociales');
    }
};

// ============================================
// UBICACIÓN DE SUCURSAL
// ============================================

/**
 * Actualiza la sucursal con datos de ubicación
 * 
 * @param negocioId - UUID del negocio
 * @param data - Datos de ubicación
 * @returns Objeto con success, sucursalId y mensaje
 */
export const actualizarSucursal = async (
    sucursalId: string,
    data: UbicacionInput
) => {
    try {
        // 1. Verificar que la sucursal existe
        const sucursal = await db.query.negocioSucursales.findFirst({
            where: eq(negocioSucursales.id, sucursalId)
        });

        if (!sucursal) {
            throw new Error('Sucursal no encontrada. Contacta a soporte.');
        }

        // 2. Convertir latitud y longitud a formato PostGIS POINT
        const ubicacionPostGIS = `SRID=4326;POINT(${data.longitud} ${data.latitud})`;

        // 3. Actualizar datos de la sucursal
        await db
            .update(negocioSucursales)
            .set({
                ciudad: data.ciudad,
                estado: data.estado,
                direccion: data.direccion,
                ubicacion: sql`ST_GeogFromText(${ubicacionPostGIS})`,
                zonaHoraria: data.zonaHoraria,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        // ✨ 4. Actualizar ciudad en tabla usuarios cuando se actualiza en sucursal
        if (data.ciudad) {
            // Obtener el usuarioId del negocio
            const [negocio] = await db
                .select({ usuarioId: negocios.usuarioId })
                .from(negocios)
                .where(eq(negocios.id, sucursal.negocioId))
                .limit(1);

            if (negocio) {
                await db
                    .update(usuarios)
                    .set({ ciudad: data.ciudad })
                    .where(eq(usuarios.id, negocio.usuarioId));
            }
        }

        return {
            success: true,
            sucursalId: sucursal.id,
            message: 'Ubicación actualizada correctamente',
        };
    } catch (error) {
        console.error('Error al actualizar sucursal:', error);
        throw new Error('Error al actualizar sucursal');
    }
};

// ============================================
// CONTACTO
// ============================================

/**
 * Actualiza el contacto de la sucursal (teléfono, whatsapp)
 * 
 * @param sucursalId - UUID de la sucursal
 * @param data - Datos de contacto de sucursal
 * @returns Objeto con success y mensaje
 */
export const actualizarContactoSucursal = async (
    sucursalId: string,
    data: { telefono?: string; whatsapp?: string }
) => {
    try {
        await db
            .update(negocioSucursales)
            .set({
                telefono: data.telefono || null,
                whatsapp: data.whatsapp || null,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        return { success: true, message: 'Contacto de sucursal actualizado' };
    } catch (error) {
        console.error('Error al actualizar contacto de sucursal:', error);
        throw new Error('Error al actualizar contacto de sucursal');
    }
};

/**
 * Actualiza el contacto del negocio (correo, sitio web)
 * 
 * @param negocioId - UUID del negocio
 * @param data - Datos de contacto del negocio
 * @returns Objeto con success y mensaje
 */
export const actualizarContactoNegocio = async (
    negocioId: string,
    data: { correo?: string; sitioWeb?: string }
) => {
    try {
        // Actualizar sitio web en negocios
        await db
            .update(negocios)
            .set({
                sitioWeb: data.sitioWeb || null,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioId));

        // Actualizar correo en la sucursal principal
        if (data.correo !== undefined) {
            await db
                .update(negocioSucursales)
                .set({
                    correo: data.correo || null,
                    updatedAt: new Date().toISOString(),
                })
                .where(
                    and(
                        eq(negocioSucursales.negocioId, negocioId),
                        eq(negocioSucursales.esPrincipal, true)
                    )
                );
        }

        return { success: true, message: 'Contacto del negocio actualizado' };
    } catch (error) {
        console.error('Error al actualizar contacto del negocio:', error);
        throw new Error('Error al actualizar contacto del negocio');
    }
};

// ============================================
// HORARIOS
// ============================================

/**
 * Actualiza los horarios de los 7 días de la semana
 * Elimina los anteriores y crea los nuevos
 * 
 * @param sucursalId - UUID de la sucursal
 * @param data - Datos de horarios
 * @returns Objeto con success y mensaje
 */
export const actualizarHorariosSucursal = async (
    sucursalId: string,
    data: HorariosInput
) => {
    try {
        // Eliminar horarios anteriores
        await db.delete(negocioHorarios).where(eq(negocioHorarios.sucursalId, sucursalId));

        // Insertar nuevos horarios
        const horariosData = data.horarios.map((horario) => ({
            sucursalId,
            diaSemana: horario.diaSemana,
            abierto: horario.abierto,
            horaApertura: horario.horaApertura || null,
            horaCierre: horario.horaCierre || null,
            tieneHorarioComida: horario.tieneHorarioComida || false,
            comidaInicio: horario.comidaInicio || null,
            comidaFin: horario.comidaFin || null,
        }));

        await db.insert(negocioHorarios).values(horariosData);

        return { success: true, message: 'Horarios actualizados correctamente' };
    } catch (error) {
        console.error('Error al actualizar horarios:', error);
        throw new Error('Error al actualizar horarios');
    }
};

// ============================================
// IMÁGENES
// ============================================

/**
 * Actualiza el logo del negocio
 * 
 * @param negocioId - UUID del negocio
 * @param logoUrl - URL de Cloudinary
 * @returns Objeto con success y mensaje
 */
export const actualizarLogoNegocio = async (negocioId: string, logoUrl: string) => {
    try {
        await db
            .update(negocios)
            .set({
                logoUrl: logoUrl,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioId));

        return { success: true, message: 'Logo actualizado correctamente' };
    } catch (error) {
        console.error('Error al actualizar logo:', error);
        throw new Error('Error al actualizar logo');
    }
};

/**
 * Actualiza la imagen de portada de la sucursal
 * 
 * @param sucursalId - UUID de la sucursal
 * @param portadaUrl - URL de Cloudinary
 * @returns Objeto con success y mensaje
 */
export const actualizarPortadaSucursal = async (
    sucursalId: string,
    portadaUrl: string
) => {
    try {
        await db
            .update(negocioSucursales)  // ← CAMBIÓ
            .set({
                portadaUrl: portadaUrl,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));  // ← CAMBIÓ

        return { success: true, message: 'Portada actualizada correctamente' };
    } catch (error) {
        console.error('Error al actualizar portada:', error);
        throw new Error('Error al actualizar portada');
    }
};

/**
 * Agrega imágenes a la galería del negocio
 * Elimina las imágenes anteriores y agrega las nuevas
 * 
 * @param negocioId - UUID del negocio
 * @param imagenes - Array de URLs de Cloudinary
 * @returns Objeto con success y mensaje
 */
export const agregarImagenesGaleria = async (
    negocioId: string,
    sucursalId: string,
    imagenes: Array<{ url: string; cloudinaryPublicId: string }>  // ← CAMBIO: Recibe objetos
) => {
    try {
        // Crear array con formato correcto para la BD
        const imagenesData = imagenes.map((imagen, index) => ({
            negocioId: negocioId,
            sucursalId: sucursalId,
            url: imagen.url,
            cloudinaryPublicId: imagen.cloudinaryPublicId,  // ← AGREGAR
            titulo: null,
            orden: index + 1,
            createdAt: new Date().toISOString(),
        }));

        // Insertar nuevas imágenes y obtener los registros insertados
        const imagenesInsertadas = await db
            .insert(negocioGaleria)
            .values(imagenesData)
            .returning({  // ← IMPORTANTE: Retornar los registros insertados
                id: negocioGaleria.id,
                url: negocioGaleria.url,
                orden: negocioGaleria.orden,
                cloudinaryPublicId: negocioGaleria.cloudinaryPublicId,
            });

        return {
            success: true,
            data: imagenesInsertadas,  // ← RETORNAR las imágenes con sus IDs
        };
    } catch (error) {
        console.error('Error al agregar imágenes a galería:', error);
        throw new Error('Error al agregar imágenes a galería');
    }
};

// =============================================================================
// FUNCIÓN HELPER - Extraer publicId de URL de Cloudinary
// =============================================================================

/**
 * Extrae el publicId de una URL de Cloudinary
 * Ejemplo URL: https://res.cloudinary.com/cloud/image/upload/v123/folder/image.jpg
 * Retorna: folder/image
 * 
 * @param url - URL completa de Cloudinary
 * @returns publicId o null si no es URL válida
 */
function extraerPublicIdDeUrl(url: string | null): string | null {
    if (!url) return null;

    try {
        // Patrón: .../upload/v{version}/{publicId}.{extension}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        if (match && match[1]) {
            return match[1]; // Retorna el publicId sin extensión
        }
        return null;
    } catch (error) {
        console.error('Error al extraer publicId:', error);
        return null;
    }
}

// =============================================================================
// 1. ELIMINAR LOGO DEL NEGOCIO
// =============================================================================

/**
 * Elimina el logo del negocio de Cloudinary y BD
 * Extrae publicId de la URL
 * 
 * @param negocioId - UUID del negocio
 * @returns Objeto con success y mensaje
 */
export const eliminarLogoNegocio = async (negocioId: string) => {
    try {
        // 1. Obtener logoUrl antes de eliminar
        const [negocio] = await db
            .select({
                logoUrl: negocios.logoUrl
            })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (!negocio) {
            throw new Error('Negocio no encontrado');
        }

        // 2. Extraer publicId de la URL
        const publicId = extraerPublicIdDeUrl(negocio.logoUrl);

        // 3. Eliminar de Cloudinary (si hay publicId)
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error al eliminar logo de Cloudinary:', cloudinaryError);
                // Continuar aunque falle Cloudinary
            }
        }

        // 4. Poner NULL en BD
        await db
            .update(negocios)
            .set({ logoUrl: null })
            .where(eq(negocios.id, negocioId));

        return {
            success: true,
            message: 'Logo eliminado correctamente',
        };
    } catch (error) {
        console.error('Error al eliminar logo:', error);
        throw error;
    }
};

// =============================================================================
// 2. ELIMINAR FOTO DE PERFIL DE SUCURSAL
// =============================================================================

/**
 * Elimina la foto de perfil de la sucursal de Cloudinary y BD
 * Extrae publicId de la URL
 * 
 * @param sucursalId - UUID de la sucursal
 * @returns Objeto con success y mensaje
 */
export const eliminarFotoPerfilSucursal = async (sucursalId: string) => {
    try {
        // 1. Obtener fotoPerfil antes de eliminar
        const [sucursal] = await db
            .select({
                fotoPerfil: negocioSucursales.fotoPerfil
            })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, sucursalId))
            .limit(1);

        if (!sucursal) {
            throw new Error('Sucursal no encontrada');
        }

        // 2. Extraer publicId de la URL
        const publicId = extraerPublicIdDeUrl(sucursal.fotoPerfil);

        // 3. Eliminar de Cloudinary (si hay publicId)
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error al eliminar foto de perfil de Cloudinary:', cloudinaryError);
                // Continuar aunque falle Cloudinary
            }
        }

        // 4. Poner NULL en BD
        await db
            .update(negocioSucursales)
            .set({ fotoPerfil: null })
            .where(eq(negocioSucursales.id, sucursalId));

        return {
            success: true,
            message: 'Foto de perfil eliminada correctamente',
        };
    } catch (error) {
        console.error('Error al eliminar foto de perfil:', error);
        throw error;
    }
};

// =============================================================================
// 3. ELIMINAR PORTADA DE SUCURSAL
// =============================================================================

/**
 * Elimina la portada de la sucursal de Cloudinary y BD
 * Extrae publicId de la URL
 * 
 * @param sucursalId - UUID de la sucursal
 * @returns Objeto con success y mensaje
 */
export const eliminarPortadaSucursal = async (sucursalId: string) => {
    try {
        // 1. Obtener portadaUrl antes de eliminar
        const [sucursal] = await db
            .select({
                portadaUrl: negocioSucursales.portadaUrl
            })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, sucursalId))
            .limit(1);

        if (!sucursal) {
            throw new Error('Sucursal no encontrada');
        }

        // 2. Extraer publicId de la URL
        const publicId = extraerPublicIdDeUrl(sucursal.portadaUrl);

        // 3. Eliminar de Cloudinary (si hay publicId)
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error al eliminar portada de Cloudinary:', cloudinaryError);
                // Continuar aunque falle Cloudinary
            }
        }

        // 4. Poner NULL en BD
        await db
            .update(negocioSucursales)
            .set({ portadaUrl: null })
            .where(eq(negocioSucursales.id, sucursalId));

        return {
            success: true,
            message: 'Portada eliminada correctamente',
        };
    } catch (error) {
        console.error('Error al eliminar portada:', error);
        throw error;
    }
};

// =============================================================================
// 4. ELIMINAR IMAGEN DE GALERÍA
// =============================================================================

/**
 * Elimina una imagen de la galería de Cloudinary y BD
 * Usa cloudinaryPublicId si existe, sino extrae de URL
 * 
 * @param imageId - ID numérico de la imagen
 * @returns Objeto con success y mensaje
 */
export const eliminarImagenGaleria = async (imageId: number) => {
    try {
        // 1. Obtener cloudinaryPublicId (este SÍ existe en galería)
        const [imagen] = await db
            .select({
                cloudinaryPublicId: negocioGaleria.cloudinaryPublicId,
                url: negocioGaleria.url
            })
            .from(negocioGaleria)
            .where(eq(negocioGaleria.id, imageId))
            .limit(1);

        if (!imagen) {
            throw new Error('Imagen no encontrada');
        }

        // 2. Obtener publicId (primero intentar campo, luego extraer de URL)
        const publicId = imagen.cloudinaryPublicId || extraerPublicIdDeUrl(imagen.url);

        // 3. Eliminar de Cloudinary (si hay publicId)
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
                // Continuar aunque falle Cloudinary
            }
        }

        // 4. Eliminar registro de BD
        await db
            .delete(negocioGaleria)
            .where(eq(negocioGaleria.id, imageId));

        return {
            success: true,
            message: 'Imagen eliminada de galería',
        };
    } catch (error) {
        console.error('Error al eliminar imagen de galería:', error);
        throw error;
    }
};

// ============================================
// MÉTODOS DE PAGO - CORRECCIÓN
// ============================================

/**
 * 
 * Cambios:
 * - Ahora recibe sucursalId
 * - Incluye sucursalId en delete y insert
 * - Filtra por negocioId Y sucursalId
 */
export const actualizarMetodosPagoNegocio = async (
    negocioId: string,
    sucursalId: string,  // ← AGREGADO
    data: MetodosPagoInput
) => {
    try {
        // Eliminar métodos anteriores de esta sucursal específica
        await db
            .delete(negocioMetodosPago)
            .where(
                and(
                    eq(negocioMetodosPago.negocioId, negocioId),
                    eq(negocioMetodosPago.sucursalId, sucursalId)  // ← AGREGADO
                )
            );

        // Insertar nuevos métodos con sucursalId
        const metodosData = data.metodos.map((metodo) => ({
            negocioId,
            sucursalId,  // ← AGREGADO
            tipo: metodo,
            activo: true,
        }));

        await db.insert(negocioMetodosPago).values(metodosData);

        return { success: true, message: 'Métodos de pago actualizados correctamente' };
    } catch (error) {
        console.error('Error al actualizar métodos de pago:', error);
        throw new Error('Error al actualizar métodos de pago');
    }
};

// ============================================
// PARTICIPACIÓN EN PUNTOS
// ============================================

/**
 * Actualiza si el negocio participa en el sistema de puntos CardYA
 * 
 * @param negocioId - UUID del negocio
 * @param data - Datos de participación en puntos
 * @returns Objeto con success y mensaje
 */
export const actualizarParticipacionPuntos = async (
    negocioId: string,
    data: PuntosInput
) => {
    try {
        await db
            .update(negocios)
            .set({
                participaPuntos: data.participaPuntos,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioId));

        return { success: true, message: 'Participación en puntos actualizada' };
    } catch (error) {
        console.error('Error al actualizar participación en puntos:', error);
        throw new Error('Error al actualizar participación en puntos');
    }
};

/**
 * Actualiza el nombre de la sucursal
 * 
 * @param sucursalId - UUID de la sucursal
 * @param nombre - Nombre de la sucursal
 * @returns Objeto con success y mensaje
 */
export const actualizarNombreSucursal = async (
    sucursalId: string,
    nombre: string
) => {
    try {
        await db
            .update(negocioSucursales)
            .set({
                nombre: nombre.trim(),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        return { success: true, message: 'Nombre de sucursal actualizado' };
    } catch (error) {
        console.error('Error al actualizar nombre de sucursal:', error);
        throw new Error('Error al actualizar nombre de sucursal');
    }
};

/**
 * Actualiza la foto de perfil de la sucursal
 * 
 * @param sucursalId - UUID de la sucursal
 * @param fotoPerfilUrl - URL de Cloudinary
 * @returns Objeto con success y mensaje
 */
export const actualizarFotoPerfilSucursal = async (
    sucursalId: string,
    fotoPerfilUrl: string
) => {
    try {
        await db
            .update(negocioSucursales)
            .set({
                fotoPerfil: fotoPerfilUrl,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        return { success: true, message: 'Foto de perfil actualizada correctamente' };
    } catch (error) {
        console.error('Error al actualizar foto de perfil:', error);
        throw new Error('Error al actualizar foto de perfil');
    }
};

/**
 * Actualiza si la sucursal tiene envío a domicilio
 * 
 * @param sucursalId - UUID de la sucursal
 * @param tieneEnvio - Boolean
 * @returns Objeto con success y mensaje
 */
export const actualizarEnvioDomicilio = async (
    sucursalId: string,
    tieneEnvio: boolean
) => {
    try {
        await db
            .update(negocioSucursales)
            .set({
                tieneEnvioDomicilio: tieneEnvio,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        return { success: true, message: 'Configuración de envío actualizada' };
    } catch (error) {
        console.error('Error al actualizar envío a domicilio:', error);
        throw new Error('Error al actualizar envío a domicilio');
    }
};

/**
 * Actualiza si la sucursal tiene servicio a domicilio
 * 
 * @param sucursalId - UUID de la sucursal
 * @param tieneServicio - Boolean
 * @returns Objeto con success y mensaje
 */
export const actualizarServicioDomicilio = async (
    sucursalId: string,
    tieneServicio: boolean
) => {
    try {
        await db
            .update(negocioSucursales)
            .set({
                tieneServicioDomicilio: tieneServicio,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        return { success: true, message: 'Configuración de servicio actualizada' };
    } catch (error) {
        console.error('Error al actualizar servicio a domicilio:', error);
        throw new Error('Error al actualizar servicio a domicilio');
    }
};

// ============================================
// EXPORTS
// ============================================

export default {
    // Info General
    actualizarInfoGeneral,
    actualizarDescripcionNegocio,
    actualizarRedesSocialesSucursal,

    // Ubicación
    actualizarSucursal,

    // Contacto
    actualizarContactoSucursal,
    actualizarContactoNegocio,
    actualizarNombreSucursal,

    // Horarios
    actualizarHorariosSucursal,

    // Imágenes
    actualizarLogoNegocio,
    actualizarPortadaSucursal,
    agregarImagenesGaleria,
    eliminarLogoNegocio,
    eliminarPortadaSucursal,
    eliminarImagenGaleria,
    actualizarFotoPerfilSucursal,
    eliminarFotoPerfilSucursal,

    // Métodos de Pago
    actualizarMetodosPagoNegocio,

    // Puntos
    actualizarParticipacionPuntos,

    // Envío y Servicio
    actualizarEnvioDomicilio,
    actualizarServicioDomicilio,
};