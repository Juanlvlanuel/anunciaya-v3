/**
 * transacciones.service.ts
 * =========================
 * Lógica de negocio para el módulo Transacciones en Business Studio
 * 
 * Ubicación: apps/api/src/services/transacciones.service.ts
 * 
 * FUNCIONES:
 * 1. obtenerKPIsTransacciones - 4 KPIs para Tab Ventas
 * 2. obtenerKPIsCanjes - 4 KPIs para Tab Canjes
 * 3. obtenerHistorialCanjes - Lista de vouchers con filtros
 * 
 * CONSUMIDO POR:
 * - transacciones.controller.ts
 */

import { eq, and, gte, lte, sql, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  puntosTransacciones,
  vouchersCanje,
  recompensas,
  usuarios,
  negocioSucursales,
  empleados,
} from '../db/schemas/schema.js';
import type {
  RespuestaServicio,
  KPIsTransacciones,
  KPIsCanjes,
  KPIsCupones,
  VoucherCanje,
  PeriodoEstadisticas
} from '../types/puntos.types.js';
import { expirarVouchersVencidos } from './puntos.service.js';
import { startOfDay, subDays, subMonths, subYears } from 'date-fns';

// =============================================================================
// HELPER: Calcular fecha inicio según periodo
// =============================================================================

export function calcularFechaInicio(periodo: PeriodoEstadisticas): Date {
  switch (periodo) {
    case 'hoy':
      return startOfDay(new Date());
    case 'semana':
      // Últimos 7 días (alineado con historial)
      return startOfDay(subDays(new Date(), 7));
    case 'mes':
      return startOfDay(subDays(new Date(), 30));
    case '3meses':
      return startOfDay(subMonths(new Date(), 3));
    case 'anio':
      return startOfDay(subYears(new Date(), 1));
    case 'todo':
    default:
      return new Date(0);
  }
}

// =============================================================================
// 1. OBTENER KPIs TRANSACCIONES (Tab Ventas)
// =============================================================================

/**
 * Obtiene las 4 métricas principales para la página de Transacciones BS:
 * - Total ventas ($) del periodo
 * - Número de transacciones
 * - Ticket promedio
 * - Transacciones revocadas
 * 
 * Filtra por sucursalId (automático vía interceptor/middleware)
 */
export async function obtenerKPIsTransacciones(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'todo'
): Promise<RespuestaServicio<KPIsTransacciones>> {
  try {
    const fechaInicio = calcularFechaInicio(periodo);
    const fechaFin = new Date();

    // Condiciones base
    const condiciones = [
      eq(puntosTransacciones.negocioId, negocioId),
      gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
      lte(puntosTransacciones.createdAt, fechaFin.toISOString()),
    ];

    if (sucursalId) {
      condiciones.push(eq(puntosTransacciones.sucursalId, sucursalId));
    }

    // Excluir transacciones con cupón — éstas se cuentan en los KPIs del
    // tab Cupones (obtenerKPIsCupones). Sin este filtro, los 4 KPIs de
    // Ventas no coinciden con la tabla que sí filtra `oferta_uso_id IS NULL`.
    condiciones.push(sql`${puntosTransacciones.ofertaUsoId} IS NULL`);

    // Query: Métricas de transacciones válidas (confirmadas)
    const [metricas] = await db
      .select({
        totalVentas: sql<number>`COALESCE(SUM(CASE WHEN estado = 'confirmado' THEN monto_compra ELSE 0 END), 0)`,
        totalTransacciones: sql<number>`COUNT(CASE WHEN estado = 'confirmado' THEN 1 END)`,
        ticketPromedio: sql<number>`COALESCE(AVG(CASE WHEN estado = 'confirmado' THEN monto_compra END), 0)`,
        totalRevocadas: sql<number>`COUNT(CASE WHEN estado = 'cancelado' THEN 1 END)`,
      })
      .from(puntosTransacciones)
      .where(and(...condiciones));

    return {
      success: true,
      message: 'KPIs de transacciones obtenidos',
      data: {
        totalVentas: Number(metricas.totalVentas),
        totalTransacciones: Number(metricas.totalTransacciones),
        ticketPromedio: Number(Number(metricas.ticketPromedio).toFixed(2)),
        totalRevocadas: Number(metricas.totalRevocadas),
      },
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener KPIs transacciones:', error);
    return {
      success: false,
      message: 'Error al obtener métricas de transacciones',
      code: 500,
    };
  }
}

// =============================================================================
// 2. OBTENER KPIs CANJES (Tab Canjes)
// =============================================================================

/**
 * Obtiene las 4 métricas principales para el Tab Canjes:
 * - Pendientes: vouchers esperando ser reclamados
 * - Usados: vouchers ya entregados
 * - Vencidos: vouchers que expiraron
 * - Total canjes: suma de todos
 * 
 * FILTRO SUCURSAL:
 * - Pendientes: siempre se muestran todos (no tienen sucursal aún)
 * - Usados/Vencidos: solo los canjeados en esa sucursal
 */
export async function obtenerKPIsCanjes(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'todo'
): Promise<RespuestaServicio<KPIsCanjes>> {
  try {
    // Expirar vouchers vencidos antes de contar
    await expirarVouchersVencidos(negocioId);

    const fechaInicio = calcularFechaInicio(periodo);
    const fechaFin = new Date();

    // Condición base: del negocio y en el periodo
    const condicionBase = and(
      eq(vouchersCanje.negocioId, negocioId),
      gte(vouchersCanje.createdAt, fechaInicio.toISOString()),
      lte(vouchersCanje.createdAt, fechaFin.toISOString())
    );

    // Pendientes: siempre todos del negocio (no filtrar por sucursal)
    const [pendientesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vouchersCanje)
      .where(and(condicionBase, eq(vouchersCanje.estado, 'pendiente')));

    // Usados: filtrar por sucursal si viene
    const condicionUsados = sucursalId
      ? and(condicionBase, eq(vouchersCanje.estado, 'usado'), eq(vouchersCanje.sucursalId, sucursalId))
      : and(condicionBase, eq(vouchersCanje.estado, 'usado'));

    const [usadosResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vouchersCanje)
      .where(condicionUsados);

    // Vencidos: filtrar por sucursal si viene
    const condicionVencidos = sucursalId
      ? and(condicionBase, eq(vouchersCanje.estado, 'expirado'), eq(vouchersCanje.sucursalId, sucursalId))
      : and(condicionBase, eq(vouchersCanje.estado, 'expirado'));

    const [vencidosResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vouchersCanje)
      .where(condicionVencidos);

    const pendientes = pendientesResult?.count || 0;
    const usados = usadosResult?.count || 0;
    const vencidos = vencidosResult?.count || 0;

    return {
      success: true,
      message: 'KPIs de canjes obtenidos',
      data: {
        pendientes,
        usados,
        vencidos,
        totalCanjes: pendientes + usados + vencidos,
      },
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener KPIs canjes:', error);
    return {
      success: false,
      message: 'Error al obtener métricas de canjes',
      code: 500,
    };
  }
}

// =============================================================================
// 3. OBTENER KPIs CUPONES (Tab Cupones)
// =============================================================================

/**
 * Obtiene las 4 métricas principales para el Tab Cupones:
 * - Total cupones canjeados en el periodo
 * - Cupones gratis (monto $0)
 * - Cupones con compra (monto > $0)
 * - Total en descuentos aplicados
 */
export async function obtenerKPIsCupones(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'todo'
): Promise<RespuestaServicio<KPIsCupones>> {
  try {
    const fechaInicio = calcularFechaInicio(periodo);
    const fechaFin = new Date();

    const condiciones = [
      eq(puntosTransacciones.negocioId, negocioId),
      gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
      lte(puntosTransacciones.createdAt, fechaFin.toISOString()),
      sql`${puntosTransacciones.ofertaUsoId} IS NOT NULL`,
      eq(puntosTransacciones.estado, 'confirmado'),
    ];

    if (sucursalId) {
      condiciones.push(eq(puntosTransacciones.sucursalId, sucursalId));
    }

    const [metricas] = await db
      .select({
        totalCupones: sql<number>`count(*)::int`,
        cuponesGratis: sql<number>`count(CASE WHEN ${puntosTransacciones.montoCompra}::numeric = 0 THEN 1 END)::int`,
        cuponesConCompra: sql<number>`count(CASE WHEN ${puntosTransacciones.montoCompra}::numeric > 0 THEN 1 END)::int`,
        totalDescuentos: sql<number>`COALESCE(SUM(ou_ref.descuento_aplicado::numeric), 0)`,
      })
      .from(puntosTransacciones)
      .leftJoin(
        sql`oferta_usos ou_ref`,
        sql`ou_ref.id = ${puntosTransacciones.ofertaUsoId}`
      )
      .where(and(...condiciones));

    return {
      success: true,
      message: 'KPIs de cupones obtenidos',
      data: {
        totalCupones: metricas?.totalCupones || 0,
        cuponesGratis: metricas?.cuponesGratis || 0,
        cuponesConCompra: metricas?.cuponesConCompra || 0,
        totalDescuentos: Number(Number(metricas?.totalDescuentos || 0).toFixed(2)),
      },
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener KPIs cupones:', error);
    return {
      success: false,
      message: 'Error al obtener métricas de cupones',
      code: 500,
    };
  }
}

// =============================================================================
// 4. OBTENER HISTORIAL DE CANJES
// =============================================================================

/**
 * Obtiene lista de vouchers con filtros y paginación.
 * 
 * FILTRO SUCURSAL:
 * - Pendientes: siempre se muestran todos
 * - Usados/Vencidos: solo los canjeados en esa sucursal
 */
export async function obtenerHistorialCanjes(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'todo',
  limit: number = 20,
  offset: number = 0,
  estado?: string,
  busqueda?: string,
  operadorId?: string
): Promise<RespuestaServicio<{ canjes: VoucherCanje[]; total: number }>> {
  try {
    // Expirar vouchers vencidos antes de listar
    await expirarVouchersVencidos(negocioId);

    const fechaInicio = calcularFechaInicio(periodo);
    const fechaFin = new Date();

    // Construir condiciones
    const condiciones = [
      eq(vouchersCanje.negocioId, negocioId),
      gte(vouchersCanje.createdAt, fechaInicio.toISOString()),
      lte(vouchersCanje.createdAt, fechaFin.toISOString()),
      // Excluir vouchers cancelados del historial — son "arrepentimientos" del
      // cliente que no representan acción pendiente, canje real ni vencimiento.
      // Mantenerlos genera ruido visual y desincroniza los KPIs (que solo
      // cuentan pendientes/usados/vencidos).
      sql`${vouchersCanje.estado} != 'cancelado'`,
    ];

    // Filtro por estado
    if (estado && estado !== 'todos') {
      condiciones.push(eq(vouchersCanje.estado, estado));
    }

    // Filtro por sucursal (solo para usados/vencidos)
    // Pendientes siempre se muestran
    if (sucursalId) {
      condiciones.push(
        or(
          eq(vouchersCanje.estado, 'pendiente'),
          eq(vouchersCanje.sucursalId, sucursalId)
        )!
      );
    }

    // Filtro por búsqueda (nombre o teléfono del cliente)
    if (busqueda) {
      const busquedaLower = `%${busqueda.toLowerCase()}%`;
      condiciones.push(
        sql`(
          LOWER(concat(${usuarios.nombre}, ' ', coalesce(${usuarios.apellidos}, ''))) LIKE ${busquedaLower}
          OR ${usuarios.telefono} LIKE ${busquedaLower}
        )`
      );
    }

    // Filtro por operador (empleado o dueño/gerente que canjeó)
    if (operadorId) {
      condiciones.push(
        sql`(${vouchersCanje.usadoPorEmpleadoId}::text = ${operadorId} OR ${vouchersCanje.usadoPorUsuarioId}::text = ${operadorId})`
      );
    }

    // Contar total
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vouchersCanje)
      .innerJoin(usuarios, eq(vouchersCanje.usuarioId, usuarios.id))
      .where(and(...condiciones));

    const total = totalResult?.count || 0;

    // Obtener canjes con joins
    const canjes = await db
      .select({
        id: vouchersCanje.id,
        clienteId: vouchersCanje.usuarioId,
        clienteNombre: sql<string>`concat(${usuarios.nombre}, ' ', coalesce(${usuarios.apellidos}, ''))`,
        clienteTelefono: usuarios.telefono,
        clienteAvatarUrl: usuarios.avatarUrl,
        recompensaNombre: recompensas.nombre,
        recompensaDescripcion: recompensas.descripcion,
        recompensaImagenUrl: recompensas.imagenUrl,
        puntosUsados: vouchersCanje.puntosUsados,
        estado: vouchersCanje.estado,
        expiraAt: vouchersCanje.expiraAt,
        createdAt: vouchersCanje.createdAt,
        usadoAt: vouchersCanje.usadoAt,
        sucursalNombre: negocioSucursales.nombre,
        usadoPorEmpleadoId: vouchersCanje.usadoPorEmpleadoId,
        usadoPorUsuarioId: vouchersCanje.usadoPorUsuarioId,
      })
      .from(vouchersCanje)
      .innerJoin(usuarios, eq(vouchersCanje.usuarioId, usuarios.id))
      .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
      .leftJoin(negocioSucursales, eq(vouchersCanje.sucursalId, negocioSucursales.id))
      .where(and(...condiciones))
      .orderBy(sql`${vouchersCanje.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // Obtener nombres de quien canjeó
    const canjesConNombre: VoucherCanje[] = await Promise.all(
      canjes.map(async (c) => {
        let usadoPorNombre: string | null = null;

        if (c.usadoPorEmpleadoId) {
          const [empleado] = await db
            .select({ nick: empleados.nick })
            .from(empleados)
            .where(eq(empleados.id, c.usadoPorEmpleadoId))
            .limit(1);
          usadoPorNombre = empleado?.nick || null;
        } else if (c.usadoPorUsuarioId) {
          const [usuario] = await db
            .select({ nombre: usuarios.nombre })
            .from(usuarios)
            .where(eq(usuarios.id, c.usadoPorUsuarioId))
            .limit(1);
          usadoPorNombre = usuario?.nombre || null;
        }

        return {
          id: c.id,
          clienteId: c.clienteId,
          clienteNombre: c.clienteNombre,
          clienteTelefono: c.clienteTelefono,
          clienteAvatarUrl: c.clienteAvatarUrl,
          recompensaNombre: c.recompensaNombre,
          recompensaDescripcion: c.recompensaDescripcion,
          recompensaImagenUrl: c.recompensaImagenUrl,
          puntosUsados: c.puntosUsados,
          estado: c.estado as 'pendiente' | 'usado' | 'expirado',
          expiraAt: c.expiraAt,
          createdAt: c.createdAt,
          usadoAt: c.usadoAt,
          sucursalNombre: c.sucursalNombre || null,
          usadoPorNombre,
        };
      })
    );

    return {
      success: true,
      message: `${total} canje${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`,
      data: {
        canjes: canjesConNombre,
        total,
      },
      code: 200,
    };
  } catch (error) {
    console.error('Error al obtener historial canjes:', error);
    return {
      success: false,
      message: 'Error al obtener historial de canjes',
      code: 500,
    };
  }
}