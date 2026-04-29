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
    articulos,
    articuloSucursales,
    ofertas,
    empleados,
    bolsaTrabajo,
    puntosTransacciones,
    transaccionesEvidencia,
    usuarios,
    recompensas,
} from '../db/schemas/schema';
import type {
    UbicacionInput,
    HorariosInput,
    MetodosPagoInput,
    PuntosInput,
} from '../validations/onboarding.schema';

import { duplicarArchivo, eliminarArchivo } from './r2.service.js';
import { getZonaHorariaPorEstado } from '../utils/zonaHoraria.js';
import { revocarSesionesEmpleado } from '../utils/tokenStoreScanYA.js';
import { emitirAUsuario } from '../socket.js';

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
// HELPERS INTERNOS — empleados de sucursal
// ============================================

/**
 * Revoca las sesiones ScanYA de todos los empleados de una sucursal.
 * - Cierra turnos activos (hora_fin = NOW)
 * - Marca timestamp de revocación en Redis para cada empleado
 * - Emite socket 'scanya:sesion-revocada' al usuario-dueño (ScanYA filtra por empleadoId)
 *
 * Se usa al DESACTIVAR o ELIMINAR una sucursal.
 * No falla el flujo si alguna revocación individual falla — solo log.
 */
async function revocarEmpleadosDeSucursal(sucursalId: string, motivo: string): Promise<void> {
	const empleadosSucursal = await db
		.select({ id: empleados.id, usuarioId: empleados.usuarioId })
		.from(empleados)
		.where(eq(empleados.sucursalId, sucursalId));

	if (empleadosSucursal.length === 0) return;

	const empleadoIds = empleadosSucursal.map((e) => e.id);

	// Cerrar turnos ScanYA abiertos en una sola query
	await db.execute(sql`
		UPDATE scanya_turnos
		SET hora_fin = NOW(), notas_cierre = ${motivo}
		WHERE hora_fin IS NULL AND empleado_id IN (${sql.join(empleadoIds.map((id) => sql`${id}`), sql`, `)})
	`);

	// Revocar cada empleado en Redis + emitir socket
	for (const emp of empleadosSucursal) {
		try {
			await revocarSesionesEmpleado(emp.id);
		} catch (err) {
			console.error(`No se pudo revocar sesión ScanYA del empleado ${emp.id}:`, err);
		}

		if (emp.usuarioId) {
			emitirAUsuario(emp.usuarioId, 'scanya:sesion-revocada', {
				empleadoId: emp.id,
				motivo,
				timestamp: new Date().toISOString(),
			});
		}
	}
}

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
        //    La zona horaria se deriva SIEMPRE del estado para evitar inconsistencias
        //    (ignoramos la que venga del cliente).
        const zonaHorariaDerivada = getZonaHorariaPorEstado(data.estado);

        await db
            .update(negocioSucursales)
            .set({
                ciudad: data.ciudad,
                estado: data.estado,
                direccion: data.direccion,
                ubicacion: sql`ST_GeogFromText(${ubicacionPostGIS})`,
                zonaHoraria: zonaHorariaDerivada,
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
 * @param logoUrl - URL de R2
 * @returns Objeto con success y mensaje
 */
export const actualizarLogoNegocio = async (negocioId: string, logoUrl: string) => {
    try {
        // Capturar el logo anterior antes de sobrescribir para limpiar R2
        // (sin esto se acumulaban imágenes viejas al cambiar logo).
        const [anterior] = await db
            .select({ logoUrl: negocios.logoUrl })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        await db
            .update(negocios)
            .set({
                logoUrl: logoUrl,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioId));

        if (anterior?.logoUrl && anterior.logoUrl !== logoUrl) {
            eliminarImagenSiHuerfana(anterior.logoUrl).catch(err =>
                console.warn('No se pudo limpiar logo anterior:', err)
            );
        }

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
 * @param portadaUrl - URL de R2
 * @returns Objeto con success y mensaje
 */
export const actualizarPortadaSucursal = async (
    sucursalId: string,
    portadaUrl: string
) => {
    try {
        // Obtener la URL anterior antes de sobrescribir — se borra de R2 después
        // del UPDATE si ya no la usa nadie más. Sin esto se acumulan leaks cada
        // vez que el dueño cambia la imagen.
        const [anterior] = await db
            .select({ portadaUrl: negocioSucursales.portadaUrl })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, sucursalId))
            .limit(1);

        await db
            .update(negocioSucursales)
            .set({
                portadaUrl: portadaUrl,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        // Cleanup de la imagen anterior (si existía, era distinta y no la usa nadie más)
        if (anterior?.portadaUrl && anterior.portadaUrl !== portadaUrl) {
            eliminarImagenSiHuerfana(anterior.portadaUrl, sucursalId).catch(err =>
                console.warn('No se pudo limpiar portada anterior:', err)
            );
        }

        return { success: true, message: 'Portada actualizada correctamente' };
    } catch (error) {
        console.error('Error al actualizar portada:', error);
        throw new Error('Error al actualizar portada');
    }
};

/**
 * Agrega imágenes a la galería de la sucursal del negocio.
 *
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de la sucursal
 * @param imagenes - Array de URLs de R2
 * @returns Objeto con success y data con las imágenes insertadas
 */
export const agregarImagenesGaleria = async (
    negocioId: string,
    sucursalId: string,
    imagenes: Array<{ url: string }>
) => {
    try {
        const imagenesData = imagenes.map((imagen, index) => ({
            negocioId: negocioId,
            sucursalId: sucursalId,
            url: imagen.url,
            titulo: null,
            orden: index + 1,
            createdAt: new Date().toISOString(),
        }));

        const imagenesInsertadas = await db
            .insert(negocioGaleria)
            .values(imagenesData)
            .returning({
                id: negocioGaleria.id,
                url: negocioGaleria.url,
                orden: negocioGaleria.orden,
            });

        return {
            success: true,
            data: imagenesInsertadas,
        };
    } catch (error) {
        console.error('Error al agregar imágenes a galería:', error);
        throw new Error('Error al agregar imágenes a galería');
    }
};

// =============================================================================
// FUNCIÓN HELPER - Eliminar imagen huérfana
// =============================================================================

/**
 * Verifica si una URL de imagen está siendo usada en otro registro del sistema
 * (portada/perfil de otra sucursal, artículos, galería, ofertas, recompensas,
 * logo de negocio). Si está huérfana la borra de R2.
 *
 * Se usa al reemplazar imagen de portada o foto de perfil de una sucursal — evita
 * que la imagen anterior quede como basura en el storage, pero también protege
 * contra borrar por error una URL compartida con otro registro (pueden quedar
 * compartidas al duplicarse artículos/ofertas).
 *
 * @param url - URL de la imagen potencialmente huérfana
 * @param excluirSucursalId - UUID de la sucursal que acaba de cambiar su imagen
 *                            (para NO contar su propia nueva URL como "uso previo")
 */
export async function eliminarImagenSiHuerfana(
    url: string,
    excluirSucursalId?: string
): Promise<void> {
    try {
        // 1. ¿Otra sucursal la usa como portada o perfil?
        const condicionesSucursal = [
            sql`(${negocioSucursales.portadaUrl} = ${url} OR ${negocioSucursales.fotoPerfil} = ${url})`,
        ];
        if (excluirSucursalId) {
            condicionesSucursal.push(sql`${negocioSucursales.id} != ${excluirSucursalId}`);
        }
        const [{ total: enSucursales }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(negocioSucursales)
            .where(and(...condicionesSucursal));

        if (enSucursales > 0) {
            console.log(`ℹ️ Imagen conservada (usada por otra sucursal): ${url}`);
            return;
        }

        // 2. ¿Algún artículo la usa como imagen principal o adicional?
        const [{ total: enArticulos }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(articulos)
            .where(sql`${articulos.imagenPrincipal} = ${url} OR ${url} = ANY(${articulos.imagenesAdicionales})`);

        if (enArticulos > 0) {
            console.log(`ℹ️ Imagen conservada (usada por ${enArticulos} artículo/s): ${url}`);
            return;
        }

        // 3. ¿Algún negocio la usa como logo?
        const [{ total: enNegocios }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(negocios)
            .where(eq(negocios.logoUrl, url));

        if (enNegocios > 0) {
            console.log(`ℹ️ Imagen conservada (usada como logo de negocio): ${url}`);
            return;
        }

        // 4. ¿Alguna imagen de galería la referencia?
        const [{ total: enGaleria }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(negocioGaleria)
            .where(eq(negocioGaleria.url, url));

        if (enGaleria > 0) {
            console.log(`ℹ️ Imagen conservada (usada en galería): ${url}`);
            return;
        }

        // 5. ¿Alguna oferta la referencia?
        const [{ total: enOfertas }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(ofertas)
            .where(eq(ofertas.imagen, url));

        if (enOfertas > 0) {
            console.log(`ℹ️ Imagen conservada (usada por ${enOfertas} oferta/s): ${url}`);
            return;
        }

        // 6. ¿Alguna recompensa la referencia?
        const [{ total: enRecompensas }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(recompensas)
            .where(eq(recompensas.imagenUrl, url));

        if (enRecompensas > 0) {
            console.log(`ℹ️ Imagen conservada (usada por ${enRecompensas} recompensa/s): ${url}`);
            return;
        }

        // 7. Huérfana — eliminar de R2
        await eliminarArchivo(url);
    } catch (error) {
        console.error('Error en eliminarImagenSiHuerfana:', error);
    }
}

// =============================================================================
// 1. ELIMINAR LOGO DEL NEGOCIO
// =============================================================================

/**
 * Elimina el logo del negocio: pone NULL en BD y borra el archivo de R2 si
 * está huérfano (reference-count contra otras tablas).
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

        // 2. Poner NULL en BD
        await db
            .update(negocios)
            .set({ logoUrl: null })
            .where(eq(negocios.id, negocioId));

        // 3. Eliminar archivo de R2 si está huérfano
        if (negocio.logoUrl) {
            eliminarImagenSiHuerfana(negocio.logoUrl).catch(err =>
                console.error('No se pudo limpiar archivo de logo:', err)
            );
        }

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
 * Elimina la foto de perfil de la sucursal: pone NULL en BD y borra el archivo
 * de R2 si está huérfano (reference-count contra otras tablas).
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

        // 2. Poner NULL en BD
        await db
            .update(negocioSucursales)
            .set({ fotoPerfil: null })
            .where(eq(negocioSucursales.id, sucursalId));

        // 3. Eliminar archivo de R2 si está huérfano
        if (sucursal.fotoPerfil) {
            eliminarImagenSiHuerfana(sucursal.fotoPerfil, sucursalId).catch(err =>
                console.error('No se pudo limpiar archivo de foto de perfil:', err)
            );
        }

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
 * Elimina la portada de la sucursal: pone NULL en BD y borra el archivo de R2
 * si está huérfano (reference-count contra otras tablas).
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

        // 2. Poner NULL en BD
        await db
            .update(negocioSucursales)
            .set({ portadaUrl: null })
            .where(eq(negocioSucursales.id, sucursalId));

        // 3. Eliminar archivo de R2 si está huérfano
        if (sucursal.portadaUrl) {
            eliminarImagenSiHuerfana(sucursal.portadaUrl, sucursalId).catch(err =>
                console.error('No se pudo limpiar archivo de portada:', err)
            );
        }

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
 * Elimina una imagen de la galería: borra la fila de BD y limpia el archivo
 * de R2 si está huérfano (reference-count contra otras tablas).
 *
 * @param imageId - ID numérico de la imagen
 * @returns Objeto con success y mensaje
 */
export const eliminarImagenGaleria = async (imageId: number) => {
    try {
        // 1. Obtener URL antes de borrar
        const [imagen] = await db
            .select({
                url: negocioGaleria.url
            })
            .from(negocioGaleria)
            .where(eq(negocioGaleria.id, imageId))
            .limit(1);

        if (!imagen) {
            throw new Error('Imagen no encontrada');
        }

        // 2. Eliminar registro de BD primero
        await db
            .delete(negocioGaleria)
            .where(eq(negocioGaleria.id, imageId));

        // 3. Eliminar archivo de R2 si está huérfano (reference-count protege
        // contra borrar URLs compartidas con otros registros).
        if (imagen.url) {
            eliminarImagenSiHuerfana(imagen.url).catch(err =>
                console.error('No se pudo limpiar archivo de galería:', err)
            );
        }

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
 * @param fotoPerfilUrl - URL de R2
 * @returns Objeto con success y mensaje
 */
export const actualizarFotoPerfilSucursal = async (
    sucursalId: string,
    fotoPerfilUrl: string
) => {
    try {
        // Obtener la URL anterior para limpiar después del UPDATE (ver comentario
        // en actualizarPortadaSucursal sobre el leak de imágenes antiguas).
        const [anterior] = await db
            .select({ fotoPerfil: negocioSucursales.fotoPerfil })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, sucursalId))
            .limit(1);

        await db
            .update(negocioSucursales)
            .set({
                fotoPerfil: fotoPerfilUrl,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocioSucursales.id, sucursalId));

        if (anterior?.fotoPerfil && anterior.fotoPerfil !== fotoPerfilUrl) {
            eliminarImagenSiHuerfana(anterior.fotoPerfil, sucursalId).catch(err =>
                console.warn('No se pudo limpiar foto de perfil anterior:', err)
            );
        }

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
// CRUD SUCURSALES
// ============================================

/**
 * Crea una nueva sucursal para un negocio
 * La sucursal se crea como NO principal y activa.
 * También crea 7 registros de horarios vacíos (cerrado por defecto).
 */
export const crearSucursal = async (
	negocioId: string,
	datos: {
		nombre: string;
		ciudad: string;
		estado: string;
		direccion?: string;
		telefono?: string;
		whatsapp?: string;
		correo?: string;
		latitud: number;
		longitud: number;
	}
) => {
	try {
		// 1. Validar que no exista otra sucursal con el mismo nombre en este negocio
		//    (comparación case-insensitive, ignorando espacios al principio/fin)
		const nombreNormalizado = datos.nombre.trim().toLowerCase();
		const sucursalesExistentes = await db
			.select({ nombre: negocioSucursales.nombre })
			.from(negocioSucursales)
			.where(eq(negocioSucursales.negocioId, negocioId));

		const duplicado = sucursalesExistentes.some(
			(s) => s.nombre.trim().toLowerCase() === nombreNormalizado
		);
		if (duplicado) {
			throw new Error('NOMBRE_DUPLICADO');
		}

		// 2. Buscar la sucursal principal para clonar datos
		const [matriz] = await db
			.select()
			.from(negocioSucursales)
			.where(and(
				eq(negocioSucursales.negocioId, negocioId),
				eq(negocioSucursales.esPrincipal, true),
			));

		// 3. Crear la nueva sucursal con coordenadas + PostGIS point
		// SRID 4326 = WGS84 (estándar para lat/lng). Mismo patrón que actualizarSucursal.
		const ubicacionPostGIS = `SRID=4326;POINT(${datos.longitud} ${datos.latitud})`;

		// Zona horaria se determina por el estado de la sucursal (no de Matriz)
		// para soportar correctamente negocios con sucursales en distintas zonas de México.
		const zonaHoraria = getZonaHorariaPorEstado(datos.estado);

		const [sucursal] = await db
			.insert(negocioSucursales)
			.values({
				negocioId,
				nombre: datos.nombre,
				ciudad: datos.ciudad,
				estado: datos.estado,
				direccion: datos.direccion || null,
				telefono: datos.telefono || null,
				whatsapp: datos.whatsapp || null,
				correo: datos.correo || null,
				ubicacion: sql`ST_GeogFromText(${ubicacionPostGIS})`,
				esPrincipal: false,
				activa: true,
				zonaHoraria,
				// Heredar flags de servicio de Matriz (ofertas, CardYA, etc. se configuran per-sucursal)
				...(matriz && {
					tieneEnvioDomicilio: matriz.tieneEnvioDomicilio,
					tieneServicioDomicilio: matriz.tieneServicioDomicilio,
				}),
			})
			.returning();

		// 3. Clonar horarios de Matriz (o crear vacíos si no hay Matriz)
		if (matriz) {
			const horariosMatriz = await db
				.select()
				.from(negocioHorarios)
				.where(eq(negocioHorarios.sucursalId, matriz.id));

			if (horariosMatriz.length > 0) {
				const horariosClonados = horariosMatriz.map(h => ({
					sucursalId: sucursal.id,
					diaSemana: h.diaSemana,
					abierto: h.abierto,
					horaApertura: h.horaApertura,
					horaCierre: h.horaCierre,
					tieneHorarioComida: h.tieneHorarioComida,
					comidaInicio: h.comidaInicio,
					comidaFin: h.comidaFin,
				}));
				await db.insert(negocioHorarios).values(horariosClonados);
			} else {
				// Matriz sin horarios → crear vacíos
				const horariosVacios = Array.from({ length: 7 }, (_, i) => ({
					sucursalId: sucursal.id,
					diaSemana: i,
					abierto: false,
					horaApertura: null,
					horaCierre: null,
					tieneHorarioComida: false,
					comidaInicio: null,
					comidaFin: null,
				}));
				await db.insert(negocioHorarios).values(horariosVacios);
			}
		} else {
			// Sin Matriz → horarios vacíos
			const horariosVacios = Array.from({ length: 7 }, (_, i) => ({
				sucursalId: sucursal.id,
				diaSemana: i,
				abierto: false,
				horaApertura: null,
				horaCierre: null,
				tieneHorarioComida: false,
				comidaInicio: null,
				comidaFin: null,
			}));
			await db.insert(negocioHorarios).values(horariosVacios);
		}

		// 4. Clonar métodos de pago de Matriz
		if (matriz) {
			const metodosMatriz = await db
				.select()
				.from(negocioMetodosPago)
				.where(eq(negocioMetodosPago.sucursalId, matriz.id));

			if (metodosMatriz.length > 0) {
				const metodosClonados = metodosMatriz.map(m => ({
					negocioId,
					sucursalId: sucursal.id,
					tipo: m.tipo,
					activo: m.activo,
					instrucciones: m.instrucciones,
				}));
				await db.insert(negocioMetodosPago).values(metodosClonados);
			}
		}

		// 5. Clonar catálogo (duplicar artículos como registros independientes con imágenes en R2)
		if (matriz) {
			const articulosIds = await db
				.select({ articuloId: articuloSucursales.articuloId })
				.from(articuloSucursales)
				.where(eq(articuloSucursales.sucursalId, matriz.id));

			if (articulosIds.length > 0) {
				const articulosOriginales = await db
					.select()
					.from(articulos)
					.where(inArray(articulos.id, articulosIds.map(a => a.articuloId)));

				for (const art of articulosOriginales) {
					// Duplicar imagen principal en R2
					let nuevaImagenPrincipal = art.imagenPrincipal;
					if (art.imagenPrincipal) {
						const duplicada = await duplicarArchivo(art.imagenPrincipal, 'articulos');
						if (duplicada) nuevaImagenPrincipal = duplicada;
					}

					// Duplicar imágenes adicionales en R2
					let nuevasImagenesAdicionales = art.imagenesAdicionales;
					if (art.imagenesAdicionales && art.imagenesAdicionales.length > 0) {
						const duplicadas: string[] = [];
						for (const imgUrl of art.imagenesAdicionales) {
							if (imgUrl && imgUrl.trim()) {
								const duplicada = await duplicarArchivo(imgUrl, 'articulos');
								duplicadas.push(duplicada || imgUrl);
							}
						}
						if (duplicadas.length > 0) nuevasImagenesAdicionales = duplicadas;
					}

					// Crear artículo duplicado
					const [nuevoArticulo] = await db
						.insert(articulos)
						.values({
							negocioId,
							tipo: art.tipo,
							nombre: art.nombre,
							descripcion: art.descripcion,
							categoria: art.categoria,
							sku: art.sku,
							precioBase: art.precioBase,
							precioDesde: art.precioDesde,
							imagenPrincipal: nuevaImagenPrincipal,
							imagenesAdicionales: nuevasImagenesAdicionales,
							requiereCita: art.requiereCita,
							duracionEstimada: art.duracionEstimada,
							disponible: art.disponible,
							destacado: art.destacado,
							orden: art.orden,
						})
						.returning({ id: articulos.id });

					// Asignar a la nueva sucursal
					await db.insert(articuloSucursales).values({
						articuloId: nuevoArticulo.id,
						sucursalId: sucursal.id,
					});
				}
			}
		}

		// 6. Duplicar imágenes de Matriz en R2 (foto perfil, portada, galería)
		if (matriz) {
			const imagenesActualizadas: Record<string, string> = {};

			// Foto de perfil
			if (matriz.fotoPerfil) {
				const nuevaUrl = await duplicarArchivo(matriz.fotoPerfil, 'perfiles');
				if (nuevaUrl) imagenesActualizadas.fotoPerfil = nuevaUrl;
			}

			// Portada
			if (matriz.portadaUrl) {
				const nuevaUrl = await duplicarArchivo(matriz.portadaUrl, 'portadas');
				if (nuevaUrl) imagenesActualizadas.portadaUrl = nuevaUrl;
			}

			// Actualizar sucursal con URLs duplicadas
			if (Object.keys(imagenesActualizadas).length > 0) {
				await db
					.update(negocioSucursales)
					.set({ ...imagenesActualizadas, updatedAt: new Date().toISOString() })
					.where(eq(negocioSucursales.id, sucursal.id));
			}

			// Galería
			const galeriaMatriz = await db
				.select()
				.from(negocioGaleria)
				.where(eq(negocioGaleria.sucursalId, matriz.id));

			if (galeriaMatriz.length > 0) {
				for (const img of galeriaMatriz) {
					const nuevaUrl = await duplicarArchivo(img.url, 'galeria');
					if (nuevaUrl) {
						await db.insert(negocioGaleria).values({
							negocioId,
							sucursalId: sucursal.id,
							url: nuevaUrl,
							titulo: img.titulo,
							orden: img.orden,
						});
					}
				}
			}
		}

		// 7. Clonar ofertas públicas (NO cupones privados) con imágenes duplicadas en R2
		//    Criterio: visibilidad = 'publico' → es oferta, 'privado' → es cupón asignado
		if (matriz) {
			const ofertasMatriz = await db
				.select()
				.from(ofertas)
				.where(and(
					eq(ofertas.sucursalId, matriz.id),
					eq(ofertas.visibilidad, 'publico'),
				));

			if (ofertasMatriz.length > 0) {
				for (const oferta of ofertasMatriz) {
					// Duplicar imagen en R2 si existe
					let nuevaImagen = oferta.imagen;
					if (oferta.imagen) {
						const duplicada = await duplicarArchivo(oferta.imagen, 'ofertas');
						if (duplicada) nuevaImagen = duplicada;
					}

					// Insertar oferta clonada (sin historial de usos)
					await db.insert(ofertas).values({
						negocioId,
						sucursalId: sucursal.id,
						articuloId: oferta.articuloId,
						titulo: oferta.titulo,
						descripcion: oferta.descripcion,
						imagen: nuevaImagen,
						tipo: oferta.tipo,
						valor: oferta.valor,
						compraMinima: oferta.compraMinima,
						fechaInicio: oferta.fechaInicio,
						fechaFin: oferta.fechaFin,
						limiteUsos: oferta.limiteUsos,
						usosActuales: 0,
						activo: oferta.activo,
						visibilidad: 'publico',
						limiteUsosPorUsuario: oferta.limiteUsosPorUsuario,
					});
				}
			}
		}

		return { success: true, sucursal };
	} catch (error) {
		console.error('Error al crear sucursal:', error);
		// Re-lanzar errores de validación conocidos con su mensaje intacto
		if (error instanceof Error && error.message === 'NOMBRE_DUPLICADO') {
			throw error;
		}
		throw new Error('Error al crear sucursal');
	}
};

/**
 * Activa o desactiva una sucursal.
 * Si tiene gerente asignado y se desactiva → revocar gerente automáticamente.
 */
export const toggleActivaSucursal = async (
	sucursalId: string,
	activa: boolean
) => {
	try {
		// Validar que la sucursal existe y no es la principal (si se está desactivando)
		const [sucursal] = await db
			.select({
				id: negocioSucursales.id,
				esPrincipal: negocioSucursales.esPrincipal,
			})
			.from(negocioSucursales)
			.where(eq(negocioSucursales.id, sucursalId));

		if (!sucursal) {
			throw new Error('Sucursal no encontrada');
		}

		if (!activa && sucursal.esPrincipal) {
			throw new Error('La Matriz no se puede desactivar');
		}

		if (!activa) {
			// Si tiene gerente, revocarlo
			const [gerente] = await db
				.select({ id: usuarios.id })
				.from(usuarios)
				.where(eq(usuarios.sucursalAsignada, sucursalId));

			if (gerente) {
				await db
					.update(usuarios)
					.set({
						sucursalAsignada: null,
						negocioId: null,
						modoActivo: 'personal',
						perfil: 'personal',
						tieneModoComercial: false,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(usuarios.id, gerente.id));
			}

			// Revocar sesiones ScanYA de todos los empleados de esta sucursal
			// (empleado sigue existiendo en BD — al reactivar la sucursal podrá volver a iniciar sesión)
			await revocarEmpleadosDeSucursal(sucursalId, 'Sucursal desactivada');
		}

		await db
			.update(negocioSucursales)
			.set({
				activa,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(negocioSucursales.id, sucursalId));

		return { success: true, message: activa ? 'Sucursal activada' : 'Sucursal desactivada' };
	} catch (error) {
		if (error instanceof Error && (
			error.message.includes('principal') ||
			error.message.includes('no encontrada')
		)) {
			throw error;
		}
		console.error('Error al cambiar estado de sucursal:', error);
		throw new Error('Error al cambiar estado de sucursal');
	}
};

/**
 * Elimina una sucursal y todas sus imágenes de R2.
 * La sucursal principal NO se puede eliminar.
 * Si tiene gerente → revocar primero.
 * Limpia imágenes de: sucursal, galería, artículos, ofertas, empleados,
 * dinámicas, bolsa de trabajo y tickets ScanYA.
 */
export const eliminarSucursal = async (sucursalId: string) => {
	try {
		const [sucursal] = await db
			.select({
				esPrincipal: negocioSucursales.esPrincipal,
				fotoPerfil: negocioSucursales.fotoPerfil,
				portadaUrl: negocioSucursales.portadaUrl,
			})
			.from(negocioSucursales)
			.where(eq(negocioSucursales.id, sucursalId));

		if (!sucursal) {
			throw new Error('Sucursal no encontrada');
		}

		if (sucursal.esPrincipal) {
			throw new Error('La Matriz no se puede eliminar');
		}

		// ─── 0. Proteger historial: si hay transacciones, bloquear eliminación física ───
		// Cuando una sucursal tiene ventas registradas (`puntos_transacciones`), no debe
		// eliminarse para preservar el historial de negocio. En su lugar, el dueño debe
		// desactivarla (lo cual ya revoca empleados y la oculta del feed público).
		const [{ total: totalTransacciones }] = await db
			.select({ total: sql<number>`count(*)::int` })
			.from(puntosTransacciones)
			.where(eq(puntosTransacciones.sucursalId, sucursalId));

		if (totalTransacciones > 0) {
			throw new Error('TIENE_HISTORIAL');
		}

		// ─── 1. Revocar gerente si tiene ───
		const [gerente] = await db
			.select({ id: usuarios.id })
			.from(usuarios)
			.where(eq(usuarios.sucursalAsignada, sucursalId));

		if (gerente) {
			await db
				.update(usuarios)
				.set({
					sucursalAsignada: null,
					negocioId: null,
					modoActivo: 'personal',
					perfil: 'personal',
					tieneModoComercial: false,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(usuarios.id, gerente.id));
		}

		// ─── 1.1 Revocar sesiones ScanYA de los empleados ANTES del CASCADE ───
		// Una vez que se elimine la sucursal, el FK CASCADE borrará los empleados;
		// necesitamos sus IDs y usuarioId ahora para notificarlos y limpiar Redis.
		await revocarEmpleadosDeSucursal(sucursalId, 'Sucursal eliminada');

		// ─── 2. Recolectar TODAS las URLs de R2 a eliminar (queries en paralelo) ───
		const urlsAEliminar: string[] = [];

		// Sucursal: perfil + portada
		if (sucursal.fotoPerfil) urlsAEliminar.push(sucursal.fotoPerfil);
		if (sucursal.portadaUrl) urlsAEliminar.push(sucursal.portadaUrl);

		// Queries en paralelo para recolectar URLs
		// (Tablas dinámicas removidas en Fase D del cleanup — visión v3, abril 2026)
		const [galeriaImgs, articulosAsignados, ofertasImgs, empleadosFotos, vacantesImgs, transaccionesSuc] = await Promise.all([
			db.select({ url: negocioGaleria.url }).from(negocioGaleria).where(eq(negocioGaleria.sucursalId, sucursalId)),
			db.select({ articuloId: articuloSucursales.articuloId }).from(articuloSucursales).where(eq(articuloSucursales.sucursalId, sucursalId)),
			db.select({ imagen: ofertas.imagen }).from(ofertas).where(eq(ofertas.sucursalId, sucursalId)),
			db.select({ fotoUrl: empleados.fotoUrl }).from(empleados).where(eq(empleados.sucursalId, sucursalId)),
			db.select({ portafolioUrl: bolsaTrabajo.portafolioUrl }).from(bolsaTrabajo).where(eq(bolsaTrabajo.sucursalId, sucursalId)),
			db.select({ id: puntosTransacciones.id, fotoTicketUrl: puntosTransacciones.fotoTicketUrl }).from(puntosTransacciones).where(eq(puntosTransacciones.sucursalId, sucursalId)),
		]);

		// Galería
		for (const img of galeriaImgs) if (img.url) urlsAEliminar.push(img.url);

		// Ofertas/Cupones
		for (const o of ofertasImgs) if (o.imagen) urlsAEliminar.push(o.imagen);

		// Empleados
		for (const e of empleadosFotos) if (e.fotoUrl) urlsAEliminar.push(e.fotoUrl);

		// Bolsa de trabajo (publicaciones de Servicios)
		for (const v of vacantesImgs) if (v.portafolioUrl) urlsAEliminar.push(v.portafolioUrl);

		// Tickets ScanYA + evidencia
		if (transaccionesSuc.length > 0) {
			for (const t of transaccionesSuc) if (t.fotoTicketUrl) urlsAEliminar.push(t.fotoTicketUrl);

			const evidencias = await db
				.select({ urlImagen: transaccionesEvidencia.urlImagen })
				.from(transaccionesEvidencia)
				.where(inArray(transaccionesEvidencia.transaccionId, transaccionesSuc.map(t => t.id)));

			for (const ev of evidencias) if (ev.urlImagen) urlsAEliminar.push(ev.urlImagen);
		}

		// ─── 3. Artículos huérfanos: eliminar asignaciones, recolectar imágenes, borrar registros ───
		await db.delete(articuloSucursales).where(eq(articuloSucursales.sucursalId, sucursalId));

		const articulosHuerfanosIds: string[] = [];
		for (const a of articulosAsignados) {
			const [cuenta] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(articuloSucursales)
				.where(eq(articuloSucursales.articuloId, a.articuloId));

			if (cuenta.total === 0) articulosHuerfanosIds.push(a.articuloId);
		}

		if (articulosHuerfanosIds.length > 0) {
			const articulosData = await db
				.select({ id: articulos.id, imagenPrincipal: articulos.imagenPrincipal, imagenesAdicionales: articulos.imagenesAdicionales })
				.from(articulos)
				.where(inArray(articulos.id, articulosHuerfanosIds));

			for (const art of articulosData) {
				if (art.imagenPrincipal) urlsAEliminar.push(art.imagenPrincipal);
				if (art.imagenesAdicionales) {
					for (const imgUrl of art.imagenesAdicionales) {
						if (imgUrl?.trim()) urlsAEliminar.push(imgUrl);
					}
				}
			}

			await db.delete(articulos).where(inArray(articulos.id, articulosHuerfanosIds));
		}

		// ─── 4. Eliminar imágenes de R2 en paralelo — solo las NO compartidas ───
		// CRÍTICO: verificar que ningún otro artículo del sistema use la misma
		// URL antes de borrar. Las URLs pueden compartirse entre artículos de
		// distintas sucursales (al duplicarse).
		if (urlsAEliminar.length > 0) {
			const urlsSeguras: string[] = [];
			for (const url of urlsAEliminar) {
				const [{ total }] = await db
					.select({ total: sql<number>`COUNT(*)::int` })
					.from(articulos)
					.where(sql`${articulos.imagenPrincipal} = ${url} OR ${url} = ANY(${articulos.imagenesAdicionales})`);

				if (total === 0) {
					urlsSeguras.push(url);
				} else {
					console.log(`ℹ️ Imagen R2 conservada (usada por ${total} artículo/s): ${url}`);
				}
			}

			if (urlsSeguras.length > 0) {
				await Promise.all(
					urlsSeguras.map(url => eliminarArchivo(url).catch(err =>
						console.warn('No se pudo eliminar de R2:', url, err)
					))
				);
			}
		}

		// ─── 5. Hard delete: CASCADE elimina horarios, metodos_pago, galeria, etc. ───
		await db.delete(negocioSucursales).where(eq(negocioSucursales.id, sucursalId));

		return { success: true, message: 'Sucursal eliminada' };
	} catch (error) {
		if (error instanceof Error && (
			error.message.includes('principal') ||
			error.message.includes('no encontrada') ||
			error.message === 'TIENE_HISTORIAL'
		)) {
			throw error;
		}
		console.error('Error al eliminar sucursal:', error);
		throw new Error('Error al eliminar sucursal');
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

    // CRUD Sucursales
    crearSucursal,
    toggleActivaSucursal,
    eliminarSucursal,
};