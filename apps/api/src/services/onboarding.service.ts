/**
 * ============================================================================
 * ONBOARDING SERVICE - Lógica del Wizard de Onboarding
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/onboarding.service.ts
 * 
 * PROPÓSITO:
 * Funciones específicas del proceso de onboarding (wizard de 8 pasos).
 * Para funciones CRUD generales, ver negocioManagement.service.ts
 * 
 * ACTUALIZADO: 2 Enero 2026 - Refactor, funciones CRUD movidas a negocioManagement.service
 */

import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import {
    negocios,
    asignacionSubcategorias,
    negocioSucursales,
    negocioHorarios,
    negocioMetodosPago,
    negocioGaleria,
    articulos,
    articuloSucursales,
    usuarios,
    puntosConfiguracion,
} from '../db/schemas/schema';
import type { ArticulosInput } from '../validations/onboarding.schema';
import {
    Paso1Draft,
    UbicacionDraft,
    ContactoDraft,
    HorariosDraft,
    LogoDraft,
    PortadaDraft,
    GaleriaDraft,
    MetodosPagoDraft,
    PuntosDraft,
    ArticulosDraft
} from '../validations/onboarding.schema';

// ============================================
// PASO 8: CREAR ARTÍCULOS INICIALES
// ============================================

/**
 * Crea los artículos/productos iniciales del negocio
 * Esta función es específica del onboarding (mínimo 3 artículos requeridos)
 * 
 * @param negocioId - UUID del negocio
 * @param data - Datos de artículos iniciales
 * @returns Objeto con success y mensaje
 */
export const crearArticulosIniciales = async (
    negocioId: string,
    sucursalId: string,  // ← AGREGAR PARÁMETRO
    data: ArticulosInput
) => {
    try {
        const articulosData = data.articulos.map((articulo, index) => ({
            negocioId,
            tipo: articulo.tipo,
            nombre: articulo.nombre,
            descripcion: articulo.descripcion,
            precioBase: articulo.precioBase.toString(),
            imagenPrincipal: articulo.imagenPrincipal,
            disponible: articulo.disponible ?? true,
            categoria: 'General',
            orden: index,
            destacado: false,
        }));

        // 1. Eliminar artículos anteriores del negocio
        await db
            .delete(articulos)
            .where(eq(articulos.negocioId, negocioId));

        if (articulosData.length > 0) {
            // 2. Insertar artículos y OBTENER los IDs generados
            const articulosInsertados = await db
                .insert(articulos)
                .values(articulosData)
                .returning({ id: articulos.id });  // ← OBTENER IDs

            // 3. Crear registros para articulo_sucursales
            const articulosSucursalesData = articulosInsertados.map(art => ({
                articuloId: art.id,
                sucursalId: sucursalId,  // ← ASIGNAR A SUCURSAL
            }));

            // 4. Insertar en articulo_sucursales
            await db
                .insert(articuloSucursales)  // ← NOMBRE DE LA TABLA (verificar import)
                .values(articulosSucursalesData);
        }

        return { success: true, message: 'Artículos guardados correctamente' };
    } catch (error) {
        console.error('Error al crear artículos:', error);
        throw new Error('Error al crear artículos');
    }
};

// ============================================
// FINALIZAR ONBOARDING
// ============================================

/**
 * Valida que todos los pasos del onboarding estén completos y publica el negocio
 * Cambia esBorrador=false y asigna negocioId al usuario
 * 
 * @param negocioId - UUID del negocio
 * @param usuarioId - UUID del usuario
 * @returns Objeto con success y mensaje
 */
export const finalizarOnboarding = async (negocioId: string, usuarioId: string) => {
    try {
        // Validar que el negocio existe y pertenece al usuario
        const [negocio] = await db
            .select()
            .from(negocios)
            .where(and(eq(negocios.id, negocioId), eq(negocios.usuarioId, usuarioId)))
            .limit(1);

        if (!negocio) {
            throw new Error('Negocio no encontrado');
        }

        // PRIMERO: Obtener sucursal principal
        const [sucursalPrincipal] = await db
            .select()
            .from(negocioSucursales)
            .where(
                and(
                    eq(negocioSucursales.negocioId, negocioId),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .limit(1);

        if (!sucursalPrincipal) {
            throw new Error('Debes crear la sucursal principal (Paso 2: Ubicación)');
        }

        const sucursalId = sucursalPrincipal.id;  // ← GUARDAR ID

        // Validar que todos los pasos estén completos
        const validaciones = await Promise.all([
            // Paso 1: Al menos 1 subcategoría
            db
                .select()
                .from(asignacionSubcategorias)
                .where(eq(asignacionSubcategorias.negocioId, negocioId)),

            // Paso 3: Contacto (correo en sucursal principal)
            db
                .select({
                    correo: negocioSucursales.correo,
                    telefono: negocioSucursales.telefono,
                    whatsapp: negocioSucursales.whatsapp
                })
                .from(negocioSucursales)
                .where(eq(negocioSucursales.id, sucursalId)),  // ← USAR sucursalId

            // Paso 4: 7 horarios DE ESTA SUCURSAL
            db.select()
                .from(negocioHorarios)
                .where(eq(negocioHorarios.sucursalId, sucursalId)),  // ← FILTRAR POR SUCURSAL

            // Paso 5: Logo obligatorio
            db
                .select({ logoUrl: negocios.logoUrl })
                .from(negocios)
                .where(eq(negocios.id, negocioId)),

            // Paso 6: Al menos 1 método de pago
            db
                .select()
                .from(negocioMetodosPago)
                .where(eq(negocioMetodosPago.negocioId, negocioId)),

            // Paso 8: Al menos 3 artículos
            db.select().from(articulos).where(eq(articulos.negocioId, negocioId)),
        ]);

        const [
            subcategorias,
            contactoData,
            horariosData,
            metodosPagoData,
            articulosData,
        ] = validaciones;

        // Validar cada paso
        if (subcategorias.length === 0) {
            throw new Error('Debes asignar al menos 1 subcategoría');
        }

        if (!sucursalPrincipal?.direccion || !sucursalPrincipal?.ciudad) {
            throw new Error('Debes completar la ubicación de la sucursal');
        }

        // Validar contacto (teléfono/whatsapp en sucursal O correo)
        if (!sucursalPrincipal?.telefono && !sucursalPrincipal?.whatsapp && !contactoData[0]?.correo) {
            throw new Error('Debes proporcionar al menos 1 método de contacto');
        }

        if (horariosData.length !== 7) {
            throw new Error('Debes configurar los horarios de los 7 días');
        }

        if (metodosPagoData.length === 0) {
            throw new Error('Debes seleccionar al menos 1 método de pago');
        }

        if (articulosData.length < 3) {
            throw new Error('Debes agregar al menos 3 productos/servicios');
        }

        // Si todas las validaciones pasaron, publicar el negocio
        await db
            .update(negocios)
            .set({
                esBorrador: false,
                onboardingCompletado: true,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioId));

        // Asignar negocio_id al usuario
        await db
            .update(usuarios)
            .set({
                negocioId: negocioId,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(usuarios.id, usuarioId));

        // ───────────────────────────────────────────────────────────────────
        // NUEVO: Si participa_puntos = true, crear configuración inicial
        // ───────────────────────────────────────────────────────────────────
        if (negocio.participaPuntos) {
            // Verificar si ya existe configuración (por si acaso)
            const [configExistente] = await db
                .select()
                .from(puntosConfiguracion)
                .where(eq(puntosConfiguracion.negocioId, negocioId))
                .limit(1);

            // Solo crear si NO existe
            if (!configExistente) {
                await db.insert(puntosConfiguracion).values({
                    negocioId,
                    puntosPorPeso: '1.0',
                    pesosOriginales: null,
                    puntosOriginales: null,
                    minimoCompra: '0',                // Sin mínimo de compra
                    diasExpiracionPuntos: 90,
                    diasExpiracionVoucher: 30,
                    validarHorario: true,             // Validar horario por default
                    horarioInicio: '09:00:00',        // 9 AM
                    horarioFin: '22:00:00',           // 10 PM
                    activo: true,
                    nivelesActivos: true,
                    // Nivel Bronce
                    nivelBronceMin: 0,
                    nivelBronceMax: 999,
                    nivelBronceMultiplicador: '1.0',
                    nivelBronceNombre: null,
                    // Nivel Plata
                    nivelPlataMin: 1000,
                    nivelPlataMax: 4999,
                    nivelPlataMultiplicador: '1.2',
                    nivelPlataNombre: null,
                    // Nivel Oro
                    nivelOroMin: 5000,
                    nivelOroMultiplicador: '1.5',
                    nivelOroNombre: null,
                });

                console.log(`✅ Configuración de puntos creada automáticamente para negocio ${negocioId}`);
            }
        }

        return {
            success: true,
            message: 'Onboarding completado. ¡Tu negocio ya está publicado!',
        };
    } catch (error) {
        console.error('Error al finalizar onboarding:', error);
        throw error;
    }
};

// ============================================
// OBTENER NEGOCIO DEL USUARIO
// ============================================

/**
 * Busca si el usuario ya tiene un negocio (borrador o publicado)
 * 
 * @param usuarioId - UUID del usuario
 * @returns Datos básicos del negocio o null
 */
export const obtenerNegocioUsuario = async (usuarioId: string) => {
    try {
        const [negocio] = await db
            .select({
                id: negocios.id,
                nombre: negocios.nombre,
                esBorrador: negocios.esBorrador,
                onboardingCompletado: negocios.onboardingCompletado,
            })
            .from(negocios)
            .where(eq(negocios.usuarioId, usuarioId))
            .limit(1);

        return negocio || null;
    } catch (error) {
        console.error('Error al obtener negocio del usuario:', error);
        throw new Error('Error al obtener negocio del usuario');
    }
};

// ============================================
// OBTENER PROGRESO DEL ONBOARDING
// ============================================

/**
 * Obtiene el estado actual del onboarding del negocio
 * Útil para reanudar donde se quedó
 * 
 * @param negocioId - UUID del negocio
 * @returns Objeto con progreso de cada paso y datos actuales
 */
export const obtenerProgresoOnboarding = async (negocioId: string) => {
    try {
        const [negocio] = await db
            .select()
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (!negocio) {
            throw new Error('Negocio no encontrado');
        }

        const [
            subcategorias,
            sucursalesData,
            metodosPago,
            galeria,
            articulosData,
        ] = await Promise.all([
            db
                .select()
                .from(asignacionSubcategorias)
                .where(eq(asignacionSubcategorias.negocioId, negocioId)),
            db
                .select({
                    id: negocioSucursales.id,
                    negocioId: negocioSucursales.negocioId,
                    nombre: negocioSucursales.nombre,
                    esPrincipal: negocioSucursales.esPrincipal,
                    direccion: negocioSucursales.direccion,
                    ciudad: negocioSucursales.ciudad,
                    estado: negocioSucursales.estado,
                    telefono: negocioSucursales.telefono,
                    whatsapp: negocioSucursales.whatsapp,
                    correo: negocioSucursales.correo,
                    portadaUrl: negocioSucursales.portadaUrl,
                    latitud: sql<number>`ST_Y(${negocioSucursales.ubicacion}::geometry)`,
                    longitud: sql<number>`ST_X(${negocioSucursales.ubicacion}::geometry)`,
                })
                .from(negocioSucursales)
                .where(eq(negocioSucursales.negocioId, negocioId)),
            db
                .select()
                .from(negocioMetodosPago)
                .where(eq(negocioMetodosPago.negocioId, negocioId)),
            db
                .select()
                .from(negocioGaleria)
                .where(eq(negocioGaleria.negocioId, negocioId)),
            db.select().from(articulos).where(eq(articulos.negocioId, negocioId)),
        ]);

        const sucursal = sucursalesData[0];

        const horariosData = sucursal
            ? await db
                .select()
                .from(negocioHorarios)
                .where(eq(negocioHorarios.sucursalId, sucursal.id))
            : [];

        const progreso = {
            paso1Completo: subcategorias.length > 0,
            paso2Completo: Boolean(sucursal?.ciudad && sucursal?.direccion),
            paso3Completo: Boolean(sucursal?.telefono || sucursal?.whatsapp || sucursal?.correo),
            paso4Completo: horariosData.length === 7,
            paso5Completo: Boolean(negocio.logoUrl),
            paso6Completo: metodosPago.length > 0,
            paso7Completo: negocio.participaPuntos === true,
            paso8Completo: articulosData.length >= 3,
            onboardingCompletado: negocio.onboardingCompletado,
            negocio: {
                id: negocio.id,
                nombre: negocio.nombre,
                esBorrador: negocio.esBorrador,
                sitioWeb: negocio.sitioWeb,
                participaPuntos: negocio.participaPuntos,
                logoUrl: negocio.logoUrl,
            },
            subcategoriasSeleccionadas: subcategorias.map(s => s.subcategoriaId),
            sucursal: sucursal ? {
                id: sucursal.id,
                ciudad: sucursal.ciudad,
                estado: sucursal.estado,
                direccion: sucursal.direccion,
                latitud: sucursal.latitud || null,
                longitud: sucursal.longitud || null,
                telefono: sucursal.telefono || null,
                whatsapp: sucursal.whatsapp || null,
                correo: sucursal.correo || null,
                portadaUrl: sucursal.portadaUrl || null,
            } : null,
            horarios: horariosData,
            metodosPago: metodosPago,
            galeria: galeria,
            articulos: articulosData,
        };

        return progreso;
    } catch (error) {
        console.error('Error al obtener progreso:', error);
        throw new Error('Error al obtener progreso del onboarding');
    }
};

// ============================================
// GUARDAR BORRADORES (SIN VALIDACIÓN COMPLETA)
// ============================================

/**
 * Guarda borrador del Paso 1 (Nombre + Subcategorías)
 * NO valida si los datos están completos
 */
export const guardarBorradorPaso1 = async (
    negocioId: string,
    data: Paso1Draft
) => {
    try {
        const updateData: any = { updatedAt: new Date().toISOString() };

        // Solo actualizar campos que NO sean null o undefined
        if (data.nombre !== undefined) updateData.nombre = data.nombre || null;

        // Actualizar negocio solo si hay campos para actualizar
        if (Object.keys(updateData).length > 1) {
            await db
                .update(negocios)
                .set(updateData)
                .where(eq(negocios.id, negocioId));
        }

        // Actualizar subcategorías si existen
        if (data.subcategoriasIds && data.subcategoriasIds.length > 0) {
            // Eliminar subcategorías anteriores
            await db
                .delete(asignacionSubcategorias)
                .where(eq(asignacionSubcategorias.negocioId, negocioId));

            // Insertar nuevas subcategorías
            const subcategoriasData = data.subcategoriasIds.map((subcategoriaId) => ({
                negocioId,
                subcategoriaId,
            }));

            await db
                .insert(asignacionSubcategorias)
                .values(subcategoriasData);
        }

        return { success: true, message: 'Borrador guardado' };
    } catch (error) {
        console.error('Error al guardar borrador paso 1:', error);
        throw new Error('Error al guardar borrador');
    }
};

/**
 * Guarda borrador de Ubicación (Paso 2)
 * NO valida que todos los campos estén completos
 */
export const guardarBorradorSucursal = async (
    negocioId: string,
    data: UbicacionDraft
) => {
    try {
        // Buscar sucursal principal
        const [sucursal] = await db
            .select()
            .from(negocioSucursales)
            .where(
                and(
                    eq(negocioSucursales.negocioId, negocioId),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .limit(1);

        if (!sucursal) {
            throw new Error('Sucursal principal no encontrada');
        }

        // Preparar datos (permite null para borrar campos)
        const updateData: any = {
            updatedAt: new Date().toISOString()
        };

        // Actualiza si viene el campo (permite null o string)
        if (data.ciudad !== undefined) updateData.ciudad = data.ciudad || null;
        if (data.estado !== undefined) updateData.estado = data.estado || null;
        if (data.direccion !== undefined) updateData.direccion = data.direccion || null;
        if (data.zonaHoraria !== undefined) updateData.zonaHoraria = data.zonaHoraria || null;

        // Si vienen lat/lng válidos, actualizar ubicación PostGIS
        if (data.latitud !== undefined && data.longitud !== undefined && data.latitud && data.longitud) {
            updateData.ubicacion = sql`ST_SetSRID(ST_MakePoint(${data.longitud}, ${data.latitud}), 4326)`;
        }

        // Solo actualizar si hay campos para actualizar
        if (Object.keys(updateData).length > 1) {
            await db
                .update(negocioSucursales)
                .set(updateData)
                .where(eq(negocioSucursales.id, sucursal.id));
        }

        return { success: true, message: 'Borrador de ubicación guardado' };
    } catch (error) {
        console.error('Error al guardar borrador sucursal:', error);
        throw new Error('Error al guardar borrador de ubicación');
    }
};

/**
 * Guarda borrador de Contacto (Paso 3)
 * NO valida que al menos un método de contacto esté presente
 */
export const guardarBorradorContacto = async (
    negocioId: string,
    data: ContactoDraft
) => {
    try {
        // Buscar sucursal principal
        const [sucursal] = await db
            .select()
            .from(negocioSucursales)
            .where(
                and(
                    eq(negocioSucursales.negocioId, negocioId),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .limit(1);

        if (!sucursal) {
            throw new Error('Sucursal principal no encontrada');
        }

        // Preparar datos (permite null para borrar campos)
        const updateSucursal: any = { updatedAt: new Date().toISOString() };
        const updateNegocio: any = { updatedAt: new Date().toISOString() };

        // Permite null o string (para borrar o actualizar)
        if (data.telefono !== undefined) updateSucursal.telefono = data.telefono || null;
        if (data.whatsapp !== undefined) updateSucursal.whatsapp = data.whatsapp || null;
        if (data.correo !== undefined) updateSucursal.correo = data.correo || null;
        if (data.sitioWeb !== undefined) updateNegocio.sitioWeb = data.sitioWeb || null;

        // Actualizar sucursal
        if (Object.keys(updateSucursal).length > 1) {
            await db
                .update(negocioSucursales)
                .set(updateSucursal)
                .where(eq(negocioSucursales.id, sucursal.id));
        }

        // Actualizar negocio
        if (Object.keys(updateNegocio).length > 1) {
            await db
                .update(negocios)
                .set(updateNegocio)
                .where(eq(negocios.id, negocioId));
        }

        return { success: true, message: 'Borrador de contacto guardado' };
    } catch (error) {
        console.error('Error al guardar borrador contacto:', error);
        throw new Error('Error al guardar borrador de contacto');
    }
};

/**
 * Guarda borrador de Horarios (Paso 4)
 * NO valida que sean 7 días completos
 */
export const guardarBorradorHorarios = async (
    negocioId: string,
    data: HorariosDraft
) => {
    try {
        // Buscar sucursal principal
        const [sucursal] = await db
            .select()
            .from(negocioSucursales)
            .where(
                and(
                    eq(negocioSucursales.negocioId, negocioId),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .limit(1);

        if (!sucursal) {
            throw new Error('Sucursal principal no encontrada');
        }

        // Si vienen horarios, guardarlos
        if (data.horarios && data.horarios.length > 0) {
            // Eliminar horarios anteriores
            await db
                .delete(negocioHorarios)
                .where(eq(negocioHorarios.sucursalId, sucursal.id));

            // Insertar nuevos horarios
            const horariosData = data.horarios.map((horario) => ({
                sucursalId: sucursal.id,
                diaSemana: horario.diaSemana,
                abierto: horario.abierto ?? false,
                horaApertura: horario.horaApertura || null,
                horaCierre: horario.horaCierre || null,
                tieneHorarioComida: horario.tieneHorarioComida ?? false,
                comidaInicio: horario.comidaInicio || null,
                comidaFin: horario.comidaFin || null,
            }));

            await db.insert(negocioHorarios).values(horariosData);
        }

        return { success: true, message: 'Borrador de horarios guardado' };
    } catch (error) {
        console.error('Error al guardar borrador horarios:', error);
        throw new Error('Error al guardar borrador de horarios');
    }
};

/**
 * Guarda borrador de Logo (Paso 5a)
 */
export const guardarBorradorLogo = async (
    negocioId: string,
    data: LogoDraft
) => {
    try {
        if (data.logoUrl !== undefined) {
            await db
                .update(negocios)
                .set({
                    logoUrl: data.logoUrl || null, // ← Convierte "" a null
                    updatedAt: new Date().toISOString()
                })
                .where(eq(negocios.id, negocioId));
        }

        return { success: true, message: 'Borrador de logo guardado' };
    } catch (error) {
        console.error('Error al guardar borrador logo:', error);
        throw new Error('Error al guardar borrador de logo');
    }
};
/**
 * Guarda borrador de Portada (Paso 5b)
 */
export const guardarBorradorPortada = async (
    negocioId: string,
    data: PortadaDraft
) => {
    try {
        if (data.portadaUrl !== undefined) {
            // Buscar sucursal principal
            const [sucursal] = await db
                .select()
                .from(negocioSucursales)
                .where(
                    and(
                        eq(negocioSucursales.negocioId, negocioId),
                        eq(negocioSucursales.esPrincipal, true)
                    )
                )
                .limit(1);

            if (!sucursal) {
                throw new Error('Sucursal principal no encontrada');
            }

            // Actualizar portada en la sucursal
            await db
                .update(negocioSucursales)
                .set({
                    portadaUrl: data.portadaUrl || null, // ← Convierte "" a null
                    updatedAt: new Date().toISOString()
                })
                .where(eq(negocioSucursales.id, sucursal.id));
        }

        return { success: true, message: 'Borrador de portada guardado' };
    } catch (error) {
        console.error('Error al guardar borrador portada:', error);
        throw new Error('Error al guardar borrador de portada');
    }
};

/**
 * Guarda borrador de Galería (Paso 5c)
 */
export const guardarBorradorGaleria = async (
    negocioId: string,
    data: GaleriaDraft
) => {
    try {
        if (data.imagenes && data.imagenes.length > 0) {
            // ✅ CORRECCIÓN: Las imágenes son strings directos, no objetos
            const imagenesValidas = data.imagenes.filter((url: string) =>
                url && typeof url === 'string' && url.trim() !== ''
            );

            if (imagenesValidas.length > 0) {
                // Eliminar galería anterior
                await db
                    .delete(negocioGaleria)
                    .where(eq(negocioGaleria.negocioId, negocioId));

                // ✅ CORRECCIÓN: Insertar strings directamente como URLs
                const imagenesData = imagenesValidas.map((url: string, index: number) => ({
                    negocioId,
                    url: url,              // ← Ya es un string directo
                    titulo: null,          // ← Sin título por ahora
                    orden: index + 1,      // ← Orden secuencial (1, 2, 3...)
                }));

                await db.insert(negocioGaleria).values(imagenesData);
            }
        }

        return { success: true, message: 'Borrador de galería guardado' };
    } catch (error) {
        console.error('Error al guardar borrador galería:', error);
        throw new Error('Error al guardar borrador de galería');
    }
};

/**
 * Guarda borrador de Métodos de Pago (Paso 6)
 */
export const guardarBorradorMetodosPago = async (
    negocioId: string,
    data: MetodosPagoDraft
) => {
    try {
        const { sucursalId, metodos } = data;

        if (metodos && metodos.length > 0) {
            // Eliminar métodos anteriores (solo de esta sucursal o sin sucursal)
            if (sucursalId) {
                await db
                    .delete(negocioMetodosPago)
                    .where(
                        and(
                            eq(negocioMetodosPago.negocioId, negocioId),
                            or(
                                eq(negocioMetodosPago.sucursalId, sucursalId),
                                isNull(negocioMetodosPago.sucursalId)
                            )
                        )
                    );
            } else {
                await db
                    .delete(negocioMetodosPago)
                    .where(eq(negocioMetodosPago.negocioId, negocioId));
            }

            // Filtrar duplicados antes de insertar
            const metodosUnicos = [...new Set(metodos)];

            const metodosData = metodosUnicos.map((metodo: string) => ({
                negocioId,
                sucursalId: sucursalId || null,
                tipo: metodo,
            }));

            await db.insert(negocioMetodosPago).values(metodosData);
        }

        return { success: true, message: 'Borrador de métodos de pago guardado' };
    } catch (error) {
        console.error('Error al guardar borrador métodos de pago:', error);
        throw new Error('Error al guardar borrador de métodos de pago');
    }
};

/**
 * Guarda borrador de Puntos (Paso 7)
 */
export const guardarBorradorPuntos = async (
    negocioId: string,
    data: PuntosDraft
) => {
    try {
        if (data.participaPuntos !== undefined && data.participaPuntos !== null) {
            await db
                .update(negocios)
                .set({
                    participaPuntos: data.participaPuntos,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(negocios.id, negocioId));
        }

        return { success: true, message: 'Borrador de puntos guardado' };
    } catch (error) {
        console.error('Error al guardar borrador puntos:', error);
        throw new Error('Error al guardar borrador de puntos');
    }
};

/**
 * Guarda borrador de Artículos (Paso 8)
 * NO valida que sean mínimo 3
 */
export const guardarBorradorArticulos = async (
    negocioId: string,
    data: ArticulosDraft
) => {
    try {
        // Buscar sucursal principal
        const [sucursal] = await db
            .select()
            .from(negocioSucursales)
            .where(
                and(
                    eq(negocioSucursales.negocioId, negocioId),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .limit(1);

        if (!sucursal) {
            throw new Error('Sucursal principal no encontrada');
        }

        if (data.articulos && data.articulos.length > 0) {
            // Eliminar artículos anteriores
            await db
                .delete(articulos)
                .where(eq(articulos.negocioId, negocioId));

            // Insertar nuevos artículos
            const articulosData = data.articulos.map((art: any, index: number) => ({
                negocioId,
                tipo: art.tipo,
                nombre: art.nombre,
                descripcion: art.descripcion || null,
                precioBase: art.precioBase?.toString() || '0',
                imagenPrincipal: art.imagenPrincipal || null,
                disponible: art.disponible ?? true,
                categoria: 'General',
                orden: index,
                destacado: false,
            }));

            const articulosInsertados = await db
                .insert(articulos)
                .values(articulosData)
                .returning({ id: articulos.id });

            // Crear registros en articulo_sucursales
            const articulosSucursalesData = articulosInsertados.map(art => ({
                articuloId: art.id,
                sucursalId: sucursal.id,
            }));

            await db
                .insert(articuloSucursales)
                .values(articulosSucursalesData);
        }

        return { success: true, message: 'Borrador de artículos guardado' };
    } catch (error) {
        console.error('Error al guardar borrador artículos:', error);
        throw new Error('Error al guardar borrador de artículos');
    }
};

// ============================================
// EXPORTS
// ============================================

export default {
    crearArticulosIniciales,
    finalizarOnboarding,
    obtenerNegocioUsuario,
    obtenerProgresoOnboarding,
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
};