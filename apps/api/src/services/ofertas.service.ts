/**
 * ============================================================================
 * OFERTAS SERVICE - Sistema Completo de Ofertas
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/ofertas.service.ts
 * 
 * PROPÓSITO:
 * Funciones CRUD para gestionar ofertas (Business Studio)
 * Funciones públicas para feed geolocalizado (vista pública)
 * 
 * NOTA: Sin mappers - el middleware transformResponseMiddleware
 * convierte automáticamente snake_case → camelCase
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { sql, eq, and, count } from 'drizzle-orm';
import { db } from '../db';
import { ofertas, ofertaUsos, ofertaUsuarios } from '../db/schemas/schema';
import { duplicarImagen } from './cloudinary.service';
import { generarPresignedUrl, duplicarArchivo, esUrlR2 } from './r2.service.js';
import type {
  CrearOfertaInput,
  ActualizarOfertaInput,
  DuplicarOfertaInput,
  FiltrosFeedOfertas,
  RegistrarUsoOfertaInput,
} from '../types/ofertas.types';
import { negocios, puntosBilletera, notificaciones } from '../db/schemas/schema';
import { crearNotificacion } from './notificaciones.service.js';

// =============================================================================
// HELPER: DUPLICAR IMAGEN (R2 o Cloudinary)
// =============================================================================

/**
 * Duplica una imagen de forma inteligente:
 * - Si es URL de R2 → usa CopyObjectCommand (sin descargar)
 * - Si es URL de Cloudinary → usa duplicarImagen de cloudinary.service
 */
async function duplicarImagenInteligente(url: string, carpeta: string): Promise<string | null> {
    if (esUrlR2(url)) return await duplicarArchivo(url, carpeta);
    return await duplicarImagen(url, carpeta);
}

// =============================================================================
// GENERAR URL DE UPLOAD PARA IMAGEN DE OFERTA (R2)
// =============================================================================

/**
 * Genera una presigned URL para que el frontend suba directamente a R2.
 *
 * @param nombreArchivo - Nombre original del archivo
 * @param contentType   - MIME type (image/jpeg, image/png, image/webp)
 */
export async function generarUrlUploadImagenOferta(nombreArchivo: string, contentType: string) {
    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return generarPresignedUrl('ofertas', nombreArchivo, contentType, 300, TIPOS_PERMITIDOS);
}

// =============================================================================
// FEED DE OFERTAS (VISTA PÚBLICA - AMBOS MODOS)
// =============================================================================

/**
 * Obtiene feed de ofertas geolocalizadas con PostGIS
 * 
 * - Funciona en modo personal y comercial
 * - Filtra por: ubicación, categoría, tipo, búsqueda
 * - Incluye: datos negocio, sucursal, distancia, métricas
 * - Ordenadas por distancia o relevancia
 * 
 * @param userId - UUID del usuario (para likes/saves) - puede ser null
 * @param filtros - Filtros de búsqueda
 * @returns Lista de ofertas con información completa
 */
export async function obtenerFeedOfertas(
  userId: string | null,
  filtros: FiltrosFeedOfertas
) {
  try {
    const {
      sucursalId,
      latitud,
      longitud,
      distanciaMaxKm = 50,
      categoriaId,
      tipo,
      busqueda,
      limite = 20,
      offset = 0,
      fechaLocal, // Fecha local del usuario (YYYY-MM-DD)
    } = filtros;

    // Query SQL raw para PostGIS
    const query = sql`
      SELECT 
        -- Datos de la oferta
        o.id as oferta_id,
        o.titulo,
        o.descripcion,
        o.imagen,
        o.tipo,
        o.valor,
        o.compra_minima,
        o.fecha_inicio,
        o.fecha_fin,
        o.limite_usos,
        o.usos_actuales,
        o.activo,
        
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
        
        -- Coordenadas de la sucursal
        ST_Y(s.ubicacion::geometry) as latitud,
        ST_X(s.ubicacion::geometry) as longitud,
        
        -- Distancia calculada con PostGIS (si hay GPS)
        ${latitud && longitud
        ? sql`
          ST_Distance(
            s.ubicacion::geography,
            ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
          ) / 1000 as distancia_km,
        `
        : sql`NULL as distancia_km,`
      }
        
        -- Categorías del negocio
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
        
        -- Métricas de la oferta
        COALESCE(me.total_views, 0) as total_vistas,
        COALESCE(me.total_shares, 0) as total_shares,
        
        -- Estado de voto del usuario
        ${userId
        ? sql`
          EXISTS(
            SELECT 1 FROM votos v 
            WHERE v.entity_type = 'oferta'
              AND v.entity_id = o.id 
              AND v.user_id = ${userId}
              AND v.tipo_accion = 'like'
          ) as liked,
          EXISTS(
            SELECT 1 FROM votos v 
            WHERE v.entity_type = 'oferta'
              AND v.entity_id = o.id 
              AND v.user_id = ${userId}
              AND v.tipo_accion = 'save'
          ) as saved
        `
        : sql`
          false as liked,
          false as saved
        `
      }
        
      FROM ofertas o
      INNER JOIN negocios n ON n.id = o.negocio_id
      INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
      LEFT JOIN metricas_entidad me ON me.entity_type = 'oferta' AND me.entity_id = o.id
      
      WHERE o.activo = true
        AND n.activo = true
        AND s.activa = true
        AND n.es_borrador = false
        AND n.onboarding_completado = true
        
      -- Filtro: Solo ofertas ACTIVAS (en rango de fechas y no excedidas)
        -- Usa la fecha local del usuario para que las ofertas se muestren
        -- según SU medianoche, no la del servidor UTC
        AND DATE(${fechaLocal || sql`CURRENT_DATE`}) >= DATE(o.fecha_inicio)
        AND DATE(${fechaLocal || sql`CURRENT_DATE`}) <= DATE(o.fecha_fin)
        AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)
        
        -- Filtro: Sucursal específica (para perfil de negocio)
        ${sucursalId ? sql`AND s.id = ${sucursalId}` : sql``}
        
        -- Filtro: Geolocalización (si hay GPS y NO hay sucursalId)
        ${!sucursalId && latitud && longitud
        ? sql`
          AND ST_DWithin(
            s.ubicacion::geography,
            ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography,
            ${distanciaMaxKm * 1000}
          )
        `
        : sql``
      }
        
        -- Filtro: Categoría
        ${categoriaId
        ? sql`
          AND EXISTS(
            SELECT 1 FROM asignacion_subcategorias asig
            JOIN subcategorias_negocio sc ON sc.id = asig.subcategoria_id
            WHERE asig.negocio_id = n.id
              AND sc.categoria_id = ${categoriaId}
          )
        `
        : sql``
      }
        
        -- Filtro: Tipo de oferta
        ${tipo ? sql`AND o.tipo = ${tipo}` : sql``}
        
        -- Filtro: Búsqueda (título o descripción)
        ${busqueda
        ? sql`
          AND (
            o.titulo ILIKE ${`%${busqueda}%`}
            OR o.descripcion ILIKE ${`%${busqueda}%`}
            OR n.nombre ILIKE ${`%${busqueda}%`}
          )
        `
        : sql``
      }
      
      -- Ordenar por distancia (si hay GPS) o por fecha de creación
      ORDER BY ${latitud && longitud ? sql`distancia_km ASC` : sql`o.created_at DESC`
      }
      
      LIMIT ${limite}
      OFFSET ${offset}
    `;

    const resultado = await db.execute(query);

    // ✅ Retornar directo - el middleware transforma automáticamente
    return {
      success: true,
      data: resultado.rows,
    };
  } catch (error) {
    console.error('Error al obtener feed de ofertas:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER OFERTA INDIVIDUAL (DETALLE)
// =============================================================================

/**
 * Obtiene una oferta específica con datos del negocio y sucursal
 * Para modal de detalle o enlaces compartidos
 * 
 * @param ofertaId - UUID de la oferta
 * @param userId - UUID del usuario (opcional, para likes/saves)
 * @returns Oferta completa con información del negocio
 */
export async function obtenerOfertaDetalle(
  ofertaId: string,
  userId: string | null
) {
  try {
    const query = sql`
      SELECT 
        -- Datos de la oferta
        o.id as oferta_id,
        o.titulo,
        o.descripcion,
        o.imagen,
        o.tipo,
        o.valor,
        o.compra_minima,
        o.fecha_inicio,
        o.fecha_fin,
        o.limite_usos,
        o.usos_actuales,
        o.activo,
        o.created_at,
        
        -- Datos del negocio
        n.id as negocio_id,
        n.nombre as negocio_nombre,
        n.descripcion as negocio_descripcion,
        n.logo_url,
        n.participa_puntos as acepta_cardya,
        n.verificado,
        n.sitio_web,
        
        -- Datos de la sucursal
        s.id as sucursal_id,
        s.nombre as sucursal_nombre,
        s.direccion,
        s.ciudad,
        s.telefono,
        s.whatsapp,
        s.correo,
        
        -- Coordenadas
        ST_Y(s.ubicacion::geometry) as latitud,
        ST_X(s.ubicacion::geometry) as longitud,
        
        -- Métricas
        COALESCE(me.total_views, 0) as total_vistas,
        COALESCE(me.total_shares, 0) as total_shares,
        COALESCE(me.total_clicks, 0) as total_clicks,
        
        -- Estado del usuario
        ${userId
        ? sql`
          EXISTS(
            SELECT 1 FROM votos v 
            WHERE v.entity_type = 'oferta'
              AND v.entity_id = o.id 
              AND v.user_id = ${userId}
              AND v.tipo_accion = 'like'
          ) as liked,
          EXISTS(
            SELECT 1 FROM votos v 
            WHERE v.entity_type = 'oferta'
              AND v.entity_id = o.id 
              AND v.user_id = ${userId}
              AND v.tipo_accion = 'save'
          ) as saved
        `
        : sql`
          false as liked,
          false as saved
        `
      }
        
      FROM ofertas o
      INNER JOIN negocios n ON n.id = o.negocio_id
      INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
      LEFT JOIN metricas_entidad me ON me.entity_type = 'oferta' AND me.entity_id = o.id
      
      WHERE o.id = ${ofertaId}
        AND n.activo = true
        AND s.activa = true
      
      LIMIT 1
    `;

    const resultado = await db.execute(query);

    if (resultado.rows.length === 0) {
      return {
        success: false,
        error: 'Oferta no encontrada',
      };
    }

    // ✅ Retornar directo - el middleware transforma automáticamente
    return {
      success: true,
      data: resultado.rows[0],
    };
  } catch (error) {
    console.error('Error al obtener detalle de oferta:', error);
    throw error;
  }
}

// =============================================================================
// CREAR OFERTA (BUSINESS STUDIO)
// =============================================================================

/**
 * Crea una nueva oferta y la asigna a la sucursal activa
 * 
 * @param negocioId - UUID del negocio (inyectado por middleware)
 * @param sucursalId - UUID de la sucursal activa (del query interceptor)
 * @param datos - Datos de la oferta a crear
 * @returns Oferta creada
 */
export async function crearOferta(
  negocioId: string,
  sucursalId: string,
  datos: CrearOfertaInput
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Crear oferta
      const [nuevaOferta] = await tx
        .insert(ofertas)
        .values({
          negocioId,
          sucursalId,
          articuloId: datos.articuloId || null,
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion?.trim() || null,
          imagen: datos.imagen ?? null,
          tipo: datos.tipo,
          valor: datos.valor?.toString() || null,
          compraMinima: (datos.compraMinima || 0).toString(),
          fechaInicio: datos.fechaInicio,
          fechaFin: datos.fechaFin,
          limiteUsos: datos.limiteUsos || null,
          limiteUsosPorUsuario: datos.limiteUsosPorUsuario || null,
          usosActuales: 0,
          activo: datos.activo ?? true,
          visibilidad: datos.visibilidad || 'publico',
        })
        .returning();

      // Si es oferta privada, asignar a usuarios con código único
      if (datos.visibilidad === 'privado' && datos.usuariosIds?.length) {
        const asignaciones = datos.usuariosIds.map((uid) => ({
          ofertaId: nuevaOferta.id,
          usuarioId: uid,
          motivo: datos.motivoAsignacion || null,
          codigoPersonal: generarCodigoAleatorio(),
        }));
        await tx.insert(ofertaUsuarios).values(asignaciones);

        // Notificar a usuarios asignados
        const [negocioInfo] = await tx
          .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
          .from(negocios)
          .where(eq(negocios.id, negocioId))
          .limit(1);

        for (const uid of datos.usuariosIds) {
          crearNotificacion({
            usuarioId: uid,
            modo: 'personal',
            tipo: 'nueva_oferta',
            titulo: '¡Oferta exclusiva para ti!',
            mensaje: `${nuevaOferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
            negocioId,
            sucursalId,
            referenciaId: nuevaOferta.id,
            referenciaTipo: 'oferta',
            icono: '🎟️',
            actorImagenUrl: nuevaOferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
            actorNombre: negocioInfo?.nombre ?? undefined,
          }).catch((err) => console.error('Error notificación oferta exclusiva:', err));
        }
      }

      // Notificar a clientes con billetera (solo ofertas públicas)
      if (nuevaOferta.activo && datos.visibilidad !== 'privado') {
        const clientesConBilletera = await tx
          .select({ usuarioId: puntosBilletera.usuarioId })
          .from(puntosBilletera)
          .where(eq(puntosBilletera.negocioId, negocioId));

        const [negocioInfo] = await tx
          .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
          .from(negocios)
          .where(eq(negocios.id, negocioId))
          .limit(1);

        for (const cliente of clientesConBilletera) {
          crearNotificacion({
            usuarioId: cliente.usuarioId,
            modo: 'personal',
            tipo: 'nueva_oferta',
            titulo: '¡Nueva oferta!',
            mensaje: `${nuevaOferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
            negocioId,
            sucursalId,
            referenciaId: nuevaOferta.id,
            referenciaTipo: 'oferta',
            icono: '🏷️',
            actorImagenUrl: nuevaOferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
            actorNombre: negocioInfo?.nombre ?? undefined,
          }).catch((err) => console.error('Error notificación nueva oferta:', err));
        }
      }

      // ✅ Retornar directo - el middleware transforma automáticamente
      return {
        success: true,
        message: 'Oferta creada correctamente',
        data: nuevaOferta,
      };
    });
  } catch (error) {
    console.error('Error al crear oferta:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER OFERTAS (BUSINESS STUDIO)
// =============================================================================

/**
 * Lista todas las ofertas de la sucursal activa
 * Incluye métricas y estado
 * 
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal activa
 * @returns Lista de ofertas con métricas
 */
export async function obtenerOfertas(negocioId: string, sucursalId: string) {
  try {
    const query = sql`
      SELECT 
        o.*,
        COALESCE(me.total_views, 0) as total_vistas,
        COALESCE(me.total_shares, 0) as total_shares,
        COALESCE(me.total_clicks, 0) as total_clicks,
        
        -- Estado calculado
        CASE
          WHEN NOT o.activo THEN 'inactiva'
          WHEN CURRENT_TIMESTAMP < o.fecha_inicio THEN 'proxima'
          WHEN CURRENT_TIMESTAMP > o.fecha_fin THEN 'vencida'
          WHEN o.limite_usos IS NOT NULL AND o.usos_actuales >= o.limite_usos THEN 'agotada'
          ELSE 'activa'
        END as estado
        
      FROM ofertas o
      LEFT JOIN metricas_entidad me ON me.entity_type = 'oferta' AND me.entity_id = o.id
      
      WHERE o.negocio_id = ${negocioId}
        AND o.sucursal_id = ${sucursalId}
      
      ORDER BY o.created_at DESC
    `;

    const resultado = await db.execute(query);

    // ✅ Retornar directo - el middleware transforma automáticamente
    return {
      success: true,
      data: resultado.rows,
    };
  } catch (error) {
    console.error('Error al obtener ofertas:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER OFERTA POR ID (BUSINESS STUDIO)
// =============================================================================

/**
 * Obtiene una oferta específica de la sucursal
 * Para edición en Business Studio
 * 
 * @param ofertaId - UUID de la oferta
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal (validación)
 * @returns Oferta con métricas
 */
export async function obtenerOfertaPorId(
  ofertaId: string,
  negocioId: string,
  sucursalId: string
) {
  try {
    const query = sql`
      SELECT 
        o.*,
        COALESCE(me.total_views, 0) as total_vistas,
        COALESCE(me.total_shares, 0) as total_shares,
        COALESCE(me.total_clicks, 0) as total_clicks
      FROM ofertas o
      LEFT JOIN metricas_entidad me ON me.entity_type = 'oferta' AND me.entity_id = o.id
      WHERE o.id = ${ofertaId}
        AND o.negocio_id = ${negocioId}
        AND o.sucursal_id = ${sucursalId}
      LIMIT 1
    `;

    const resultado = await db.execute(query);

    if (resultado.rows.length === 0) {
      return {
        success: false,
        error: 'Oferta no encontrada',
      };
    }

    // ✅ Retornar directo - el middleware transforma automáticamente
    return {
      success: true,
      data: resultado.rows[0],
    };
  } catch (error) {
    console.error('Error al obtener oferta por ID:', error);
    throw error;
  }
}

// =============================================================================
// ACTUALIZAR OFERTA (BUSINESS STUDIO)
// =============================================================================

/**
 * Actualiza una oferta existente
 * Solo los campos proporcionados
 * 
 * @param ofertaId - UUID de la oferta
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal (validación)
 * @param datos - Datos a actualizar
 * @returns Oferta actualizada
 */
export async function actualizarOferta(
  ofertaId: string,
  negocioId: string,
  sucursalId: string,
  datos: ActualizarOfertaInput
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Verificar que la oferta existe y pertenece a la sucursal
      const [ofertaExistente] = await tx
        .select()
        .from(ofertas)
        .where(
          and(
            eq(ofertas.id, ofertaId),
            eq(ofertas.negocioId, negocioId),
            eq(ofertas.sucursalId, sucursalId)
          )
        )
        .limit(1);

      if (!ofertaExistente) {
        throw new Error('Oferta no encontrada o no pertenece a esta sucursal');
      }

      // 2. Construir objeto de actualización
      const datosActualizacion: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (datos.titulo !== undefined) {
        datosActualizacion.titulo = datos.titulo.trim();
      }
      if (datos.descripcion !== undefined) {
        datosActualizacion.descripcion = datos.descripcion?.trim() || null;
      }
      if (datos.imagen !== undefined) {
        datosActualizacion.imagen = datos.imagen;
      }
      if (datos.tipo !== undefined) {
        datosActualizacion.tipo = datos.tipo;
      }
      if (datos.valor !== undefined) {
        datosActualizacion.valor = datos.valor?.toString() || null;
      }
      if (datos.compraMinima !== undefined) {
        datosActualizacion.compraMinima = datos.compraMinima.toString();
      }
      if (datos.fechaInicio !== undefined) {
        datosActualizacion.fechaInicio = datos.fechaInicio;
      }
      if (datos.fechaFin !== undefined) {
        datosActualizacion.fechaFin = datos.fechaFin;
      }
      if (datos.limiteUsos !== undefined) {
        datosActualizacion.limiteUsos = datos.limiteUsos;
      }
      if (datos.articuloId !== undefined) {
        datosActualizacion.articuloId = datos.articuloId;
      }
      if (datos.activo !== undefined) {
        datosActualizacion.activo = datos.activo;
      }
      if (datos.visibilidad !== undefined) {
        datosActualizacion.visibilidad = datos.visibilidad;
      }
      if (datos.limiteUsosPorUsuario !== undefined) {
        datosActualizacion.limiteUsosPorUsuario = datos.limiteUsosPorUsuario;
      }

      // 3. Actualizar oferta
      const [ofertaActualizada] = await tx
        .update(ofertas)
        .set(datosActualizacion)
        .where(eq(ofertas.id, ofertaId))
        .returning();

      // 4. Notificar si se activó una oferta que estaba oculta
      if (datos.activo === true && !ofertaExistente.activo) {
        const clientesConBilletera = await tx
          .select({ usuarioId: puntosBilletera.usuarioId })
          .from(puntosBilletera)
          .where(eq(puntosBilletera.negocioId, negocioId));

        const [negocioInfo] = await tx
          .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
          .from(negocios)
          .where(eq(negocios.id, negocioId))
          .limit(1);

        for (const cliente of clientesConBilletera) {
          crearNotificacion({
            usuarioId: cliente.usuarioId,
            modo: 'personal',
            tipo: 'nueva_oferta',
            titulo: '¡Nueva oferta!',
            mensaje: `${ofertaActualizada.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
            negocioId,
            sucursalId,
            referenciaId: ofertaId,
            referenciaTipo: 'oferta',
            icono: '🏷️',
            actorImagenUrl: ofertaActualizada.imagen ?? negocioInfo?.logoUrl ?? undefined,
            actorNombre: negocioInfo?.nombre ?? undefined,
          }).catch((err) => console.error('Error notificación oferta activada:', err));
        }
      }

      // ✅ Retornar directo - el middleware transforma automáticamente
      return {
        success: true,
        message: 'Oferta actualizada correctamente',
        data: ofertaActualizada,
      };
    });
  } catch (error) {
    console.error('Error al actualizar oferta:', error);
    throw error;
  }
}

// =============================================================================
// ELIMINAR OFERTA (BUSINESS STUDIO)
// =============================================================================

/**
 * Elimina una oferta completamente
 * CASCADE elimina automáticamente registros relacionados
 * 
 * @param ofertaId - UUID de la oferta
 * @param negocioId - UUID del negocio (validación)
 * @param sucursalId - UUID de la sucursal (validación)
 * @returns Confirmación de eliminación
 */
export async function eliminarOferta(
  ofertaId: string,
  negocioId: string,
  sucursalId: string
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Verificar que la oferta existe y pertenece a la sucursal
      const verificacion = await tx.execute(sql`
        SELECT o.id
        FROM ofertas o
        WHERE o.id = ${ofertaId}
          AND o.negocio_id = ${negocioId}
          AND o.sucursal_id = ${sucursalId}
      `);

      if (verificacion.rows.length === 0) {
        throw new Error('Oferta no encontrada o no pertenece a esta sucursal');
      }

      // 2. Limpiar guardados de esta oferta (no hay FK CASCADE hacia guardados)
      await tx.execute(sql`
        DELETE FROM guardados 
        WHERE entity_type = 'oferta' AND entity_id = ${ofertaId}
      `);

      // 3. Limpiar notificaciones que referencian esta oferta
      await tx.delete(notificaciones).where(
        and(
          eq(notificaciones.referenciaId, ofertaId),
          eq(notificaciones.referenciaTipo, 'oferta')
        )
      );

      // 4. Eliminar oferta (CASCADE eliminará registros relacionados)
      await tx.delete(ofertas).where(eq(ofertas.id, ofertaId));

      return {
        success: true,
        message: 'Oferta eliminada correctamente',
      };
    });
  } catch (error) {
    console.error('Error al eliminar oferta:', error);
    throw error;
  }
}

// =============================================================================
// DUPLICAR OFERTA A OTRAS SUCURSALES (SOLO DUEÑOS)
// =============================================================================

/**
 * Duplica una oferta a múltiples sucursales
 * Crea NUEVOS registros en ofertas (cada sucursal tiene su copia)
 * SOLO DUEÑOS pueden usar esta función
 * 
 * @param ofertaId - UUID de la oferta original
 * @param negocioId - UUID del negocio (validación)
 * @param datos - Array de sucursalesIds destino
 * @returns Ofertas duplicadas
 */
export async function duplicarOfertaASucursales(
  ofertaId: string,
  negocioId: string,
  datos: DuplicarOfertaInput
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Obtener oferta original
      const [ofertaOriginal] = await tx
        .select()
        .from(ofertas)
        .where(and(eq(ofertas.id, ofertaId), eq(ofertas.negocioId, negocioId)))
        .limit(1);

      if (!ofertaOriginal) {
        throw new Error('Oferta no encontrada');
      }

      // 2. Verificar que las sucursales pertenecen al negocio
      const sucursalesArray = sql.join(
        datos.sucursalesIds.map((id) => sql`${id}`),
        sql`,`
      );
      const verificacionSucursales = await tx.execute(sql`
        SELECT id 
        FROM negocio_sucursales 
        WHERE negocio_id = ${negocioId}
        AND id IN (${sucursalesArray})
      `);

      if (verificacionSucursales.rows.length !== datos.sucursalesIds.length) {
        throw new Error(
          'Una o más sucursales no pertenecen a tu negocio'
        );
      }

      // 3. Duplicar imagen (R2 o Cloudinary según origen)
      let nuevaImagenUrl: string | null = null;
      if (ofertaOriginal.imagen) {
        nuevaImagenUrl = await duplicarImagenInteligente(ofertaOriginal.imagen, 'ofertas');

        if (!nuevaImagenUrl) {
          nuevaImagenUrl = ofertaOriginal.imagen; // Fallback a imagen original
        }
      }
      // 4. Duplicar oferta para cada sucursal
      const ofertasDuplicadas: { id: string; sucursalId: string; titulo: string }[] = [];

      for (const sucursalId of datos.sucursalesIds) {
        // Crear copia de la oferta con imagen duplicada
        const [nuevaCopia] = await tx
          .insert(ofertas)
          .values({
            negocioId: ofertaOriginal.negocioId,
            sucursalId,
            articuloId: ofertaOriginal.articuloId,
            titulo: ofertaOriginal.titulo,
            descripcion: ofertaOriginal.descripcion,
            imagen: nuevaImagenUrl, // ← AGREGAR ESTA LÍNEA
            tipo: ofertaOriginal.tipo,
            valor: ofertaOriginal.valor,
            compraMinima: ofertaOriginal.compraMinima,
            fechaInicio: ofertaOriginal.fechaInicio,
            fechaFin: ofertaOriginal.fechaFin,
            limiteUsos: ofertaOriginal.limiteUsos,
            usosActuales: 0, // Reiniciar contador
            activo: ofertaOriginal.activo,
          })
          .returning();

        ofertasDuplicadas.push({
          id: nuevaCopia.id,
          sucursalId,
          titulo: nuevaCopia.titulo,
        });
      }

      return {
        success: true,
        message: 'Oferta duplicada exitosamente',
        data: ofertasDuplicadas,
      };
    });
  } catch (error) {
    console.error('Error al duplicar oferta:', error);
    throw error;
  }
}

// =============================================================================
// REGISTRAR VISTA DE OFERTA (MÉTRICA)
// =============================================================================

/**
 * Registra una vista de oferta (incrementa total_vistas)
 * Llamado cuando un usuario abre el modal de detalle
 * 
 * @param ofertaId - UUID de la oferta
 * @returns Confirmación de registro
 */
export async function registrarVistaOferta(ofertaId: string) {
  try {
    // Incrementar contador de vistas en metricas_entidad
    // El trigger SQL se encarga de la sincronización
    const query = sql`
      INSERT INTO metricas_entidad (entity_type, entity_id, total_views)
      VALUES ('oferta', ${ofertaId}, 1)
      ON CONFLICT (entity_type, entity_id)
      DO UPDATE SET 
        total_views = metricas_entidad.total_views + 1,
        updated_at = CURRENT_TIMESTAMP
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
// HELPER: GENERAR CÓDIGO ALEATORIO
// =============================================================================

function generarCodigoAleatorio(): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = 'ANUN-';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

// =============================================================================
// VALIDAR OFERTA POR CÓDIGO (para ScanYA)
// =============================================================================

export async function validarOfertaPorCodigo(
  codigo: string,
  clienteId: string,
  negocioId: string,
  sucursalId: string
) {
  try {
    // 1. Buscar código personal en oferta_usuarios
    const query = sql`
      SELECT o.*, ou.usuario_id as asignado_a, ou.codigo_personal
      FROM oferta_usuarios ou
      JOIN ofertas o ON o.id = ou.oferta_id
      WHERE UPPER(ou.codigo_personal) = UPPER(${codigo})
      LIMIT 1
    `;
    const resultado = await db.execute(query);

    if (resultado.rows.length === 0) {
      return { success: false, message: 'Código no encontrado', code: 404 };
    }

    const oferta = resultado.rows[0] as Record<string, unknown>;

    // Verificar que el código pertenece a este cliente
    if (oferta.asignado_a !== clienteId) {
      return { success: false, message: 'Este código no te pertenece', code: 403 };
    }

    // 2. Verificar que pertenece al negocio
    if (oferta.negocio_id !== negocioId) {
      return { success: false, message: 'Este código no es válido para este negocio', code: 400 };
    }

    // 3. Verificar sucursal (null = todas las sucursales)
    if (oferta.sucursal_id && oferta.sucursal_id !== sucursalId) {
      return { success: false, message: 'Este código no es válido para esta sucursal', code: 400 };
    }

    // 4. Verificar que está activa
    if (!oferta.activo) {
      return { success: false, message: 'Esta oferta no está activa', code: 400 };
    }

    // 5. Verificar fechas
    const ahora = new Date();
    const fechaInicio = new Date(oferta.fecha_inicio as string);
    const fechaFin = new Date(oferta.fecha_fin as string);

    if (ahora < fechaInicio) {
      return { success: false, message: 'Esta oferta aún no está vigente', code: 400 };
    }
    if (ahora > fechaFin) {
      return { success: false, message: 'Esta oferta ha expirado', code: 400 };
    }

    // 6. Verificar límite de usos totales
    const limiteUsos = oferta.limite_usos as number | null;
    const usosActuales = oferta.usos_actuales as number;
    if (limiteUsos !== null && usosActuales >= limiteUsos) {
      return { success: false, message: 'Esta oferta ha alcanzado su límite de usos', code: 400 };
    }

    // 7. Verificar límite por usuario
    const limiteUsosPorUsuario = oferta.limite_usos_por_usuario as number | null;
    if (limiteUsosPorUsuario !== null) {
      const usosDelUsuario = await db
        .select({ total: count() })
        .from(ofertaUsos)
        .where(
          and(
            eq(ofertaUsos.ofertaId, oferta.id as string),
            eq(ofertaUsos.usuarioId, clienteId)
          )
        );
      const totalUsosUsuario = Number(usosDelUsuario[0]?.total ?? 0);
      if (totalUsosUsuario >= limiteUsosPorUsuario) {
        return { success: false, message: 'Ya has usado esta oferta el máximo de veces permitido', code: 400 };
      }
    }

    // 8. Verificar visibilidad privada
    if (oferta.visibilidad === 'privado') {
      const asignacion = await db
        .select()
        .from(ofertaUsuarios)
        .where(
          and(
            eq(ofertaUsuarios.ofertaId, oferta.id as string),
            eq(ofertaUsuarios.usuarioId, clienteId)
          )
        )
        .limit(1);
      if (asignacion.length === 0) {
        return { success: false, message: 'No tienes acceso a esta oferta', code: 403 };
      }
    }

    // 9. Construir info de descuento
    const tipo = oferta.tipo as string;
    const valor = parseFloat(oferta.valor as string) || 0;
    let descuentoInfo = '';
    switch (tipo) {
      case 'porcentaje': descuentoInfo = `${valor}% de descuento`; break;
      case 'monto_fijo': descuentoInfo = `$${valor} de descuento`; break;
      case '2x1': descuentoInfo = '2x1 (segundo artículo gratis)'; break;
      case '3x2': descuentoInfo = '3x2 (tercer artículo gratis)'; break;
      case 'envio_gratis': descuentoInfo = 'Envío gratis'; break;
      default: descuentoInfo = oferta.valor as string || 'Descuento especial';
    }

    return {
      success: true,
      message: 'Código válido',
      data: {
        oferta: {
          id: oferta.id,
          codigo: oferta.codigo,
          titulo: oferta.titulo,
          tipo,
          valor,
          compraMinima: parseFloat(oferta.compra_minima as string) || 0,
          descripcion: oferta.descripcion,
        },
        descuentoInfo,
      },
      code: 200,
    };
  } catch (error) {
    console.error('Error al validar código de oferta:', error);
    return { success: false, message: 'Error interno al validar código', code: 500 };
  }
}

// =============================================================================
// REGISTRAR USO DE OFERTA
// =============================================================================

export async function registrarUsoOferta(datos: RegistrarUsoOfertaInput) {
  try {
    return await db.transaction(async (tx) => {
      // Registrar uso
      const [uso] = await tx
        .insert(ofertaUsos)
        .values({
          ofertaId: datos.ofertaId,
          usuarioId: datos.usuarioId,
          metodoCanje: datos.metodoCanje,
          montoCompra: datos.montoCompra?.toString() || null,
          descuentoAplicado: datos.descuentoAplicado?.toString() || null,
          empleadoId: datos.empleadoId || null,
          sucursalId: datos.sucursalId || null,
        })
        .returning();

      // Incrementar usos actuales
      await tx.execute(sql`
        UPDATE ofertas
        SET usos_actuales = usos_actuales + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${datos.ofertaId}
      `);

      return {
        success: true,
        message: 'Uso registrado correctamente',
        data: uso,
      };
    });
  } catch (error) {
    console.error('Error al registrar uso de oferta:', error);
    throw error;
  }
}

// =============================================================================
// ASIGNAR OFERTA A USUARIOS (OFERTAS EXCLUSIVAS)
// =============================================================================

export async function asignarOfertaAUsuarios(
  ofertaId: string,
  negocioId: string,
  usuariosIds: string[],
  motivo?: string
) {
  try {
    // Verificar que la oferta existe y pertenece al negocio
    const [oferta] = await db
      .select()
      .from(ofertas)
      .where(and(eq(ofertas.id, ofertaId), eq(ofertas.negocioId, negocioId)))
      .limit(1);

    if (!oferta) {
      return { success: false, error: 'Oferta no encontrada' };
    }

    // Insertar asignaciones con código personal único
    for (const uid of usuariosIds) {
      try {
        await db.insert(ofertaUsuarios).values({
          ofertaId,
          usuarioId: uid,
          motivo: motivo || null,
          codigoPersonal: generarCodigoAleatorio(),
        });
      } catch {
        // Ignorar duplicados (ON CONFLICT)
      }
    }

    // Notificar a usuarios asignados
    const [negocioInfo] = await db
      .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    for (const uid of usuariosIds) {
      crearNotificacion({
        usuarioId: uid,
        modo: 'personal',
        tipo: 'nueva_oferta',
        titulo: '¡Oferta exclusiva para ti!',
        mensaje: `${oferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId,
        referenciaId: ofertaId,
        referenciaTipo: 'oferta',
        icono: '🎟️',
        actorImagenUrl: oferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
        actorNombre: negocioInfo?.nombre ?? undefined,
      }).catch((err) => console.error('Error notificación oferta exclusiva:', err));
    }

    return {
      success: true,
      message: `Oferta asignada a ${usuariosIds.length} usuario(s)`,
    };
  } catch (error) {
    console.error('Error al asignar oferta a usuarios:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER OFERTAS EXCLUSIVAS DEL USUARIO
// =============================================================================

export async function obtenerOfertasExclusivasUsuario(usuarioId: string) {
  try {
    const query = sql`
      SELECT
        o.*,
        ou.motivo,
        ou.asignado_at,
        ou.vista,
        n.nombre as negocio_nombre,
        n.logo_url,
        ns.nombre as sucursal_nombre,
        CASE
          WHEN CURRENT_TIMESTAMP < o.fecha_inicio THEN 'proxima'
          WHEN CURRENT_TIMESTAMP > o.fecha_fin THEN 'vencida'
          WHEN o.limite_usos IS NOT NULL AND o.usos_actuales >= o.limite_usos THEN 'agotada'
          ELSE 'activa'
        END as estado
      FROM oferta_usuarios ou
      JOIN ofertas o ON o.id = ou.oferta_id
      JOIN negocios n ON n.id = o.negocio_id
      LEFT JOIN negocio_sucursales ns ON ns.id = o.sucursal_id
      WHERE ou.usuario_id = ${usuarioId}
        AND o.activo = true
      ORDER BY ou.asignado_at DESC
    `;

    const resultado = await db.execute(query);

    // Marcar como vistas
    await db.execute(sql`
      UPDATE oferta_usuarios SET vista = true
      WHERE usuario_id = ${usuarioId} AND vista = false
    `);

    return {
      success: true,
      data: resultado.rows,
    };
  } catch (error) {
    console.error('Error al obtener ofertas exclusivas:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER OFERTA PÚBLICA POR CÓDIGO
// =============================================================================

export async function obtenerOfertaPublica(codigo: string) {
  try {
    const query = sql`
      SELECT
        o.id, o.titulo, o.descripcion, o.imagen, o.tipo, o.valor,
        o.compra_minima, o.fecha_inicio, o.fecha_fin,
        o.limite_usos, o.usos_actuales,
        n.nombre as negocio_nombre, n.logo_url,
        ns.nombre as sucursal_nombre, ns.direccion, ns.ciudad
      FROM ofertas o
      JOIN negocios n ON n.id = o.negocio_id
      LEFT JOIN negocio_sucursales ns ON ns.id = o.sucursal_id
      WHERE UPPER(o.codigo) = UPPER(${codigo})
        AND o.activo = true
        AND o.visibilidad = 'publico'
      LIMIT 1
    `;

    const resultado = await db.execute(query);

    if (resultado.rows.length === 0) {
      return { success: false, error: 'Oferta no encontrada' };
    }

    return {
      success: true,
      data: resultado.rows[0],
    };
  } catch (error) {
    console.error('Error al obtener oferta pública:', error);
    throw error;
  }
}

// =============================================================================
// REENVIAR CUPÓN (notificaciones a usuarios asignados)
// =============================================================================

export async function reenviarCupon(ofertaId: string, negocioId: string) {
  try {
    // Verificar oferta
    const [oferta] = await db
      .select()
      .from(ofertas)
      .where(and(eq(ofertas.id, ofertaId), eq(ofertas.negocioId, negocioId)))
      .limit(1);

    if (!oferta) return { success: false, error: 'Oferta no encontrada' };
    if (oferta.visibilidad !== 'privado') return { success: false, error: 'Solo se pueden reenviar cupones privados' };

    // Obtener usuarios asignados
    const asignados = await db
      .select({ usuarioId: ofertaUsuarios.usuarioId, codigoPersonal: ofertaUsuarios.codigoPersonal })
      .from(ofertaUsuarios)
      .where(eq(ofertaUsuarios.ofertaId, ofertaId));

    if (asignados.length === 0) return { success: false, error: 'No hay clientes asignados' };

    // Info del negocio
    const [negocioInfo] = await db
      .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    // Reenviar notificación a cada usuario
    for (const asignado of asignados) {
      crearNotificacion({
        usuarioId: asignado.usuarioId,
        modo: 'personal',
        tipo: 'nueva_oferta',
        titulo: '¡Cupón exclusivo para ti!',
        mensaje: `${oferta.titulo}\nCódigo: ${asignado.codigoPersonal}\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId,
        referenciaId: ofertaId,
        referenciaTipo: 'oferta',
        icono: '🎟️',
        actorImagenUrl: oferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
        actorNombre: negocioInfo?.nombre ?? undefined,
      }).catch((err) => console.error('Error reenvío cupón:', err));
    }

    return {
      success: true,
      message: `Cupón reenviado a ${asignados.length} cliente(s)`,
    };
  } catch (error) {
    console.error('Error al reenviar cupón:', error);
    throw error;
  }
}

// =============================================================================
// REVOCAR CUPÓN (desde BS)
// =============================================================================

export async function revocarCupon(
  ofertaId: string,
  usuarioId: string,
  negocioId: string,
  revocadoPorId: string,
  motivo?: string
) {
  try {
    // Verificar oferta
    const [oferta] = await db
      .select()
      .from(ofertas)
      .where(and(eq(ofertas.id, ofertaId), eq(ofertas.negocioId, negocioId)))
      .limit(1);

    if (!oferta) return { success: false, error: 'Oferta no encontrada' };

    // Verificar asignación
    const [asignacion] = await db
      .select()
      .from(ofertaUsuarios)
      .where(and(eq(ofertaUsuarios.ofertaId, ofertaId), eq(ofertaUsuarios.usuarioId, usuarioId)))
      .limit(1);

    if (!asignacion) return { success: false, error: 'El usuario no tiene este cupón asignado' };
    if (asignacion.estado === 'revocado') return { success: false, error: 'Este cupón ya fue revocado' };
    if (asignacion.estado === 'usado') return { success: false, error: 'Este cupón ya fue usado' };

    // Revocar
    await db
      .update(ofertaUsuarios)
      .set({
        estado: 'revocado',
        revocadoAt: new Date().toISOString(),
        revocadoPor: revocadoPorId,
        motivoRevocacion: motivo || null,
      })
      .where(eq(ofertaUsuarios.id, asignacion.id));

    // Notificar al usuario
    const [negocioInfo] = await db
      .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    crearNotificacion({
      usuarioId,
      modo: 'personal',
      tipo: 'cupon_revocado',
      titulo: 'Cupón revocado',
      mensaje: `${oferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}${motivo ? `\nMotivo: ${motivo}` : ''}`,
      negocioId,
      referenciaId: ofertaId,
      referenciaTipo: 'cupon',
      icono: '❌',
      actorImagenUrl: oferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
      actorNombre: negocioInfo?.nombre ?? undefined,
    }).catch((err) => console.error('Error notificación cupón revocado:', err));

    return { success: true, message: 'Cupón revocado correctamente' };
  } catch (error) {
    console.error('Error al revocar cupón:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER MIS CUPONES (vista cliente)
// =============================================================================

export async function obtenerMisCupones(usuarioId: string, filtroEstado?: string) {
  try {
    const condiciones = [eq(ofertaUsuarios.usuarioId, usuarioId)];

    if (filtroEstado && filtroEstado !== 'todos') {
      condiciones.push(eq(ofertaUsuarios.estado, filtroEstado));
    }

    const query = sql`
      SELECT
        ou.id as cupón_id,
        ou.oferta_id,
        ou.codigo_personal,
        ou.estado,
        ou.motivo,
        ou.asignado_at,
        ou.usado_at,
        ou.revocado_at,
        ou.motivo_revocacion,
        o.titulo,
        o.descripcion,
        o.imagen,
        o.tipo,
        o.valor,
        o.compra_minima,
        o.fecha_inicio,
        o.fecha_fin,
        n.id as negocio_id,
        n.nombre as negocio_nombre,
        n.logo_url as negocio_logo,
        ns.nombre as sucursal_nombre
      FROM oferta_usuarios ou
      JOIN ofertas o ON o.id = ou.oferta_id
      JOIN negocios n ON n.id = o.negocio_id
      LEFT JOIN negocio_sucursales ns ON ns.id = o.sucursal_id
      WHERE ou.usuario_id = ${usuarioId}
      ${filtroEstado && filtroEstado !== 'todos' ? sql`AND ou.estado = ${filtroEstado}` : sql``}
      ORDER BY
        CASE ou.estado
          WHEN 'activo' THEN 1
          WHEN 'usado' THEN 2
          WHEN 'expirado' THEN 3
          WHEN 'revocado' THEN 4
        END,
        ou.asignado_at DESC
    `;

    const resultado = await db.execute(query);

    return {
      success: true,
      data: resultado.rows,
    };
  } catch (error) {
    console.error('Error al obtener mis cupones:', error);
    throw error;
  }
}

// =============================================================================
// REVELAR CÓDIGO DE CUPÓN (vista cliente)
// =============================================================================

export async function revelarCodigoCupon(ofertaUsuarioId: string, usuarioId: string) {
  try {
    const query = sql`
      SELECT ou.codigo_personal, ou.estado, ou.oferta_id
      FROM oferta_usuarios ou
      WHERE ou.id = ${ofertaUsuarioId}
        AND ou.usuario_id = ${usuarioId}
      LIMIT 1
    `;

    const resultado = await db.execute(query);

    if (resultado.rows.length === 0) {
      return { success: false, error: 'Cupón no encontrado', code: 404 };
    }

    const cupon = resultado.rows[0] as Record<string, unknown>;

    if (cupon.estado === 'revocado') {
      return { success: false, error: 'Este cupón fue revocado', code: 400 };
    }

    return {
      success: true,
      data: {
        codigo: cupon.codigo_personal,
        estado: cupon.estado,
      },
    };
  } catch (error) {
    console.error('Error al revelar código:', error);
    throw error;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Feed público (ambos modos)
  obtenerFeedOfertas,
  obtenerOfertaDetalle,
  registrarVistaOferta,

  // Business Studio (modo comercial)
  generarUrlUploadImagenOferta,
  crearOferta,
  obtenerOfertas,
  obtenerOfertaPorId,
  actualizarOferta,
  eliminarOferta,
  duplicarOfertaASucursales,

  // Código de descuento + ofertas exclusivas
  validarOfertaPorCodigo,
  registrarUsoOferta,
  asignarOfertaAUsuarios,
  obtenerOfertasExclusivasUsuario,
  obtenerOfertaPublica,
  reenviarCupon,
  revocarCupon,
  obtenerMisCupones,
  revelarCodigoCupon,
};