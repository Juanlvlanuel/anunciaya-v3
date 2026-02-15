/**
 * ============================================================================
 * NEGOCIOS SERVICE - Lógica de Negocio
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/negocios.service.ts
 * 
 * PROPÓSITO:
 * Funciones para obtener información de negocios y sucursales
 * 
 * ACTUALIZADO: Fase 5.3 - Agregados mappers para transformar snake_case a camelCase
 */

import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { negocios, negocioGaleria, negocioSucursales, empleados, usuarios } from '../db/schemas/schema';
import type { PerfilSucursalRow, SucursalResumenRow } from '../types/negocios.types';

// =============================================================================
// TIPOS
// =============================================================================

interface FiltrosListaSucursales {
    latitud?: number;
    longitud?: number;
    distanciaMaxKm?: number;
    categoriaId?: number;
    subcategoriaIds?: number[];
    metodosPago?: string[];
    aceptaCardYA?: boolean;
    tieneEnvio?: boolean;
    busqueda?: string;
    limite?: number;
    offset?: number;
    votanteSucursalId?: string | null; // Para filtrar votos por modo personal/comercial
}

// =============================================================================
// MAPPERS - Transformación de snake_case a camelCase
// =============================================================================

/**
 * Transforma el resultado de listarSucursalesCercanas de snake_case a camelCase
 * 
 * IMPORTANTE: Los campos anidados en JSON (categorias, metodos_pago, etc) 
 * ya vienen en camelCase desde el SQL, solo transformamos los de primer nivel
 */
function mapearSucursalResumen(row: SucursalResumenRow) {
    return {
        // Datos del negocio
        negocioId: row.negocio_id,
        negocioNombre: row.negocio_nombre,
        galeria: row.galeria || [],
        logoUrl: row.logo_url,
        aceptaCardya: row.acepta_cardya,
        verificado: row.verificado,

        // Datos de la sucursal
        sucursalId: row.sucursal_id,
        sucursalNombre: row.sucursal_nombre,
        direccion: row.direccion,
        ciudad: row.ciudad,
        estado: row.estado,
        telefono: row.telefono,
        whatsapp: row.whatsapp,
        tieneEnvioDomicilio: row.tiene_envio_domicilio,
        tieneServicioDomicilio: row.tiene_servicio_domicilio,
        calificacionPromedio: row.calificacion_promedio,
        totalCalificaciones: row.total_calificaciones,
        totalLikes: row.total_likes,
        totalVisitas: row.total_visitas,
        activa: row.activa,

        // Coordenadas de la sucursal
        latitud: row.latitud,
        longitud: row.longitud,

        // Distancia (puede ser null)
        distanciaKm: row.distancia_km,
        // Arrays anidados (ya vienen en camelCase desde SQL)
        categorias: row.categorias,
        metodosPago: row.metodos_pago,

        // Estado del usuario
        liked: row.liked,
        followed: row.followed,
        estaAbierto: row.esta_abierto,
    };
}

/**
 * Transforma el resultado de obtenerPerfilSucursal de snake_case a camelCase
 */
function mapearPerfilCompleto(row: PerfilSucursalRow) {
    return {
        // Datos del negocio
        negocioId: row.negocio_id,
        negocioNombre: row.negocio_nombre,
        negocioDescripcion: row.negocio_descripcion,
        logoUrl: row.logo_url,
        portadaUrl: row.portada_url,
        fotoPerfilUrl: row.foto_perfil,
        sitioWeb: row.sitio_web,
        redesSociales: row.redes_sociales,
        aceptaCardya: row.acepta_cardya,
        verificado: row.verificado,

        // Datos de la sucursal
        sucursalId: row.sucursal_id,
        sucursalNombre: row.sucursal_nombre,
        esPrincipal: row.es_principal,
        direccion: row.direccion,
        ciudad: row.ciudad,
        estado: row.estado,
        telefono: row.telefono,
        whatsapp: row.whatsapp,
        correo: row.correo,
        tieneEnvioDomicilio: row.tiene_envio_domicilio,
        tieneServicioDomicilio: row.tiene_servicio_domicilio,
        latitud: row.latitud,
        longitud: row.longitud,
        calificacionPromedio: row.calificacion_promedio,
        totalCalificaciones: row.total_calificaciones,
        totalLikes: row.total_likes,
        totalVisitas: row.total_visitas,
        activa: row.activa,
        zonaHoraria: row.zona_horaria,

        // Arrays anidados (ya vienen en camelCase desde SQL)
        categorias: row.categorias,
        horarios: row.horarios,
        metodosPago: row.metodos_pago,
        galeria: row.galeria,
        metricas: row.metricas,

        // Estado del usuario
        liked: row.liked,
        followed: row.followed,
        estaAbierto: row.esta_abierto,

        // Conteo de sucursales
        totalSucursales: row.total_sucursales,
    };
}

/**
 * Expande los métodos de pago del frontend a los tipos de la BD
 * 'tarjeta' se expande a 'tarjeta_debito' Y 'tarjeta_credito'
 */
function expandirMetodosPago(metodos: string[]): string[] {
    const expandidos: string[] = [];

    for (const metodo of metodos) {
        if (metodo === 'tarjeta') {
            expandidos.push('tarjeta_debito', 'tarjeta_credito');
        } else {
            expandidos.push(metodo);
        }
    }

    return expandidos;
}

// =============================================================================
// LISTAR SUCURSALES CON POSTGIS (NUEVO - Fase 5.3)
// =============================================================================

/**
 * Obtiene lista de sucursales cercanas con filtros PostGIS
 * 
 * Retorna sucursales ordenadas por distancia
 * Incluye: datos negocio, datos sucursal, categorías, métricas, distancia
 */
export async function listarSucursalesCercanas(
    userId: string | null,
    filtros: FiltrosListaSucursales
) {
    try {
        const {
            latitud,
            longitud,
            distanciaMaxKm = 50,
            categoriaId,
            subcategoriaIds,
            metodosPago,
            aceptaCardYA,
            tieneEnvio,
            busqueda,
            limite = 20,
            offset = 0,
            votanteSucursalId,
        } = filtros;

        // Query SQL raw para PostGIS
        const query = sql`
            SELECT 
                -- Datos del negocio
                n.id as negocio_id,
                n.nombre as negocio_nombre,
                n.logo_url,
                n.participa_puntos as acepta_cardya,
                n.verificado,
                
               -- Datos de la sucursal
                s.id as sucursal_id,
                s.nombre as sucursal_nombre,
                s.direccion,
                s.ciudad,
                s.telefono,
                s.whatsapp,
                s.tiene_envio_domicilio,
                s.tiene_servicio_domicilio,
                s.calificacion_promedio,
                s.total_calificaciones,
                s.total_likes,
                s.total_visitas,
                s.activa,
                
                -- Coordenadas de la sucursal
                ST_Y(s.ubicacion::geometry) as latitud,
                ST_X(s.ubicacion::geometry) as longitud,
                
                -- Distancia calculada con PostGIS
                ${latitud && longitud ? sql`
                    ST_Distance(
                        s.ubicacion::geography,
                        ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
                    ) / 1000 as distancia_km,
                ` : sql`NULL as distancia_km,`}
                
                -- Categorías
                (
                    SELECT json_agg(json_build_object(
                        'id', sc.id,
                        'nombre', sc.nombre,
                        'categoria', json_build_object(
                            'id', c.id,
                            'nombre', c.nombre,
                            'icono', c.icono
                        )
                    ))
                    FROM asignacion_subcategorias asig_sub
                    JOIN subcategorias_negocio sc ON sc.id = asig_sub.subcategoria_id
                    JOIN categorias_negocio c ON c.id = sc.categoria_id
                    WHERE asig_sub.negocio_id = n.id
                ) as categorias,
                
                -- Métodos de pago
                (
                    SELECT json_agg(DISTINCT mp.tipo)
                    FROM negocio_metodos_pago mp
                    WHERE mp.negocio_id = n.id 
                      AND mp.sucursal_id = s.id
                      AND mp.activo = true
                ) as metodos_pago,

                -- Galería (primeras 4 imágenes)
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', g.id,
                            'url', g.url,
                            'titulo', g.titulo,
                            'orden', g.orden
                        )
                        ORDER BY g.orden
                    )
                    FROM negocio_galeria g
                    WHERE g.sucursal_id = s.id
                    LIMIT 8
                ) as galeria,
                
                -- Estado de voto del usuario (liked/followed)
                -- Considera votanteSucursalId para distinguir modo personal vs comercial
                ${userId ? sql`
                    EXISTS(
                        SELECT 1 FROM votos v 
                        WHERE v.entity_type = 'sucursal' 
                          AND v.entity_id = s.id 
                          AND v.user_id = ${userId}
                          AND v.tipo_accion = 'like'
                          AND ${votanteSucursalId
                    ? sql`v.votante_sucursal_id = ${votanteSucursalId}`
                    : sql`v.votante_sucursal_id IS NULL`}
                    ) as liked,
                    EXISTS(
                        SELECT 1 FROM votos v 
                        WHERE v.entity_type = 'sucursal' 
                          AND v.entity_id = s.id 
                          AND v.user_id = ${userId}
                          AND v.tipo_accion = 'follow'
                          AND ${votanteSucursalId
                    ? sql`v.votante_sucursal_id = ${votanteSucursalId}`
                    : sql`v.votante_sucursal_id IS NULL`}
                    ) as followed,
                ` : sql`
                    false as liked,
                    false as followed,
                `}
                
                -- Horarios (hoy está abierto?)
                (
                    SELECT 
                        CASE 
                            WHEN nh.abierto = false THEN false
                            WHEN nh.hora_cierre < nh.hora_apertura THEN 
                                -- Horario que cruza medianoche (ej: 22:00 - 02:00)
                                (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time >= nh.hora_apertura 
                                OR (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time <= nh.hora_cierre
                            ELSE 
                                -- Horario normal
                                (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time 
                                BETWEEN nh.hora_apertura AND nh.hora_cierre
                        END
                    FROM negocio_horarios nh
                    WHERE nh.sucursal_id = s.id
                    AND nh.dia_semana = EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE s.zona_horaria))::INTEGER
                    LIMIT 1
                ) as esta_abierto
                
            FROM negocios n
            INNER JOIN negocio_sucursales s ON s.negocio_id = n.id
            
            WHERE n.activo = true
              AND s.activa = true
              AND n.es_borrador = false
              AND n.onboarding_completado = true
              
              -- Filtro por distancia (PostGIS)
              ${latitud && longitud ? sql`
                AND ST_DWithin(
                    s.ubicacion::geography,
                    ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography,
                    ${distanciaMaxKm * 1000}
                )
              ` : sql``}
              
              -- Filtro por categoría
              ${categoriaId ? sql`
                AND EXISTS(
                    SELECT 1 FROM asignacion_subcategorias asig_sub
                    JOIN subcategorias_negocio sc ON sc.id = asig_sub.subcategoria_id
                    WHERE asig_sub.negocio_id = n.id
                      AND sc.categoria_id = ${categoriaId}
                )
              ` : sql``}
              
             -- Filtro por subcategorías
              ${subcategoriaIds && subcategoriaIds.length > 0 ? sql`
                AND EXISTS(
                    SELECT 1 FROM asignacion_subcategorias asig_sub
                    WHERE asig_sub.negocio_id = n.id
                      AND asig_sub.subcategoria_id IN (${sql.join(subcategoriaIds.map(id => sql`${id}`), sql`, `)})
                )
              ` : sql``}
              
              -- Filtro por CardYA
              ${aceptaCardYA !== undefined ? sql`
                AND n.participa_puntos = ${aceptaCardYA}
              ` : sql``}
              
              -- Filtro por envío a domicilio
              ${tieneEnvio !== undefined ? sql`
                AND s.tiene_envio_domicilio = ${tieneEnvio}
              ` : sql``}
              
              -- Búsqueda por nombre

            -- Filtro por métodos de pago
              ${metodosPago && metodosPago.length > 0 ? sql`
                AND EXISTS(
                    SELECT 1 FROM negocio_metodos_pago mp
                    WHERE mp.negocio_id = n.id 
                      AND mp.activo = true
                      AND mp.tipo IN (${sql.join(expandirMetodosPago(metodosPago).map(m => sql`${m}`), sql`, `)})
                )
              ` : sql``}


              ${busqueda ? sql`
                AND (
                    n.nombre ILIKE ${'%' + busqueda + '%'}
                    OR s.nombre ILIKE ${'%' + busqueda + '%'}
                )
              ` : sql``}
            
            -- Ordenar por distancia (más cercano primero)
            ORDER BY ${latitud && longitud ? sql`distancia_km ASC` : sql`s.total_likes DESC`}
            
            LIMIT ${limite}
            OFFSET ${offset}
        `;

        const resultado = await db.execute(query);

        // ✅ TRANSFORMAR a camelCase antes de devolver
        const sucursalesTransformadas = resultado.rows.map(row =>
            mapearSucursalResumen(row as unknown as SucursalResumenRow)
        );

        return {
            success: true,
            data: sucursalesTransformadas,
        };
    } catch (error) {
        console.error('Error al listar sucursales:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER PERFIL COMPLETO DE SUCURSAL (NUEVO - Fase 5.3)
// =============================================================================

/**
 * Obtiene perfil completo de una sucursal específica
 * 
 * Incluye: negocio, sucursal, categorías, horarios, métodos pago, galería, métricas
 */
export async function obtenerPerfilSucursal(
    sucursalId: string,
    userId: string | null,
    votanteSucursalId?: string | null
) {
    try {
        const query = sql`
            SELECT 
                -- Datos del negocio
                n.id as negocio_id,
                n.nombre as negocio_nombre,
                n.descripcion as negocio_descripcion,
                n.logo_url,
                n.sitio_web,
                n.participa_puntos as acepta_cardya,
                n.verificado,
                
                -- Datos de la sucursal
                s.id as sucursal_id,
                s.nombre as sucursal_nombre,
                s.es_principal,
                s.portada_url,
                s.foto_perfil,
                s.redes_sociales,
                s.direccion,
                s.ciudad,
                s.estado,
                s.telefono,
                s.whatsapp,
                s.correo,
                s.tiene_envio_domicilio,
                s.tiene_servicio_domicilio,
                ST_Y(s.ubicacion::geometry) as latitud,
                ST_X(s.ubicacion::geometry) as longitud,
                s.calificacion_promedio,
                s.total_calificaciones,
                s.total_likes,
                s.total_visitas,
                s.activa,
                s.zona_horaria,
                
                -- Categorías y subcategorías
                (
                    SELECT json_agg(json_build_object(
                        'id', sc.id,
                        'nombre', sc.nombre,
                        'categoria', json_build_object(
                            'id', c.id,
                            'nombre', c.nombre,
                            'icono', c.icono
                        )
                    ))
                    FROM asignacion_subcategorias asig_sub
                    JOIN subcategorias_negocio sc ON sc.id = asig_sub.subcategoria_id
                    JOIN categorias_negocio c ON c.id = sc.categoria_id
                    WHERE asig_sub.negocio_id = n.id
                ) as categorias,
                
                -- Horarios
                (
                    SELECT json_agg(json_build_object(
                        'diaSemana', nh.dia_semana,
                        'abierto', nh.abierto,
                        'horaApertura', nh.hora_apertura,
                        'horaCierre', nh.hora_cierre,
                        'tieneHorarioComida', nh.tiene_horario_comida,
                        'comidaInicio', nh.comida_inicio,
                        'comidaFin', nh.comida_fin
                    ) ORDER BY nh.dia_semana)
                    FROM negocio_horarios nh
                    WHERE nh.sucursal_id = s.id
                ) as horarios,
                
              -- Métodos de pago
                (
                    SELECT json_agg(DISTINCT mp.tipo)
                    FROM negocio_metodos_pago mp
                    WHERE mp.negocio_id = n.id 
                    AND mp.sucursal_id = s.id
                    AND mp.activo = true
                ) as metodos_pago,    
                
                -- Galería
                (
                    SELECT json_agg(json_build_object(
                        'id', ng.id,
                        'url', ng.url,
                        'titulo', ng.titulo,
                        'orden', ng.orden
                    ) ORDER BY ng.orden)
                    FROM negocio_galeria ng
                    WHERE ng.sucursal_id = s.id
                ) as galeria,
                
                -- Métricas de interacción (follows, shares, clicks, messages)
                (
                    SELECT json_build_object(
                        'totalFollows', COALESCE(m.total_follows, 0),
                        'totalShares', COALESCE(m.total_shares, 0),
                        'totalClicks', COALESCE(m.total_clicks, 0),
                        'totalMessages', COALESCE(m.total_messages, 0)
                    )
                    FROM metricas_entidad m
                    WHERE m.entity_type = 'sucursal'
                      AND m.entity_id = s.id
                ) as metricas,

                -- Total de sucursales del negocio
                (
                    SELECT COUNT(*)::integer
                    FROM negocio_sucursales ns
                    WHERE ns.negocio_id = n.id
                    AND ns.activa = true
                ) as total_sucursales,

                -- Horarios (hoy está abierto?)
                (
                    SELECT 
                        CASE 
                            WHEN nh.abierto = false THEN false
                            WHEN nh.hora_cierre < nh.hora_apertura THEN 
                                -- Horario que cruza medianoche (ej: 22:00 - 02:00)
                                (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time >= nh.hora_apertura 
                                OR (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time <= nh.hora_cierre
                            ELSE 
                                -- Horario normal
                                (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time 
                                BETWEEN nh.hora_apertura AND nh.hora_cierre
                        END
                    FROM negocio_horarios nh
                    WHERE nh.sucursal_id = s.id
                    AND nh.dia_semana = EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE s.zona_horaria))::INTEGER
                    LIMIT 1
                ) as esta_abierto,
                
                -- Estado de voto del usuario
                -- Considera votanteSucursalId para distinguir modo personal vs comercial
                ${userId ? sql`
                    EXISTS(
                        SELECT 1 FROM votos v 
                        WHERE v.entity_type = 'sucursal' 
                          AND v.entity_id = s.id 
                          AND v.user_id = ${userId}
                          AND v.tipo_accion = 'like'
                          AND ${votanteSucursalId
                    ? sql`v.votante_sucursal_id = ${votanteSucursalId}`
                    : sql`v.votante_sucursal_id IS NULL`}
                    ) as liked,
                    EXISTS(
                        SELECT 1 FROM votos v 
                        WHERE v.entity_type = 'sucursal' 
                          AND v.entity_id = s.id 
                          AND v.user_id = ${userId}
                          AND v.tipo_accion = 'follow'
                          AND ${votanteSucursalId
                    ? sql`v.votante_sucursal_id = ${votanteSucursalId}`
                    : sql`v.votante_sucursal_id IS NULL`}
                    ) as followed
                ` : sql`
                    false as liked,
                    false as followed
                `}
                
            FROM negocio_sucursales s
            INNER JOIN negocios n ON n.id = s.negocio_id
            
            WHERE s.id = ${sucursalId}
              AND s.activa = true
              AND n.activo = true
              AND n.es_borrador = false
              AND n.onboarding_completado = true
            
            LIMIT 1
        `;

        const resultado = await db.execute(query);

        if (resultado.rows.length === 0) {
            throw new Error('Sucursal no encontrada');
        }

        // ✅ TRANSFORMAR a camelCase antes de devolver
        const perfilTransformado = mapearPerfilCompleto(resultado.rows[0] as unknown as PerfilSucursalRow);

        return {
            success: true,
            data: perfilTransformado,
        };
    } catch (error) {
        console.error('Error al obtener perfil de sucursal:', error);
        throw error;
    }
}

// =============================================================================
// FUNCIONES EXISTENTES (SIN CAMBIOS)
// =============================================================================

/**
 * Obtiene información básica de un negocio + datos de sucursal principal
 * Incluye: logo (negocio), portada (sucursal), nombre, descripción
 */
export async function obtenerNegocioPorId(negocioId: string) {
    try {
        const [resultado] = await db
            .select({
                // Datos del NEGOCIO
                id: negocios.id,
                nombre: negocios.nombre,
                descripcion: negocios.descripcion,
                logoUrl: negocios.logoUrl,
                sitioWeb: negocios.sitioWeb,
                activo: negocios.activo,
                verificado: negocios.verificado,

                // Datos de la SUCURSAL PRINCIPAL
                sucursalId: negocioSucursales.id,
                portadaUrl: negocioSucursales.portadaUrl,
            })
            .from(negocios)
            .innerJoin(
                negocioSucursales,
                and(
                    eq(negocioSucursales.negocioId, negocios.id),
                    eq(negocioSucursales.esPrincipal, true)
                )
            )
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (!resultado) {
            throw new Error('Negocio no encontrado');
        }

        return {
            success: true,
            data: resultado,
        };
    } catch (error) {
        console.error('Error al obtener negocio:', error);
        throw error;
    }
}

/**
 * Obtiene todas las imágenes de la galería de un negocio
 * Ordenadas por el campo 'orden'
 */
export async function obtenerGaleriaNegocio(negocioId: string) {
    try {
        const imagenes = await db
            .select({
                id: negocioGaleria.id,
                url: negocioGaleria.url,
                titulo: negocioGaleria.titulo,
                orden: negocioGaleria.orden,
                cloudinaryPublicId: negocioGaleria.cloudinaryPublicId,
            })
            .from(negocioGaleria)
            .where(eq(negocioGaleria.sucursalId, negocioId))
            .orderBy(negocioGaleria.orden);

        return {
            success: true,
            data: imagenes,
        };
    } catch (error) {
        console.error('Error al obtener galería:', error);
        throw error;
    }
}



/**
 * Interfaz para datos básicos del negocio
 * Usado en auth, chat, publicaciones, etc.
 */
export interface DatosNegocio {
    nombre: string | null;              // Nombre del negocio
    correo: string | null;              // Correo de la sucursal
    logo: string | null;                // Logo del negocio
    fotoPerfil: string | null;          // Foto de perfil de la sucursal
    sucursalPrincipalId: string | null; // ID de la sucursal
    nombreSucursal: string | null;      // ✅ NUEVO: Nombre de la sucursal
}

/**
 * Obtiene todas las sucursales de un negocio
 * Usado para: preview en Business Studio, selector de sucursales
 */
export async function obtenerSucursalesNegocio(negocioId: string) {
    try {
        const sucursales = await db
            .select({
                id: negocioSucursales.id,
                nombre: negocioSucursales.nombre,
                esPrincipal: negocioSucursales.esPrincipal,
                direccion: negocioSucursales.direccion,
                ciudad: negocioSucursales.ciudad,
                telefono: negocioSucursales.telefono,
                activa: negocioSucursales.activa,
            })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.negocioId, negocioId))
            .orderBy(negocioSucursales.esPrincipal);

        return {
            success: true,
            data: sucursales,
        };
    } catch (error) {
        console.error('Error al obtener sucursales del negocio:', error);
        throw error;
    }
}

/**
 * Obtiene datos del negocio y sucursal
 * - Si recibe sucursalId: usa esa sucursal (para gerentes)
 * - Si NO recibe sucursalId: usa la principal (para dueños)
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de sucursal específica (opcional, para gerentes)
 * @returns Datos del negocio + datos de la sucursal
 */
export async function obtenerDatosNegocio(
    negocioId: string | null,
    sucursalId?: string | null  // ✅ NUEVO: parámetro opcional
): Promise<DatosNegocio | undefined> {
    if (!negocioId) return undefined;

    try {
        // 1. Obtener datos del negocio (nombre, logo)
        const [negocio] = await db
            .select({
                nombre: negocios.nombre,
                logo: negocios.logoUrl,
            })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (!negocio) return undefined;

        // 2. ✅ LÓGICA CONDICIONAL: ¿Qué sucursal buscar?
        const condiciones = sucursalId
            ? [eq(negocioSucursales.id, sucursalId)]  // Gerente: buscar SU sucursal
            : [                                        // Dueño: buscar la principal
                eq(negocioSucursales.negocioId, negocioId),
                eq(negocioSucursales.esPrincipal, true)
            ];

        // 3. Obtener datos de la sucursal (correo, fotoPerfil)
        const [sucursal] = await db
            .select({
                id: negocioSucursales.id,
                nombre: negocioSucursales.nombre,      // ✅ NUEVO: nombre de la sucursal
                correo: negocioSucursales.correo,
                fotoPerfil: negocioSucursales.fotoPerfil,
            })
            .from(negocioSucursales)
            .where(and(...condiciones))  // ✅ Usar las condiciones dinámicas
            .limit(1);

        return {
            nombre: negocio.nombre,
            correo: sucursal?.correo ?? null,
            logo: negocio.logo,
            fotoPerfil: sucursal?.fotoPerfil ?? null,
            sucursalPrincipalId: sucursal?.id ?? null,
            nombreSucursal: sucursal?.nombre ?? null,  // ✅ NUEVO
        };
    } catch (error) {
        console.error('Error obteniendo datos del negocio:', error);
        return undefined;
    }
}

// =============================================================================
// LISTAR EMPLEADOS DEL NEGOCIO (Para filtros ScanYA / Business Studio)
// =============================================================================

/**
 * Formatea nombre: Primera palabra + Última palabra
 * "Carlos Alberto Pérez García" → "Carlos García"
 * "María López" → "María López"
 * "Juan" → "Juan"
 */
function formatearNombreEmpleado(nombreCompleto: string): string {
    const palabras = nombreCompleto.trim().split(/\s+/);
    if (palabras.length <= 2) {
        return nombreCompleto.trim();
    }
    return `${palabras[0]} ${palabras[palabras.length - 1]}`;
}

/**
 * Obtiene lista de empleados del negocio para dropdowns/filtros
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de sucursal (opcional, para filtrar)
 * @returns Lista de empleados con id, nombre formateado, nick, sucursal
 */
export async function listarEmpleadosNegocio(
    negocioId: string,
    sucursalId?: string
) {
    try {
        // Construir condiciones
        const condiciones = [
            eq(negocioSucursales.negocioId, negocioId),
            eq(empleados.activo, true),
        ];

        // Filtrar por sucursal si se especifica
        if (sucursalId) {
            condiciones.push(eq(empleados.sucursalId, sucursalId));
        }

        const lista = await db
            .select({
                id: empleados.id,
                nombreCompleto: empleados.nombre,
                nick: empleados.nick,
                sucursalId: empleados.sucursalId,
                sucursalNombre: negocioSucursales.nombre,
            })
            .from(empleados)
            .innerJoin(
                negocioSucursales,
                eq(empleados.sucursalId, negocioSucursales.id)
            )
            .where(and(...condiciones))
            .orderBy(empleados.nombre);

        // Formatear nombres
        const empleadosFormateados = lista.map((emp) => ({
            id: emp.id,
            nombre: formatearNombreEmpleado(emp.nombreCompleto),
            nick: emp.nick,
            sucursalId: emp.sucursalId,
            sucursalNombre: emp.sucursalNombre,
        }));

        return {
            success: true,
            data: empleadosFormateados,
        };
    } catch (error) {
        console.error('Error al listar empleados del negocio:', error);
        throw error;
    }
}

// =============================================================================
// LISTAR OPERADORES DEL NEGOCIO (Empleados + Gerentes + Dueño)
// Para filtros de ScanYA - Quién registró la venta
// =============================================================================

/**
 * Obtiene lista de todas las personas que pueden registrar ventas:
 * - Empleados activos
 * - Gerentes (usuarios con sucursal_asignada)
 * - Dueño del negocio
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de sucursal (opcional, para filtrar)
 * @returns Lista con id, nombre, tipo, sucursalId
 */
export async function listarOperadoresNegocio(
    negocioId: string,
    sucursalId?: string
) {
    try {
        const operadores: Array<{
            id: string;
            nombre: string;
            tipo: 'empleado' | 'gerente' | 'dueno';
            sucursalId: string | null;
            sucursalNombre: string | null;
        }> = [];

        // -----------------------------------------------------------------
        // 1. Obtener EMPLEADOS
        // -----------------------------------------------------------------
        const condicionesEmpleados = [
            eq(negocioSucursales.negocioId, negocioId),
            eq(empleados.activo, true),
        ];

        if (sucursalId) {
            condicionesEmpleados.push(eq(empleados.sucursalId, sucursalId));
        }

        const listaEmpleados = await db
            .select({
                id: empleados.id,
                nombreCompleto: empleados.nombre,
                sucursalId: empleados.sucursalId,
                sucursalNombre: negocioSucursales.nombre,
            })
            .from(empleados)
            .innerJoin(
                negocioSucursales,
                eq(empleados.sucursalId, negocioSucursales.id)
            )
            .where(and(...condicionesEmpleados))
            .orderBy(empleados.nombre);

        for (const emp of listaEmpleados) {
            operadores.push({
                id: emp.id,
                nombre: formatearNombreEmpleado(emp.nombreCompleto),
                tipo: 'empleado',
                sucursalId: emp.sucursalId,
                sucursalNombre: emp.sucursalNombre,
            });
        }

        // -----------------------------------------------------------------
        // 2. Obtener GERENTES (usuarios con sucursal_asignada del negocio)
        // -----------------------------------------------------------------
        const condicionesGerentes = [
            eq(negocioSucursales.negocioId, negocioId),
            isNotNull(usuarios.sucursalAsignada),
        ];

        if (sucursalId) {
            condicionesGerentes.push(eq(usuarios.sucursalAsignada, sucursalId));
        }

        const listaGerentes = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                sucursalId: usuarios.sucursalAsignada,
                sucursalNombre: negocioSucursales.nombre,
            })
            .from(usuarios)
            .innerJoin(
                negocioSucursales,
                eq(usuarios.sucursalAsignada, negocioSucursales.id)
            )
            .where(and(...condicionesGerentes))
            .orderBy(usuarios.nombre);

        for (const gte of listaGerentes) {
            const nombreCompleto = `${gte.nombre || ''} ${gte.apellidos || ''}`.trim();
            operadores.push({
                id: gte.id,
                nombre: formatearNombreEmpleado(nombreCompleto) + ' (Gte)',
                tipo: 'gerente',
                sucursalId: gte.sucursalId,
                sucursalNombre: gte.sucursalNombre,
            });
        }

        // -----------------------------------------------------------------
        // 3. Obtener DUEÑO (siempre, puede vender en cualquier sucursal)
        // -----------------------------------------------------------------
        const [dueno] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
            })
            .from(usuarios)
            .innerJoin(negocios, eq(negocios.usuarioId, usuarios.id))
            .where(eq(negocios.id, negocioId))
            .limit(1);

        if (dueno) {
            const nombreCompleto = `${dueno.nombre || ''} ${dueno.apellidos || ''}`.trim();
            operadores.push({
                id: dueno.id,
                nombre: formatearNombreEmpleado(nombreCompleto) + ' (Dueño)',
                tipo: 'dueno',
                sucursalId: null,
                sucursalNombre: null,
            });
        }

        return {
            success: true,
            data: operadores,
        };
    }
    catch (error) {
        console.error('Error al listar operadores del negocio:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    listarSucursalesCercanas,
    obtenerPerfilSucursal,
    obtenerNegocioPorId,
    obtenerGaleriaNegocio,
    obtenerDatosNegocio,
    obtenerSucursalesNegocio,
    listarEmpleadosNegocio,
    listarOperadoresNegocio,
};