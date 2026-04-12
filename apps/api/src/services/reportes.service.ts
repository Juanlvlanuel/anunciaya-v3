/**
 * reportes.service.ts
 * ====================
 * Lógica de negocio para el módulo de Reportes en Business Studio.
 * 5 funciones principales (una por pestaña): Ventas, Clientes, Empleados, Promociones, Reseñas.
 *
 * Ubicación: apps/api/src/services/reportes.service.ts
 *
 * CONSUMIDO POR:
 * - reportes.controller.ts
 */

import { eq, and, gte, sql, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  puntosTransacciones,
  puntosBilletera,
  usuarios,
  empleados,
  negocios,
  negocioSucursales,
  ofertas,
  ofertaUsos,
  ofertaUsuarios,
  resenas,
  alertasSeguridad,
  vouchersCanje,
  metricasEntidad,
} from '../db/schemas/schema.js';
import type { RespuestaServicio, PeriodoEstadisticas } from '../types/puntos.types.js';
import { calcularFechaInicio } from './transacciones.service.js';

// =============================================================================
// TIPOS
// =============================================================================

interface ReporteVentas {
  horariosPico: { hora: number; totalVentas: number; cantidad: number }[];
  ventasPorDia: { dia: number; nombre: string; totalVentas: number; cantidad: number }[];
  tasaRevocacion: { total: number; revocadas: number; porcentaje: number };
  metodosPago: { efectivo: number; tarjeta: number; transferencia: number; sinEspecificar: number; total: number };
}

interface ClienteTop {
  clienteId: string;
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  valor: number;
}

interface ReporteClientes {
  topPorGasto: ClienteTop[];
  topPorFrecuencia: ClienteTop[];
  clientesEnRiesgo: number;
  clientesPerdidos: number;
  totalClientes: number;
  gastoPromedioPorCliente: number;
  tendenciaAdquisicion: { semana: string; nuevos: number }[];
}

interface EmpleadoReporte {
  empleadoId: string;
  nombre: string;
  fotoUrl: string | null;
  totalTransacciones: number;
  montoTotal: number;
  ticketPromedio: number;
  alertas: number;
  /** true cuando la fila representa al dueño (ventas sin empleadoId). En UI no es clickeable. */
  esDueno?: boolean;
  /** true cuando el empleado ya no está operando (desactivado o eliminado) pero tiene ventas en el período. En UI no es clickeable. */
  inactivo?: boolean;
}

interface ReporteEmpleados {
  empleados: EmpleadoReporte[];
}

interface PromocionResumen {
  titulo: string;
  tipo: string;
  valor: string | null;
  imagen: string | null;
  descripcion: string | null;
  /** clicks para ofertas, canjes para cupones/recompensas */
  metrica: number;
  metricaLabel: string;
}

interface ReportePromociones {
  funnelOfertas: { activas: number; vistas: number; clicks: number; shares: number; expiradas: number };
  mejorOferta: PromocionResumen | null;
  funnelCupones: { emitidos: number; canjeados: number; expirados: number; activos: number };
  mejorCupon: PromocionResumen | null;
  funnelRecompensas: { generados: number; canjeados: number; expirados: number; pendientes: number };
  mejorRecompensa: PromocionResumen | null;
  descuentoTotal: number;
  porVencer: number;
}

interface RespuestaPorResponder {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  esDueno: boolean;
  respondidas: number;
  tiempoPromDias: number;
}

interface ReporteResenas {
  distribucionEstrellas: { rating: number; cantidad: number; porcentaje: number }[];
  tendenciaRating: { semana: string; promedio: number; cantidad: number }[];
  sinResponder: number;
  totalResenas: number;
  tasaRespuesta: number;
  tiempoPromedioRespuestaDias: number;
  respuestasPorResponder: RespuestaPorResponder[];
}

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// =============================================================================
// HELPER: Condiciones base para transacciones confirmadas
// =============================================================================

function condicionesBaseTransacciones(
  negocioId: string,
  sucursalId: string | undefined,
  fechaInicio: Date,
  soloConfirmadas = true
) {
  const conds = [
    eq(puntosTransacciones.negocioId, negocioId),
    gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
  ];
  if (soloConfirmadas) {
    conds.push(eq(puntosTransacciones.estado, 'confirmado'));
  }
  if (sucursalId) {
    conds.push(eq(puntosTransacciones.sucursalId, sucursalId));
  }
  return conds;
}

/** Agrega condición de fechaFin a un array de condiciones si viene definida */
function agregarCondicionFechaFin(conds: ReturnType<typeof condicionesBaseTransacciones>, fechaFinCustom?: string) {
  if (fechaFinCustom) {
    const fin = fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom;
    conds.push(sql`${puntosTransacciones.createdAt} <= ${fin}`);
  }
}

// =============================================================================
// 1. REPORTE VENTAS
// =============================================================================

export async function obtenerReporteVentas(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'mes',
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
): Promise<RespuestaServicio<ReporteVentas>> {
  try {
    // Si vienen fechas custom (drill-down por semana), usarlas; si no, calcular desde periodo
    const fechaInicio = fechaInicioCustom ? new Date(fechaInicioCustom) : calcularFechaInicio(periodo);
    const conds = condicionesBaseTransacciones(negocioId, sucursalId, fechaInicio);

    // Si hay fechaFin, agregar condición de límite superior (incluir todo el día)
    if (fechaFinCustom) {
      const finDelDia = fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom;
      conds.push(sql`created_at <= ${finDelDia}`);
    }

    // ── Horarios pico (agrupado por hora) ──────────────────────────────────
    const horariosPicoRaw = await db
      .select({
        hora: sql<number>`EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')::int`,
        totalVentas: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
        cantidad: sql<number>`COUNT(*)::int`,
      })
      .from(puntosTransacciones)
      .where(and(...conds))
      .groupBy(sql`EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')`)
      .orderBy(sql`EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')`);

    // ── Ventas por día de la semana (ordenado Lunes → Domingo) ────────────
    const ventasPorDiaRaw = await db
      .select({
        dia: sql<number>`EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Mexico_City')::int`,
        totalVentas: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
        cantidad: sql<number>`COUNT(*)::int`,
      })
      .from(puntosTransacciones)
      .where(and(...conds))
      .groupBy(sql`EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Mexico_City')`)
      .orderBy(sql`CASE WHEN EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Mexico_City') = 0 THEN 7 ELSE EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Mexico_City') END`);

    // Mapear a los 7 días de la semana (Lunes a Domingo), rellenando con 0 los que no tienen ventas
    const mapaVentas = new Map(ventasPorDiaRaw.map((r) => [r.dia, r]));
    const ordenDias = [1, 2, 3, 4, 5, 6, 0]; // Lunes, Martes, ..., Domingo
    const ventasPorDia = ordenDias.map((dia) => {
      const encontrado = mapaVentas.get(dia);
      return {
        dia,
        nombre: NOMBRES_DIA[dia] ?? '',
        totalVentas: encontrado?.totalVentas ?? 0,
        cantidad: encontrado?.cantidad ?? 0,
      };
    });

    // ── Tasa de revocación ─────────────────────────────────────────────────
    const condsAll = condicionesBaseTransacciones(negocioId, sucursalId, fechaInicio, false);
    if (fechaFinCustom) {
      const finAll = fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom;
      condsAll.push(sql`created_at <= ${finAll}`);
    }
    const [revocacionRaw] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        revocadas: sql<number>`COUNT(*) FILTER (WHERE estado = 'cancelado')::int`,
      })
      .from(puntosTransacciones)
      .where(and(...condsAll));

    const tasaRevocacion = {
      total: revocacionRaw?.total ?? 0,
      revocadas: revocacionRaw?.revocadas ?? 0,
      porcentaje: revocacionRaw?.total
        ? Math.round((revocacionRaw.revocadas / revocacionRaw.total) * 100 * 10) / 10
        : 0,
    };

    // ── Métodos de pago ────────────────────────────────────────────────────
    const [metodosPagoRaw] = await db
      .select({
        efectivo: sql<number>`COALESCE(SUM(monto_efectivo), 0)::float`,
        tarjeta: sql<number>`COALESCE(SUM(monto_tarjeta), 0)::float`,
        transferencia: sql<number>`COALESCE(SUM(monto_transferencia), 0)::float`,
        total: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
      })
      .from(puntosTransacciones)
      .where(and(...conds));

    const sumaMetodos = (metodosPagoRaw?.efectivo ?? 0) + (metodosPagoRaw?.tarjeta ?? 0) + (metodosPagoRaw?.transferencia ?? 0);
    const sinEspecificar = Math.max(0, (metodosPagoRaw?.total ?? 0) - sumaMetodos);

    // ── Ventas por semana (tabla principal para drill-down) ────────────────
    return {
      success: true,
      message: 'Reporte de ventas obtenido',
      data: {
        horariosPico: horariosPicoRaw,
        ventasPorDia,
        tasaRevocacion,
        metodosPago: {
          efectivo: metodosPagoRaw?.efectivo ?? 0,
          tarjeta: metodosPagoRaw?.tarjeta ?? 0,
          transferencia: metodosPagoRaw?.transferencia ?? 0,
          sinEspecificar,
          total: metodosPagoRaw?.total ?? 0,
        },
      },
    };
  } catch (error) {
    console.error('Error obteniendo reporte de ventas:', error);
    return { success: false, message: 'Error al obtener reporte de ventas' };
  }
}

// =============================================================================
// 2. REPORTE CLIENTES
// =============================================================================

export async function obtenerReporteClientes(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'mes',
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
): Promise<RespuestaServicio<ReporteClientes>> {
  try {
    const fechaInicio = fechaInicioCustom ? new Date(fechaInicioCustom) : calcularFechaInicio(periodo);
    const conds = condicionesBaseTransacciones(negocioId, sucursalId, fechaInicio);
    agregarCondicionFechaFin(conds, fechaFinCustom);

    // ── Top 10 por gasto ───────────────────────────────────────────────────
    const topGastoRaw = await db
      .select({
        clienteId: puntosTransacciones.clienteId,
        nombre: usuarios.nombre,
        apellidos: usuarios.apellidos,
        avatarUrl: usuarios.avatarUrl,
        valor: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
      })
      .from(puntosTransacciones)
      .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id))
      .where(and(...conds))
      .groupBy(puntosTransacciones.clienteId, usuarios.nombre, usuarios.apellidos, usuarios.avatarUrl)
      .orderBy(sql`SUM(monto_compra) DESC`)
      .limit(10);

    // ── Top 10 por frecuencia ──────────────────────────────────────────────
    const topFrecuenciaRaw = await db
      .select({
        clienteId: puntosTransacciones.clienteId,
        nombre: usuarios.nombre,
        apellidos: usuarios.apellidos,
        avatarUrl: usuarios.avatarUrl,
        valor: sql<number>`COUNT(*)::int`,
      })
      .from(puntosTransacciones)
      .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id))
      .where(and(...conds))
      .groupBy(puntosTransacciones.clienteId, usuarios.nombre, usuarios.apellidos, usuarios.avatarUrl)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // ── Clientes en riesgo y perdidos ──────────────────────────────────────
    const ahora = new Date();
    const hace15 = new Date(ahora.getTime() - 15 * 24 * 60 * 60 * 1000);
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    const condsBilletera = [eq(puntosBilletera.negocioId, negocioId)];

    const [riesgoRaw] = await db
      .select({ cantidad: sql<number>`COUNT(*)::int` })
      .from(puntosBilletera)
      .where(and(
        ...condsBilletera,
        sql`ultima_actividad < ${hace15.toISOString()}`,
        sql`ultima_actividad >= ${hace30.toISOString()}`,
      ));

    const [perdidosRaw] = await db
      .select({ cantidad: sql<number>`COUNT(*)::int` })
      .from(puntosBilletera)
      .where(and(
        ...condsBilletera,
        sql`ultima_actividad < ${hace30.toISOString()}`,
      ));

    // ── Total de clientes únicos y gasto promedio por cliente ─────────────
    const [resumenRaw] = await db
      .select({
        totalClientes: sql<number>`COUNT(DISTINCT cliente_id)::int`,
        totalVendido: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
      })
      .from(puntosTransacciones)
      .where(and(...conds));

    const totalClientes = resumenRaw?.totalClientes ?? 0;
    const totalVendido = resumenRaw?.totalVendido ?? 0;
    const gastoPromedioPorCliente = totalClientes > 0 ? Math.round(totalVendido / totalClientes) : 0;

    // ── Tendencia de adquisición (clientes con PRIMERA compra por semana) ─
    // Usa la primera transacción confirmada como "fecha de adquisición"
    // para garantizar consistencia con "Total de clientes"
    const condSucTendencia = sucursalId ? sql`AND sucursal_id = ${sucursalId}` : sql``;
    const tendenciaRaw = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', primera_compra AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') as semana,
        COUNT(*)::int as nuevos
      FROM (
        SELECT cliente_id, MIN(created_at) as primera_compra
        FROM puntos_transacciones
        WHERE negocio_id = ${negocioId}
          AND estado = 'confirmado'
          ${condSucTendencia}
        GROUP BY cliente_id
      ) primeras
      WHERE primera_compra >= ${fechaInicio.toISOString()}
        ${fechaFinCustom ? sql`AND primera_compra <= ${fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom}` : sql``}
      GROUP BY DATE_TRUNC('week', primera_compra AT TIME ZONE 'America/Mexico_City')
      ORDER BY DATE_TRUNC('week', primera_compra AT TIME ZONE 'America/Mexico_City')
    `);
    const tendencia = (tendenciaRaw as unknown as { rows: { semana: string; nuevos: number }[] }).rows;

    return {
      success: true,
      message: 'Reporte de clientes obtenido',
      data: {
        topPorGasto: topGastoRaw,
        topPorFrecuencia: topFrecuenciaRaw,
        clientesEnRiesgo: riesgoRaw?.cantidad ?? 0,
        clientesPerdidos: perdidosRaw?.cantidad ?? 0,
        totalClientes,
        gastoPromedioPorCliente,
        tendenciaAdquisicion: tendencia,
      },
    };
  } catch (error) {
    console.error('Error obteniendo reporte de clientes:', error);
    return { success: false, message: 'Error al obtener reporte de clientes' };
  }
}

// =============================================================================
// 2B. LISTA DE CLIENTES EN RIESGO / INACTIVOS (para modal detalle)
// =============================================================================

interface ClienteDetalleInactivo {
  clienteId: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  correo: string | null;
  ultimaActividad: string | null;
  diasSinComprar: number;
  puntosDisponibles: number;
}

export async function obtenerClientesInactivos(
  negocioId: string,
  tipo: 'riesgo' | 'inactivos'
): Promise<RespuestaServicio<ClienteDetalleInactivo[]>> {
  try {
    const ahora = new Date();
    const hace15 = new Date(ahora.getTime() - 15 * 24 * 60 * 60 * 1000);
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    let condicionRiesgo;
    if (tipo === 'riesgo') {
      // Entre 15 y 30 días sin comprar
      condicionRiesgo = sql`${puntosBilletera.ultimaActividad} < ${hace15.toISOString()} AND ${puntosBilletera.ultimaActividad} >= ${hace30.toISOString()}`;
    } else {
      // Más de 30 días sin comprar
      condicionRiesgo = sql`${puntosBilletera.ultimaActividad} < ${hace30.toISOString()}`;
    }

    const clientes = await db
      .select({
        clienteId: puntosBilletera.usuarioId,
        nombre: usuarios.nombre,
        apellidos: usuarios.apellidos,
        telefono: usuarios.telefono,
        correo: usuarios.correo,
        ultimaActividad: puntosBilletera.ultimaActividad,
        puntosDisponibles: puntosBilletera.puntosDisponibles,
      })
      .from(puntosBilletera)
      .innerJoin(usuarios, eq(puntosBilletera.usuarioId, usuarios.id))
      .where(and(
        eq(puntosBilletera.negocioId, negocioId),
        condicionRiesgo,
      ))
      .orderBy(sql`${puntosBilletera.ultimaActividad} DESC NULLS LAST`);

    const resultado: ClienteDetalleInactivo[] = clientes.map((c) => {
      const ultima = c.ultimaActividad ? new Date(c.ultimaActividad) : null;
      const diasSinComprar = ultima ? Math.floor((ahora.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        clienteId: c.clienteId,
        nombre: c.nombre ?? '',
        apellidos: c.apellidos ?? '',
        telefono: c.telefono,
        correo: c.correo,
        ultimaActividad: c.ultimaActividad ? c.ultimaActividad.toString() : null,
        diasSinComprar,
        puntosDisponibles: c.puntosDisponibles ?? 0,
      };
    });

    return {
      success: true,
      message: 'Clientes obtenidos',
      data: resultado,
    };
  } catch (error) {
    console.error('Error obteniendo clientes inactivos:', error);
    return { success: false, message: 'Error al obtener clientes' };
  }
}

// =============================================================================
// 3. REPORTE EMPLEADOS
// =============================================================================

export async function obtenerReporteEmpleados(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'mes',
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
): Promise<RespuestaServicio<ReporteEmpleados>> {
  try {
    const fechaInicio = fechaInicioCustom ? new Date(fechaInicioCustom) : calcularFechaInicio(periodo);
    const fechaFinNorm = fechaFinCustom && fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom;

    // ── Paso 1a: Info del dueño del negocio ───────────────────────────────
    // El dueño siempre aparece como una fila adicional en el reporte.
    const [duenoInfo] = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellidos: usuarios.apellidos,
        avatarUrl: usuarios.avatarUrl,
      })
      .from(negocios)
      .innerJoin(usuarios, eq(negocios.usuarioId, usuarios.id))
      .where(eq(negocios.id, negocioId))
      .limit(1);

    // ── Paso 1b: TODOS los empleados activos del negocio ──────────────────
    // Así los que no tienen ventas en el período también aparecen (con 0s).
    const condsEmpleado = [
      eq(negocioSucursales.negocioId, negocioId),
      eq(empleados.activo, true),
      isNull(empleados.eliminadoAt),
    ];
    if (sucursalId) condsEmpleado.push(eq(empleados.sucursalId, sucursalId));

    const empleadosNegocio = await db
      .select({
        id: empleados.id,
        nombre: empleados.nombre,
        fotoUrl: empleados.fotoUrl,
      })
      .from(empleados)
      .innerJoin(negocioSucursales, eq(empleados.sucursalId, negocioSucursales.id))
      .where(and(...condsEmpleado))
      .orderBy(empleados.nombre);

    // ── Paso 1c: Empleados INACTIVOS (eliminados O desactivados) con ventas ─
    // Estos ya no están operando pero sus ventas siguen vivas en puntos_transacciones.
    // Los incluimos (solo si tienen ventas en el período) para que el total del tab
    // Empleados cuadre con el tab Ventas tras rotación de personal.
    //
    // Cubre DOS casos:
    //   - eliminado_at IS NOT NULL → empleado borrado (soft-delete)
    //   - activo = false           → empleado desactivado/suspendido
    const empleadosInactivosConVentas = await db.execute(sql`
      SELECT DISTINCT e.id, e.nombre, e.foto_url
      FROM empleados e
      INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
      INNER JOIN puntos_transacciones pt ON pt.empleado_id = e.id
      WHERE ns.negocio_id = ${negocioId}
        AND (e.eliminado_at IS NOT NULL OR e.activo = false)
        AND pt.estado = 'confirmado'
        AND pt.created_at >= ${fechaInicio.toISOString()}
        ${sucursalId ? sql`AND pt.sucursal_id = ${sucursalId}` : sql``}
        ${fechaFinNorm ? sql`AND pt.created_at <= ${fechaFinNorm}` : sql``}
    `);
    const empleadosInactivos = (
      empleadosInactivosConVentas.rows as unknown as { id: string; nombre: string | null; foto_url: string | null }[]
    );

    // ── Paso 2: Transacciones por empleado en el período ──────────────────
    const condsTx = [
      eq(puntosTransacciones.negocioId, negocioId),
      eq(puntosTransacciones.estado, 'confirmado'),
      gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
      isNotNull(puntosTransacciones.empleadoId),
    ];
    if (sucursalId) condsTx.push(eq(puntosTransacciones.sucursalId, sucursalId));
    if (fechaFinNorm) condsTx.push(sql`${puntosTransacciones.createdAt} <= ${fechaFinNorm}`);

    const txPorEmpleado = await db
      .select({
        empleadoId: puntosTransacciones.empleadoId,
        totalTransacciones: sql<number>`COUNT(*)::int`,
        montoTotal: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
        ticketPromedio: sql<number>`COALESCE(AVG(monto_compra), 0)::float`,
      })
      .from(puntosTransacciones)
      .where(and(...condsTx))
      .groupBy(puntosTransacciones.empleadoId);

    const txMap = new Map(
      txPorEmpleado.map((t) => [t.empleadoId, t])
    );

    // ── Paso 2b: Ventas directas del dueño (empleadoId IS NULL) ───────────
    // Estas son transacciones registradas sin empleado asignado → las hizo el dueño.
    const condsTxDueno = [
      eq(puntosTransacciones.negocioId, negocioId),
      eq(puntosTransacciones.estado, 'confirmado'),
      gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
      isNull(puntosTransacciones.empleadoId),
    ];
    if (sucursalId) condsTxDueno.push(eq(puntosTransacciones.sucursalId, sucursalId));
    if (fechaFinNorm) condsTxDueno.push(sql`${puntosTransacciones.createdAt} <= ${fechaFinNorm}`);

    const [txDuenoRaw] = await db
      .select({
        totalTransacciones: sql<number>`COUNT(*)::int`,
        montoTotal: sql<number>`COALESCE(SUM(monto_compra), 0)::float`,
        ticketPromedio: sql<number>`COALESCE(AVG(monto_compra), 0)::float`,
      })
      .from(puntosTransacciones)
      .where(and(...condsTxDueno));

    // ── Paso 3: Alertas por empleado en el período ────────────────────────
    const condsAlerta = [
      eq(alertasSeguridad.negocioId, negocioId),
      gte(alertasSeguridad.createdAt, fechaInicio.toISOString()),
      isNotNull(alertasSeguridad.empleadoId),
    ];
    if (fechaFinNorm) condsAlerta.push(sql`${alertasSeguridad.createdAt} <= ${fechaFinNorm}`);
    if (sucursalId) {
      condsAlerta.push(
        sql`(${alertasSeguridad.sucursalId} = ${sucursalId} OR ${alertasSeguridad.sucursalId} IS NULL)`
      );
    }

    const alertasPorEmpleado = await db
      .select({
        empleadoId: alertasSeguridad.empleadoId,
        alertas: sql<number>`COUNT(*)::int`,
      })
      .from(alertasSeguridad)
      .where(and(...condsAlerta))
      .groupBy(alertasSeguridad.empleadoId);

    const alertasMap = new Map(
      alertasPorEmpleado.map((a) => [a.empleadoId, a.alertas])
    );

    // ── Paso 4: Merge — dueño + todos los empleados ───────────────────────
    const filas: EmpleadoReporte[] = [];

    // Dueño (siempre incluido si existe la info)
    if (duenoInfo) {
      const nombreCompleto = [duenoInfo.nombre, duenoInfo.apellidos].filter(Boolean).join(' ').trim() || 'Dueño';
      filas.push({
        empleadoId: duenoInfo.id,
        nombre: nombreCompleto,
        fotoUrl: duenoInfo.avatarUrl ?? null,
        totalTransacciones: txDuenoRaw?.totalTransacciones ?? 0,
        montoTotal: txDuenoRaw ? Math.round(txDuenoRaw.montoTotal * 100) / 100 : 0,
        ticketPromedio: txDuenoRaw ? Math.round(txDuenoRaw.ticketPromedio * 100) / 100 : 0,
        alertas: 0,
        esDueno: true,
      });
    }

    // Empleados del negocio
    for (const e of empleadosNegocio) {
      const tx = txMap.get(e.id);
      filas.push({
        empleadoId: e.id,
        nombre: e.nombre ?? 'Sin nombre',
        fotoUrl: e.fotoUrl ?? null,
        totalTransacciones: tx?.totalTransacciones ?? 0,
        montoTotal: tx ? Math.round(tx.montoTotal * 100) / 100 : 0,
        ticketPromedio: tx ? Math.round(tx.ticketPromedio * 100) / 100 : 0,
        alertas: alertasMap.get(e.id) ?? 0,
      });
    }

    // Empleados inactivos (eliminados o desactivados) que tienen ventas en el período
    for (const e of empleadosInactivos) {
      const tx = txMap.get(e.id);
      if (!tx) continue;
      filas.push({
        empleadoId: e.id,
        nombre: e.nombre ?? 'Sin nombre',
        fotoUrl: e.foto_url ?? null,
        totalTransacciones: tx.totalTransacciones,
        montoTotal: Math.round(tx.montoTotal * 100) / 100,
        ticketPromedio: Math.round(tx.ticketPromedio * 100) / 100,
        alertas: alertasMap.get(e.id) ?? 0,
        inactivo: true,
      });
    }

    // Ordenar por montoTotal DESC; desempate por nombre alfabético
    const empleadosReporte = filas.sort((a, b) => {
      if (b.montoTotal !== a.montoTotal) return b.montoTotal - a.montoTotal;
      return a.nombre.localeCompare(b.nombre);
    });

    return {
      success: true,
      message: 'Reporte de empleados obtenido',
      data: { empleados: empleadosReporte },
    };
  } catch (error) {
    console.error('Error obteniendo reporte de empleados:', error);
    return { success: false, message: 'Error al obtener reporte de empleados' };
  }
}

// =============================================================================
// 4. REPORTE PROMOCIONES
// =============================================================================

export async function obtenerReportePromociones(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'mes',
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
): Promise<RespuestaServicio<ReportePromociones>> {
  try {
    const fechaInicio = fechaInicioCustom ? new Date(fechaInicioCustom) : calcularFechaInicio(periodo);
    const fechaFinNorm = fechaFinCustom && fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom;

    // ── Funnel ofertas públicas ───────────────────────────────────────────
    // Ofertas activas y expiradas del negocio (visibilidad pública)
    const condsOfertasPublicas = [
      eq(ofertas.negocioId, negocioId),
      sql`${ofertas.visibilidad} = 'publico'`,
    ];

    const [funnelOfertasRaw] = await db
      .select({
        activas: sql<number>`COUNT(*) FILTER (WHERE ${ofertas.activo} = true AND ${ofertas.fechaFin} > NOW())::int`,
        expiradas: sql<number>`COUNT(*) FILTER (WHERE ${ofertas.fechaFin} <= NOW())::int`,
      })
      .from(ofertas)
      .where(and(...condsOfertasPublicas));

    // Métricas de engagement (vistas, clicks, shares) de todas las ofertas del negocio
    const [metricasOfertasRaw] = await db
      .select({
        vistas: sql<number>`COALESCE(SUM(${metricasEntidad.totalViews}), 0)::int`,
        clicks: sql<number>`COALESCE(SUM(${metricasEntidad.totalClicks}), 0)::int`,
        shares: sql<number>`COALESCE(SUM(${metricasEntidad.totalShares}), 0)::int`,
      })
      .from(metricasEntidad)
      .where(and(
        eq(metricasEntidad.entityType, 'oferta'),
        sql`${metricasEntidad.entityId} IN (SELECT id FROM ofertas WHERE negocio_id = ${negocioId} AND visibilidad = 'publico')`,
      ));

    // Mejor oferta pública (por clicks — las ofertas no tienen "canje" directo)
    const mejorOfertaRaw = await db
      .select({
        titulo: ofertas.titulo,
        tipo: ofertas.tipo,
        valor: ofertas.valor,
        imagen: ofertas.imagen,
        descripcion: ofertas.descripcion,
        clicks: metricasEntidad.totalClicks,
      })
      .from(ofertas)
      .innerJoin(metricasEntidad, and(
        eq(metricasEntidad.entityType, 'oferta'),
        eq(metricasEntidad.entityId, ofertas.id),
      ))
      .where(and(
        eq(ofertas.negocioId, negocioId),
        sql`${ofertas.visibilidad} = 'publico'`,
      ))
      .orderBy(sql`${metricasEntidad.totalClicks} DESC NULLS LAST`)
      .limit(1);

    // ── Funnel cupones (oferta_usuarios = cupones privados) ────────────────
    const condsOfertaUsuarios = [
      sql`oferta_id IN (SELECT id FROM ofertas WHERE negocio_id = ${negocioId})`,
      gte(ofertaUsuarios.asignadoAt, fechaInicio.toISOString()),
    ];
    if (fechaFinNorm) condsOfertaUsuarios.push(sql`${ofertaUsuarios.asignadoAt} <= ${fechaFinNorm}`);

    const [funnelCuponesRaw] = await db
      .select({
        emitidos: sql<number>`COUNT(*)::int`,
        canjeados: sql<number>`COUNT(*) FILTER (WHERE estado = 'usado')::int`,
        expirados: sql<number>`COUNT(*) FILTER (WHERE estado = 'expirado')::int`,
        activos: sql<number>`COUNT(*) FILTER (WHERE estado = 'activo')::int`,
      })
      .from(ofertaUsuarios)
      .where(and(...condsOfertaUsuarios));

    // ── Funnel vouchers (vouchers_canje = recompensas canjeadas) ──────────
    const condsVouchers = [
      eq(vouchersCanje.negocioId, negocioId),
      gte(vouchersCanje.createdAt, fechaInicio.toISOString()),
    ];
    if (fechaFinNorm) condsVouchers.push(sql`${vouchersCanje.createdAt} <= ${fechaFinNorm}`);

    const [funnelVouchersRaw] = await db
      .select({
        generados: sql<number>`COUNT(*)::int`,
        canjeados: sql<number>`COUNT(*) FILTER (WHERE estado = 'usado')::int`,
        expirados: sql<number>`COUNT(*) FILTER (WHERE estado = 'expirado')::int`,
        pendientes: sql<number>`COUNT(*) FILTER (WHERE estado IN ('pendiente', 'aprobacion_pendiente'))::int`,
      })
      .from(vouchersCanje)
      .where(and(...condsVouchers));

    // ── Descuento total otorgado ───────────────────────────────────────────
    const condsUsos = [
      sql`oferta_id IN (SELECT id FROM ofertas WHERE negocio_id = ${negocioId})`,
      gte(ofertaUsos.createdAt, fechaInicio.toISOString()),
    ];
    if (fechaFinNorm) condsUsos.push(sql`${ofertaUsos.createdAt} <= ${fechaFinNorm}`);

    const [descuentoRaw] = await db
      .select({
        total: sql<number>`COALESCE(SUM(descuento_aplicado), 0)::float`,
      })
      .from(ofertaUsos)
      .where(and(...condsUsos));

    // ── Mejor cupón del período ────────────────────────────────────────────
    const condFechaFinMejorCupon = fechaFinNorm ? sql`AND ou.created_at <= ${fechaFinNorm}` : sql``;
    const mejorCuponRaw = await db
      .select({
        titulo: ofertas.titulo,
        tipo: ofertas.tipo,
        valor: ofertas.valor,
        imagen: ofertas.imagen,
        descripcion: ofertas.descripcion,
        canjes: sql<number>`COUNT(ou.id)::int`,
      })
      .from(ofertas)
      .innerJoin(sql`oferta_usos ou`, sql`ou.oferta_id = ${ofertas.id}`)
      .where(and(
        eq(ofertas.negocioId, negocioId),
        sql`ou.created_at >= ${fechaInicio.toISOString()} ${condFechaFinMejorCupon}`,
      ))
      .groupBy(ofertas.id, ofertas.titulo, ofertas.tipo, ofertas.valor, ofertas.imagen, ofertas.descripcion)
      .orderBy(sql`COUNT(ou.id) DESC`)
      .limit(1);

    // ── Cupones/vouchers por vencer (dato global, no depende del filtro de fecha) ─
    const ahora = new Date();
    const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [porVencerRaw] = await db
      .select({ cantidad: sql<number>`COUNT(*)::int` })
      .from(ofertas)
      .where(and(
        eq(ofertas.negocioId, negocioId),
        eq(ofertas.activo, true),
        sql`fecha_fin <= ${en7dias.toISOString()}`,
        sql`fecha_fin > ${ahora.toISOString()}`,
      ));

    // ── Mejor recompensa del período (más canjes/vouchers generados) ──────
    const condFechaFinMejorRecompensa = fechaFinNorm ? sql`AND vc.created_at <= ${fechaFinNorm}` : sql``;
    const mejorRecompensaRaw = await db.execute(sql`
      SELECT
        r.nombre AS titulo,
        r.tipo,
        r.puntos_requeridos::text AS valor,
        r.imagen_url AS imagen,
        r.descripcion,
        COUNT(vc.id)::int AS canjes
      FROM recompensas r
      INNER JOIN vouchers_canje vc ON vc.recompensa_id = r.id
      WHERE r.negocio_id = ${negocioId}
        AND vc.created_at >= ${fechaInicio.toISOString()}
        ${condFechaFinMejorRecompensa}
      GROUP BY r.id, r.nombre, r.tipo, r.puntos_requeridos, r.imagen_url, r.descripcion
      ORDER BY COUNT(vc.id) DESC
      LIMIT 1
    `);
    const mejorRecompensaRow = (mejorRecompensaRaw.rows[0] ?? null) as { titulo: string; tipo: string; valor: string; imagen: string | null; descripcion: string | null; canjes: number } | null;

    return {
      success: true,
      message: 'Reporte de promociones obtenido',
      data: {
        funnelOfertas: {
          activas: funnelOfertasRaw?.activas ?? 0,
          vistas: metricasOfertasRaw?.vistas ?? 0,
          clicks: metricasOfertasRaw?.clicks ?? 0,
          shares: metricasOfertasRaw?.shares ?? 0,
          expiradas: funnelOfertasRaw?.expiradas ?? 0,
        },
        mejorOferta: mejorOfertaRaw[0] ? {
          titulo: mejorOfertaRaw[0].titulo ?? '',
          tipo: mejorOfertaRaw[0].tipo ?? '',
          valor: mejorOfertaRaw[0].valor ?? null,
          imagen: mejorOfertaRaw[0].imagen ?? null,
          descripcion: mejorOfertaRaw[0].descripcion ?? null,
          metrica: mejorOfertaRaw[0].clicks ?? 0,
          metricaLabel: 'clicks',
        } : null,
        funnelCupones: funnelCuponesRaw ?? { emitidos: 0, canjeados: 0, expirados: 0, activos: 0 },
        mejorCupon: mejorCuponRaw[0] ? {
          titulo: mejorCuponRaw[0].titulo ?? '',
          tipo: mejorCuponRaw[0].tipo ?? '',
          valor: mejorCuponRaw[0].valor ?? null,
          imagen: mejorCuponRaw[0].imagen ?? null,
          descripcion: mejorCuponRaw[0].descripcion ?? null,
          metrica: mejorCuponRaw[0].canjes,
          metricaLabel: 'canjes',
        } : null,
        funnelRecompensas: funnelVouchersRaw ?? { generados: 0, canjeados: 0, expirados: 0, pendientes: 0 },
        mejorRecompensa: mejorRecompensaRow ? {
          titulo: mejorRecompensaRow.titulo,
          tipo: mejorRecompensaRow.tipo ?? 'basica',
          valor: mejorRecompensaRow.valor ? `${mejorRecompensaRow.valor} pts` : null,
          imagen: mejorRecompensaRow.imagen ?? null,
          descripcion: mejorRecompensaRow.descripcion ?? null,
          metrica: mejorRecompensaRow.canjes,
          metricaLabel: 'canjes',
        } : null,
        descuentoTotal: descuentoRaw?.total ?? 0,
        porVencer: porVencerRaw?.cantidad ?? 0,
      },
    };
  } catch (error) {
    console.error('Error obteniendo reporte de promociones:', error);
    return { success: false, message: 'Error al obtener reporte de promociones' };
  }
}

// =============================================================================
// 5. REPORTE RESEÑAS
// =============================================================================

export async function obtenerReporteResenas(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas = 'mes',
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
): Promise<RespuestaServicio<ReporteResenas>> {
  try {
    const fechaInicio = fechaInicioCustom ? new Date(fechaInicioCustom) : calcularFechaInicio(periodo);
    const fechaFinNorm = fechaFinCustom && fechaFinCustom.length === 10 ? `${fechaFinCustom}T23:59:59` : fechaFinCustom;

    // Condiciones base para reseñas de este negocio
    // Las reseñas se asocian a la sucursal vía sucursal_id
    const condsResenas = [
      eq(resenas.destinoTipo, 'negocio'),
      gte(resenas.createdAt, fechaInicio.toISOString()),
    ];
    if (sucursalId) {
      condsResenas.push(eq(resenas.sucursalId, sucursalId));
    } else {
      condsResenas.push(
        sql`sucursal_id IN (SELECT id FROM negocio_sucursales WHERE negocio_id = ${negocioId})`
      );
    }
    if (fechaFinNorm) {
      condsResenas.push(sql`created_at <= ${fechaFinNorm}`);
    }

    // ── Distribución de estrellas ──────────────────────────────────────────
    const distribucionRaw = await db
      .select({
        rating: resenas.rating,
        cantidad: sql<number>`COUNT(*)::int`,
      })
      .from(resenas)
      .where(and(...condsResenas, isNotNull(resenas.rating)))
      .groupBy(resenas.rating)
      .orderBy(resenas.rating);

    const totalResenas = distribucionRaw.reduce((acc, d) => acc + d.cantidad, 0);
    const distribucionEstrellas = distribucionRaw.map((d) => ({
      rating: d.rating!,
      cantidad: d.cantidad,
      porcentaje: totalResenas > 0 ? Math.round((d.cantidad / totalResenas) * 100) : 0,
    }));

    // ── Tendencia de rating por semana ─────────────────────────────────────
    const tendencia = await db
      .select({
        semana: sql<string>`TO_CHAR(DATE_TRUNC('week', created_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD')`,
        promedio: sql<number>`COALESCE(AVG(rating), 0)::float`,
        cantidad: sql<number>`COUNT(*)::int`,
      })
      .from(resenas)
      .where(and(...condsResenas, isNotNull(resenas.rating)))
      .groupBy(sql`DATE_TRUNC('week', created_at AT TIME ZONE 'America/Mexico_City')`)
      .orderBy(sql`DATE_TRUNC('week', created_at AT TIME ZONE 'America/Mexico_City')`);

    // ── Sin responder / Tasa de respuesta / Tiempo promedio ───────────────
    // IMPORTANTE: una reseña se considera "respondida" cuando existe una fila
    // con autor_tipo='negocio' vinculada por interaccion_id + destino_id (el autor
    // original). Esto cuenta correctamente las respuestas tanto de empleados
    // como del dueño/gerente (quienes dejan respondido_por_empleado_id = NULL).
    //
    // NO confundir con respondido_por_empleado_id, que solo se setea en la fila
    // de la respuesta (nunca en la reseña original del cliente), y por lo tanto
    // no sirve como indicador "está respondida" en la reseña del cliente.

    // Filtros SQL raw equivalentes a condsResenas para usar en db.execute
    const condSucursalSQL = sucursalId
      ? sql`AND r.sucursal_id = ${sucursalId}`
      : sql`AND r.sucursal_id IN (SELECT id FROM negocio_sucursales WHERE negocio_id = ${negocioId})`;
    const condFechaFinSQL = fechaFinNorm
      ? sql`AND r.created_at <= ${fechaFinNorm}`
      : sql``;

    // Sin responder: reseñas de cliente SIN una fila de respuesta asociada
    const sinResponderResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cantidad
      FROM resenas r
      WHERE r.destino_tipo = 'negocio'
        AND r.autor_tipo = 'cliente'
        AND r.rating IS NOT NULL
        AND r.created_at >= ${fechaInicio.toISOString()}
        ${condSucursalSQL}
        ${condFechaFinSQL}
        AND NOT EXISTS (
          SELECT 1 FROM resenas rr
          WHERE rr.autor_tipo = 'negocio'
            AND rr.interaccion_id = r.interaccion_id
            AND rr.destino_id = r.autor_id
        )
    `);
    const sinResponder = Number(
      (sinResponderResult.rows[0] as { cantidad?: number } | undefined)?.cantidad ?? 0
    );

    // Tasa de respuesta: (respondidas / total) * 100
    const respondidas = totalResenas - sinResponder;
    const tasaRespuesta = totalResenas > 0
      ? Math.round((respondidas / totalResenas) * 100)
      : 0;

    // Tiempo promedio de respuesta: diferencia entre created_at de la reseña original
    // y created_at de la respuesta (fila autor_tipo='negocio' asociada).
    const tiempoResult = await db.execute(sql`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (respuesta.created_at - r.created_at)) / 86400),
        0
      )::float AS promedio_dias
      FROM resenas r
      INNER JOIN resenas respuesta
        ON respuesta.autor_tipo = 'negocio'
        AND respuesta.interaccion_id = r.interaccion_id
        AND respuesta.destino_id = r.autor_id
      WHERE r.destino_tipo = 'negocio'
        AND r.autor_tipo = 'cliente'
        AND r.rating IS NOT NULL
        AND r.created_at >= ${fechaInicio.toISOString()}
        ${condSucursalSQL}
        ${condFechaFinSQL}
    `);
    const promedioDiasRespuesta = Number(
      (tiempoResult.rows[0] as { promedio_dias?: number } | undefined)?.promedio_dias ?? 0
    );

    // ── Respuestas agrupadas por responder (dueño + empleados) ────────────
    // Trae todas las respuestas del período enriquecidas con info del responder.
    // Después en JS agrupamos por responder y calculamos metrics por persona.
    const respuestasRaw = await db.execute(sql`
      SELECT
        respuesta.id AS respuesta_id,
        respuesta.autor_id AS respondedor_usuario_id,
        respuesta.respondido_por_empleado_id AS empleado_id,
        respuesta.created_at AS respuesta_created_at,
        r.created_at AS original_created_at,
        emp.nombre AS empleado_nombre,
        emp.foto_url AS empleado_foto,
        usr.nombre AS usuario_nombre,
        usr.apellidos AS usuario_apellidos,
        usr.avatar_url AS usuario_avatar
      FROM resenas r
      INNER JOIN resenas respuesta
        ON respuesta.autor_tipo = 'negocio'
        AND respuesta.interaccion_id = r.interaccion_id
        AND respuesta.destino_id = r.autor_id
      LEFT JOIN empleados emp ON emp.id = respuesta.respondido_por_empleado_id
      LEFT JOIN usuarios usr ON usr.id = respuesta.autor_id
      WHERE r.destino_tipo = 'negocio'
        AND r.autor_tipo = 'cliente'
        AND r.rating IS NOT NULL
        AND r.created_at >= ${fechaInicio.toISOString()}
        ${condSucursalSQL}
        ${condFechaFinSQL}
    `);

    // Info del dueño del negocio (para marcar esDueno en el breakdown)
    const [duenoResenasInfo] = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellidos: usuarios.apellidos,
      })
      .from(negocios)
      .innerJoin(usuarios, eq(negocios.usuarioId, usuarios.id))
      .where(eq(negocios.id, negocioId))
      .limit(1);

    // Agrupar respuestas por responder en JS
    type FilaRaw = {
      respuesta_id: string | number;
      respondedor_usuario_id: string | null;
      empleado_id: string | null;
      respuesta_created_at: string | Date;
      original_created_at: string | Date;
      empleado_nombre: string | null;
      empleado_foto: string | null;
      usuario_nombre: string | null;
      usuario_apellidos: string | null;
      usuario_avatar: string | null;
    };

    const agrupadoMap = new Map<string, { id: string; nombre: string; fotoUrl: string | null; esDueno: boolean; tiempos: number[] }>();

    for (const filaRaw of respuestasRaw.rows as unknown as FilaRaw[]) {
      let id: string;
      let nombre: string;
      let fotoUrl: string | null = null;
      let esDueno = false;

      if (filaRaw.empleado_id) {
        id = `emp-${filaRaw.empleado_id}`;
        nombre = filaRaw.empleado_nombre ?? 'Empleado sin nombre';
        fotoUrl = filaRaw.empleado_foto ?? null;
      } else if (filaRaw.respondedor_usuario_id) {
        id = `usr-${filaRaw.respondedor_usuario_id}`;
        nombre = [filaRaw.usuario_nombre, filaRaw.usuario_apellidos].filter(Boolean).join(' ').trim() || 'Usuario';
        fotoUrl = filaRaw.usuario_avatar ?? null;
        esDueno = duenoResenasInfo?.id === filaRaw.respondedor_usuario_id;
      } else {
        id = 'desconocido';
        nombre = 'Sin identificar';
      }

      // Calcular tiempo de respuesta en días
      const originalMs = new Date(filaRaw.original_created_at).getTime();
      const respuestaMs = new Date(filaRaw.respuesta_created_at).getTime();
      const dias = (respuestaMs - originalMs) / (1000 * 60 * 60 * 24);

      if (!agrupadoMap.has(id)) {
        agrupadoMap.set(id, { id, nombre, fotoUrl, esDueno, tiempos: [] });
      }
      agrupadoMap.get(id)!.tiempos.push(dias);
    }

    const respuestasPorResponder: RespuestaPorResponder[] = Array.from(agrupadoMap.values())
      .map((g) => ({
        id: g.id,
        nombre: g.nombre,
        fotoUrl: g.fotoUrl,
        esDueno: g.esDueno,
        respondidas: g.tiempos.length,
        tiempoPromDias: g.tiempos.length > 0
          ? Math.round((g.tiempos.reduce((a, b) => a + b, 0) / g.tiempos.length) * 10) / 10
          : 0,
      }))
      // Ordenar: dueño primero (si tiene respuestas), luego por cantidad DESC
      .sort((a, b) => {
        if (a.esDueno !== b.esDueno) return a.esDueno ? -1 : 1;
        return b.respondidas - a.respondidas;
      });

    return {
      success: true,
      message: 'Reporte de reseñas obtenido',
      data: {
        distribucionEstrellas,
        tendenciaRating: tendencia,
        sinResponder,
        totalResenas,
        tasaRespuesta,
        tiempoPromedioRespuestaDias: Math.round(promedioDiasRespuesta * 10) / 10,
        respuestasPorResponder,
      },
    };
  } catch (error) {
    console.error('Error obteniendo reporte de reseñas:', error);
    return { success: false, message: 'Error al obtener reporte de reseñas' };
  }
}
