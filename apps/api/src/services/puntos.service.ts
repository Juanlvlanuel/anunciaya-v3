/**
 * puntos.service.ts
 * ==================
 * Lógica de negocio compartida por los módulos: Puntos, Transacciones y Clientes.
 * 
 * Ubicación: apps/api/src/services/puntos.service.ts
 * 
 * CONSUMIDO POR:
 * - puntos.controller.ts        → Configuración, Recompensas, Estadísticas (KPIs)
 * - transacciones.controller.ts → Historial, Revocar
 * - clientes.controller.ts      → Top Clientes
 * 
 * FUNCIONES:
 * 1.  obtenerConfigPuntos            - Obtiene configuración (con defaults)
 * 2.  actualizarConfigPuntos         - Actualiza o crea configuración
 * 3.  obtenerRecompensas             - Lista recompensas (filtro activas)
 * 4.  obtenerRecompensaPorId         - Obtiene una recompensa específica
 * 5.  crearRecompensa                - Crea recompensa (imagen ya subida desde frontend)
 * 6.  actualizarRecompensa           - Actualiza recompensa con cleanup Cloudinary
 * 7.  eliminarRecompensa             - Soft delete con cleanup Cloudinary
 * 8.  obtenerEstadisticasPuntos      - 4 KPIs con filtros de periodo y sucursal
 * 8b. obtenerTopClientes             - Top clientes por puntos (Módulo Clientes)
 * 9.  obtenerHistorialTransacciones  - Historial con JOINs (Módulo Transacciones)
 * 10. revocarTransaccion             - Cancela transacción y resta puntos (Módulo Transacciones)
 * 
 * DEPENDENCIAS:
 * - date-fns: Instalar con "pnpm add date-fns" en apps/api
 */

import { eq, and, inArray, notInArray, gte, lte, lt, gt, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  puntosConfiguracion,
  recompensas,
  puntosTransacciones,
  puntosBilletera,
  usuarios,
  empleados,
  negocioSucursales,
  vouchersCanje
} from '../db/schemas/schema.js';
import type {
  ActualizarConfigPuntosInput,
  CrearRecompensaInput,
  ActualizarRecompensaInput
} from '../validations/puntos.schema.js';
import type {
  RespuestaServicio,
  ConfigPuntosCompleta,
  Recompensa,
  EstadisticasPuntos,
  ClienteConPuntos,
  TransaccionPuntos,
  PeriodoEstadisticas
} from '../types/puntos.types.js';
import { eliminarImagen } from './cloudinary.service.js';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths } from 'date-fns';

// =============================================================================
// VALORES POR DEFECTO
// =============================================================================

const CONFIG_DEFAULTS = {
  puntosPorPeso: 1.0,
  diasExpiracionPuntos: 90,
  diasExpiracionVoucher: 30,
  activo: true,
  nivelesActivos: true,
  nivelBronce: { min: 0, max: 999, multiplicador: 1.0 },
  nivelPlata: { min: 1000, max: 4999, multiplicador: 1.2 },
  nivelOro: { min: 5000, multiplicador: 1.5 },
};

// =============================================================================
// 1. OBTENER CONFIGURACIÓN DE PUNTOS
// =============================================================================

export async function obtenerConfigPuntos(
  negocioId: string
): Promise<RespuestaServicio<ConfigPuntosCompleta>> {
  try {
    const [config] = await db
      .select()
      .from(puntosConfiguracion)
      .where(eq(puntosConfiguracion.negocioId, negocioId))
      .limit(1);

    // Si no existe configuración, retornar defaults
    if (!config) {
      return {
        success: true,
        message: 'Configuración por defecto',
        data: CONFIG_DEFAULTS,
        code: 200,
      };
    }

    // Transformar a camelCase
    const configFormateada: ConfigPuntosCompleta = {
      puntosPorPeso: Number(config.puntosPorPeso),
      pesosOriginales: config.pesosOriginales ?? undefined,
      puntosOriginales: config.puntosOriginales ?? undefined,
      diasExpiracionPuntos: config.diasExpiracionPuntos,
      diasExpiracionVoucher: config.diasExpiracionVoucher || 30,
      activo: config.activo,
      nivelesActivos: config.nivelesActivos ?? true,
      nivelBronce: {
        min: config.nivelBronceMin || 0,
        max: config.nivelBronceMax || 999,
        multiplicador: Number(config.nivelBronceMultiplicador) || 1.0,
      },
      nivelPlata: {
        min: config.nivelPlataMin || 1000,
        max: config.nivelPlataMax || 4999,
        multiplicador: Number(config.nivelPlataMultiplicador) || 1.2,
      },
      nivelOro: {
        min: config.nivelOroMin || 5000,
        multiplicador: Number(config.nivelOroMultiplicador) || 1.5,
      },
    };

    return {
      success: true,
      message: 'Configuración obtenida',
      data: configFormateada,
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener configuración de puntos:', error);
    return {
      success: false,
      message: 'Error al obtener configuración de puntos',
      code: 500,
    };
  }
}

// =============================================================================
// 2. ACTUALIZAR CONFIGURACIÓN DE PUNTOS
// =============================================================================

export async function actualizarConfigPuntos(
  negocioId: string,
  datos: ActualizarConfigPuntosInput
): Promise<RespuestaServicio<ConfigPuntosCompleta>> {
  try {
    // Verificar si existe configuración
    const [configExistente] = await db
      .select()
      .from(puntosConfiguracion)
      .where(eq(puntosConfiguracion.negocioId, negocioId))
      .limit(1);

    // Preparar datos para inserción/actualización (camelCase — Drizzle convierte a snake_case)
    const datosDB: Partial<{
      puntosPorPeso: string;
      pesosOriginales: number;
      puntosOriginales: number;
      diasExpiracionPuntos: number | null;
      diasExpiracionVoucher: number;
      activo: boolean;
      nivelesActivos: boolean;
      nivelBronceMin: number;
      nivelBronceMax: number;
      nivelBronceMultiplicador: string;
      nivelPlataMin: number;
      nivelPlataMax: number;
      nivelPlataMultiplicador: string;
      nivelOroMin: number;
      nivelOroMultiplicador: string;
    }> = {};

    // NUEVO: Calcular puntosPorPeso a partir de pesosPor y puntosGanados
    if (datos.pesosPor !== undefined && datos.puntosGanados !== undefined) {
      const ratio = datos.puntosGanados / datos.pesosPor;
      datosDB.puntosPorPeso = ratio.toString();
      datosDB.pesosOriginales = datos.pesosPor;
      datosDB.puntosOriginales = datos.puntosGanados;
    }
    
    if (datos.diasExpiracionPuntos !== undefined) datosDB.diasExpiracionPuntos = datos.diasExpiracionPuntos;
    if (datos.diasExpiracionVoucher !== undefined) datosDB.diasExpiracionVoucher = datos.diasExpiracionVoucher;
    if (datos.activo !== undefined) datosDB.activo = datos.activo;
    if (datos.nivelesActivos !== undefined) datosDB.nivelesActivos = datos.nivelesActivos;

    // Niveles
    if (datos.nivelBronceMin !== undefined) datosDB.nivelBronceMin = datos.nivelBronceMin;
    if (datos.nivelBronceMax !== undefined) datosDB.nivelBronceMax = datos.nivelBronceMax;
    if (datos.nivelBronceMultiplicador !== undefined) datosDB.nivelBronceMultiplicador = datos.nivelBronceMultiplicador.toString();

    if (datos.nivelPlataMin !== undefined) datosDB.nivelPlataMin = datos.nivelPlataMin;
    if (datos.nivelPlataMax !== undefined) datosDB.nivelPlataMax = datos.nivelPlataMax;
    if (datos.nivelPlataMultiplicador !== undefined) datosDB.nivelPlataMultiplicador = datos.nivelPlataMultiplicador.toString();

    if (datos.nivelOroMin !== undefined) datosDB.nivelOroMin = datos.nivelOroMin;
    if (datos.nivelOroMultiplicador !== undefined) datosDB.nivelOroMultiplicador = datos.nivelOroMultiplicador.toString();

    if (configExistente) {
      // Actualizar existente
      await db
        .update(puntosConfiguracion)
        .set(datosDB)
        .where(eq(puntosConfiguracion.negocioId, negocioId));
    } else {
      // Crear nueva configuración
      await db
        .insert(puntosConfiguracion)
        .values({
          negocioId,
          ...datosDB,
        });
    }

    // ── Recalcular nivel_actual de TODAS las billeteras del negocio ──────
    // Si se cambiaron los rangos de niveles, los clientes existentes deben
    // reclasificarse según los nuevos rangos.
    const tieneRangos = datos.nivelBronceMax !== undefined
      && datos.nivelPlataMax !== undefined
      && datos.nivelOroMin !== undefined;

    if (tieneRangos) {
      const bronceMax = datos.nivelBronceMax!;
      const plataMax = datos.nivelPlataMax!;
      const oroMin = datos.nivelOroMin!;

      await db.execute(sql`
        UPDATE puntos_billetera
        SET nivel_actual = CASE
          WHEN puntos_acumulados_total >= ${oroMin} THEN 'oro'
          WHEN puntos_acumulados_total > ${bronceMax} AND puntos_acumulados_total <= ${plataMax} THEN 'plata'
          ELSE 'bronce'
        END
        WHERE negocio_id = ${negocioId}
      `);
    }

    // Retornar configuración actualizada
    return obtenerConfigPuntos(negocioId);
  } catch (error) {
    console.error('Error al actualizar configuración de puntos:', error);
    return {
      success: false,
      message: 'Error al actualizar configuración de puntos',
      code: 500,
    };
  }
}

// =============================================================================
// 3. OBTENER RECOMPENSAS
// =============================================================================

export async function obtenerRecompensas(
  negocioId: string,
  soloActivas?: boolean
): Promise<RespuestaServicio<Recompensa[]>> {
  try {
    const condiciones = [eq(recompensas.negocioId, negocioId)];

    if (soloActivas) {
      condiciones.push(eq(recompensas.activa, true));
    }

    const resultados = await db
      .select()
      .from(recompensas)
      .where(and(...condiciones))
      .orderBy(asc(recompensas.orden), desc(recompensas.createdAt));

    // Transformar a camelCase
    const recompensasFormateadas = resultados.map(r => ({
      id: r.id,
      negocioId: r.negocioId,
      nombre: r.nombre,
      descripcion: r.descripcion,
      puntosRequeridos: r.puntosRequeridos,
      imagenUrl: r.imagenUrl,
      stock: r.stock,
      requiereAprobacion: r.requiereAprobacion,
      activa: r.activa,
      orden: r.orden,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      success: true,
      message: 'Recompensas obtenidas',
      data: recompensasFormateadas,
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener recompensas:', error);
    return {
      success: false,
      message: 'Error al obtener recompensas',
      code: 500,
    };
  }
}

// =============================================================================
// 4. OBTENER RECOMPENSA POR ID
// =============================================================================

export async function obtenerRecompensaPorId(
  id: string,
  negocioId: string
): Promise<RespuestaServicio<Recompensa>> {
  try {
    const [recompensa] = await db
      .select()
      .from(recompensas)
      .where(
        and(
          eq(recompensas.id, id),
          eq(recompensas.negocioId, negocioId)
        )
      )
      .limit(1);

    if (!recompensa) {
      return {
        success: false,
        message: 'Recompensa no encontrada',
        code: 404,
      };
    }

    // Transformar a camelCase
    const recompensaFormateada = {
      id: recompensa.id,
      negocioId: recompensa.negocioId,
      nombre: recompensa.nombre,
      descripcion: recompensa.descripcion,
      puntosRequeridos: recompensa.puntosRequeridos,
      imagenUrl: recompensa.imagenUrl,
      stock: recompensa.stock,
      requiereAprobacion: recompensa.requiereAprobacion,
      activa: recompensa.activa,
      orden: recompensa.orden,
      createdAt: recompensa.createdAt,
      updatedAt: recompensa.updatedAt,
    };

    return {
      success: true,
      message: 'Recompensa obtenida',
      data: recompensaFormateada,
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener recompensa:', error);
    return {
      success: false,
      message: 'Error al obtener recompensa',
      code: 500,
    };
  }
}

// =============================================================================
// 5. CREAR RECOMPENSA
// =============================================================================

/**
 * Crea una nueva recompensa
 * 
 * FLUJO DE IMAGEN:
 * 1. Frontend sube imagen con uploadToCloudinary(file, 'recompensas')
 * 2. Frontend recibe URL de Cloudinary
 * 3. Frontend envía datos.imagenUrl (ya subida)
 * 4. Backend solo guarda la URL en BD
 * 
 * CLEANUP:
 * Si falla la inserción en BD, el frontend debe eliminar la imagen con:
 * await eliminarDeCloudinary(imagenUrl)
 */
export async function crearRecompensa(
  datos: CrearRecompensaInput,
  negocioId: string
): Promise<RespuestaServicio<Recompensa>> {
  try {
    // Insertar en BD (imagen ya está en Cloudinary)
    const [recompensa] = await db
      .insert(recompensas)
      .values({
        negocioId,
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
        puntosRequeridos: datos.puntosRequeridos,
        imagenUrl: datos.imagenUrl || null,
        stock: datos.stock ?? null, // NULL = ilimitado
        requiereAprobacion: datos.requiereAprobacion ?? false,
        activa: datos.activa ?? true,
        orden: datos.orden ?? 0,
      })
      .returning();

    // Transformar a camelCase
    const recompensaFormateada = {
      id: recompensa.id,
      negocioId: recompensa.negocioId,
      nombre: recompensa.nombre,
      descripcion: recompensa.descripcion,
      puntosRequeridos: recompensa.puntosRequeridos,
      imagenUrl: recompensa.imagenUrl,
      stock: recompensa.stock,
      requiereAprobacion: recompensa.requiereAprobacion,
      activa: recompensa.activa,
      orden: recompensa.orden,
      createdAt: recompensa.createdAt,
      updatedAt: recompensa.updatedAt,
    };

    return {
      success: true,
      message: 'Recompensa creada exitosamente',
      data: recompensaFormateada,
      code: 201,
    };
  } catch (error) {
    console.error('Error al crear recompensa:', error);
    return {
      success: false,
      message: 'Error al crear recompensa',
      code: 500,
    };
  }
}

// =============================================================================
// 6. ACTUALIZAR RECOMPENSA (con cleanup Cloudinary)
// =============================================================================

/**
 * Actualiza una recompensa existente
 * 
 * FLUJO DE IMAGEN:
 * - Si datos.imagenUrl viene (nueva imagen):
 *   1. Frontend ya subió nueva imagen a Cloudinary
 *   2. Backend elimina imagen anterior
 *   3. Backend guarda nueva URL
 * 
 * - Si datos.eliminarImagen = true:
 *   1. Backend elimina imagen de Cloudinary
 *   2. Backend pone imagenUrl = null en BD
 */
export async function actualizarRecompensa(
  id: string,
  datos: ActualizarRecompensaInput,
  negocioId: string
): Promise<RespuestaServicio<Recompensa>> {
  try {
    // Obtener recompensa actual
    const [recompensaActual] = await db
      .select()
      .from(recompensas)
      .where(
        and(
          eq(recompensas.id, id),
          eq(recompensas.negocioId, negocioId)
        )
      )
      .limit(1);

    if (!recompensaActual) {
      return {
        success: false,
        message: 'Recompensa no encontrada',
        code: 404,
      };
    }

    const datosActualizar: Partial<{
      nombre: string;
      descripcion: string | null;
      puntosRequeridos: number;
      imagenUrl: string | null;
      stock: number | null; // NULL = ilimitado
      requiereAprobacion: boolean;
      activa: boolean;
      orden: number;
    }> = {};

    // Actualizar campos básicos
    if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
    if (datos.descripcion !== undefined) datosActualizar.descripcion = datos.descripcion;
    if (datos.puntosRequeridos !== undefined) datosActualizar.puntosRequeridos = datos.puntosRequeridos;
    if (datos.stock !== undefined) datosActualizar.stock = datos.stock;
    if (datos.requiereAprobacion !== undefined) datosActualizar.requiereAprobacion = datos.requiereAprobacion;
    if (datos.activa !== undefined) datosActualizar.activa = datos.activa;
    if (datos.orden !== undefined) datosActualizar.orden = datos.orden;

    // Manejo de imagen
    if (datos.eliminarImagen && recompensaActual.imagenUrl) {
      // Eliminar imagen actual de Cloudinary
      await eliminarImagen(recompensaActual.imagenUrl);
      datosActualizar.imagenUrl = null;
    } else if (datos.imagenUrl && datos.imagenUrl !== recompensaActual.imagenUrl) {
      // Nueva imagen (ya subida por frontend)
      datosActualizar.imagenUrl = datos.imagenUrl;

      // Eliminar imagen anterior de Cloudinary
      if (recompensaActual.imagenUrl) {
        await eliminarImagen(recompensaActual.imagenUrl);
      }
    }

    // Actualizar en BD
    const [recompensaActualizada] = await db
      .update(recompensas)
      .set(datosActualizar)
      .where(eq(recompensas.id, id))
      .returning();

    // Transformar a camelCase
    const recompensaFormateada = {
      id: recompensaActualizada.id,
      negocioId: recompensaActualizada.negocioId,
      nombre: recompensaActualizada.nombre,
      descripcion: recompensaActualizada.descripcion,
      puntosRequeridos: recompensaActualizada.puntosRequeridos,
      imagenUrl: recompensaActualizada.imagenUrl,
      stock: recompensaActualizada.stock,
      requiereAprobacion: recompensaActualizada.requiereAprobacion,
      activa: recompensaActualizada.activa,
      orden: recompensaActualizada.orden,
      createdAt: recompensaActualizada.createdAt,
      updatedAt: recompensaActualizada.updatedAt,
    };

    return {
      success: true,
      message: 'Recompensa actualizada exitosamente',
      data: recompensaFormateada,
      code: 200,
    };
  } catch (error) {
    console.error('Error al actualizar recompensa:', error);
    return {
      success: false,
      message: 'Error al actualizar recompensa',
      code: 500,
    };
  }
}

// =============================================================================
// 7. ELIMINAR RECOMPENSA (Soft delete + cleanup Cloudinary)
// =============================================================================

export async function eliminarRecompensa(
  id: string,
  negocioId: string
): Promise<RespuestaServicio> {
  try {
    // Obtener recompensa actual
    const [recompensa] = await db
      .select()
      .from(recompensas)
      .where(
        and(
          eq(recompensas.id, id),
          eq(recompensas.negocioId, negocioId)
        )
      )
      .limit(1);

    if (!recompensa) {
      return {
        success: false,
        message: 'Recompensa no encontrada',
        code: 404,
      };
    }

    // Soft delete (marcar como inactiva)
    await db
      .update(recompensas)
      .set({ activa: false })
      .where(eq(recompensas.id, id));

    // Eliminar imagen de Cloudinary
    if (recompensa.imagenUrl) {
      await eliminarImagen(recompensa.imagenUrl);
    }

    return {
      success: true,
      message: 'Recompensa eliminada exitosamente',
      code: 200,
    };
  } catch (error) {
    console.error('Error al eliminar recompensa:', error);
    return {
      success: false,
      message: 'Error al eliminar recompensa',
      code: 500,
    };
  }
}

// =============================================================================
// 8. OBTENER ESTADÍSTICAS DE PUNTOS (con filtros)
// =============================================================================

export async function obtenerEstadisticasPuntos(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'todo'
): Promise<RespuestaServicio<EstadisticasPuntos>> {
  try {
    // Calcular fechas según periodo
    let fechaInicio: Date;
    const fechaFin = new Date();

    switch (periodo) {
      case 'hoy':
        fechaInicio = startOfDay(new Date());
        break;
      case 'semana':
        fechaInicio = startOfWeek(new Date());
        break;
      case 'mes':
        fechaInicio = startOfMonth(new Date());
        break;
      case '3meses':
        fechaInicio = subMonths(new Date(), 3);
        break;
      case 'anio':
        fechaInicio = startOfYear(new Date());
        break;
      case 'todo':
      default:
        fechaInicio = new Date(0);
    }

    // Condiciones base
    const condicionesTransacciones = [
      eq(puntosTransacciones.negocioId, negocioId),
      notInArray(puntosTransacciones.estado, ['anulado', 'cancelado']),
      gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
      lte(puntosTransacciones.createdAt, fechaFin.toISOString()),
    ];

    const condicionesBilletera = [
      eq(puntosBilletera.negocioId, negocioId),
    ];

    // Filtro por sucursal (solo aplica a transacciones)
    if (sucursalId) {
      condicionesTransacciones.push(eq(puntosTransacciones.sucursalId, sucursalId));
    }

    // NOTA: puntos_billetera NO tiene sucursalId
    // Las billeteras son por usuario+negocio, no por sucursal

    // Query 1: Puntos otorgados (base × multiplicador)
    const [puntosOtorgados] = await db
      .select({ total: sql<number>`COALESCE(SUM(puntos_otorgados * multiplicador_aplicado), 0)` })
      .from(puntosTransacciones)
      .where(and(...condicionesTransacciones));

    // Query 2: Puntos activos (disponibles en billetera)
    const [puntosActivos] = await db
      .select({ total: sql<number>`COALESCE(SUM(puntos_disponibles), 0)` })
      .from(puntosBilletera)
      .where(and(...condicionesBilletera));

    // Canjeados = otorgados - disponibles (lo que ya se gastó)
    const totalOtorgados = Number(puntosOtorgados.total);
    const totalDisponibles = Number(puntosActivos.total);
    const totalCanjeados = Math.max(0, totalOtorgados - totalDisponibles);

    // Query 4: Clientes con puntos
    const [clientesConPuntos] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(puntosBilletera)
      .where(
        and(
          ...condicionesBilletera,
          gt(puntosBilletera.puntosDisponibles, 0)
        )
      );

    return {
      success: true,
      message: 'Estadísticas obtenidas',
      data: {
        puntosOtorgados: totalOtorgados,
        puntosCanjeados: totalCanjeados,
        puntosActivos: totalDisponibles,
        clientesConPuntos: Number(clientesConPuntos.count),
      },
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      success: false,
      message: 'Error al obtener estadísticas',
      code: 500,
    };
  }
}

// =============================================================================
// 8b. OBTENER TOP CLIENTES CON PUNTOS (Módulo Clientes)
// =============================================================================

export async function obtenerTopClientes(
  negocioId: string,
  sucursalId?: string,
  limit: number = 10
): Promise<RespuestaServicio<ClienteConPuntos[]>> {
  try {
    const condicionesBilletera = [eq(puntosBilletera.negocioId, negocioId)];

    // Billeteras son globales por negocio (no tienen sucursalId)
    // Para filtrar por sucursal: buscar clientes que tienen transacciones en esa sucursal
    if (sucursalId) {
      const usuariosSucursal = await db
        .selectDistinct({ usuarioId: puntosTransacciones.clienteId })
        .from(puntosTransacciones)
        .where(
          and(
            eq(puntosTransacciones.negocioId, negocioId),
            eq(puntosTransacciones.sucursalId, sucursalId)
          )
        );

      const usuarioIds = usuariosSucursal.map(u => u.usuarioId);

      if (usuarioIds.length === 0) {
        return { success: true, message: 'Top clientes obtenidos', data: [], code: 200 };
      }

      condicionesBilletera.push(inArray(puntosBilletera.usuarioId, usuarioIds));
    }

    const topClientes = await db
      .select({
        usuarioId: puntosBilletera.usuarioId,
        nombre: sql<string>`CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellidos})`,
        avatarUrl: usuarios.avatarUrl,
        puntosDisponibles: puntosBilletera.puntosDisponibles,
      })
      .from(puntosBilletera)
      .innerJoin(usuarios, eq(puntosBilletera.usuarioId, usuarios.id))
      .where(
        and(
          ...condicionesBilletera,
          gt(puntosBilletera.puntosDisponibles, 0)
        )
      )
      .orderBy(desc(puntosBilletera.puntosDisponibles))
      .limit(limit);

    return {
      success: true,
      message: 'Top clientes obtenidos',
      data: topClientes.map(c => ({
        usuarioId: c.usuarioId,
        nombre: c.nombre,
        avatarUrl: c.avatarUrl,
        puntosDisponibles: c.puntosDisponibles,
      })),
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener top clientes:', error);
    return {
      success: false,
      message: 'Error al obtener top clientes',
      code: 500,
    };
  }
}

// =============================================================================
// 9. OBTENER HISTORIAL DE TRANSACCIONES (con JOINs)
// =============================================================================

export async function obtenerHistorialTransacciones(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'todo',
  limit: number = 50,
  offset: number = 0
): Promise<RespuestaServicio<TransaccionPuntos[]>> {
  try {
    const condiciones = [eq(puntosTransacciones.negocioId, negocioId)];

    if (sucursalId) {
      condiciones.push(eq(puntosTransacciones.sucursalId, sucursalId));
    }

    // Filtro por periodo (fecha)
    let fechaInicio: Date;
    switch (periodo) {
      case 'hoy':
        fechaInicio = startOfDay(new Date());
        break;
      case 'semana':
        fechaInicio = startOfWeek(new Date());
        break;
      case 'mes':
        fechaInicio = startOfMonth(new Date());
        break;
      case '3meses':
        fechaInicio = subMonths(new Date(), 3);
        break;
      case 'anio':
        fechaInicio = startOfYear(new Date());
        break;
      case 'todo':
      default:
        fechaInicio = new Date(0); // Desde el inicio de los tiempos
        break;
    }

    condiciones.push(gte(puntosTransacciones.createdAt, fechaInicio.toISOString()));

    const transacciones = await db
      .select({
        id: puntosTransacciones.id,
        clienteId: puntosTransacciones.clienteId,
        clienteNombre: sql<string>`CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellidos})`,
        clienteTelefono: usuarios.telefono,
        clienteAvatarUrl: usuarios.avatarUrl,
        montoCompra: puntosTransacciones.montoCompra,
        puntosOtorgados: puntosTransacciones.puntosOtorgados,
        multiplicadorAplicado: puntosTransacciones.multiplicadorAplicado,
        estado: puntosTransacciones.estado,
        createdAt: puntosTransacciones.createdAt,
        sucursalId: puntosTransacciones.sucursalId,
        sucursalNombre: negocioSucursales.nombre,
        empleadoId: puntosTransacciones.empleadoId,
        // COALESCE: Si es empleado → nombre empleado, sino → nombre usuario (gerente/dueño)
        empleadoNombre: sql<string>`COALESCE(
          ${empleados.nombre},
          CONCAT(${sql.raw('u2.nombre')}, ' ', ${sql.raw('u2.apellidos')})
        )`,
        empleadoTipo: sql<string>`CASE 
          WHEN ${empleados.id} IS NOT NULL THEN 'empleado'
          WHEN ${sql.raw('u2.id')} IS NOT NULL THEN 'usuario'
          ELSE NULL
        END`,
      })
      .from(puntosTransacciones)
      .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id))
      .leftJoin(negocioSucursales, eq(puntosTransacciones.sucursalId, negocioSucursales.id))
      .leftJoin(empleados, eq(puntosTransacciones.empleadoId, empleados.id))
      // JOIN adicional para gerentes/dueños (usuarios que registraron la venta)
      .leftJoin(
        sql`usuarios u2`,
        sql`${puntosTransacciones.empleadoId} = u2.id`
      )
      .where(and(...condiciones))
      .orderBy(desc(puntosTransacciones.createdAt))
      .limit(limit)
      .offset(offset);

    // Transformar a camelCase
    const transaccionesFormateadas = transacciones.map(t => ({
      id: t.id,
      clienteId: t.clienteId,
      clienteNombre: t.clienteNombre,
      clienteTelefono: t.clienteTelefono,
      clienteAvatarUrl: t.clienteAvatarUrl,
      montoCompra: Number(t.montoCompra),
      puntosOtorgados: t.puntosOtorgados,
      multiplicadorAplicado: Number(t.multiplicadorAplicado),
      estado: t.estado,
      createdAt: t.createdAt,
      sucursalId: t.sucursalId,
      sucursalNombre: t.sucursalNombre,
      empleadoId: t.empleadoId,
      empleadoNombre: t.empleadoNombre,
      empleadoTipo: t.empleadoTipo as 'empleado' | 'usuario' | null, // empleado, usuario (gerente/dueño), o null
    }));

    return {
      success: true,
      message: 'Historial obtenido',
      data: transaccionesFormateadas,
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return {
      success: false,
      message: 'Error al obtener historial',
      code: 500,
    };
  }
}

// =============================================================================
// 10. REVOCAR TRANSACCIÓN
// =============================================================================

export async function revocarTransaccion(
  transaccionId: string,
  negocioId: string,
  sucursalId?: string // Para gerentes: validar que sea de su sucursal
): Promise<RespuestaServicio> {
  try {
    // Paso 1: Obtener transacción
    const [transaccion] = await db
      .select()
      .from(puntosTransacciones)
      .where(
        and(
          eq(puntosTransacciones.id, transaccionId),
          eq(puntosTransacciones.negocioId, negocioId)
        )
      )
      .limit(1);

    if (!transaccion) {
      return {
        success: false,
        message: 'Transacción no encontrada',
        code: 404,
      };
    }

    // Validar sucursal (para gerentes)
    if (sucursalId && transaccion.sucursalId !== sucursalId) {
      return {
        success: false,
        message: 'No tienes permiso para revocar esta transacción. Solo puedes revocar transacciones de tu sucursal.',
        code: 403,
      };
    }

    // Paso 2: Validar estado
    if (!['confirmado', 'pendiente'].includes(transaccion.estado)) {
      return {
        success: false,
        message: 'Esta transacción ya fue cancelada o rechazada',
        code: 400,
      };
    }

    // Paso 3: Verificar saldo del cliente
    const [billetera] = await db
      .select({ puntosDisponibles: puntosBilletera.puntosDisponibles })
      .from(puntosBilletera)
      .where(eq(puntosBilletera.id, transaccion.billeteraId))
      .limit(1);

    if (!billetera || billetera.puntosDisponibles < transaccion.puntosOtorgados) {
      return {
        success: false,
        message: 'El cliente no tiene suficientes puntos disponibles',
        code: 400,
      };
    }

    // Paso 4: Ejecutar revocación en transacción DB
    await db.transaction(async (tx) => {
      // Cancelar transacción
      await tx
        .update(puntosTransacciones)
        .set({ estado: 'cancelado' })
        .where(eq(puntosTransacciones.id, transaccionId));

      // Restar puntos de billetera
      await tx
        .update(puntosBilletera)
        .set({
          puntosDisponibles: sql`puntos_disponibles - ${transaccion.puntosOtorgados}`,
        })
        .where(eq(puntosBilletera.id, transaccion.billeteraId));
    });

    return {
      success: true,
      message: `Transacción revocada. Se restaron ${transaccion.puntosOtorgados} puntos`,
      code: 200,
    };
  } catch (error) {
    console.error('Error al revocar transacción:', error);
    return {
      success: false,
      message: 'Error al revocar transacción',
      code: 500,
    };
  }
}



// =============================================================================
// 11. SISTEMA DE EXPIRACIONES
// =============================================================================

/**
 * Obtiene el fin del dia (23:59:59) en la zona horaria del negocio.
 * Convierte ultima_actividad UTC a fecha local, suma dias, retorna fin del dia en UTC.
 *
 * Ejemplo: ultima_actividad = "2026-01-27 21:38:53 UTC", zona = "America/Hermosillo" (UTC-7)
 *   -> Fecha local: 2026-01-27 14:38 (2:38 PM)
 *   -> + 9 dias = 2026-02-05
 *   -> Fin del dia local: 2026-02-05 23:59:59 Hermosillo = 2026-02-06 06:59:59 UTC
 */
function calcularFinDiaExpiracion(
  fechaUTC: string,
  diasExpiracion: number,
  zonaHoraria: string
): Date {
  const fechaLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(fechaUTC));

  const [anio, mes, dia] = fechaLocal.split('-').map(Number);
  const fechaExp = new Date(Date.UTC(anio, mes - 1, dia + diasExpiracion));
  const anioExp = fechaExp.getUTCFullYear();
  const mesExp = String(fechaExp.getUTCMonth() + 1).padStart(2, '0');
  const diaExp = String(fechaExp.getUTCDate()).padStart(2, '0');

  const refDate = new Date(`${anioExp}-${mesExp}-${diaExp}T12:00:00Z`);
  const utcStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(refDate);
  const localStr = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(refDate);

  const parseMMDDYYYY = (s: string) => {
    const [datePart, timePart] = s.split(', ');
    const [m, d, y] = datePart.split('/').map(Number);
    const [h, min, sec] = timePart.split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, h, min, sec));
  };

  const utcParsed = parseMMDDYYYY(utcStr);
  const localParsed = parseMMDDYYYY(localStr);
  const offsetMs = localParsed.getTime() - utcParsed.getTime();

  const finDiaLocal = new Date(Date.UTC(
    Number(anioExp), Number(mesExp) - 1, Number(diaExp), 23, 59, 59, 999
  ));
  const finDiaUTC = new Date(finDiaLocal.getTime() - offsetMs);

  return finDiaUTC;
}

/**
 * Obtiene la zona horaria de la sucursal principal de un negocio.
 */
async function obtenerZonaHorariaNegocio(negocioId: string): Promise<string> {
  const [sucursal] = await db
    .select({ zonaHoraria: negocioSucursales.zonaHoraria })
    .from(negocioSucursales)
    .where(
      and(
        eq(negocioSucursales.negocioId, negocioId),
        eq(negocioSucursales.esPrincipal, true)
      )
    )
    .limit(1);

  return sucursal?.zonaHoraria || 'America/Mexico_City';
}

// -----------------------------------------------------------------------------
// 11a. EXPIRAR VOUCHERS VENCIDOS (masivo por negocio)
// -----------------------------------------------------------------------------

/**
 * Expira TODOS los vouchers vencidos de un negocio y devuelve puntos.
 * Reutilizable desde cualquier endpoint que toque vouchers:
 * - ScanYA: al abrir seccion de vouchers, al buscar cliente
 * - CardYA: al consultar vouchers del cliente (futuro)
 * - Business Studio: al ver reporte de vouchers (futuro)
 *
 * @param negocioId - ID del negocio
 * @returns Cantidad de vouchers expirados y puntos devueltos
 */
export async function expirarVouchersVencidos(
  negocioId: string
): Promise<{ vouchersExpirados: number; puntosDevueltos: number }> {
  let vouchersExpirados = 0;
  let puntosDevueltos = 0;

  try {
    const ahora = new Date();

    const vouchersVencidos = await db
      .select({
        id: vouchersCanje.id,
        puntosUsados: vouchersCanje.puntosUsados,
        billeteraId: vouchersCanje.billeteraId,
        usuarioId: vouchersCanje.usuarioId,
      })
      .from(vouchersCanje)
      .where(
        and(
          eq(vouchersCanje.negocioId, negocioId),
          eq(vouchersCanje.estado, 'pendiente'),
          lt(vouchersCanje.expiraAt, ahora.toISOString())
        )
      );

    for (const voucher of vouchersVencidos) {
      await db
        .update(vouchersCanje)
        .set({ estado: 'expirado' })
        .where(eq(vouchersCanje.id, voucher.id));

      await db
        .update(puntosBilletera)
        .set({
          puntosDisponibles: sql`puntos_disponibles + ${voucher.puntosUsados}`,
        })
        .where(eq(puntosBilletera.id, voucher.billeteraId));

      vouchersExpirados++;
      puntosDevueltos += voucher.puntosUsados;

      console.log(`[Expiracion] Voucher ${voucher.id} expirado. Devueltos ${voucher.puntosUsados} pts al usuario ${voucher.usuarioId}`);
    }

  } catch (error) {
    console.error('[Expiracion] Error al expirar vouchers del negocio:', error);
  }

  return { vouchersExpirados, puntosDevueltos };
}

// -----------------------------------------------------------------------------
// 11b. EXPIRAR PUNTOS POR INACTIVIDAD (por usuario individual)
// -----------------------------------------------------------------------------

/**
 * Verifica si los puntos de un cliente expiraron por inactividad.
 * Expiran al final del dia local del negocio (23:59:59 zona del negocio)
 * tras X dias sin actividad (compras ni canjes).
 *
 * @param usuarioId - ID del cliente
 * @param negocioId - ID del negocio
 */
export async function expirarPuntosPorInactividad(
  usuarioId: string,
  negocioId: string
): Promise<void> {
  try {
    const [config] = await db
      .select({
        diasExpiracionPuntos: puntosConfiguracion.diasExpiracionPuntos,
      })
      .from(puntosConfiguracion)
      .where(eq(puntosConfiguracion.negocioId, negocioId))
      .limit(1);

    if (!config || config.diasExpiracionPuntos === null) return;

    const [billetera] = await db
      .select({
        id: puntosBilletera.id,
        puntosDisponibles: puntosBilletera.puntosDisponibles,
        puntosExpiradosTotal: puntosBilletera.puntosExpiradosTotal,
        ultimaActividad: puntosBilletera.ultimaActividad,
      })
      .from(puntosBilletera)
      .where(
        and(
          eq(puntosBilletera.usuarioId, usuarioId),
          eq(puntosBilletera.negocioId, negocioId)
        )
      )
      .limit(1);

    if (!billetera || billetera.puntosDisponibles <= 0 || !billetera.ultimaActividad) return;

    const zonaHoraria = await obtenerZonaHorariaNegocio(negocioId);

    const finDiaExpiracion = calcularFinDiaExpiracion(
      billetera.ultimaActividad,
      config.diasExpiracionPuntos,
      zonaHoraria
    );

    if (new Date() > finDiaExpiracion) {
      await db
        .update(puntosBilletera)
        .set({
          puntosDisponibles: 0,
          puntosExpiradosTotal: (billetera.puntosExpiradosTotal || 0) + billetera.puntosDisponibles,
        })
        .where(eq(puntosBilletera.id, billetera.id));

      console.log(`[Expiracion] Puntos expirados: ${billetera.puntosDisponibles} pts del usuario ${usuarioId} en negocio ${negocioId} (zona: ${zonaHoraria})`);
    }

  } catch (error) {
    console.error('[Expiracion] Error al verificar puntos por inactividad:', error);
  }
}

// -----------------------------------------------------------------------------
// 11c. VERIFICAR EXPIRACIONES (combina ambas - para endpoints de cliente)
// -----------------------------------------------------------------------------

/**
 * Ejecuta ambas verificaciones para un cliente especifico.
 * Usar en endpoints que consultan datos de un cliente individual:
 * - identificarCliente (ScanYA)
 * - buscarClienteConVouchers (ScanYA)
 * - consultarBilletera (CardYA futuro)
 *
 * @param usuarioId - ID del cliente
 * @param negocioId - ID del negocio
 */
export async function verificarExpiraciones(
  usuarioId: string,
  negocioId: string
): Promise<void> {
  await expirarVouchersVencidos(negocioId);
  await expirarPuntosPorInactividad(usuarioId, negocioId);
}