/**
 * ============================================================================
 * GUARDADOS SERVICE - Lógica de Negocio
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/guardados.service.ts
 *
 * PROPÓSITO:
 * Funciones para manejar guardados (ofertas y publicaciones de Servicios)
 * Sistema reutilizable para guardar contenido
 *
 * ENTITY TYPES SOPORTADOS:
 * - oferta (Ofertas/Cupones)
 * - servicio (publicaciones de la sección pública Servicios)
 *
 * DIFERENCIA CON VOTOS:
 * - Votos = Interacciones sociales públicas (like/follow de negocios)
 * - Guardados = Lista personal privada (guardar contenido para después)
 *
 * CAMBIOS EN ESTA VERSIÓN:
 * ✅ JOIN con tabla ofertas cuando entityType='oferta'
 * ✅ Retorna datos completos de la oferta
 * ✅ JOIN con negocio_sucursales para obtener whatsapp de la sucursal
 */

import { eq, and, sql, or, ne } from 'drizzle-orm';
import { db } from '../db';
import { estaFueraDeCirculacion } from '../utils/estadoNegocio.js';
import {
    guardados,
    ofertas,
    negocioSucursales,
    negocios,
    articulosMarketplace,
    serviciosPublicaciones,
} from '../db/schemas/schema';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'oferta' | 'servicio' | 'articulo_marketplace';

interface AgregarGuardadoParams {
    userId: string;
    entityType: EntityType;
    entityId: string;
}

// =============================================================================
// AGREGAR A GUARDADOS
// =============================================================================

/**
 * Agrega una entidad a guardados del usuario
 */
export async function agregarGuardado(params: AgregarGuardadoParams) {
    try {
        const { userId, entityType, entityId } = params;

        // Verificar si ya existe
        const [guardadoExistente] = await db
            .select()
            .from(guardados)
            .where(
                and(
                    eq(guardados.usuarioId, userId),
                    eq(guardados.entityType, entityType),
                    eq(guardados.entityId, entityId)
                )
            )
            .limit(1);

        if (guardadoExistente) {
            return {
                success: false,
                message: 'Ya está en guardados',
            };
        }

        // Candado de circulación: no se puede guardar una oferta de un negocio
        // fuera de circulación.
        if (entityType === 'oferta') {
            const [ofe] = await db
                .select({
                    activo: negocios.activo,
                    estadoMembresia: negocios.estadoMembresia,
                    estadoAdmin: negocios.estadoAdmin,
                })
                .from(ofertas)
                .innerJoin(negocios, eq(negocios.id, ofertas.negocioId))
                .where(eq(ofertas.id, entityId))
                .limit(1);
            if (ofe && estaFueraDeCirculacion(ofe)) {
                return { success: false, message: 'Este negocio no está disponible.', code: 403 };
            }
        }

        // Candado de circulación: tampoco se puede guardar una VACANTE-EMPRESA de un
        // negocio fuera de circulación. El innerJoin + tipo='vacante-empresa' deja
        // fuera las publicaciones de persona física (que no tienen negocio).
        if (entityType === 'servicio') {
            const [vac] = await db
                .select({
                    activo: negocios.activo,
                    estadoMembresia: negocios.estadoMembresia,
                    estadoAdmin: negocios.estadoAdmin,
                })
                .from(serviciosPublicaciones)
                .innerJoin(negocioSucursales, eq(negocioSucursales.id, serviciosPublicaciones.sucursalId))
                .innerJoin(negocios, eq(negocios.id, negocioSucursales.negocioId))
                .where(and(
                    eq(serviciosPublicaciones.id, entityId),
                    eq(serviciosPublicaciones.tipo, 'vacante-empresa')
                ))
                .limit(1);
            if (vac && estaFueraDeCirculacion(vac)) {
                return { success: false, message: 'Este negocio no está disponible.', code: 403 };
            }
        }

        // Crear nuevo guardado
        const [nuevoGuardado] = await db
            .insert(guardados)
            .values({
                usuarioId: userId,
                entityType,
                entityId,
            })
            .returning();

        // Incrementar el contador denormalizado de la entidad guardada.
        // Las ofertas tienen su contador manejado en otros services.
        // articulo_marketplace y servicio actualizan aquí su `total_guardados`
        // para que el feed/detalle muestren el número correcto sin tener
        // que volver a contar la tabla guardados.
        if (entityType === 'articulo_marketplace') {
            await db
                .update(articulosMarketplace)
                .set({ totalGuardados: sql`${articulosMarketplace.totalGuardados} + 1` })
                .where(eq(articulosMarketplace.id, entityId));
        } else if (entityType === 'servicio') {
            await db
                .update(serviciosPublicaciones)
                .set({ totalGuardados: sql`${serviciosPublicaciones.totalGuardados} + 1` })
                .where(eq(serviciosPublicaciones.id, entityId));
        }

        return {
            success: true,
            message: '¡Guardado!',
            data: {
                id: nuevoGuardado.id,
                usuarioId: nuevoGuardado.usuarioId,
                entityType: nuevoGuardado.entityType,
                entityId: nuevoGuardado.entityId,
                createdAt: nuevoGuardado.createdAt,
            },
        };
    } catch (error) {
        console.error('Error al agregar a guardados:', error);
        throw error;
    }
}

// =============================================================================
// QUITAR DE GUARDADOS
// =============================================================================

/**
 * Quita una entidad de guardados del usuario
 */
export async function quitarGuardado(
    userId: string,
    entityType: EntityType,
    entityId: string
) {
    try {
        // Buscar el guardado
        const [guardadoExistente] = await db
            .select()
            .from(guardados)
            .where(
                and(
                    eq(guardados.usuarioId, userId),
                    eq(guardados.entityType, entityType),
                    eq(guardados.entityId, entityId)
                )
            )
            .limit(1);

        if (!guardadoExistente) {
            return {
                success: false,
                message: 'No está en guardados',
            };
        }

        // Eliminar guardado
        await db
            .delete(guardados)
            .where(eq(guardados.id, guardadoExistente.id));

        // Decrementar el contador denormalizado de la entidad guardada.
        // GREATEST evita valores negativos si el contador queda desfasado.
        if (entityType === 'articulo_marketplace') {
            await db
                .update(articulosMarketplace)
                .set({
                    totalGuardados: sql`GREATEST(${articulosMarketplace.totalGuardados} - 1, 0)`,
                })
                .where(eq(articulosMarketplace.id, entityId));
        } else if (entityType === 'servicio') {
            await db
                .update(serviciosPublicaciones)
                .set({
                    totalGuardados: sql`GREATEST(${serviciosPublicaciones.totalGuardados} - 1, 0)`,
                })
                .where(eq(serviciosPublicaciones.id, entityId));
        }

        return {
            success: true,
            message: 'Quitado de guardados',
        };
    } catch (error) {
        console.error('Error al quitar de guardados:', error);
        throw error;
    }
}

// =============================================================================
// VERIFICAR SI ESTÁ EN GUARDADOS
// =============================================================================

/**
 * Verifica si una entidad está en guardados del usuario
 */
export async function verificarGuardado(
    userId: string,
    entityType: EntityType,
    entityId: string
): Promise<boolean> {
    try {
        const [guardado] = await db
            .select()
            .from(guardados)
            .where(
                and(
                    eq(guardados.usuarioId, userId),
                    eq(guardados.entityType, entityType),
                    eq(guardados.entityId, entityId)
                )
            )
            .limit(1);

        return !!guardado;
    } catch (error) {
        console.error('Error al verificar guardado:', error);
        return false;
    }
}

// =============================================================================
// OBTENER GUARDADOS DEL USUARIO
// =============================================================================

/**
 * Obtiene la lista de entidades guardadas de un usuario
 * Filtrable por tipo de entidad
 * 
 * CAMBIO IMPORTANTE:
 * - Si entityType='oferta': Hace JOIN con ofertas y negocio_sucursales
 * - Retorna datos completos incluyendo whatsapp de la sucursal
 * - Si entityType='servicio' (Servicios): Retorna solo IDs (comportamiento anterior)
 */
export async function obtenerGuardados(
    userId: string,
    entityType?: EntityType,
    pagina: number = 1,
    limite: number = 20
) {
    try {
        const offset = (pagina - 1) * limite;

        // Construir condiciones
        const condiciones = [eq(guardados.usuarioId, userId)];

        if (entityType) {
            condiciones.push(eq(guardados.entityType, entityType));
        }

        // =====================================================================
        // CASO 1: entityType === 'oferta' → JOIN con negocio_sucursales
        // =====================================================================
        if (entityType === 'oferta') {
            // Obtener guardados con datos completos de ofertas + sucursal
            const guardadosConOfertas = await db
                .select({
                    // Datos del guardado
                    id: guardados.id,
                    entityType: guardados.entityType,
                    entityId: guardados.entityId,
                    createdAt: guardados.createdAt,
                    // Datos completos de la oferta
                    oferta: {
                        id: ofertas.id,
                        negocioId: ofertas.negocioId,
                        sucursalId: ofertas.sucursalId,
                        articuloId: ofertas.articuloId,
                        titulo: ofertas.titulo,
                        descripcion: ofertas.descripcion,
                        imagen: ofertas.imagen,
                        tipo: ofertas.tipo,
                        valor: ofertas.valor,
                        compraMinima: ofertas.compraMinima,
                        fechaInicio: ofertas.fechaInicio,
                        fechaFin: ofertas.fechaFin,
                        limiteUsos: ofertas.limiteUsos,
                        usosActuales: ofertas.usosActuales,
                        activo: ofertas.activo,
                        createdAt: ofertas.createdAt,
                        updatedAt: ofertas.updatedAt,
                    },
                    // Datos completos del negocio + sucursal para el header
                    // del ModalOfertaDetalle (logo + nombre del negocio +
                    // label de sucursal) y para el avatar correcto del chat
                    // (foto de perfil de la SUCURSAL, no el logo). Antes solo
                    // se devolvía `nombre` (de la sucursal) y eso se mostraba
                    // como nombre del negocio — bug visible en MisGuardados.
                    negocio: {
                        nombre: negocios.nombre,                     // nombre del NEGOCIO
                        logoUrl: negocios.logoUrl,                   // logo del negocio
                        whatsapp: negocioSucursales.whatsapp,
                        sucursalId: negocioSucursales.id,
                        sucursalNombre: negocioSucursales.nombre,    // nombre de la SUCURSAL
                        sucursalFotoPerfil: negocioSucursales.fotoPerfil, // avatar chat
                        usuarioId: negocios.usuarioId,
                    }
                })
                .from(guardados)
                .leftJoin(ofertas, eq(guardados.entityId, ofertas.id))
                .leftJoin(negocioSucursales, eq(ofertas.sucursalId, negocioSucursales.id))
                .leftJoin(negocios, eq(negocioSucursales.negocioId, negocios.id))
                .where(and(
                    ...condiciones,
                    eq(ofertas.activo, true),
                    // Ocultar guardados cuyo negocio está fuera de circulación (no se
                    // borran: si el negocio reactiva, el guardado reaparece solo).
                    eq(negocios.activo, true),
                    sql`(${ofertas.fechaFin} IS NULL OR ${ofertas.fechaFin} >= CURRENT_DATE)`
                ))
                .orderBy(sql`${guardados.createdAt} DESC`)
                .limit(limite)
                .offset(offset);

            // Contar total
            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .where(and(...condiciones));

            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosConOfertas,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO 2: entityType === 'articulo_marketplace' → JOIN con MarketPlace
        // (Sprint 7 — tab "Artículos" en Mis Guardados)
        // =====================================================================
        else if (entityType === 'articulo_marketplace') {
            // SQL crudo para extraer ubicacion_aproximada con ST_Y/ST_X
            // (Drizzle no tiene tipo geography y la columna está como text).
            const offsetSql = (pagina - 1) * limite;
            const guardadosRaw = await db.execute(sql`
                SELECT
                    g.id,
                    g.entity_type AS "entityType",
                    g.entity_id AS "entityId",
                    g.created_at AS "createdAt",
                    a.id AS "articuloId",
                    a.usuario_id AS "articuloUsuarioId",
                    a.titulo AS "articuloTitulo",
                    a.descripcion AS "articuloDescripcion",
                    a.precio AS "articuloPrecio",
                    a.condicion AS "articuloCondicion",
                    a.acepta_ofertas AS "articuloAceptaOfertas",
                    a.unidad_venta AS "articuloUnidadVenta",
                    a.fotos AS "articuloFotos",
                    a.foto_portada_index AS "articuloFotoPortadaIndex",
                    ST_Y(a.ubicacion_aproximada::geometry) AS "articuloLat",
                    ST_X(a.ubicacion_aproximada::geometry) AS "articuloLng",
                    a.ciudad AS "articuloCiudad",
                    a.zona_aproximada AS "articuloZonaAproximada",
                    a.estado AS "articuloEstado",
                    a.total_vistas AS "articuloTotalVistas",
                    a.total_mensajes AS "articuloTotalMensajes",
                    a.total_guardados AS "articuloTotalGuardados",
                    a.expira_at AS "articuloExpiraAt",
                    a.created_at AS "articuloCreatedAt",
                    a.updated_at AS "articuloUpdatedAt",
                    a.vendida_at AS "articuloVendidaAt"
                FROM guardados g
                INNER JOIN articulos_marketplace a ON a.id = g.entity_id
                WHERE g.usuario_id = ${userId}
                  AND g.entity_type = 'articulo_marketplace'
                  AND a.deleted_at IS NULL
                  -- Solo mostrar artículos activos. Si el vendedor lo marcó
                  -- como vendido, lo pausó, o el cron de expiración lo movió a
                  -- 'pausada', desaparece automáticamente de Mis Guardados del
                  -- cliente. La fila en la tabla guardados se conserva en BD
                  -- por si el artículo regresa a estado 'activa' después.
                  AND a.estado = 'activa'
                ORDER BY g.created_at DESC
                LIMIT ${limite}
                OFFSET ${offsetSql}
            `);

            interface RawRow {
                id: string;
                entityType: string;
                entityId: string;
                createdAt: string;
                articuloId: string;
                articuloUsuarioId: string;
                articuloTitulo: string;
                articuloDescripcion: string;
                articuloPrecio: string;
                // condicion, aceptaOfertas y unidadVenta son opcionales
                // desde 2026-05-13 (productos consumibles, hechos a mano).
                articuloCondicion: string | null;
                articuloAceptaOfertas: boolean | null;
                articuloUnidadVenta: string | null;
                articuloFotos: string[];
                articuloFotoPortadaIndex: number;
                articuloLat: number;
                articuloLng: number;
                articuloCiudad: string;
                articuloZonaAproximada: string;
                articuloEstado: string;
                articuloTotalVistas: number;
                articuloTotalMensajes: number;
                articuloTotalGuardados: number;
                articuloExpiraAt: string;
                articuloCreatedAt: string;
                articuloUpdatedAt: string;
                articuloVendidaAt: string | null;
            }

            const guardadosConArticulo = (guardadosRaw.rows as unknown as RawRow[]).map(
                (r) => ({
                    id: r.id,
                    entityType: r.entityType,
                    entityId: r.entityId,
                    createdAt: r.createdAt,
                    articulo: {
                        id: r.articuloId,
                        usuarioId: r.articuloUsuarioId,
                        titulo: r.articuloTitulo,
                        descripcion: r.articuloDescripcion,
                        precio: r.articuloPrecio,
                        condicion: r.articuloCondicion,
                        aceptaOfertas: r.articuloAceptaOfertas,
                        unidadVenta: r.articuloUnidadVenta,
                        fotos: r.articuloFotos,
                        fotoPortadaIndex: r.articuloFotoPortadaIndex,
                        ubicacionAproximada: { lat: r.articuloLat, lng: r.articuloLng },
                        ciudad: r.articuloCiudad,
                        zonaAproximada: r.articuloZonaAproximada,
                        estado: r.articuloEstado,
                        totalVistas: r.articuloTotalVistas,
                        totalMensajes: r.articuloTotalMensajes,
                        totalGuardados: r.articuloTotalGuardados,
                        expiraAt: r.articuloExpiraAt,
                        createdAt: r.articuloCreatedAt,
                        updatedAt: r.articuloUpdatedAt,
                        vendidaAt: r.articuloVendidaAt,
                    },
                })
            );

            // Total
            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .innerJoin(articulosMarketplace, eq(articulosMarketplace.id, guardados.entityId))
                .where(
                    and(
                        eq(guardados.usuarioId, userId),
                        eq(guardados.entityType, 'articulo_marketplace'),
                        sql`${articulosMarketplace.deletedAt} IS NULL`
                    )
                );
            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosConArticulo,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO 3: entityType === 'servicio' → JOIN con servicios_publicaciones
        // (Sprint 9.3 — tab "Servicios" en Mis Guardados)
        // =====================================================================
        else if (entityType === 'servicio') {
            // SQL crudo igual que articulo_marketplace porque ubicacion_aproximada
            // está como text (geography no soportado nativamente por Drizzle).
            //
            // Sprint 9.3 (iteración): se agregaron LEFT JOIN a negocios +
            // negocio_sucursales (mismos que `COLUMNAS_PUBLICACION_FEED` del
            // feed normal) para que el card de Vacante guardada renderice
            // el logo del negocio y la foto de portada de la sucursal
            // (antes salía con placeholder gris porque faltaban esos
            // campos en la respuesta).
            const offsetSql = (pagina - 1) * limite;
            const guardadosRaw = await db.execute(sql`
                SELECT
                    g.id,
                    g.entity_type AS "entityType",
                    g.entity_id AS "entityId",
                    g.created_at AS "createdAt",
                    p.id AS "publicacionId",
                    p.usuario_id AS "publicacionUsuarioId",
                    p.sucursal_id AS "publicacionSucursalId",
                    p.modo AS "publicacionModo",
                    p.tipo AS "publicacionTipo",
                    p.subtipo AS "publicacionSubtipo",
                    p.titulo AS "publicacionTitulo",
                    p.descripcion AS "publicacionDescripcion",
                    p.fotos AS "publicacionFotos",
                    p.foto_portada_index AS "publicacionFotoPortadaIndex",
                    p.precio AS "publicacionPrecio",
                    p.modalidad AS "publicacionModalidad",
                    ST_Y(p.ubicacion_aproximada::geometry) AS "publicacionLat",
                    ST_X(p.ubicacion_aproximada::geometry) AS "publicacionLng",
                    p.ciudad AS "publicacionCiudad",
                    p.zonas_aproximadas AS "publicacionZonasAproximadas",
                    p.skills AS "publicacionSkills",
                    p.requisitos AS "publicacionRequisitos",
                    p.horario AS "publicacionHorario",
                    p.dias_semana AS "publicacionDiasSemana",
                    p.tipo_empleo AS "publicacionTipoEmpleo",
                    p.beneficios AS "publicacionBeneficios",
                    p.presupuesto AS "publicacionPresupuesto",
                    p.categoria AS "publicacionCategoria",
                    p.urgente AS "publicacionUrgente",
                    p.estado AS "publicacionEstado",
                    p.total_vistas AS "publicacionTotalVistas",
                    p.total_mensajes AS "publicacionTotalMensajes",
                    p.total_guardados AS "publicacionTotalGuardados",
                    p.expira_at AS "publicacionExpiraAt",
                    p.created_at AS "publicacionCreatedAt",
                    p.updated_at AS "publicacionUpdatedAt",
                    -- Datos del negocio + sucursal (solo poblados cuando
                    -- es vacante con sucursal_id). NULL en publicaciones
                    -- personales (servicio-persona, solicito).
                    n.id            AS "publicacionNegocioId",
                    n.nombre        AS "publicacionNegocioNombre",
                    n.logo_url      AS "publicacionNegocioLogo",
                    s.nombre        AS "publicacionSucursalNombre",
                    s.portada_url   AS "publicacionSucursalPortada",
                    s.foto_perfil   AS "publicacionSucursalFotoPerfil"
                FROM guardados g
                INNER JOIN servicios_publicaciones p ON p.id = g.entity_id
                LEFT JOIN negocio_sucursales s ON p.sucursal_id = s.id
                LEFT JOIN negocios n ON s.negocio_id = n.id
                WHERE g.usuario_id = ${userId}
                  AND g.entity_type = 'servicio'
                  -- Solo publicaciones activas. Si el dueño la pausó o el
                  -- cron de expiración la auto-pausó, desaparece de Mis
                  -- Guardados. La fila en guardados se mantiene en BD
                  -- por si la publicación vuelve a 'activa' después.
                  AND p.estado = 'activa'
                  -- Ocultar vacantes de empresa de negocios fuera de circulación
                  -- (las publicaciones de persona física no tienen negocio → visibles)
                  AND (p.tipo <> 'vacante-empresa' OR n.activo = true)
                ORDER BY g.created_at DESC
                LIMIT ${limite}
                OFFSET ${offsetSql}
            `);

            interface RawPubRow {
                id: string;
                entityType: string;
                entityId: string;
                createdAt: string;
                publicacionId: string;
                publicacionUsuarioId: string;
                publicacionSucursalId: string | null;
                publicacionModo: string;
                publicacionTipo: string;
                publicacionSubtipo: string | null;
                publicacionTitulo: string;
                publicacionDescripcion: string;
                publicacionFotos: string[];
                publicacionFotoPortadaIndex: number;
                publicacionPrecio: unknown;
                publicacionModalidad: string;
                publicacionLat: number;
                publicacionLng: number;
                publicacionCiudad: string;
                publicacionZonasAproximadas: string[];
                publicacionSkills: string[];
                publicacionRequisitos: string[];
                publicacionHorario: string | null;
                publicacionDiasSemana: string[];
                publicacionTipoEmpleo: string | null;
                publicacionBeneficios: string[];
                publicacionPresupuesto: unknown;
                publicacionCategoria: string | null;
                publicacionUrgente: boolean;
                publicacionEstado: string;
                publicacionTotalVistas: number;
                publicacionTotalMensajes: number;
                publicacionTotalGuardados: number;
                publicacionExpiraAt: string;
                publicacionCreatedAt: string;
                publicacionUpdatedAt: string;
                // Datos del negocio (vacantes) — null para tipos personales.
                publicacionNegocioId: string | null;
                publicacionNegocioNombre: string | null;
                publicacionNegocioLogo: string | null;
                publicacionSucursalNombre: string | null;
                publicacionSucursalPortada: string | null;
                publicacionSucursalFotoPerfil: string | null;
            }

            const guardadosConPublicacion = (
                guardadosRaw.rows as unknown as RawPubRow[]
            ).map((r) => ({
                id: r.id,
                entityType: r.entityType,
                entityId: r.entityId,
                createdAt: r.createdAt,
                publicacion: {
                    id: r.publicacionId,
                    usuarioId: r.publicacionUsuarioId,
                    sucursalId: r.publicacionSucursalId,
                    modo: r.publicacionModo,
                    tipo: r.publicacionTipo,
                    subtipo: r.publicacionSubtipo,
                    titulo: r.publicacionTitulo,
                    descripcion: r.publicacionDescripcion,
                    fotos: r.publicacionFotos,
                    fotoPortadaIndex: r.publicacionFotoPortadaIndex,
                    precio: r.publicacionPrecio,
                    modalidad: r.publicacionModalidad,
                    ubicacionAproximada: {
                        lat: r.publicacionLat,
                        lng: r.publicacionLng,
                    },
                    ciudad: r.publicacionCiudad,
                    zonasAproximadas: r.publicacionZonasAproximadas,
                    skills: r.publicacionSkills,
                    requisitos: r.publicacionRequisitos,
                    horario: r.publicacionHorario,
                    diasSemana: r.publicacionDiasSemana,
                    tipoEmpleo: r.publicacionTipoEmpleo,
                    beneficios: r.publicacionBeneficios,
                    presupuesto: r.publicacionPresupuesto,
                    categoria: r.publicacionCategoria,
                    urgente: r.publicacionUrgente,
                    estado: r.publicacionEstado,
                    totalVistas: r.publicacionTotalVistas,
                    totalMensajes: r.publicacionTotalMensajes,
                    totalGuardados: r.publicacionTotalGuardados,
                    expiraAt: r.publicacionExpiraAt,
                    createdAt: r.publicacionCreatedAt,
                    updatedAt: r.publicacionUpdatedAt,
                    // Negocio + sucursal — para que el CardServicio
                    // renderice logo de vacante y portada de la sucursal.
                    negocioId: r.publicacionNegocioId,
                    negocioNombre: r.publicacionNegocioNombre,
                    negocioLogo: r.publicacionNegocioLogo,
                    sucursalNombre: r.publicacionSucursalNombre,
                    sucursalPortada: r.publicacionSucursalPortada,
                    sucursalFotoPerfil: r.publicacionSucursalFotoPerfil,
                },
            }));

            // Total — cuenta solo activas para que el badge del tab
            // refleje lo que el usuario realmente puede ver.
            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .innerJoin(
                    serviciosPublicaciones,
                    eq(serviciosPublicaciones.id, guardados.entityId),
                )
                .leftJoin(negocioSucursales, eq(negocioSucursales.id, serviciosPublicaciones.sucursalId))
                .leftJoin(negocios, eq(negocios.id, negocioSucursales.negocioId))
                .where(
                    and(
                        eq(guardados.usuarioId, userId),
                        eq(guardados.entityType, 'servicio'),
                        eq(serviciosPublicaciones.estado, 'activa'),
                        // Mismo filtro que la lista: ocultar vacantes-empresa de negocios fuera
                        or(
                            ne(serviciosPublicaciones.tipo, 'vacante-empresa'),
                            eq(negocios.activo, true),
                        ),
                    ),
                );
            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosConPublicacion,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO FALLBACK: cualquier otro entityType → Solo IDs (comportamiento legacy)
        // =====================================================================
        else {
            const guardadosRaw = await db
                .select({
                    id: guardados.id,
                    entityType: guardados.entityType,
                    entityId: guardados.entityId,
                    createdAt: guardados.createdAt,
                })
                .from(guardados)
                .where(and(...condiciones))
                .orderBy(sql`${guardados.createdAt} DESC`)
                .limit(limite)
                .offset(offset);

            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .where(and(...condiciones));

            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosRaw,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }
    } catch (error) {
        console.error('Error al obtener guardados:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    agregarGuardado,
    quitarGuardado,
    verificarGuardado,
    obtenerGuardados,
};