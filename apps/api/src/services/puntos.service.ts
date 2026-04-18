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
  recompensaProgreso,
  puntosTransacciones,
  puntosBilletera,
  usuarios,
  empleados,
  negocioSucursales,
  vouchersCanje,
  negocios,
  scanyaTurnos,
  notificaciones,
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
import { generarPresignedUrl, eliminarArchivo } from './r2.service.js';
import { eliminarImagenSiHuerfana } from './negocioManagement.service.js';
import { startOfDay, subDays, subMonths, subYears } from 'date-fns';
import { crearNotificacion, eliminarNotificacionesPorReferencia, obtenerSucursalPrincipal } from './notificaciones.service.js';

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
      // Crear nueva configuración con TODOS los campos requeridos
      await db
        .insert(puntosConfiguracion)
        .values({
          negocioId,
          // Campos enviados por el usuario O defaults
          puntosPorPeso: datosDB.puntosPorPeso ?? CONFIG_DEFAULTS.puntosPorPeso.toString(),
          pesosOriginales: datosDB.pesosOriginales ?? null,
          puntosOriginales: datosDB.puntosOriginales ?? null,
          minimoCompra: '0',                // Sin mínimo de compra
          diasExpiracionPuntos: datosDB.diasExpiracionPuntos ?? CONFIG_DEFAULTS.diasExpiracionPuntos,
          diasExpiracionVoucher: datosDB.diasExpiracionVoucher ?? CONFIG_DEFAULTS.diasExpiracionVoucher,
          validarHorario: true,             // Validar horario por default
          horarioInicio: '09:00:00',        // 9 AM
          horarioFin: '22:00:00',           // 10 PM
          activo: datosDB.activo ?? CONFIG_DEFAULTS.activo,
          nivelesActivos: datosDB.nivelesActivos ?? CONFIG_DEFAULTS.nivelesActivos,
          // Nivel Bronce
          nivelBronceMin: datosDB.nivelBronceMin ?? CONFIG_DEFAULTS.nivelBronce.min,
          nivelBronceMax: datosDB.nivelBronceMax ?? CONFIG_DEFAULTS.nivelBronce.max,
          nivelBronceMultiplicador: datosDB.nivelBronceMultiplicador ?? CONFIG_DEFAULTS.nivelBronce.multiplicador.toString(),
          nivelBronceNombre: null,          // Nombres personalizados opcionales
          // Nivel Plata
          nivelPlataMin: datosDB.nivelPlataMin ?? CONFIG_DEFAULTS.nivelPlata.min,
          nivelPlataMax: datosDB.nivelPlataMax ?? CONFIG_DEFAULTS.nivelPlata.max,
          nivelPlataMultiplicador: datosDB.nivelPlataMultiplicador ?? CONFIG_DEFAULTS.nivelPlata.multiplicador.toString(),
          nivelPlataNombre: null,
          // Nivel Oro
          nivelOroMin: datosDB.nivelOroMin ?? CONFIG_DEFAULTS.nivelOro.min,
          nivelOroMultiplicador: datosDB.nivelOroMultiplicador ?? CONFIG_DEFAULTS.nivelOro.multiplicador.toString(),
          nivelOroNombre: null,
        });
    }

    // ── Notificar clientes si nivelesActivos cambió ─────────────────────
    const nivelesAntes = configExistente?.nivelesActivos ?? true;
    const nivelesDespues = datosDB.nivelesActivos;
    if (nivelesDespues !== undefined && nivelesDespues !== nivelesAntes) {
      const [negocioInfo] = await db
        .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
        .from(negocios)
        .where(eq(negocios.id, negocioId))
        .limit(1);

      const billeteras = await db
        .select({ usuarioId: puntosBilletera.usuarioId })
        .from(puntosBilletera)
        .where(eq(puntosBilletera.negocioId, negocioId));

      if (billeteras.length > 0) {
        const titulo = nivelesDespues
          ? 'Sistema de niveles activado'
          : 'Sistema de niveles desactivado';
        const mensaje = nivelesDespues
          ? 'Ahora puedes subir de nivel y ganar puntos más rápido. ¡Acumula puntos para desbloquear mejores beneficios!'
          : 'Tus puntos siguen acumulándose con normalidad. Los bonos por nivel (Bronce, Plata, Oro) ya no están activos por el momento.';

        // Enviar en background para no bloquear la respuesta
        Promise.all(
          billeteras.map((b) =>
            crearNotificacion({
              usuarioId: b.usuarioId,
              modo: 'personal',
              tipo: 'sistema',
              titulo,
              mensaje,
              negocioId,
              actorImagenUrl: negocioInfo?.logoUrl ?? undefined,
              actorNombre: negocioInfo?.nombre ?? undefined,
            })
          )
        ).catch((err) => console.error('Error al notificar cambio de niveles:', err));
      }
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
      .select({
        id: recompensas.id,
        negocioId: recompensas.negocioId,
        nombre: recompensas.nombre,
        descripcion: recompensas.descripcion,
        puntosRequeridos: recompensas.puntosRequeridos,
        imagenUrl: recompensas.imagenUrl,
        stock: recompensas.stock,
        requiereAprobacion: recompensas.requiereAprobacion,
        activa: recompensas.activa,
        orden: recompensas.orden,
        tipo: recompensas.tipo,
        numeroComprasRequeridas: recompensas.numeroComprasRequeridas,
        requierePuntos: recompensas.requierePuntos,
        createdAt: recompensas.createdAt,
        updatedAt: recompensas.updatedAt,
        canjesRealizados: sql<number>`(SELECT COUNT(*)::int FROM vouchers_canje vc WHERE vc.recompensa_id = "recompensas"."id")`,
        clientesActivos: sql<number>`(SELECT COUNT(DISTINCT rp.usuario_id)::int FROM recompensa_progreso rp WHERE rp.recompensa_id = "recompensas"."id" AND rp.compras_acumuladas > 0 AND rp.canjeada = false)`,
        desbloqueos: sql<number>`(SELECT COUNT(*)::int FROM recompensa_progreso rp WHERE rp.recompensa_id = "recompensas"."id" AND rp.desbloqueada = true)`,
      })
      .from(recompensas)
      .where(and(...condiciones))
      .orderBy(asc(recompensas.orden), desc(recompensas.createdAt));

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
      tipo: r.tipo ?? 'basica',
      numeroComprasRequeridas: r.numeroComprasRequeridas,
      requierePuntos: r.requierePuntos ?? true,
      canjesRealizados: r.canjesRealizados ?? 0,
      clientesActivos: r.clientesActivos ?? 0,
      desbloqueos: r.desbloqueos ?? 0,
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

    const [conteoCanjes] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(vouchersCanje)
      .where(eq(vouchersCanje.recompensaId, id));

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
      tipo: recompensa.tipo ?? 'basica',
      numeroComprasRequeridas: recompensa.numeroComprasRequeridas,
      requierePuntos: recompensa.requierePuntos ?? true,
      canjesRealizados: conteoCanjes?.total ?? 0,
      clientesActivos: 0,
      desbloqueos: 0,
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
        tipo: datos.tipo || 'basica',
        numeroComprasRequeridas: datos.numeroComprasRequeridas || null,
        requierePuntos: datos.requierePuntos ?? true,
      })
      .returning();

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
      tipo: recompensa.tipo ?? 'basica',
      numeroComprasRequeridas: recompensa.numeroComprasRequeridas,
      requierePuntos: recompensa.requierePuntos ?? true,
      canjesRealizados: 0,
      clientesActivos: 0,
      desbloqueos: 0,
      createdAt: recompensa.createdAt,
      updatedAt: recompensa.updatedAt,
    };

    // Notificar a todos los clientes con billetera en este negocio
    if (recompensa.activa) {
      const clientesConBilletera = await db
        .select({ usuarioId: puntosBilletera.usuarioId })
        .from(puntosBilletera)
        .where(eq(puntosBilletera.negocioId, negocioId));

      const [negocioInfo] = await db
        .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
        .from(negocios)
        .where(eq(negocios.id, negocioId))
        .limit(1);

      const sucursalPrincipalId = await obtenerSucursalPrincipal(negocioId);

      for (const cliente of clientesConBilletera) {
        crearNotificacion({
          usuarioId: cliente.usuarioId,
          modo: 'personal',
          tipo: 'nueva_recompensa',
          titulo: '¡Nueva recompensa disponible!',
          mensaje: `${recompensa.nombre} (${recompensa.puntosRequeridos} pts)\n${negocioInfo?.nombre ?? 'un negocio'}`,
          negocioId,
          sucursalId: sucursalPrincipalId ?? undefined,
          referenciaId: recompensa.id,
          referenciaTipo: 'recompensa',
          icono: '🎁',
          actorImagenUrl: negocioInfo?.logoUrl ?? recompensa.imagenUrl ?? undefined,
          actorNombre: negocioInfo?.nombre ?? undefined,
        }).catch((err) => console.error('Error notificación nueva recompensa:', err));
      }
    }

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
      stock: number | null;
      requiereAprobacion: boolean;
      activa: boolean;
      orden: number;
      tipo: string;
      numeroComprasRequeridas: number | null;
      requierePuntos: boolean;
    }> = {};

    // Actualizar campos básicos
    if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
    if (datos.descripcion !== undefined) datosActualizar.descripcion = datos.descripcion;
    if (datos.puntosRequeridos !== undefined) datosActualizar.puntosRequeridos = datos.puntosRequeridos;
    if (datos.stock !== undefined) datosActualizar.stock = datos.stock;
    if (datos.requiereAprobacion !== undefined) datosActualizar.requiereAprobacion = datos.requiereAprobacion;
    if (datos.activa !== undefined) datosActualizar.activa = datos.activa;
    if (datos.orden !== undefined) datosActualizar.orden = datos.orden;
    if (datos.tipo !== undefined) datosActualizar.tipo = datos.tipo;
    if (datos.numeroComprasRequeridas !== undefined) datosActualizar.numeroComprasRequeridas = datos.numeroComprasRequeridas;
    if (datos.requierePuntos !== undefined) datosActualizar.requierePuntos = datos.requierePuntos;

    // Manejo de imagen.
    // Nota: se usa `eliminarImagenSiHuerfana` en vez de `eliminarArchivo` directo
    // para hacer reference-count contra TODAS las tablas que pueden referenciar
    // la misma URL (sucursales, artículos, negocios, galería, ofertas, recompensas).
    // Evita romper otras entidades que compartan la URL por fallback del clonado.
    const urlAnterior = recompensaActual.imagenUrl;
    let limpiarUrlAnterior = false;

    if (datos.eliminarImagen && urlAnterior) {
      datosActualizar.imagenUrl = null;
      limpiarUrlAnterior = true;
    } else if (datos.imagenUrl && datos.imagenUrl !== urlAnterior) {
      datosActualizar.imagenUrl = datos.imagenUrl;
      if (urlAnterior) limpiarUrlAnterior = true;
    }

    // La limpieza de la URL anterior se hace DESPUÉS del UPDATE para que el
    // reference-count no cuente la fila que acabamos de actualizar
    // (declaración aquí por alcance — la ejecución está más abajo).
    const _urlAnteriorParaLimpiar = limpiarUrlAnterior ? urlAnterior : null;

    // Actualizar en BD
    const [recompensaActualizada] = await db
      .update(recompensas)
      .set(datosActualizar)
      .where(eq(recompensas.id, id))
      .returning();

    // Limpiar imagen anterior con reference-count (ver nota arriba).
    if (_urlAnteriorParaLimpiar) {
      eliminarImagenSiHuerfana(_urlAnteriorParaLimpiar).catch(err =>
        console.error('No se pudo limpiar imagen anterior de recompensa:', err)
      );
    }

    // Transformar a camelCase
    // Contar canjes
    const [conteoCanjes] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(vouchersCanje)
      .where(eq(vouchersCanje.recompensaId, id));

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
      tipo: recompensaActualizada.tipo ?? 'basica',
      numeroComprasRequeridas: recompensaActualizada.numeroComprasRequeridas,
      requierePuntos: recompensaActualizada.requierePuntos ?? true,
      canjesRealizados: conteoCanjes?.total ?? 0,
      clientesActivos: 0,
      desbloqueos: 0,
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

    // Limpiar notificaciones que referencian esta recompensa
    await db.delete(notificaciones).where(
      and(
        eq(notificaciones.referenciaId, id),
        eq(notificaciones.referenciaTipo, 'recompensa')
      )
    );

    // Hard delete — la confirmación del frontend ya advierte que no se puede deshacer
    await db
      .delete(recompensas)
      .where(eq(recompensas.id, id));

    // Eliminar imagen con reference-count (evita romper otras entidades que
    // compartan la URL por fallback del clonado).
    if (recompensa.imagenUrl) {
      eliminarImagenSiHuerfana(recompensa.imagenUrl).catch(err =>
        console.error('Error eliminando imagen de recompensa:', err)
      );
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
// 7.1 GENERAR PRESIGNED URL PARA IMAGEN DE RECOMPENSA (R2)
// =============================================================================

export async function generarUrlUploadImagenRecompensa(nombreArchivo: string, contentType: string) {
    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return generarPresignedUrl('recompensas', nombreArchivo, contentType, 300, TIPOS_PERMITIDOS);
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
        fechaInicio = startOfDay(subDays(new Date(), 7));
        break;
      case 'mes':
        fechaInicio = startOfDay(subDays(new Date(), 30));
        break;
      case '3meses':
        fechaInicio = startOfDay(subMonths(new Date(), 3));
        break;
      case 'anio':
        fechaInicio = startOfDay(subYears(new Date(), 1));
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
  offset: number = 0,
  busqueda?: string,
  operadorId?: string,
  estado?: string,
  filtroCupon?: 'todos' | 'con_cupon' | 'sin_cupon'
): Promise<RespuestaServicio<{ historial: TransaccionPuntos[], total: number }>> {
  try {
    const condiciones = [eq(puntosTransacciones.negocioId, negocioId)];

    if (sucursalId) {
      condiciones.push(eq(puntosTransacciones.sucursalId, sucursalId));
    }

    // Filtro por estado
    if (estado) {
      condiciones.push(eq(puntosTransacciones.estado, estado));
    }

    // Filtro por periodo (fecha)
    let fechaInicio: Date;
    switch (periodo) {
      case 'hoy':
        fechaInicio = startOfDay(new Date());
        break;
      case 'semana':
        fechaInicio = startOfDay(subDays(new Date(), 7));
        break;
      case 'mes':
        fechaInicio = startOfDay(subDays(new Date(), 30));
        break;
      case '3meses':
        fechaInicio = startOfDay(subMonths(new Date(), 3));
        break;
      case 'anio':
        fechaInicio = startOfDay(subYears(new Date(), 1));
        break;
      case 'todo':
      default:
        fechaInicio = new Date(0);
        break;
    }

    condiciones.push(gte(puntosTransacciones.createdAt, fechaInicio.toISOString()));

    // Filtro por operador (empleado o dueño/gerente que registró la venta)
    if (operadorId) {
      condiciones.push(
        sql`(${scanyaTurnos.empleadoId} = ${operadorId} OR ${scanyaTurnos.usuarioId} = ${operadorId})`
      );
    }

    // Filtro por cupón
    if (filtroCupon === 'con_cupon') {
      condiciones.push(sql`${puntosTransacciones.ofertaUsoId} IS NOT NULL`);
    } else if (filtroCupon === 'sin_cupon') {
      condiciones.push(sql`${puntosTransacciones.ofertaUsoId} IS NULL`);
    }

    // Filtro por búsqueda (nombre o teléfono del cliente)
    // Se aplica en el WHERE después del JOIN con usuarios
    const busquedaNormalizada = busqueda?.trim().toLowerCase();

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
        concepto: puntosTransacciones.concepto,
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
        montoEfectivo: puntosTransacciones.montoEfectivo,
        montoTarjeta: puntosTransacciones.montoTarjeta,
        montoTransferencia: puntosTransacciones.montoTransferencia,
        fotoTicketUrl: puntosTransacciones.fotoTicketUrl,
        nota: puntosTransacciones.nota,
        numeroOrden: puntosTransacciones.numeroOrden,
        motivoRevocacion: puntosTransacciones.motivoRevocacion,
        // Cupón
        ofertaUsoId: puntosTransacciones.ofertaUsoId,
        cuponTitulo: sql<string>`oferta_ref.titulo`,
        cuponTipo: sql<string>`oferta_ref.tipo`,
        cuponValor: sql<string>`oferta_ref.valor`,
        cuponImagen: sql<string>`oferta_ref.imagen`,
        cuponDescuento: sql<string>`ou_ref.descuento_aplicado`,
      })
      .from(puntosTransacciones)
      .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id))
      .leftJoin(negocioSucursales, eq(puntosTransacciones.sucursalId, negocioSucursales.id))
      .leftJoin(empleados, eq(puntosTransacciones.empleadoId, empleados.id))
      // JOIN a través del turno para obtener el dueño/gerente que registró la venta
      .leftJoin(scanyaTurnos, eq(puntosTransacciones.turnoId, scanyaTurnos.id))
      .leftJoin(
        sql`usuarios u2`,
        sql`${scanyaTurnos.usuarioId} = u2.id`
      )
      // JOIN para datos del cupón
      .leftJoin(
        sql`oferta_usos ou_ref`,
        sql`ou_ref.id = ${puntosTransacciones.ofertaUsoId}`
      )
      .leftJoin(
        sql`ofertas oferta_ref`,
        sql`oferta_ref.id = ou_ref.oferta_id`
      )
      .where(
        busquedaNormalizada
          ? and(
            ...condiciones,
            sql`(
                LOWER(CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellidos})) LIKE ${`%${busquedaNormalizada}%`}
                OR LOWER(${usuarios.telefono}) LIKE ${`%${busquedaNormalizada}%`}
              )`
          )
          : and(...condiciones)
      )
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
      concepto: t.concepto || null,
      createdAt: t.createdAt,
      sucursalId: t.sucursalId,
      sucursalNombre: t.sucursalNombre,
      empleadoId: t.empleadoId,
      empleadoNombre: t.empleadoNombre,
      empleadoTipo: t.empleadoTipo as 'empleado' | 'usuario' | null,
      montoEfectivo: Number(t.montoEfectivo || 0),
      montoTarjeta: Number(t.montoTarjeta || 0),
      montoTransferencia: Number(t.montoTransferencia || 0),
      fotoTicketUrl: t.fotoTicketUrl || null,
      nota: t.nota || null,
      numeroOrden: t.numeroOrden || null,
      motivoRevocacion: t.motivoRevocacion || null,
      // Cupón
      cuponTitulo: t.cuponTitulo || null,
      cuponTipo: t.cuponTipo || null,
      cuponValor: t.cuponValor || null,
      cuponImagen: t.cuponImagen || null,
      cuponDescuento: t.cuponDescuento ? Number(t.cuponDescuento) : null,
    }));

    // Contar total de registros (mismas condiciones, sin limit/offset)
    const condicionesCount = [...condiciones];
    if (busquedaNormalizada) {
      condicionesCount.push(
        sql`(
          LOWER(CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellidos})) LIKE ${`%${busquedaNormalizada}%`}
          OR LOWER(${usuarios.telefono}) LIKE ${`%${busquedaNormalizada}%`}
        )`
      );
    }

    let countQuery = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(puntosTransacciones)
      .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id));

    // Si filtramos por operador, necesitamos el JOIN con turnos
    if (operadorId) {
      countQuery = countQuery.leftJoin(scanyaTurnos, eq(puntosTransacciones.turnoId, scanyaTurnos.id)) as typeof countQuery;
    }

    const [conteo] = await countQuery.where(and(...condicionesCount));

    return {
      success: true,
      message: 'Historial obtenido',
      data: {
        historial: transaccionesFormateadas,
        total: Number(conteo.total),
      },
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
  sucursalId?: string, // Para gerentes: validar que sea de su sucursal
  motivo?: string,     // Motivo obligatorio al revocar
  revocadoPor?: string // UUID del usuario que revoca
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
      // Cancelar transacción con datos de revocación
      await tx
        .update(puntosTransacciones)
        .set({
          estado: 'cancelado',
          motivoRevocacion: motivo || null,
          revocadoPor: revocadoPor || null,
          revocadoAt: new Date().toISOString(),
        })
        .where(eq(puntosTransacciones.id, transaccionId));

      // Restar puntos de billetera
      await tx
        .update(puntosBilletera)
        .set({
          puntosDisponibles: sql`puntos_disponibles - ${transaccion.puntosOtorgados}`,
          puntosAcumuladosTotal: sql`puntos_acumulados_total - ${transaccion.puntosOtorgados}`,
        })
        .where(eq(puntosBilletera.id, transaccion.billeteraId));

      // Decrementar sello de tarjeta si la transacción tenía uno
      if (transaccion.recompensaSellosId) {
        await tx
          .update(recompensaProgreso)
          .set({
            comprasAcumuladas: sql`GREATEST(compras_acumuladas - 1, 0)`,
            desbloqueada: false,
            desbloqueadaAt: null,
          })
          .where(
            and(
              eq(recompensaProgreso.usuarioId, transaccion.clienteId),
              eq(recompensaProgreso.recompensaId, transaccion.recompensaSellosId)
            )
          );
      }

      // Limpiar notificaciones de esta transacción
      await tx.delete(notificaciones).where(
        and(
          eq(notificaciones.referenciaId, transaccionId),
          eq(notificaciones.referenciaTipo, 'transaccion')
        )
      );
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

      // Limpiar notificaciones "voucher_pendiente" que ya no aplican —
      // el voucher nunca se canjeó y ahora está expirado. Sin esto, las
      // notificaciones quedan en el panel del dueño/gerentes apuntando a
      // vouchers que ya no se pueden entregar.
      // El helper también emite `notificacion:eliminada` por socket a los
      // usuarios afectados para actualizar el panel en vivo.
      await eliminarNotificacionesPorReferencia({
        tipo: 'voucher_pendiente',
        referenciaTipo: 'voucher',
        referenciaId: voucher.id,
      });

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

// =============================================================================
// 13. OBTENER OPERADORES (para filtro dropdown en Transacciones BS)
// =============================================================================

/**
 * Obtiene lista de operadores que han registrado ventas en el negocio.
 * Incluye empleados, gerentes y dueños.
 * Se obtiene desde los turnos de ScanYA.
 */
export async function obtenerOperadoresTransacciones(
  negocioId: string,
  sucursalId?: string
): Promise<RespuestaServicio<{ id: string; nombre: string; tipo: string }[]>> {
  try {
    const condicionesTurno = [eq(scanyaTurnos.negocioId, negocioId)];
    if (sucursalId) {
      condicionesTurno.push(eq(scanyaTurnos.sucursalId, sucursalId));
    }

    // Operadores tipo empleado
    const operadoresEmpleado = await db
      .selectDistinct({
        id: empleados.id,
        nombre: empleados.nombre,
      })
      .from(scanyaTurnos)
      .innerJoin(empleados, eq(scanyaTurnos.empleadoId, empleados.id))
      .where(and(...condicionesTurno, sql`${scanyaTurnos.empleadoId} IS NOT NULL`));

    // Operadores tipo usuario (dueños/gerentes)
    const operadoresUsuario = await db
      .selectDistinct({
        id: usuarios.id,
        nombre: sql<string>`CONCAT(${usuarios.nombre}, ' ', COALESCE(${usuarios.apellidos}, ''))`,
        sucursalAsignada: usuarios.sucursalAsignada,
      })
      .from(scanyaTurnos)
      .innerJoin(usuarios, eq(scanyaTurnos.usuarioId, usuarios.id))
      .where(and(...condicionesTurno, sql`${scanyaTurnos.usuarioId} IS NOT NULL`));

    const resultado = [
      ...operadoresEmpleado.map(o => ({ id: o.id, nombre: o.nombre?.trim() || '', tipo: 'empleado' })),
      ...operadoresUsuario.map(o => ({
        id: o.id,
        nombre: o.nombre?.trim() || '',
        tipo: o.sucursalAsignada ? 'gerente' : 'dueño',
      })),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      success: true,
      message: 'Operadores obtenidos',
      data: resultado,
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener operadores:', error);
    return {
      success: false,
      message: 'Error al obtener operadores',
      code: 500,
    };
  }
}

// =============================================================================
// VERIFICAR RECOMPENSAS POR COMPRAS FRECUENTES (N+1)
// =============================================================================

/**
 * @deprecated No usar — mecanismo de desbloqueo unificado en otorgarPuntos() de scanya.service.ts.
 * Esta función contaba transacciones totales, lo cual divergía del conteo explícito por sellos.
 * Se mantiene solo como referencia. El desbloqueo real ocurre en otorgarPuntos() cuando el
 * operador selecciona la tarjeta de sellos (recompensaSellosId).
 */
export async function verificarRecompensasDesbloqueadas(
  usuarioId: string,
  negocioId: string
): Promise<void> {
  try {
    // 1. Obtener recompensas tipo 'compras_frecuentes' activas del negocio
    const recompensasCondicionales = await db
      .select()
      .from(recompensas)
      .where(
        and(
          eq(recompensas.negocioId, negocioId),
          eq(recompensas.tipo, 'compras_frecuentes'),
          eq(recompensas.activa, true)
        )
      );

    if (recompensasCondicionales.length === 0) return;

    // 2. Contar transacciones confirmadas del usuario en este negocio
    const [resultado] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(puntosTransacciones)
      .where(
        and(
          eq(puntosTransacciones.clienteId, usuarioId),
          eq(puntosTransacciones.negocioId, negocioId),
          eq(puntosTransacciones.estado, 'confirmado')
        )
      );

    const totalCompras = resultado?.total ?? 0;

    // 3. Para cada recompensa condicional, verificar si se desbloquea
    for (const recompensa of recompensasCondicionales) {
      const comprasRequeridas = recompensa.numeroComprasRequeridas;
      if (!comprasRequeridas || totalCompras < comprasRequeridas) continue;

      // Verificar si ya fue desbloqueada y no canjeada
      const [progresoExistente] = await db
        .select()
        .from(recompensaProgreso)
        .where(
          and(
            eq(recompensaProgreso.usuarioId, usuarioId),
            eq(recompensaProgreso.recompensaId, recompensa.id)
          )
        )
        .limit(1);

      if (progresoExistente?.desbloqueada && !progresoExistente.canjeada) {
        // Ya desbloqueada y pendiente de canjear, solo actualizar conteo
        await db
          .update(recompensaProgreso)
          .set({ comprasAcumuladas: totalCompras })
          .where(eq(recompensaProgreso.id, progresoExistente.id));
        continue;
      }

      if (progresoExistente?.canjeada) {
        // Ya fue canjeada, verificar si acumuló suficientes para otro ciclo
        // (Compras desde el último canje)
        continue;
      }

      // Crear o actualizar progreso
      await db
        .insert(recompensaProgreso)
        .values({
          usuarioId,
          recompensaId: recompensa.id,
          negocioId,
          comprasAcumuladas: totalCompras,
          desbloqueada: true,
          desbloqueadaAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [recompensaProgreso.usuarioId, recompensaProgreso.recompensaId],
          set: {
            comprasAcumuladas: totalCompras,
            desbloqueada: true,
            desbloqueadaAt: new Date().toISOString(),
          },
        });

      // Notificar al usuario
      const [negocioInfo] = await db
        .select({ nombre: negocios.nombre, logoUrl: negocios.logoUrl })
        .from(negocios)
        .where(eq(negocios.id, negocioId))
        .limit(1);

      await crearNotificacion({
        usuarioId,
        modo: 'personal',
        tipo: 'recompensa_desbloqueada',
        titulo: '¡Recompensa desbloqueada!',
        mensaje: `${recompensa.nombre} — completaste ${totalCompras} compras\n${negocioInfo?.nombre ?? 'un negocio'}`,
        negocioId,
        referenciaId: recompensa.id,
        referenciaTipo: 'recompensa',
        icono: '🎉',
        actorImagenUrl: negocioInfo?.logoUrl ?? recompensa.imagenUrl ?? undefined,
        actorNombre: negocioInfo?.nombre ?? undefined,
      });
    }
  } catch (error) {
    console.error('Error al verificar recompensas desbloqueadas:', error);
    // No lanzar error — esto es secondary logic, no debe bloquear otorgarPuntos
  }
}

// =============================================================================
// OBTENER PROGRESO DE RECOMPENSAS (para CardYA frontend)
// =============================================================================

/**
 * Lista recompensas tipo 'compras_frecuentes' de un negocio con el progreso del usuario
 */
export async function obtenerProgresoRecompensas(
  usuarioId: string,
  negocioId: string
): Promise<RespuestaServicio> {
  try {
    const query = sql`
      SELECT
        r.*,
        COALESCE(rp.compras_acumuladas, 0) as compras_acumuladas,
        COALESCE(rp.desbloqueada, false) as desbloqueada,
        rp.desbloqueada_at,
        COALESCE(rp.canjeada, false) as canjeada,
        rp.canjeada_at
      FROM recompensas r
      LEFT JOIN recompensa_progreso rp
        ON rp.recompensa_id = r.id
        AND rp.usuario_id = ${usuarioId}
      WHERE r.negocio_id = ${negocioId}
        AND r.tipo = 'compras_frecuentes'
        AND r.activa = true
      ORDER BY r.orden ASC
    `;

    const resultado = await db.execute(query);

    return {
      success: true,
      message: 'Progreso obtenido',
      data: resultado.rows,
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener progreso recompensas:', error);
    return {
      success: false,
      message: 'Error al obtener progreso',
      code: 500,
    };
  }
}