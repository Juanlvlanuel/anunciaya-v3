/**
 * ============================================================================
 * ARTICULOS SERVICE - Catálogo de Productos y Servicios
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/articulos.service.ts
 * 
 * PROPÓSITO:
 * Funciones CRUD para gestionar artículos (productos y servicios)
 * Reutilizables por Onboarding y Business Studio
 * 
 * CREADO: Fase 5.3 - Sincronizar Perfil de Negocio
 * AMPLIADO: Fase 5.4.1 - Catálogo CRUD
 */

import { sql, eq, and } from 'drizzle-orm';
import { db } from '../db';
import { articulos, articuloSucursales } from '../db/schemas/schema';
import { duplicarImagen, eliminarImagen } from './cloudinary.service.js';
import type {
    ArticuloCatalogoRow,
    CrearArticuloInput,
    ActualizarArticuloInput,
    DuplicarArticuloInput,
} from '../types/articulos.types';

// =============================================================================
// OBTENER CATÁLOGO DE UN NEGOCIO (PÚBLICO)
// =============================================================================

/**
 * Obtiene todos los artículos disponibles de un negocio
 * 
 * - Solo artículos con disponible = true
 * - Ordenados: destacados primero, luego por orden, luego por nombre
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de la sucursal (opcional)
 * @returns Lista de artículos del catálogo
 */
export async function obtenerCatalogoNegocio(negocioId: string, sucursalId?: string) {
    try {
        let query;

        if (sucursalId) {
            // Si hay sucursalId, filtrar por sucursal
            query = sql`
                SELECT 
                    a.id,
                    a.tipo,
                    a.nombre,
                    a.descripcion,
                    a.categoria,
                    a.precio_base as "precioBase",
                    a.precio_desde as "precioDesde",
                    a.imagen_principal as "imagenPrincipal",
                    a.disponible,
                    a.destacado
                FROM articulos a
                INNER JOIN articulo_sucursales asu ON asu.articulo_id = a.id
                WHERE a.negocio_id = ${negocioId}
                AND a.disponible = true
                AND asu.sucursal_id = ${sucursalId}
                ORDER BY a.destacado DESC, a.orden ASC, a.nombre ASC
            `;
        } else {
            // Si no hay sucursalId, traer todos los del negocio
            query = sql`
                SELECT 
                    a.id,
                    a.tipo,
                    a.nombre,
                    a.descripcion,
                    a.categoria,
                    a.precio_base as "precioBase",
                    a.precio_desde as "precioDesde",
                    a.imagen_principal as "imagenPrincipal",
                    a.disponible,
                    a.destacado
                FROM articulos a
                WHERE a.negocio_id = ${negocioId}
                AND a.disponible = true
                ORDER BY a.destacado DESC, a.orden ASC, a.nombre ASC
            `;
        }

        const resultado = await db.execute(query);
        return {
            success: true,
            data: resultado.rows as unknown as ArticuloCatalogoRow[],
        };
    } catch (error) {
        console.error('Error al obtener catálogo:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER ARTÍCULO INDIVIDUAL (DETALLE)
// =============================================================================

/**
 * Obtiene un artículo individual con información completa
 * Funciona CON o SIN autenticación
 * 
 * @param articuloId - UUID del artículo
 * @returns Artículo con datos del negocio y sucursal
 */
export async function obtenerArticuloDetalle(
    articuloId: string
) {
    try {
        const resultado = await db.execute(sql`
            SELECT 
                -- Datos del artículo
                a.id,
                a.tipo,
                a.nombre,
                a.descripcion,
                a.categoria,
                a.precio_base as "precioBase",
                a.precio_desde as "precioDesde",
                a.imagen_principal as "imagenPrincipal",
                a.disponible,
                a.destacado,
                a.requiere_cita as "requiereCita",
                a.duracion_estimada as "duracionEstimada",
                
                -- Datos del negocio
                n.id as "negocioId",
                n.nombre as "negocioNombre",
                n.logo_url as "negocioLogoUrl",
                n.sitio_web as "negocioSitioWeb",
                
                -- Datos de la sucursal principal
                s.id as "sucursalId",
                s.nombre as "sucursalNombre",
                s.ciudad,
                s.direccion,
                s.whatsapp as "negocioWhatsapp"
                
            FROM articulos a
            INNER JOIN negocios n ON a.negocio_id = n.id
            LEFT JOIN negocio_sucursales s ON s.negocio_id = n.id AND s.es_principal = true
            WHERE a.id = ${articuloId}
              AND a.disponible = true
              AND n.activo = true
        `);

        if (resultado.rows.length === 0) {
            return { 
                success: false, 
                message: 'Artículo no encontrado o no disponible' 
            };
        }

        const row = resultado.rows[0] as Record<string, unknown>;

        return {
            success: true,
            data: {
                id: row.id,
                tipo: row.tipo,
                nombre: row.nombre,
                descripcion: row.descripcion,
                categoria: row.categoria,
                precioBase: row.precioBase,
                precioDesde: row.precioDesde,
                imagenPrincipal: row.imagenPrincipal,
                disponible: row.disponible,
                destacado: row.destacado,
                requiereCita: row.requiereCita,
                duracionEstimada: row.duracionEstimada,
                negocio: {
                    id: row.negocioId,
                    nombre: row.negocioNombre,
                    logoUrl: row.negocioLogoUrl,
                    sitioWeb: row.negocioSitioWeb,
                    sucursalId: row.sucursalId,
                    sucursalNombre: row.sucursalNombre,
                    ciudad: row.ciudad,
                    direccion: row.direccion,
                    whatsapp: row.negocioWhatsapp,
                },
            },
        };
    } catch (error) {
        console.error('Error al obtener artículo detalle:', error);
        throw error;
    }
}

// =============================================================================
// CREAR ARTÍCULO (BUSINESS STUDIO)
// =============================================================================

/**
 * Crea un nuevo artículo y lo asigna automáticamente a la sucursal activa
 * 
 * @param negocioId - UUID del negocio (inyectado por middleware)
 * @param sucursalId - UUID de la sucursal activa (del query interceptor)
 * @param datos - Datos del artículo a crear
 * @returns Artículo creado
 */
export async function crearArticulo(
    negocioId: string,
    sucursalId: string,
    datos: CrearArticuloInput
) {
    try {
        return await db.transaction(async (tx) => {
            // 1. Crear artículo
            const [nuevoArticulo] = await tx
                .insert(articulos)
                .values({
                    negocioId,
                    tipo: datos.tipo,
                    nombre: datos.nombre.trim(),
                    descripcion: datos.descripcion?.trim() || null,
                    categoria: datos.categoria?.trim() || 'General',
                    precioBase: datos.precioBase.toString(), // number → string para NUMERIC
                    precioDesde: datos.precioDesde ?? false,
                    imagenPrincipal: datos.imagenPrincipal || null,
                    disponible: datos.disponible ?? true,
                    destacado: datos.destacado ?? false,
                    orden: 0,
                    totalVentas: 0,
                    totalVistas: 0,
                })
                .returning();

            // 2. Asignar automáticamente a la sucursal activa
            await tx
                .insert(articuloSucursales)
                .values({
                    articuloId: nuevoArticulo.id,
                    sucursalId,
                });

            return {
                success: true,
                message: 'Artículo creado correctamente',
                data: {
                    id: nuevoArticulo.id,
                    tipo: nuevoArticulo.tipo,
                    nombre: nuevoArticulo.nombre,
                    categoria: nuevoArticulo.categoria,
                    precioBase: nuevoArticulo.precioBase,
                    imagenPrincipal: nuevoArticulo.imagenPrincipal,
                },
            };
        });
    } catch (error) {
        console.error('Error al crear artículo:', error);
        throw error;
    }
}

// =============================================================================
// LISTAR ARTÍCULOS (BUSINESS STUDIO)
// =============================================================================

/**
 * Obtiene todos los artículos de una sucursal específica
 * Incluye artículos disponibles y no disponibles (para gestión interna)
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de la sucursal
 * @returns Lista de artículos con métricas
 */
export async function obtenerArticulos(negocioId: string, sucursalId: string) {
    try {
        const resultado = await db.execute(sql`
            SELECT 
                a.id,
                a.negocio_id,
                a.tipo,
                a.nombre,
                a.descripcion,
                a.categoria,
                a.precio_base,
                a.precio_desde,
                a.imagen_principal,
                a.disponible,
                a.destacado,
                a.orden,
                a.total_ventas,
                a.total_vistas,
                a.created_at,
                a.updated_at
            FROM articulos a
            INNER JOIN articulo_sucursales asu ON asu.articulo_id = a.id
            WHERE a.negocio_id = ${negocioId}
              AND asu.sucursal_id = ${sucursalId}
            ORDER BY a.destacado DESC, a.orden ASC, a.nombre ASC
        `);

        return {
            success: true,
            data: resultado.rows as unknown as ArticuloCatalogoRow[],
        };
    } catch (error) {
        console.error('Error al obtener artículos:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER ARTÍCULO POR ID (BUSINESS STUDIO)
// =============================================================================

/**
 * Obtiene un artículo específico con validación de pertenencia
 * 
 * @param articuloId - UUID del artículo
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal (validación)
 * @returns Artículo encontrado
 */
export async function obtenerArticuloPorId(
    articuloId: string,
    negocioId: string,
    sucursalId: string
) {
    try {
        const resultado = await db.execute(sql`
            SELECT 
                a.id,
                a.negocio_id,
                a.tipo,
                a.nombre,
                a.descripcion,
                a.categoria,
                a.precio_base,
                a.precio_desde,
                a.imagen_principal,
                a.disponible,
                a.destacado,
                a.orden,
                a.total_ventas,
                a.total_vistas,
                a.created_at,
                a.updated_at
            FROM articulos a
            INNER JOIN articulo_sucursales asu ON asu.articulo_id = a.id
            WHERE a.id = ${articuloId}
              AND a.negocio_id = ${negocioId}
              AND asu.sucursal_id = ${sucursalId}
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false,
                error: 'Artículo no encontrado o no pertenece a esta sucursal',
            };
        }

        return {
            success: true,
            data: resultado.rows[0] as unknown as ArticuloCatalogoRow,
        };
    } catch (error) {
        console.error('Error al obtener artículo:', error);
        throw error;
    }
}

// =============================================================================
// ACTUALIZAR ARTÍCULO (BUSINESS STUDIO)
// =============================================================================

/**
 * Actualiza un artículo existente
 * Valida que pertenezca al negocio y sucursal correctos
 * 
 * @param articuloId - UUID del artículo
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal (validación)
 * @param datos - Datos a actualizar
 * @returns Artículo actualizado
 */
export async function actualizarArticulo(
    articuloId: string,
    negocioId: string,
    sucursalId: string,
    datos: ActualizarArticuloInput
) {
    // Extraer imagenAEliminar de los datos (no se guarda en DB)
    const { imagenAEliminar, ...datosArticulo } = datos as ActualizarArticuloInput & { imagenAEliminar?: string };

    try {
        const resultado = await db.transaction(async (tx) => {
            // 1. Verificar que el artículo existe y pertenece a la sucursal
            const verificacion = await tx.execute(sql`
                SELECT a.id
                FROM articulos a
                INNER JOIN articulo_sucursales asu ON asu.articulo_id = a.id
                WHERE a.id = ${articuloId}
                  AND a.negocio_id = ${negocioId}
                  AND asu.sucursal_id = ${sucursalId}
            `);

            if (verificacion.rows.length === 0) {
                throw new Error('Artículo no encontrado o no pertenece a esta sucursal');
            }

            // 2. Preparar datos para actualizar
            const datosActualizar: Record<string, unknown> = {
                updatedAt: new Date().toISOString(),
            };

            if (datosArticulo.nombre !== undefined) {
                datosActualizar.nombre = datosArticulo.nombre.trim();
            }
            if (datosArticulo.descripcion !== undefined) {
                datosActualizar.descripcion = datosArticulo.descripcion?.trim() || null;
            }
            if (datosArticulo.categoria !== undefined) {
                datosActualizar.categoria = datosArticulo.categoria.trim();
            }
            if (datosArticulo.precioBase !== undefined) {
                datosActualizar.precioBase = datosArticulo.precioBase.toString();
            }
            if (datosArticulo.precioDesde !== undefined) {
                datosActualizar.precioDesde = datosArticulo.precioDesde;
            }
            if (datosArticulo.imagenPrincipal !== undefined) {
                datosActualizar.imagenPrincipal = datosArticulo.imagenPrincipal;
            }
            if (datosArticulo.disponible !== undefined) {
                datosActualizar.disponible = datosArticulo.disponible;
            }
            if (datosArticulo.destacado !== undefined) {
                datosActualizar.destacado = datosArticulo.destacado;
            }
            if (datosArticulo.orden !== undefined) {
                datosActualizar.orden = datosArticulo.orden;
            }

            // 3. Actualizar artículo
            const [articuloActualizado] = await tx
                .update(articulos)
                .set(datosActualizar)
                .where(eq(articulos.id, articuloId))
                .returning();

            return {
                success: true,
                message: 'Artículo actualizado correctamente',
                data: {
                    id: articuloActualizado.id,
                    nombre: articuloActualizado.nombre,
                    precioBase: articuloActualizado.precioBase,
                },
            };
        });

        // 4. Eliminar imagen anterior de Cloudinary (fuera de la transacción)
        if (imagenAEliminar) {
            eliminarImagen(imagenAEliminar).catch((err) => {
                console.error('⚠️ Error al eliminar imagen anterior de Cloudinary:', err);
            });
        }

        return resultado;
    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        throw error;
    }
}


// =============================================================================
// ELIMINAR ARTÍCULO (BUSINESS STUDIO)
// =============================================================================

/**
 * Elimina un artículo completamente
 * CASCADE elimina automáticamente de articulo_sucursales
 * 
 * @param articuloId - UUID del artículo
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal (validación)
 * @returns Confirmación de eliminación
 */
export async function eliminarArticulo(
    articuloId: string,
    negocioId: string,
    sucursalId: string
) {
    try {
        return await db.transaction(async (tx) => {
            // 1. Verificar que el artículo existe y pertenece a la sucursal
            const verificacion = await tx.execute(sql`
                SELECT a.id, a.imagen_principal
                FROM articulos a
                INNER JOIN articulo_sucursales asu ON asu.articulo_id = a.id
                WHERE a.id = ${articuloId}
                  AND a.negocio_id = ${negocioId}
                  AND asu.sucursal_id = ${sucursalId}
            `);

            if (verificacion.rows.length === 0) {
                throw new Error('Artículo no encontrado o no pertenece a esta sucursal');
            }

            // 2. Obtener URL de imagen antes de eliminar
            const imagenUrl = verificacion.rows[0].imagen_principal as string | null;

            // 3. Eliminar artículo (CASCADE eliminará de articulo_sucursales)
            await tx
                .delete(articulos)
                .where(eq(articulos.id, articuloId));

            // 4. Eliminar imagen de Cloudinary (fuera de transacción)
            if (imagenUrl) {
                eliminarImagen(imagenUrl).catch(err => {
                    console.error('Error eliminando imagen de Cloudinary:', err);
                });
            }

            return {
                success: true,
                message: 'Artículo eliminado correctamente',
            };
        });
    } catch (error) {
        console.error('Error al eliminar artículo:', error);
        throw error;
    }
}

// =============================================================================
// DUPLICAR ARTÍCULO A OTRAS SUCURSALES (SOLO DUEÑOS)
// =============================================================================

/**
 * Duplica un artículo a múltiples sucursales
 * Crea NUEVOS registros en articulos (cada sucursal tiene su copia)
 * SOLO DUEÑOS pueden usar esta función
 * 
 * @param articuloId - UUID del artículo original
 * @param negocioId - UUID del negocio (validación)
 * @param datos - Array de sucursalesIds destino
 * @returns Artículos duplicados
 */
export async function duplicarArticuloASucursales(
    articuloId: string,
    negocioId: string,
    datos: DuplicarArticuloInput
) {
    try {
        return await db.transaction(async (tx) => {
            // 1. Obtener artículo original
            const [articuloOriginal] = await tx
                .select()
                .from(articulos)
                .where(
                    and(
                        eq(articulos.id, articuloId),
                        eq(articulos.negocioId, negocioId)
                    )
                )
                .limit(1);

            if (!articuloOriginal) {
                throw new Error('Artículo no encontrado');
            }

            // 2. Verificar que las sucursales pertenecen al negocio
            const sucursalesArray = sql.join(datos.sucursalesIds.map(id => sql`${id}`), sql`,`);
            const verificacionSucursales = await tx.execute(sql`
                SELECT id 
                FROM negocio_sucursales 
                WHERE negocio_id = ${negocioId}
                AND id IN (${sucursalesArray})
            `);

            if (verificacionSucursales.rows.length !== datos.sucursalesIds.length) {
                throw new Error('Una o más sucursales no pertenecen a tu negocio');
            }

            // 3. Duplicar artículo para cada sucursal
            const articulosDuplicados = [];

            for (const sucursalId of datos.sucursalesIds) {
                // 3.1 Duplicar imagen si existe
                let nuevaImagenUrl = articuloOriginal.imagenPrincipal;
                if (articuloOriginal.imagenPrincipal) {
                    const imagenDuplicada = await duplicarImagen(
                        articuloOriginal.imagenPrincipal,
                        'articulos'
                    );
                    if (imagenDuplicada) {
                        nuevaImagenUrl = imagenDuplicada;
                    }
                }

                // 3.2 Crear copia del artículo
                const [nuevaCopia] = await tx
                    .insert(articulos)
                    .values({
                        negocioId: articuloOriginal.negocioId,
                        tipo: articuloOriginal.tipo,
                        nombre: articuloOriginal.nombre,
                        descripcion: articuloOriginal.descripcion,
                        categoria: articuloOriginal.categoria,
                        precioBase: articuloOriginal.precioBase,
                        precioDesde: articuloOriginal.precioDesde,
                        imagenPrincipal: nuevaImagenUrl, // ← Usa la imagen duplicada
                        disponible: articuloOriginal.disponible,
                        destacado: articuloOriginal.destacado,
                        orden: articuloOriginal.orden,
                        totalVentas: 0,
                        totalVistas: 0,
                    })
                    .returning();

                // 3.3 Asignar a la sucursal destino
                await tx
                    .insert(articuloSucursales)
                    .values({
                        articuloId: nuevaCopia.id,
                        sucursalId,
                    });

                articulosDuplicados.push({
                    id: nuevaCopia.id,
                    sucursalId,
                    nombre: nuevaCopia.nombre,
                });
            }

            return {
                success: true,
                message: `Artículo duplicado a ${articulosDuplicados.length} sucursal(es)`,
                data: articulosDuplicados,
            };
        });
    } catch (error) {
        console.error('Error al duplicar artículo:', error);
        throw error;
    }
}

// =============================================================================
// REGISTRAR VISTA DE ARTÍCULO (MÉTRICA)
// =============================================================================

/**
 * Registra una vista de artículo (incrementa total_vistas)
 * Llamado cuando un usuario abre el modal de detalle
 * 
 * @param articuloId - UUID del artículo
 * @returns Confirmación de registro
 */
export async function registrarVistaArticulo(articuloId: string) {
    try {
        // Incrementar contador de vistas
        const query = sql`
            UPDATE articulos
            SET total_vistas = COALESCE(total_vistas, 0) + 1
            WHERE id = ${articuloId}
        `;

        await db.execute(query);

        return {
            success: true,
            message: 'Vista registrada',
        };
    } catch (error) {
        console.error('Error al registrar vista:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    // Públicas
    obtenerCatalogoNegocio,
    obtenerArticuloDetalle,
    registrarVistaArticulo,

    // Business Studio
    crearArticulo,
    obtenerArticulos,
    obtenerArticuloPorId,
    actualizarArticulo,
    eliminarArticulo,
    duplicarArticuloASucursales,
};