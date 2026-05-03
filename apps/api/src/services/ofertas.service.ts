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

import { sql, eq, and, count, ne } from 'drizzle-orm';
import { db } from '../db';
import { ofertas, ofertaUsos, ofertaUsuarios, chatMensajes } from '../db/schemas/schema';
import { env } from '../config/env.js';
import { generarPresignedUrl, duplicarArchivo, eliminarArchivo, esUrlR2 } from './r2.service.js';
import type {
  CrearOfertaInput,
  ActualizarOfertaInput,
  DuplicarOfertaInput,
  FiltrosFeedOfertas,
  RegistrarUsoOfertaInput,
} from '../types/ofertas.types';
import { negocios, puntosBilletera, notificaciones } from '../db/schemas/schema';
import { emitirAUsuario } from '../socket.js';
import { crearNotificacion } from './notificaciones.service.js';
import { crearObtenerConversacion, enviarMensaje } from './chatya.service.js';

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
// HELPERS INTERNOS
// =============================================================================

/**
 * Verifica si la tabla `oferta_vistas` existe en la BD.
 *
 * Se usa para degradar graciosamente el orden `populares` y el fallback de
 * `destacada-del-dia` mientras la migración
 * `2026-04-29-crear-oferta-vistas.sql` no se aplique en Supabase.
 *
 * Una sola consulta a `to_regclass` (~0.1ms): sin caché por simplicidad.
 * Se puede cachear en memoria si en el futuro se vuelve hot path.
 */
async function tablaOfertaVistasExiste(): Promise<boolean> {
  try {
    const r = await db.execute(
      sql`SELECT to_regclass('public.oferta_vistas') IS NOT NULL AS existe`
    );
    const row = r.rows[0] as { existe: boolean } | undefined;
    return row?.existe === true;
  } catch {
    return false;
  }
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
      limite = 100,
      offset = 0,
      fechaLocal,
      orden,
      soloCardya,
      creadasUltimasHoras,
    } = filtros;

    const tieneGps = Boolean(latitud && longitud);
    // Con sucursalId específico (perfil de negocio), no deduplicar — el
    // usuario quiere ver TODAS las ofertas de esa sucursal concreta.
    const deduplicar = !sucursalId;

    // Para `orden=populares` necesitamos calcular vistas reales de los
    // últimos 7 días. Si la tabla aún no existe, degradamos a created_at DESC.
    const usaPopularidadReal =
      orden === 'populares' && (await tablaOfertaVistasExiste());

    const vistasUltimos7DiasFragment = usaPopularidadReal
      ? sql`,
        COALESCE((
          SELECT COUNT(*)::int
          FROM oferta_vistas ov
          WHERE ov.oferta_id = o.id
            AND ov.created_at >= NOW() - INTERVAL '7 days'
        ), 0) AS vistas_ultimos_7_dias`
      : sql``;

    // ORDER BY del outer query sobre el CTE (sin prefijo de tabla porque
    // el CTE expone los campos directamente).
    let orderByFragment;
    switch (orden) {
      case 'distancia':
        orderByFragment = sql`distancia_km ASC NULLS LAST`;
        break;
      case 'recientes':
        orderByFragment = sql`created_at DESC`;
        break;
      case 'populares':
        orderByFragment = usaPopularidadReal
          ? sql`vistas_ultimos_7_dias DESC, created_at DESC`
          : sql`created_at DESC`;
        break;
      case 'vencen_pronto':
        orderByFragment = sql`fecha_fin ASC`;
        break;
      default:
        orderByFragment = tieneGps ? sql`distancia_km ASC` : sql`created_at DESC`;
    }

    // Tiebreaker de distancia dentro del ROW_NUMBER del CTE.
    // Se recalcula la expresión ST_Distance (los aliases del mismo nivel SELECT
    // no son accesibles en window functions en PostgreSQL).
    const distanciaTiebreakerFragment = latitud && longitud
      ? sql`COALESCE(
          ST_Distance(
            s.ubicacion::geography,
            ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
          ) / 1000,
          999999
        ) ASC,`
      : sql``;

    // CTE + outer query: el CTE calcula todos los campos + rn + total_sucursales.
    // El outer query filtra rn = 1 (una sola fila por grupo de "misma oferta
    // operativa") y aplica el ordenamiento final pedido por el usuario.
    const query = sql`
      WITH feed_base AS (
        SELECT
          -- Datos de la oferta
          o.id AS oferta_id,
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
          n.id AS negocio_id,
          n.usuario_id AS negocio_usuario_id,
          n.nombre AS negocio_nombre,
          n.logo_url,
          n.participa_puntos AS acepta_cardya,
          n.verificado,

          -- Datos de la sucursal
          s.id AS sucursal_id,
          s.nombre AS sucursal_nombre,
          s.direccion,
          s.ciudad,
          s.telefono,
          s.whatsapp,

          -- Coordenadas de la sucursal
          ST_Y(s.ubicacion::geometry) AS latitud,
          ST_X(s.ubicacion::geometry) AS longitud,

          -- Distancia calculada con PostGIS (si hay GPS)
          ${latitud && longitud
            ? sql`ST_Distance(
                s.ubicacion::geography,
                ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
              ) / 1000 AS distancia_km,`
            : sql`NULL AS distancia_km,`
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
          ) AS categorias,

          -- Métricas acumuladas
          COALESCE(me.total_views, 0) AS total_vistas,
          COALESCE(me.total_shares, 0) AS total_shares
          -- Vistas reales últimos 7 días (solo cuando orden=populares)
          ${vistasUltimos7DiasFragment}
          ,

          -- Estado de interacción del usuario
          ${userId
            ? sql`
              EXISTS(
                SELECT 1 FROM votos v
                WHERE v.entity_type = 'oferta'
                  AND v.entity_id = o.id
                  AND v.user_id = ${userId}
                  AND v.tipo_accion = 'like'
              ) AS liked,
              EXISTS(
                SELECT 1 FROM votos v
                WHERE v.entity_type = 'oferta'
                  AND v.entity_id = o.id
                  AND v.user_id = ${userId}
                  AND v.tipo_accion = 'save'
              ) AS saved
            `
            : sql`false AS liked, false AS saved`
          }
          ,

          -- DEDUPLICACIÓN: sucursal representante del grupo de "misma oferta operativa"
          -- Tiebreaker: 1) más cercana (GPS), 2) matriz, 3) más recientemente actualizada
          ROW_NUMBER() OVER (
            PARTITION BY
              o.negocio_id, o.titulo, o.descripcion, o.tipo,
              o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
            ORDER BY
              ${distanciaTiebreakerFragment}
              s.es_principal DESC,
              o.updated_at DESC
          ) AS rn,

          -- Cuántas sucursales tienen esta misma oferta
          COUNT(*) OVER (
            PARTITION BY
              o.negocio_id, o.titulo, o.descripcion, o.tipo,
              o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
          ) AS total_sucursales

        FROM ofertas o
        INNER JOIN negocios n ON n.id = o.negocio_id
        INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
        LEFT JOIN metricas_entidad me ON me.entity_type = 'oferta' AND me.entity_id = o.id

        WHERE o.activo = true
          AND o.visibilidad = 'publico'
          AND n.activo = true
          AND s.activa = true
          AND n.es_borrador = false
          AND n.onboarding_completado = true
          AND DATE(${fechaLocal || sql`CURRENT_DATE`}) >= DATE(o.fecha_inicio)
          AND DATE(${fechaLocal || sql`CURRENT_DATE`}) <= DATE(o.fecha_fin)
          AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)

          -- Filtro: sucursal específica (perfil de negocio)
          ${sucursalId ? sql`AND s.id = ${sucursalId}` : sql``}

          -- Filtro: geolocalización (solo si hay GPS y sin sucursalId)
          ${!sucursalId && latitud && longitud
            ? sql`AND ST_DWithin(
                s.ubicacion::geography,
                ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography,
                ${distanciaMaxKm * 1000}
              )`
            : sql``
          }

          -- Filtro: categoría
          ${categoriaId
            ? sql`AND EXISTS(
                SELECT 1 FROM asignacion_subcategorias asig
                JOIN subcategorias_negocio sc ON sc.id = asig.subcategoria_id
                WHERE asig.negocio_id = n.id
                  AND sc.categoria_id = ${categoriaId}
              )`
            : sql``
          }

          -- Filtro: tipo de oferta
          ${tipo ? sql`AND o.tipo = ${tipo}` : sql``}

          -- Filtro: solo negocios CardYA
          ${soloCardya ? sql`AND n.participa_puntos = true` : sql``}

          -- Filtro: creadas en las últimas N horas
          ${creadasUltimasHoras
            ? sql`AND o.created_at >= NOW() - (${creadasUltimasHoras}::int * INTERVAL '1 hour')`
            : sql``
          }

          -- Filtro: búsqueda por texto
          ${busqueda
            ? sql`AND (
                o.titulo ILIKE ${`%${busqueda}%`}
                OR o.descripcion ILIKE ${`%${busqueda}%`}
                OR n.nombre ILIKE ${`%${busqueda}%`}
              )`
            : sql``
          }
      )
      SELECT * FROM feed_base
      ${deduplicar ? sql`WHERE rn = 1` : sql``}
      ORDER BY ${orderByFragment}
      LIMIT ${limite}
      OFFSET ${offset}
    `;

    const resultado = await db.execute(query);

    // Post-procesado: marcar top N como `es_popular` cuando el orden lo
    // justifica y hay datos reales de vistas. Opera sobre las filas ya
    // deduplicadas del outer query.
    const TOP_POPULARES = 3;
    const filas = resultado.rows.map((row, idx) => ({
      ...row,
      es_popular:
        orden === 'populares' && usaPopularidadReal && idx < TOP_POPULARES,
    }));

    // ✅ Retornar directo - el middleware transforma automáticamente
    return {
      success: true,
      data: filas,
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
  userId: string | null,
  gpsUsuario?: { latitud: number; longitud: number }
) {
  try {
    const lat = gpsUsuario?.latitud;
    const lng = gpsUsuario?.longitud;
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
        n.usuario_id as negocio_usuario_id,
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

        -- Distancia desde el GPS del usuario (si lo proporcionó)
        ${lat && lng
          ? sql`ST_Distance(
              s.ubicacion::geography,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            ) / 1000 AS distancia_km,`
          : sql`NULL AS distancia_km,`
        }

        -- Métricas
        COALESCE(me.total_views, 0) as total_vistas,
        COALESCE(me.total_shares, 0) as total_shares,
        COALESCE(me.total_clicks, 0) as total_clicks,

        -- Marcador "es popular" — siempre false en el detalle individual.
        -- (Solo aplica al feed con orden=populares + tabla oferta_vistas.)
        false as es_popular,

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
        AND o.visibilidad = 'publico'
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
      // 0. Si es duplicación, copiar imagen en R2
      let imagenFinal = datos.imagen ?? null;
      if (imagenFinal && datos.duplicarImagen) {
        try {
          const { duplicarArchivo } = await import('./r2.service');
          const nuevaUrl = await duplicarArchivo(imagenFinal, 'ofertas');
          if (nuevaUrl) imagenFinal = nuevaUrl;
        } catch {
          console.error('Error al duplicar imagen R2, usando original');
        }
      }

      // 1. Crear oferta
      const [nuevaOferta] = await tx
        .insert(ofertas)
        .values({
          negocioId,
          sucursalId,
          articuloId: datos.articuloId || null,
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion?.trim() || null,
          imagen: imagenFinal,
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
          .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl, usuarioId: negocios.usuarioId })
          .from(negocios)
          .where(eq(negocios.id, negocioId))
          .limit(1);

        // Construir info del tipo de cupón
        const valorNum = nuevaOferta.valor ? parseFloat(nuevaOferta.valor) : 0;
        const tipoInfo = nuevaOferta.tipo === 'porcentaje' ? `${valorNum}% de descuento`
          : nuevaOferta.tipo === 'monto_fijo' ? `$${valorNum} de descuento`
          : nuevaOferta.tipo === '2x1' ? '2x1'
          : nuevaOferta.tipo === '3x2' ? '3x2'
          : nuevaOferta.tipo === 'envio_gratis' ? 'Envío gratis'
          : nuevaOferta.valor && isNaN(Number(nuevaOferta.valor)) ? nuevaOferta.valor
          : 'Cupón exclusivo';

        for (const uid of datos.usuariosIds) {
          // Notificación panel
          crearNotificacion({
            usuarioId: uid,
            modo: 'personal',
            tipo: 'cupon_asignado',
            titulo: tipoInfo,
            mensaje: `${nuevaOferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
            negocioId,
            sucursalId,
            referenciaId: nuevaOferta.id,
            referenciaTipo: 'cupon',
            icono: '🎟️',
            actorImagenUrl: negocioInfo?.logoUrl ?? nuevaOferta.imagen ?? undefined,
            actorNombre: negocioInfo?.nombre ?? undefined,
          }).catch((err) => console.error('Error notificación cupón asignado:', err));

          // Mensaje ChatYA con burbuja especial
          const asignacion = asignaciones.find(a => a.usuarioId === uid);
          enviarCuponPorChatYA(
            negocioInfo?.usuarioId ?? negocioId, sucursalId, uid,
            { id: nuevaOferta.id, titulo: nuevaOferta.titulo, imagen: nuevaOferta.imagen, tipo: nuevaOferta.tipo, valor: nuevaOferta.valor, fechaFin: nuevaOferta.fechaFin },
            asignacion?.codigoPersonal ? String(asignacion.codigoPersonal) : '',
            negocioInfo?.nombre ?? 'un negocio'
          ).catch((err) => console.error('Error ChatYA cupón:', err));

          // Notificar al frontend en tiempo real
          emitirAUsuario(uid, 'cupon:actualizado', { ofertaId: nuevaOferta.id, estado: 'activo' });
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
            actorImagenUrl: negocioInfo?.logoUrl ?? nuevaOferta.imagen ?? undefined,
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
        -- Orden de prioridad:
        --   1. inactiva (desactivada manualmente)
        --   2. proxima (aún no empieza)
        --   3. agotada (cumplió su propósito: todos los usos o cupones canjeados).
        --      Prevalece sobre 'vencida' porque una oferta cuyo cupón se canjeó antes
        --      de vencer debe reportarse como "usada", no como "vencida sin canjear".
        --   4. vencida (pasó fecha_fin sin haberse agotado)
        --   5. activa
        CASE
          WHEN NOT o.activo THEN 'inactiva'
          WHEN CURRENT_TIMESTAMP < o.fecha_inicio THEN 'proxima'
          WHEN o.limite_usos IS NOT NULL AND o.usos_actuales >= o.limite_usos THEN 'agotada'
          -- Cupones privados: todos los asignados están usados (no quedan 'activo'/'expirado')
          WHEN o.visibilidad = 'privado' AND (
            SELECT COUNT(*) FROM oferta_usuarios ou WHERE ou.oferta_id = o.id
          ) > 0 AND NOT EXISTS (
            SELECT 1 FROM oferta_usuarios ou WHERE ou.oferta_id = o.id AND ou.estado NOT IN ('usado', 'revocado')
          ) THEN 'agotada'
          WHEN CURRENT_TIMESTAMP > o.fecha_fin THEN 'vencida'
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

      // 3.1 Limpiar imagen anterior de R2 si fue reemplazada o eliminada.
      // CRÍTICO: verificar reference-count antes de borrar — la misma URL puede
      // estar compartida con otra oferta (al duplicarse) o estar referenciada
      // dentro de contenido JSON de chat_mensajes tipo 'cupon'. Sin este check,
      // editar la imagen de una oferta rompería las otras.
      if (
        datos.imagen !== undefined &&
        ofertaExistente.imagen &&
        ofertaExistente.imagen !== datos.imagen &&
        esUrlR2(ofertaExistente.imagen)
      ) {
        const urlAnterior = ofertaExistente.imagen;
        (async () => {
          try {
            const [{ total: enOtrasOfertas }] = await db
              .select({ total: sql<number>`COUNT(*)::int` })
              .from(ofertas)
              .where(and(eq(ofertas.imagen, urlAnterior), ne(ofertas.id, ofertaId)));

            if (enOtrasOfertas > 0) {
              console.log(`ℹ️ Imagen de oferta conservada (usada por ${enOtrasOfertas} oferta/s): ${urlAnterior}`);
              return;
            }

            // También puede estar embebida en chat_mensajes tipo 'cupon' (JSON con campo `imagen`)
            const mensajesCupon = await db.execute(sql`
              SELECT COUNT(*)::int AS total
              FROM chat_mensajes
              WHERE tipo = 'cupon'
                AND contenido::jsonb->>'imagen' = ${urlAnterior}
            `);
            const totalMensajes = Number((mensajesCupon.rows[0] as Record<string, unknown>)?.total ?? 0);
            if (totalMensajes > 0) {
              console.log(`ℹ️ Imagen de oferta conservada (usada en ${totalMensajes} mensaje/s cupón): ${urlAnterior}`);
              return;
            }

            await eliminarArchivo(urlAnterior);
          } catch (err) {
            console.error('No se pudo procesar imagen anterior de oferta en R2:', err);
          }
        })();
      }

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
            actorImagenUrl: negocioInfo?.logoUrl ?? ofertaActualizada.imagen ?? undefined,
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
      // 1. Verificar que la oferta existe y obtener imagen
      const verificacion = await tx.execute(sql`
        SELECT o.id, o.imagen
        FROM ofertas o
        WHERE o.id = ${ofertaId}
          AND o.negocio_id = ${negocioId}
          AND o.sucursal_id = ${sucursalId}
      `);

      if (verificacion.rows.length === 0) {
        throw new Error('Oferta no encontrada o no pertenece a esta sucursal');
      }

      const imagenUrl = (verificacion.rows[0] as Record<string, unknown>).imagen as string | null;

      // 2. Limpiar guardados de esta oferta (no hay FK CASCADE hacia guardados)
      await tx.execute(sql`
        DELETE FROM guardados 
        WHERE entity_type = 'oferta' AND entity_id = ${ofertaId}
      `);

      // 3. Limpiar notificaciones que referencian esta oferta (tipo 'oferta' y 'cupon')
      await tx.delete(notificaciones).where(
        and(
          eq(notificaciones.referenciaId, ofertaId),
        )
      );

      // 4. Obtener conversaciones afectadas + clientes asignados antes de eliminar
      const conversacionesAfectadas = await tx.execute(sql`
        SELECT DISTINCT conversacion_id FROM chat_mensajes
        WHERE tipo = 'cupon' AND contenido::jsonb->>'ofertaId' = ${ofertaId}
      `);

      const asignados = await tx
        .select({ usuarioId: ofertaUsuarios.usuarioId })
        .from(ofertaUsuarios)
        .where(eq(ofertaUsuarios.ofertaId, ofertaId));

      // 5. Eliminar mensajes de chat tipo 'cupon' asociados a esta oferta
      await tx.execute(sql`
        DELETE FROM chat_mensajes
        WHERE tipo = 'cupon' AND contenido::jsonb->>'ofertaId' = ${ofertaId}
      `);

      // 6. Actualizar preview de conversaciones afectadas
      // Acumulamos URLs R2 de conversaciones que se van a eliminar por completo
      // (mensajes sin archivos adjuntos ya no hay — eran solo el cupón borrado).
      // CRÍTICO: si la conversación tenía también imágenes/audios/documentos de
      // chat normal, esos archivos R2 quedaban huérfanos antes de este fix.
      const urlsR2ABorrar: string[] = [];
      for (const row of conversacionesAfectadas.rows) {
        const convId = (row as Record<string, unknown>).conversacion_id as string;
        const tiene = await tx.execute(sql`
          SELECT 1 FROM chat_mensajes WHERE conversacion_id = ${convId} AND eliminado = false LIMIT 1
        `);
        if (tiene.rows.length > 0) {
          await tx.execute(sql`
            UPDATE chat_conversaciones SET
              ultimo_mensaje_texto = LEFT(sub.contenido, 100),
              ultimo_mensaje_tipo = sub.tipo,
              ultimo_mensaje_fecha = sub.created_at,
              ultimo_mensaje_estado = sub.estado,
              ultimo_mensaje_emisor_id = sub.emisor_id
            FROM (
              SELECT contenido, tipo, created_at, estado, emisor_id
              FROM chat_mensajes
              WHERE conversacion_id = ${convId} AND eliminado = false
              ORDER BY created_at DESC LIMIT 1
            ) sub
            WHERE chat_conversaciones.id = ${convId}
          `);
        } else {
          // Recolectar URLs R2 de TODOS los mensajes (vivos y eliminados) antes del DELETE
          const mensajesBorrados = await tx.execute(sql`
            SELECT contenido, tipo FROM chat_mensajes WHERE conversacion_id = ${convId}
          `);
          const dominioEscapado = env.R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`${dominioEscapado}/[^\\s"'}\`<>]+`, 'g');
          for (const mRow of mensajesBorrados.rows) {
            const contenido = (mRow as Record<string, unknown>).contenido as string | null;
            if (!contenido) continue;
            const matches = contenido.match(regex);
            if (matches) urlsR2ABorrar.push(...matches);
          }

          await tx.execute(sql`DELETE FROM chat_mensajes WHERE conversacion_id = ${convId}`);
          await tx.execute(sql`DELETE FROM chat_conversaciones WHERE id = ${convId}`);
        }
      }

      // 6.1 Limpiar archivos R2 (fuera de la transacción) con reference-count
      // contra otros mensajes que pudieran tener las mismas URLs (raro pero posible)
      if (urlsR2ABorrar.length > 0) {
        const urlsUnicas = [...new Set(urlsR2ABorrar)];
        // fire-and-forget — no bloquear la respuesta
        (async () => {
          for (const url of urlsUnicas) {
            try {
              const [{ total }] = await db
                .select({ total: sql<number>`COUNT(*)::int` })
                .from(chatMensajes)
                .where(sql`${chatMensajes.contenido} LIKE ${`%${url}%`}`);
              if (total === 0 && esUrlR2(url)) {
                await eliminarArchivo(url);
              }
            } catch (err) {
              console.error('Error limpiando archivo R2 en eliminarOferta:', url, err);
            }
          }
        })();
      }

      // 7. Emitir sockets para actualización en tiempo real
      const convIds = conversacionesAfectadas.rows.map(r => (r as Record<string, unknown>).conversacion_id as string);
      for (const a of asignados) {
        emitirAUsuario(a.usuarioId, 'cupon:actualizado', { ofertaId, estado: 'eliminado' });
        emitirAUsuario(a.usuarioId, 'chatya:cupon-eliminado', { ofertaId, conversacionIds: convIds });
        emitirAUsuario(a.usuarioId, 'notificacion:recargar', {});
      }

      // 8. Eliminar oferta (CASCADE eliminará registros relacionados)
      await tx.delete(ofertas).where(eq(ofertas.id, ofertaId));

      // 9. Eliminar imagen de R2 con reference-count (evita romper otras
      // ofertas que compartan URL por fallback del clonado).
      // Los chat_mensajes tipo 'cupon' de esta oferta ya se borraron en paso 5.
      if (imagenUrl && esUrlR2(imagenUrl)) {
        (async () => {
          try {
            const [{ total }] = await db
              .select({ total: sql<number>`COUNT(*)::int` })
              .from(ofertas)
              .where(eq(ofertas.imagen, imagenUrl));

            if (total === 0) {
              await eliminarArchivo(imagenUrl);
            } else {
              console.log(`ℹ️ Imagen de oferta conservada (usada por ${total} oferta/s): ${imagenUrl}`);
            }
          } catch (err) {
            console.error('Error eliminando imagen de oferta:', err);
          }
        })();
      }

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

      // 3. Duplicar imagen en R2
      let nuevaImagenUrl: string | null = null;
      if (ofertaOriginal.imagen) {
        nuevaImagenUrl = await duplicarArchivo(ofertaOriginal.imagen, 'ofertas');

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
// =============================================================================
// OBTENER SUCURSALES DONDE APLICA LA MISMA OFERTA OPERATIVA
// =============================================================================
//
// Dada una `ofertaId`, busca el "grupo" de ofertas con misma partición
// (negocio_id + titulo + descripcion + tipo + valor + imagen +
// fecha_inicio + fecha_fin) y devuelve la lista de sucursales donde
// aplica esa oferta, con sus datos de contacto y distancia desde el GPS
// del usuario (si lo proporciona).
//
// Mismo set de filtros que el feed (activa, vigente, negocio completo,
// sucursal activa) — coherente con la "misma oferta operativa" que la
// dedup del CTE colapsa en una sola card.
//
// Uso: el modal de detalle llama a este endpoint cuando `totalSucursales > 1`
// para mostrar "Disponible en N sucursales" con cada nombre, dirección,
// distancia y botones de contacto (WhatsApp, teléfono).
export async function obtenerSucursalesDeOferta(
  ofertaId: string,
  gpsUsuario?: { latitud: number; longitud: number },
) {
  try {
    // Paso 1: obtener los campos de partición de la oferta solicitada.
    const ofertaQuery = sql`
      SELECT
        o.negocio_id, o.titulo, o.descripcion, o.tipo,
        o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
      FROM ofertas o
      WHERE o.id = ${ofertaId}
      LIMIT 1
    `;
    const ofertaResult = await db.execute(ofertaQuery);
    if (ofertaResult.rows.length === 0) {
      return { success: false, error: 'Oferta no encontrada', code: 404 };
    }
    const p = ofertaResult.rows[0] as Record<string, unknown>;

    const lat = gpsUsuario?.latitud;
    const lng = gpsUsuario?.longitud;

    // Paso 2: traer todas las sucursales con la MISMA partición.
    // Usamos COALESCE para igualar correctamente cuando descripcion/valor/
    // imagen son NULL (sino una NULL no iguala con otra NULL en SQL).
    const distanciaSelect = lat && lng
      ? sql`ST_Distance(
          s.ubicacion::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000 AS distancia_km`
      : sql`NULL::float AS distancia_km`;

    const orderByDistancia = lat && lng
      ? sql`distancia_km ASC NULLS LAST, s.es_principal DESC`
      : sql`s.es_principal DESC, s.nombre ASC`;

    const result = await db.execute(sql`
      SELECT
        o.id AS oferta_id,
        s.id AS sucursal_id,
        s.nombre AS sucursal_nombre,
        s.direccion,
        s.ciudad,
        s.telefono,
        s.whatsapp,
        s.es_principal,
        ST_Y(s.ubicacion::geometry) AS latitud,
        ST_X(s.ubicacion::geometry) AS longitud,
        ${distanciaSelect}
      FROM ofertas o
      INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
      INNER JOIN negocios n ON n.id = o.negocio_id
      WHERE o.negocio_id = ${p.negocio_id as string}
        AND o.titulo = ${p.titulo as string}
        AND COALESCE(o.descripcion, '') = COALESCE(${(p.descripcion as string | null) ?? ''}, '')
        AND o.tipo = ${p.tipo as string}
        AND COALESCE(o.valor::text, '') = COALESCE(${(p.valor as string | null) ?? ''}::text, '')
        AND COALESCE(o.imagen, '') = COALESCE(${(p.imagen as string | null) ?? ''}, '')
        AND o.fecha_inicio = ${p.fecha_inicio as string}
        AND o.fecha_fin = ${p.fecha_fin as string}
        AND o.activo = true
        AND o.visibilidad = 'publico'
        AND s.activa = true
        AND n.activo = true
        AND n.es_borrador = false
        AND n.onboarding_completado = true
        AND CURRENT_DATE >= DATE(o.fecha_inicio)
        AND CURRENT_DATE <= DATE(o.fecha_fin)
        AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)
      ORDER BY ${orderByDistancia}
    `);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    console.error('Error en obtenerSucursalesDeOferta:', error);
    throw error;
  }
}

// =============================================================================
// HELPER: ¿el usuario está vinculado al negocio dueño de la oferta?
// =============================================================================
//
// Si la oferta pertenece a un negocio donde el usuario es dueño o
// empleado (`usuarios.negocio_id` apunta a ese mismo negocio), las
// métricas de vista/click/share NO deben contarse — sería inflar las
// propias estadísticas del comerciante con sus propios accesos.
//
// Devuelve `true` si el usuario es "insider" del negocio dueño y la
// métrica debe descartarse.
async function esInsiderDelNegocio(
  ofertaId: string,
  usuarioId: string,
): Promise<boolean> {
  try {
    const r = await db.execute(sql`
      SELECT 1
      FROM usuarios u
      JOIN ofertas o ON o.negocio_id = u.negocio_id
      WHERE u.id = ${usuarioId} AND o.id = ${ofertaId}
      LIMIT 1
    `);
    return r.rows.length > 0;
  } catch {
    // Si falla el query (raro), por defecto dejamos pasar (no bloqueamos).
    return false;
  }
}

// =============================================================================
// REGISTRAR SHARE DE OFERTA
// =============================================================================
//
// Disparado cuando un usuario comparte una oferta (WhatsApp, Facebook,
// X, Copiar link, Web Share API). Misma política anti-inflación que
// vistas y clicks: máximo 1 share por usuario por día calendario.
//
// Antes los shares usaban la función SQL global `registrar_share` sin
// dedupe. A partir del 1 May 2026 ofertas usa su propia tabla con índice
// único per día.
export async function registrarShareOferta(ofertaId: string, usuarioId: string) {
  try {
    // No contar accesos del propio comerciante a sus ofertas.
    if (await esInsiderDelNegocio(ofertaId, usuarioId)) {
      return { success: true, message: 'Share ignorado (insider)' };
    }

    let inserto = false;
    try {
      const insertEvento = sql`
        INSERT INTO oferta_shares (oferta_id, usuario_id)
        VALUES (${ofertaId}, ${usuarioId})
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      const r = await db.execute(insertEvento);
      inserto = r.rows.length > 0;
    } catch (eventoError) {
      const msg = eventoError instanceof Error ? eventoError.message : '';
      if (msg.includes('oferta_shares') || msg.includes('42P01')) {
        // Tabla no existe (pre-migración). Modo legacy: incrementar siempre.
        inserto = true;
      } else {
        console.error('Error al insertar evento en oferta_shares:', eventoError);
      }
    }

    if (inserto) {
      const queryAcumulado = sql`
        INSERT INTO metricas_entidad (entity_type, entity_id, total_shares)
        VALUES ('oferta', ${ofertaId}, 1)
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          total_shares = metricas_entidad.total_shares + 1,
          updated_at = CURRENT_TIMESTAMP
      `;
      await db.execute(queryAcumulado);
    }

    return { success: true, message: 'Share registrado' };
  } catch (error) {
    console.error('Error al registrar share:', error);
    throw error;
  }
}

// =============================================================================
// REGISTRAR CLICK DE OFERTA (ENGAGEMENT)
// =============================================================================
//
// Disparado cuando un usuario ABRE el modal de detalle de una oferta.
// Es el evento de engagement (vs vista, que es la impression cuando la
// card aparece en el viewport).
//
// Misma política anti-inflación que vistas: máximo 1 click por usuario
// por día calendario (Sonora). El acumulado en `metricas_entidad.total_clicks`
// solo se incrementa cuando el INSERT realmente agregó una fila nueva.
export async function registrarClickOferta(ofertaId: string, usuarioId: string) {
  try {
    // No contar accesos del propio comerciante a sus ofertas.
    if (await esInsiderDelNegocio(ofertaId, usuarioId)) {
      return { success: true, message: 'Click ignorado (insider)' };
    }

    let inserto = false;
    try {
      const insertEvento = sql`
        INSERT INTO oferta_clicks (oferta_id, usuario_id)
        VALUES (${ofertaId}, ${usuarioId})
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      const r = await db.execute(insertEvento);
      inserto = r.rows.length > 0;
    } catch (eventoError) {
      const msg = eventoError instanceof Error ? eventoError.message : '';
      if (msg.includes('oferta_clicks') || msg.includes('42P01')) {
        // Tabla no existe (pre-migración). Modo legacy: incrementar siempre.
        inserto = true;
      } else {
        console.error('Error al insertar evento en oferta_clicks:', eventoError);
      }
    }

    if (inserto) {
      const queryAcumulado = sql`
        INSERT INTO metricas_entidad (entity_type, entity_id, total_clicks)
        VALUES ('oferta', ${ofertaId}, 1)
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          total_clicks = metricas_entidad.total_clicks + 1,
          updated_at = CURRENT_TIMESTAMP
      `;
      await db.execute(queryAcumulado);
    }

    return { success: true, message: 'Click registrado' };
  } catch (error) {
    console.error('Error al registrar click:', error);
    throw error;
  }
}

export async function registrarVistaOferta(ofertaId: string, usuarioId: string) {
  try {
    // No contar accesos del propio comerciante a sus ofertas (dueño o
    // empleado vinculado al negocio dueño de la oferta). Sin esto, las
    // métricas se inflan con sus propios accesos al feed.
    if (await esInsiderDelNegocio(ofertaId, usuarioId)) {
      return { success: true, message: 'Vista ignorada (insider)' };
    }

    // POLÍTICA ANTI-INFLACIÓN (1 May 2026):
    // Máximo 1 vista por usuario por día calendario (zona horaria
    // `America/Hermosillo`). El índice único `uniq_oferta_vistas_por_dia`
    // hace cumplir la regla a nivel BD; el service usa `RETURNING` para
    // saber si REALMENTE se insertó una fila nueva. Solo en ese caso
    // incrementamos el contador acumulado de `metricas_entidad`. Así el
    // total acumulado refleja vistas ÚNICAS por día, no taps repetidos.
    //
    // Comportamiento esperado:
    //  - Primera apertura del modal del día → +1 en oferta_vistas, +1 en metricas.
    //  - Apertura repetida el mismo día (mismo user) → ON CONFLICT, no inserta,
    //    no incrementa metricas. Devuelve success silenciosamente.
    //  - Día siguiente → cuenta como vista nueva.

    let inserto = false;
    try {
      const insertEvento = sql`
        INSERT INTO oferta_vistas (oferta_id, usuario_id)
        VALUES (${ofertaId}, ${usuarioId})
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      const r = await db.execute(insertEvento);
      inserto = r.rows.length > 0;
    } catch (eventoError) {
      const msg = eventoError instanceof Error ? eventoError.message : '';
      // Postgres SQLSTATE 42P01 = undefined_table. Si la migración aún no
      // se aplicó (entorno antiguo), degradamos: incrementar el acumulado
      // sin deduplicar. La deduplicación se activa al aplicar la migración.
      if (msg.includes('oferta_vistas') || msg.includes('42P01')) {
        inserto = true; // tratar como vista nueva en modo legacy
      } else {
        // Otros errores: log y seguir, pero no incrementar metricas.
        console.error('Error al insertar evento en oferta_vistas:', eventoError);
      }
    }

    if (inserto) {
      const queryAcumulado = sql`
        INSERT INTO metricas_entidad (entity_type, entity_id, total_views)
        VALUES ('oferta', ${ofertaId}, 1)
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          total_views = metricas_entidad.total_views + 1,
          updated_at = CURRENT_TIMESTAMP
      `;
      await db.execute(queryAcumulado);
    }

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

// =============================================================================
// HELPER: ENVIAR CUPÓN POR CHATYA
// =============================================================================

async function enviarCuponPorChatYA(
  negocioUsuarioId: string,
  sucursalId: string | null,
  clienteId: string,
  oferta: { id: string; titulo: string; imagen: string | null; tipo: string; valor: string | null; fechaFin: string },
  ofertaUsuarioId: string,
  negocioNombre: string
) {
  try {
    // Buscar/crear conversación negocio↔cliente
    const convRes = await crearObtenerConversacion({
      participante2Id: clienteId,
      participante2Modo: 'personal',
      participante1Modo: 'comercial',
      participante1SucursalId: sucursalId || undefined,
      contextoTipo: 'oferta',
      contextoReferenciaId: oferta.id,
    }, negocioUsuarioId);

    if (!convRes.success || !convRes.data) return;

    // Contenido JSON del mensaje tipo 'cupon'
    const contenidoCupon = JSON.stringify({
      ofertaId: oferta.id,
      ofertaUsuarioId,
      titulo: oferta.titulo,
      imagen: oferta.imagen,
      tipo: oferta.tipo,
      valor: oferta.valor,
      fechaExpiracion: oferta.fechaFin,
      negocioNombre,
      mensajeMotivador: '¡Felicidades! Tienes un cupón exclusivo 🎉',
      accionUrl: `/mis-cupones?id=${ofertaUsuarioId}`,
    });

    await enviarMensaje({
      conversacionId: convRes.data.id,
      emisorId: negocioUsuarioId,
      emisorModo: 'comercial',
      emisorSucursalId: sucursalId || undefined,
      tipo: 'cupon',
      contenido: contenidoCupon,
    });
  } catch (err) {
    console.error('Error enviando cupón por ChatYA:', err);
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
      SELECT o.*, ou.usuario_id as asignado_a, ou.codigo_personal, ou.estado as cupon_estado, ou.id as oferta_usuario_id
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

    // Verificar estado del cupón
    if (oferta.cupon_estado === 'usado') {
      return { success: false, message: 'Este cupón ya fue utilizado', code: 400 };
    }
    if (oferta.cupon_estado === 'revocado') {
      return { success: false, message: 'Este cupón fue revocado', code: 400 };
    }
    if (oferta.cupon_estado === 'expirado') {
      return { success: false, message: 'Este cupón ha expirado', code: 400 };
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
          ofertaUsuarioId: oferta.oferta_usuario_id,
          codigo: oferta.codigo_personal,
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
        titulo: '¡Recibiste un Cupón Exclusivo!',
        mensaje: `${oferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId,
        sucursalId: oferta.sucursalId ?? undefined,
        referenciaId: ofertaId,
        referenciaTipo: 'oferta',
        icono: '🎟️',
        actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,
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

    // Info del negocio (incluye usuarioId para ChatYA)
    const [negocioInfo] = await db
      .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl, usuarioId: negocios.usuarioId })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    // Reenviar notificación + mensaje ChatYA a cada usuario
    for (const asignado of asignados) {
      // Notificación (sin código — dato sensible)
      crearNotificacion({
        usuarioId: asignado.usuarioId,
        modo: 'personal',
        tipo: 'cupon_asignado',
        titulo: '¡Recordatorio de cupón!',
        mensaje: `${oferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId,
        sucursalId: oferta.sucursalId ?? undefined,
        referenciaId: ofertaId,
        referenciaTipo: 'cupon',
        icono: '🎟️',
        actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,
        actorNombre: negocioInfo?.nombre ?? undefined,
      }).catch((err) => console.error('Error reenvío notificación cupón:', err));

      // Mensaje ChatYA
      enviarCuponPorChatYA(
        negocioInfo?.usuarioId ?? negocioId,
        oferta.sucursalId,
        asignado.usuarioId,
        { id: oferta.id, titulo: oferta.titulo, imagen: oferta.imagen, tipo: oferta.tipo, valor: oferta.valor, fechaFin: oferta.fechaFin },
        asignado.codigoPersonal ? String(asignado.codigoPersonal) : '',
        negocioInfo?.nombre ?? 'un negocio'
      ).catch((err) => console.error('Error reenvío ChatYA cupón:', err));
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

    // Eliminar mensajes de chat y notificaciones originales de este cupón para este usuario
    await db.execute(sql`
      DELETE FROM chat_mensajes
      WHERE tipo = 'cupon' AND contenido::jsonb->>'ofertaId' = ${ofertaId}
        AND emisor_id != ${usuarioId}
    `);

    await db.delete(notificaciones).where(
      and(
        eq(notificaciones.usuarioId, usuarioId),
        eq(notificaciones.referenciaId, ofertaId),
        eq(notificaciones.referenciaTipo, 'cupon')
      )
    );

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
      mensaje: `${oferta.titulo}${motivo ? ` · Motivo: ${motivo}` : ''}\n${negocioInfo?.nombre ?? 'un negocio'}`,
      negocioId,
      sucursalId: oferta.sucursalId ?? undefined,
      referenciaId: ofertaId,
      referenciaTipo: 'cupon',
      icono: '❌',
      actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,
      actorNombre: negocioInfo?.nombre ?? undefined,
    }).catch((err) => console.error('Error notificación cupón revocado:', err));

    // Notificar al frontend en tiempo real
    emitirAUsuario(usuarioId, 'cupon:actualizado', { ofertaId, estado: 'revocado' });

    return { success: true, message: 'Cupón revocado correctamente' };
  } catch (error) {
    console.error('Error al revocar cupón:', error);
    throw error;
  }
}

// =============================================================================
// REVOCAR CUPÓN MASIVO — revoca TODOS los usuarios activos de un cupón
// =============================================================================

export async function revocarCuponMasivo(
  ofertaId: string,
  negocioId: string,
  revocadoPorId: string,
  motivo?: string
) {
  try {
    const [oferta] = await db
      .select()
      .from(ofertas)
      .where(and(eq(ofertas.id, ofertaId), eq(ofertas.negocioId, negocioId)))
      .limit(1);

    if (!oferta) return { success: false, error: 'Oferta no encontrada' };
    if (oferta.visibilidad !== 'privado') return { success: false, error: 'Solo se pueden revocar cupones privados' };

    // Obtener usuarios activos
    const asignados = await db
      .select({ id: ofertaUsuarios.id, usuarioId: ofertaUsuarios.usuarioId })
      .from(ofertaUsuarios)
      .where(and(eq(ofertaUsuarios.ofertaId, ofertaId), eq(ofertaUsuarios.estado, 'activo')));

    if (asignados.length === 0) return { success: false, error: 'No hay cupones activos para revocar' };

    // Revocar todos
    await db
      .update(ofertaUsuarios)
      .set({
        estado: 'revocado',
        revocadoAt: new Date().toISOString(),
        revocadoPor: revocadoPorId,
        motivoRevocacion: motivo || 'Cupón desactivado por el negocio',
      })
      .where(and(eq(ofertaUsuarios.ofertaId, ofertaId), eq(ofertaUsuarios.estado, 'activo')));

    // Desactivar la oferta
    await db
      .update(ofertas)
      .set({ activo: false })
      .where(eq(ofertas.id, ofertaId));

    // Obtener conversaciones afectadas antes de eliminar mensajes
    const conversacionesAfectadas = await db.execute(sql`
      SELECT DISTINCT conversacion_id FROM chat_mensajes
      WHERE tipo = 'cupon' AND contenido::jsonb->>'ofertaId' = ${ofertaId}
    `);

    // Eliminar mensajes de chat tipo 'cupon' de esta oferta
    await db.execute(sql`
      DELETE FROM chat_mensajes
      WHERE tipo = 'cupon' AND contenido::jsonb->>'ofertaId' = ${ofertaId}
    `);

    // Actualizar preview de conversaciones afectadas (poner el último mensaje real)
    // Acumulamos URLs R2 de conversaciones que se eliminan por completo para
    // limpiarlas después del DELETE (ver nota en eliminarOferta sobre el bug).
    const urlsR2ABorrar: string[] = [];
    for (const row of conversacionesAfectadas.rows) {
      const convId = (row as Record<string, unknown>).conversacion_id as string;
      await db.execute(sql`
        UPDATE chat_conversaciones SET
          ultimo_mensaje_texto = LEFT(sub.contenido, 100),
          ultimo_mensaje_tipo = sub.tipo,
          ultimo_mensaje_fecha = sub.created_at,
          ultimo_mensaje_estado = sub.estado,
          ultimo_mensaje_emisor_id = sub.emisor_id
        FROM (
          SELECT contenido, tipo, created_at, estado, emisor_id
          FROM chat_mensajes
          WHERE conversacion_id = ${convId} AND eliminado = false
          ORDER BY created_at DESC LIMIT 1
        ) sub
        WHERE chat_conversaciones.id = ${convId}
      `);
      // Si no quedan mensajes, eliminar la conversación completa
      const tiene = await db.execute(sql`
        SELECT 1 FROM chat_mensajes WHERE conversacion_id = ${convId} AND eliminado = false LIMIT 1
      `);
      if (tiene.rows.length === 0) {
        // Recolectar URLs R2 antes del DELETE CASCADE
        const mensajesBorrados = await db.execute(sql`
          SELECT contenido, tipo FROM chat_mensajes WHERE conversacion_id = ${convId}
        `);
        const dominioEscapado = env.R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${dominioEscapado}/[^\\s"'}\`<>]+`, 'g');
        for (const mRow of mensajesBorrados.rows) {
          const contenido = (mRow as Record<string, unknown>).contenido as string | null;
          if (!contenido) continue;
          const matches = contenido.match(regex);
          if (matches) urlsR2ABorrar.push(...matches);
        }

        await db.execute(sql`DELETE FROM chat_mensajes WHERE conversacion_id = ${convId}`);
        await db.execute(sql`DELETE FROM chat_conversaciones WHERE id = ${convId}`);
      }
    }

    // Limpiar archivos R2 recolectados con reference-count
    if (urlsR2ABorrar.length > 0) {
      const urlsUnicas = [...new Set(urlsR2ABorrar)];
      (async () => {
        for (const url of urlsUnicas) {
          try {
            const [{ total }] = await db
              .select({ total: sql<number>`COUNT(*)::int` })
              .from(chatMensajes)
              .where(sql`${chatMensajes.contenido} LIKE ${`%${url}%`}`);
            if (total === 0 && esUrlR2(url)) {
              await eliminarArchivo(url);
            }
          } catch (err) {
            console.error('Error limpiando archivo R2 en revocarCuponMasivo:', url, err);
          }
        }
      })();
    }

    // Eliminar notificaciones originales de asignación (cupon_asignado)
    await db.delete(notificaciones).where(
      and(
        eq(notificaciones.referenciaId, ofertaId),
        eq(notificaciones.referenciaTipo, 'cupon')
      )
    );

    // Notificar revocación a cada usuario
    const [negocioInfo] = await db
      .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    for (const a of asignados) {
      await crearNotificacion({
        usuarioId: a.usuarioId,
        modo: 'personal',
        tipo: 'cupon_revocado',
        titulo: 'Cupón revocado',
        mensaje: `${oferta.titulo}${motivo ? ` · Motivo: ${motivo}` : ''}\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId,
        sucursalId: oferta.sucursalId ?? undefined,
        referenciaId: ofertaId,
        referenciaTipo: 'cupon',
        icono: '❌',
        actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,
        actorNombre: negocioInfo?.nombre ?? undefined,
      }).catch((err) => console.error('Error notificación revocar masivo:', err));
    }

    // Emitir sockets después de que todo esté guardado en BD
    const convIds = conversacionesAfectadas.rows.map(r => (r as Record<string, unknown>).conversacion_id as string);
    for (const a of asignados) {
      emitirAUsuario(a.usuarioId, 'cupon:actualizado', { ofertaId, estado: 'revocado' });
      emitirAUsuario(a.usuarioId, 'chatya:cupon-eliminado', { ofertaId, conversacionIds: convIds });
      emitirAUsuario(a.usuarioId, 'notificacion:recargar', {});
    }

    return { success: true, message: `Cupón revocado para ${asignados.length} cliente(s)` };
  } catch (error) {
    console.error('Error al revocar cupón masivo:', error);
    throw error;
  }
}

// =============================================================================
// REACTIVAR CUPÓN MASIVO
// =============================================================================

export async function reactivarCupon(ofertaId: string, negocioId: string) {
  try {
    const [oferta] = await db
      .select()
      .from(ofertas)
      .where(and(eq(ofertas.id, ofertaId), eq(ofertas.negocioId, negocioId)))
      .limit(1);

    if (!oferta) return { success: false, error: 'Oferta no encontrada' };
    if (oferta.visibilidad !== 'privado') return { success: false, error: 'Solo cupones privados' };

    const revocados = await db
      .select({ id: ofertaUsuarios.id, usuarioId: ofertaUsuarios.usuarioId, codigoPersonal: ofertaUsuarios.codigoPersonal })
      .from(ofertaUsuarios)
      .where(and(eq(ofertaUsuarios.ofertaId, ofertaId), eq(ofertaUsuarios.estado, 'revocado')));

    if (revocados.length === 0) return { success: false, error: 'No hay cupones revocados para reactivar' };

    await db.update(ofertaUsuarios)
      .set({ estado: 'activo', revocadoAt: null, revocadoPor: null, motivoRevocacion: null })
      .where(and(eq(ofertaUsuarios.ofertaId, ofertaId), eq(ofertaUsuarios.estado, 'revocado')));

    await db.update(ofertas).set({ activo: true }).where(eq(ofertas.id, ofertaId));

    // Eliminar notificaciones de revocación previas
    await db.delete(notificaciones).where(
      and(eq(notificaciones.referenciaId, ofertaId), eq(notificaciones.referenciaTipo, 'cupon'))
    );

    const [negocioInfo] = await db
      .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl, usuarioId: negocios.usuarioId })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    for (const r of revocados) {
      await crearNotificacion({
        usuarioId: r.usuarioId, modo: 'personal', tipo: 'cupon_asignado',
        titulo: '¡Tu cupón fue reactivado!',
        mensaje: `${oferta.titulo}\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId, sucursalId: oferta.sucursalId ?? undefined,
        referenciaId: ofertaId, referenciaTipo: 'cupon', icono: '🎟️',
        actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,
        actorNombre: negocioInfo?.nombre ?? undefined,
      }).catch(err => console.error('Error notificación reactivar:', err));

      enviarCuponPorChatYA(
        negocioInfo?.usuarioId ?? negocioId, oferta.sucursalId, r.usuarioId,
        { id: oferta.id, titulo: oferta.titulo, imagen: oferta.imagen, tipo: oferta.tipo, valor: oferta.valor, fechaFin: oferta.fechaFin },
        r.codigoPersonal ? String(r.codigoPersonal) : '', negocioInfo?.nombre ?? 'un negocio'
      ).catch(err => console.error('Error ChatYA reactivar:', err));

      emitirAUsuario(r.usuarioId, 'cupon:actualizado', { ofertaId, estado: 'activo' });
      emitirAUsuario(r.usuarioId, 'notificacion:recargar', {});
    }

    return { success: true, message: `Cupón reactivado para ${revocados.length} cliente(s)` };
  } catch (error) {
    console.error('Error al reactivar cupón:', error);
    throw error;
  }
}

// =============================================================================
// OBTENER MIS CUPONES (vista cliente)
// =============================================================================

export async function obtenerMisCupones(usuarioId: string, filtroEstado?: string) {
  try {
    // El estado efectivo del cupón se computa cruzando con la fecha fin de la oferta padre:
    // - revocado → siempre gana (el comerciante lo revocó explícitamente)
    // - usado → el cliente lo canjeó
    // - si la oferta ya venció y no se usó → 'expirado' (aunque en BD diga 'activo')
    // - resto → 'activo'
    // El filtro opcional por `estado` también se aplica sobre el estado efectivo.
    const query = sql`
      SELECT
        ou.id as cupon_id,
        ou.oferta_id,
        ou.codigo_personal,
        CASE
          WHEN ou.estado = 'revocado' THEN 'revocado'
          WHEN ou.estado = 'usado' THEN 'usado'
          WHEN o.fecha_fin < NOW() THEN 'expirado'
          ELSE 'activo'
        END as estado,
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
        o.limite_usos_por_usuario,
        COALESCE((
          SELECT COUNT(*) FROM oferta_usos ouso
          WHERE ouso.oferta_id = o.id AND ouso.usuario_id = ou.usuario_id
        ), 0)::int as usos_realizados,
        n.id as negocio_id,
        n.usuario_id as negocio_usuario_id,
        n.nombre as negocio_nombre,
        n.logo_url as negocio_logo,
        o.sucursal_id,
        ns.nombre as sucursal_nombre
      FROM oferta_usuarios ou
      JOIN ofertas o ON o.id = ou.oferta_id
      JOIN negocios n ON n.id = o.negocio_id
      LEFT JOIN negocio_sucursales ns ON ns.id = o.sucursal_id
      WHERE ou.usuario_id = ${usuarioId}
        -- Ocultar cupones que expiraron sin usarse: no aportan valor al cliente
        -- y sólo generan frustración. Los usados (con usado_at) sí se muestran como historial.
        AND NOT (ou.estado = 'activo' AND o.fecha_fin < NOW())
        -- Ocultar revocados también (el comerciante los canceló, no tiene sentido mostrarlos)
        AND ou.estado != 'revocado'
      ${filtroEstado && filtroEstado !== 'todos' ? sql`AND (
        CASE
          WHEN ou.estado = 'usado' THEN 'usado'
          ELSE 'activo'
        END
      ) = ${filtroEstado}` : sql``}
      ORDER BY
        CASE
          WHEN ou.estado = 'revocado' THEN 4
          WHEN ou.estado = 'usado' THEN 2
          WHEN o.fecha_fin < NOW() THEN 3
          ELSE 1
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

export async function revelarCodigoCupon(ofertaUsuarioId: string, usuarioId: string, contrasena?: string) {
  try {
    // Verificar contraseña si se proporciona
    if (contrasena) {
      const resultado = await db.execute(sql`
        SELECT contrasena_hash FROM usuarios WHERE id = ${usuarioId} LIMIT 1
      `);

      const usuario = resultado.rows[0] as Record<string, unknown> | undefined;
      if (!usuario?.contrasena_hash) {
        return { success: false, message: 'Usuario sin contraseña configurada', code: 400 };
      }

      const bcrypt = await import('bcrypt');
      const valida = await bcrypt.compare(contrasena, usuario.contrasena_hash as string);
      if (!valida) {
        return { success: false, message: 'Contraseña incorrecta', code: 401 };
      }
    }

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
// OBTENER CLIENTES ASIGNADOS A UN CUPÓN (BS)
// =============================================================================

export async function obtenerClientesAsignados(ofertaId: string, negocioId: string) {
  try {
    // El estado efectivo se computa cruzando con la fecha fin de la oferta padre:
    // - `ou.estado = 'revocado'` → revocado (el dueño lo revocó explícitamente)
    // - `ou.estado = 'usado'` → usado (canje real registrado)
    // - Oferta venció (fecha_fin < NOW) y no está revocado/usado → expirado
    // - Resto → activo
    //
    // Se confía en `ou.estado` (no en `ou.usado_at`). Pueden existir registros legacy
    // con `usado_at` poblado sin que `estado` se haya marcado como 'usado' — se tratan
    // como no-canjeados. El campo autoritativo es `estado`.
    //
    // No se muta `oferta_usuarios.estado` en BD: si el dueño extiende la vigencia,
    // los cupones vuelven automáticamente a 'activo' sin migración.
    const resultado = await db.execute(sql`
      SELECT
        u.id,
        u.nombre,
        u.telefono,
        u.correo,
        u.avatar_url,
        ou.id as cupon_id,
        CASE
          WHEN ou.estado = 'revocado' THEN 'revocado'
          WHEN ou.estado = 'usado' THEN 'usado'
          WHEN o.fecha_fin < NOW() THEN 'expirado'
          ELSE 'activo'
        END as estado,
        ou.codigo_personal,
        ou.motivo,
        ou.asignado_at,
        ou.usado_at,
        ou.revocado_at,
        ou.motivo_revocacion
      FROM oferta_usuarios ou
      JOIN usuarios u ON u.id = ou.usuario_id
      JOIN ofertas o ON o.id = ou.oferta_id
      WHERE ou.oferta_id = ${ofertaId}
        AND o.negocio_id = ${negocioId}
      ORDER BY ou.asignado_at DESC
    `);

    return {
      success: true,
      data: resultado.rows,
    };
  } catch (error) {
    console.error('Error al obtener clientes asignados:', error);
    throw error;
  }
}

// =============================================================================
// OFERTA DESTACADA DEL DÍA (FEED PÚBLICO — BLOQUE EDITORIAL)
// =============================================================================

/**
 * Devuelve la oferta destacada vigente para el feed público.
 *
 * Lógica:
 *  1. Si existe un override en `ofertas_destacadas` con
 *     `activa=true AND vigente_desde <= NOW() AND vigente_hasta >= NOW()`,
 *     se usa esa oferta.
 *  2. Si no hay override vigente, se elige automáticamente la oferta activa
 *     con más vistas (`metricas_entidad.total_views` como proxy — la
 *     granularidad por ventana de 7 días no existe hoy en BD; ver reporte
 *     `ofertas-publicas-prompt-1-cierre.md` desviación 1).
 *  3. Si no hay ninguna oferta activa, retorna `data: null` (no es error).
 *
 * El formato de respuesta reutiliza `obtenerOfertaDetalle` para que el
 * frontend pueda renderizar el bloque con el mismo componente que el modal
 * de detalle.
 */
export async function obtenerOfertaDestacadaDelDia(
  userId: string,
  gpsUsuario?: { latitud: number; longitud: number }
) {
  try {
    // 1) Buscar override administrable vigente
    // Si la tabla `ofertas_destacadas` no existe todavía (migración pendiente),
    // capturamos el error y caemos al fallback automático para no romper la
    // experiencia del feed público antes de aplicar la migración en Supabase.
    // POLÍTICA (1 May 2026): la destacada del día SÍ respeta el filtro
    // de ciudad cuando hay GPS. Antes era contenido editorial "global",
    // pero mostrar una oferta a 1400km del usuario rompe la promesa
    // hiperlocal del producto. Si no hay nada destacado dentro del radio,
    // el slot simplemente no se renderiza.
    const lat = gpsUsuario?.latitud;
    const lng = gpsUsuario?.longitud;
    const radioMetros = 50 * 1000; // 50km — mismo radio que el feed
    const filtroGps = lat && lng
      ? sql`AND ST_DWithin(
          s.ubicacion::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radioMetros}
        )`
      : sql``;

    let ofertaId: string | null = null;
    try {
      // Override admin: solo válido si la oferta cae dentro del radio
      // del usuario. Sin GPS, se acepta cualquier override.
      const overrideQuery = sql`
        SELECT od.oferta_id
        FROM ofertas_destacadas od
        INNER JOIN ofertas o ON o.id = od.oferta_id
        INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
        WHERE od.activa = true
          AND od.vigente_desde <= NOW()
          AND od.vigente_hasta >= NOW()
          ${filtroGps}
        ORDER BY od.fijada_at DESC
        LIMIT 1
      `;
      const overrideResult = await db.execute(overrideQuery);
      if (overrideResult.rows.length > 0) {
        const row = overrideResult.rows[0] as { oferta_id: string };
        ofertaId = row.oferta_id;
      }
    } catch (overrideError) {
      const msg = overrideError instanceof Error ? overrideError.message : '';
      // Postgres SQLSTATE 42P01 = undefined_table
      if (!msg.includes('ofertas_destacadas') && !msg.includes('42P01')) {
        throw overrideError;
      }
      // Tabla aún no existe: ignoramos y dejamos que actúe el fallback
    }

    if (!ofertaId) {
      // 2) Fallback automático: oferta PÚBLICA activa más popular (últimos 7
      //    días), filtrada por radio cuando hay GPS, deduplicada por grupo
      //    de "misma oferta operativa".
      const usaVistasReales = await tablaOfertaVistasExiste();

      const fallbackQuery = sql`
        WITH grupos AS (
          SELECT
            o.id,
            o.created_at,
            ${usaVistasReales
              ? sql`COALESCE((
                  SELECT COUNT(*)::int
                  FROM oferta_vistas ov
                  WHERE ov.oferta_id = o.id
                    AND ov.created_at >= NOW() - INTERVAL '7 days'
                ), 0) AS vistas_7_dias,`
              : sql``
            }
            ROW_NUMBER() OVER (
              PARTITION BY
                o.negocio_id, o.titulo, o.descripcion, o.tipo,
                o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
              ORDER BY
                s.es_principal DESC,
                o.updated_at DESC
            ) AS rn
          FROM ofertas o
          INNER JOIN negocios n ON n.id = o.negocio_id
          INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
          WHERE o.activo = true
            AND o.visibilidad = 'publico'
            AND n.activo = true
            AND s.activa = true
            AND n.es_borrador = false
            AND n.onboarding_completado = true
            AND CURRENT_DATE >= DATE(o.fecha_inicio)
            AND CURRENT_DATE <= DATE(o.fecha_fin)
            AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)
            ${filtroGps}
        )
        SELECT id FROM grupos
        WHERE rn = 1
        ORDER BY ${usaVistasReales ? sql`vistas_7_dias DESC,` : sql``} created_at DESC
        LIMIT 1
      `;
      const fallbackResult = await db.execute(fallbackQuery);
      if (fallbackResult.rows.length > 0) {
        const row = fallbackResult.rows[0] as { id: string };
        ofertaId = row.id;
      }
    }

    // 3) Sin oferta destacada disponible
    if (!ofertaId) {
      return {
        success: true,
        data: null,
      };
    }

    // 4) Reutilizar el formato del detalle (mismos joins, métricas y
    //    liked/saved del usuario). Pasamos el GPS opcional para que la
    //    distancia se calcule cuando el usuario lo proporcione (la oferta
    //    NO se filtra por ciudad — es contenido editorial global — pero
    //    sí se muestra la distancia para orientación visual).
    return await obtenerOfertaDetalle(ofertaId, userId, gpsUsuario);
  } catch (error) {
    console.error('Error al obtener oferta destacada del día:', error);
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
  obtenerOfertaDestacadaDelDia,
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
  obtenerClientesAsignados,
  reactivarCupon,
};